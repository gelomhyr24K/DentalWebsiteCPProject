import { isSupabaseConfigured, supabase } from '../../supabase';

export type NotificationUser =
  | string
  | {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      username?: string | null;
    }
  | null
  | undefined;

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
  related_link: string | null;
  user: string | null;
  metadata: Record<string, any>;
  isRead: boolean;
  raw: any;
};

export type CreateNotificationInput = {
  title: string;
  message: string;
  user?: string | null;
  related_link?: string | null;
  metadata?: Record<string, any>;
  [key: string]: unknown;
};

const ensureSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet.');
  }
  return supabase;
};

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeMetadata = (value: unknown) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);

const resolveUserTokens = (user: NotificationUser) => {
  if (!user) return [];
  if (typeof user === 'string') return [user.trim().toLowerCase()].filter(Boolean);

  return [user.id, user.email, user.name, user.username]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
};

const rowMatchesUser = (row: any, user: NotificationUser) => {
  const tokens = resolveUserTokens(user);
  if (tokens.length === 0) return true;

  const candidates = [
    row?.user,
    row?.user_id,
    row?.recipient,
    row?.recipient_id,
    row?.recipient_email,
    row?.assigned_to,
    row?.target_user,
    row?.owner,
    row?.metadata?.user,
    row?.metadata?.user_id,
    row?.metadata?.recipient,
    row?.metadata?.recipient_id,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  if (candidates.length === 0) return true;
  return tokens.some((token) => candidates.includes(token));
};

const normalizeNotification = (row: any): AppNotification => {
  const title = normalizeText(row?.title || row?.name || row?.subject || row?.type || 'Notification');
  const message = normalizeText(row?.message || row?.body || row?.description || row?.text || '');
  const relatedLink = normalizeText(row?.related_link || row?.link || row?.href || row?.route || row?.path) || null;
  const user = normalizeText(row?.user || row?.user_id || row?.recipient || row?.recipient_id || row?.owner) || null;
  const metadata = normalizeMetadata(row?.metadata);
  const isRead = Boolean(row?.read_at || row?.is_read === true || row?.read === true || row?.status === 'read');

  return {
    id: String(row?.id || row?.notification_id || crypto.randomUUID()),
    title,
    message,
    created_at: normalizeText(row?.created_at || row?.date || row?.timestamp || new Date().toISOString()),
    read_at: normalizeText(row?.read_at) || null,
    archived_at: normalizeText(row?.archived_at) || null,
    related_link: relatedLink,
    user,
    metadata,
    isRead,
    raw: row,
  };
};

const sortNotifications = (items: AppNotification[]) => (
  [...items].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
);

export const loadNotifications = async (user: NotificationUser): Promise<AppNotification[]> => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('app_notifications')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return sortNotifications((data || []).filter((row) => rowMatchesUser(row, user)).map(normalizeNotification));
};

export const loadUnreadNotificationCount = async (user: NotificationUser): Promise<number> => {
  const notifications = await loadNotifications(user);
  return notifications.filter((item) => !item.isRead).length;
};

const tryNotificationUpdate = async (id: string, payloads: Array<Record<string, unknown>>) => {
  const client = ensureSupabase();
  let lastError: any = null;

  for (const payload of payloads) {
    const { error } = await client
      .from('app_notifications')
      .update(payload)
      .eq('id', id);

    if (!error) return;
    lastError = error;
  }

  if (lastError) throw lastError;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  const now = new Date().toISOString();
  await tryNotificationUpdate(id, [
    { read_at: now, is_read: true },
    { read_at: now },
    { is_read: true },
  ]);
};

export const markAllNotificationsRead = async (user: NotificationUser): Promise<void> => {
  const unreadItems = (await loadNotifications(user)).filter((item) => !item.isRead);
  await Promise.all(unreadItems.map((item) => markNotificationRead(item.id)));
};

export const archiveNotification = async (id: string): Promise<void> => {
  const now = new Date().toISOString();
  await tryNotificationUpdate(id, [
    { archived_at: now },
  ]);
};

export const createNotification = async (input: CreateNotificationInput): Promise<AppNotification> => {
  const client = ensureSupabase();
  const payload = Object.fromEntries(
    Object.entries({
      ...input,
      title: normalizeText(input.title),
      message: normalizeText(input.message),
      related_link: normalizeText(input.related_link) || null,
      metadata: normalizeMetadata(input.metadata),
    }).filter(([, value]) => value !== undefined)
  );

  const { data, error } = await client
    .from('app_notifications')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeNotification(data);
};
