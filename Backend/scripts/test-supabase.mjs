import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');

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

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }
  return value;
}

async function checkEndpoint(baseUrl, key, tableName) {
  const endpoint = new URL(`/rest/v1/${tableName}?select=id&limit=1`, baseUrl).toString();
  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${tableName} request failed: ${reason}`);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${tableName} check failed (${response.status}): ${text}`);
  }

  return text;
}

async function main() {
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const env = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL', env.VITE_SUPABASE_URL);
  const supabaseKey = requireEnv(
    'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY',
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
  );

  console.log(`Testing Supabase project: ${supabaseUrl}`);

  await checkEndpoint(supabaseUrl, supabaseKey, 'patient_records');
  console.log('patient_records: OK');

  await checkEndpoint(supabaseUrl, supabaseKey, 'dental_charts');
  console.log('dental_charts: OK');

  console.log('Supabase smoke test passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
