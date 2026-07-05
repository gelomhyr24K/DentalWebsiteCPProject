import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_CANDIDATES = [
  path.join(process.cwd(), 'Backend', '.env.local'),
  path.join(process.cwd(), '.env.local'),
];

const DEMO_USERS = [
  {
    email: 'pnjtanartedentalclinic@gmail.com',
    password: 'pnjtanarte2020',
    full_name: 'Maria Jessica David Tanarte',
    role: 'clinic_owner',
  },
  {
    email: 'associate@pj-dental.com',
    password: 'pj2020',
    full_name: 'Associate Dentist',
    role: 'associate_dentist',
  },
  {
    email: 'staff@pj-dental.com',
    password: 'pj2020',
    full_name: 'Staff Member',
    role: 'staff',
  },
];

function parseEnvFile(fileContents) {
  return Object.fromEntries(
    fileContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) return [line, ''];
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      }),
  );
}

function loadEnv() {
  const envPath = ENV_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!envPath) {
    throw new Error('Missing .env.local. Create Backend/.env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return parseEnvFile(fs.readFileSync(envPath, 'utf8'));
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

async function ensureClinicUsersTable(baseUrl, serviceRoleKey) {
  const endpoint = new URL('/rest/v1/clinic_users?select=id&limit=1', baseUrl).toString();
  const response = await fetch(endpoint, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  if (response.ok) return;

  const text = await response.text();
  throw new Error(
    `clinic_users table is unavailable or the service role cannot access it. Apply Assets/supabase-clinic-users.sql first. Supabase said: ${text}`,
  );
}

async function upsertClinicUser(baseUrl, serviceRoleKey, user) {
  const endpoint = new URL('/rest/v1/clinic_users?on_conflict=email', baseUrl).toString();
  const payload = {
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    status: 'active',
    settings: {
      demoRole: true,
      seededBy: 'seed-demo-auth-users.mjs',
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to sync clinic_users for ${user.email}: ${text}`);
  }
}

async function syncAuthUser(adminClient, user) {
  const existing = await adminClient.auth.admin.getUserByEmail(user.email);
  const metadata = {
    full_name: user.full_name,
    role: user.role,
  };

  if (existing?.data?.user) {
    const userId = existing.data.user.id;
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: user.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return { status: 'updated', userId };
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  return { status: 'created', userId: data.user?.id || null };
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = requireEnv('SUPABASE_URL', env.SUPABASE_URL || env.VITE_SUPABASE_URL);
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY);

  if (String(serviceRoleKey).includes('publishable') || String(serviceRoleKey).includes('anon')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a real service role key, not an anon/publishable key.');
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`Seeding demo auth users against ${supabaseUrl}`);
  await ensureClinicUsersTable(supabaseUrl, serviceRoleKey);

  for (const user of DEMO_USERS) {
    const authResult = await syncAuthUser(adminClient, user);
    await upsertClinicUser(supabaseUrl, serviceRoleKey, user);
    console.log(`${user.email}: auth ${authResult.status}, clinic_users synced`);
  }

  console.log('Demo auth user seed complete.');
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
