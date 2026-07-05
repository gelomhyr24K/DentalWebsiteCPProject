/**
 * Developer Mode Authentication Utility
 * 
 * SECURITY WARNING:
 * -----------------
 * DEV MODE ONLY. Frontend-only hidden credentials and hashes are not production secure.
 * Anyone with access to the source code can bypass this check.
 * TODO: Replace with secure backend-side validation (e.g. Supabase auth RPC or role checking) before production.
 * Do not enable this in production build without proper server-side authentication.
 */

// SHA-256 hash of "Thelittlea5k:Lolo9iok"
const EXPECTED_HASH = "f7b64fb0050f37ff24f39531d445aed8d9dddf265055ba23ed7415b410b390fd";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isDeveloperModeUnlocked(): boolean {
  try {
    const sessionStr = sessionStorage.getItem('PNJ_DEVELOPER_MODE_UNLOCKED');
    if (!sessionStr) return false;
    const session = JSON.parse(sessionStr);
    if (!session || !session.unlocked || !session.unlockedAt) return false;
    
    // Auto-expire developer mode after 2 hours (7,200,000 milliseconds)
    const elapsed = Date.now() - session.unlockedAt;
    if (elapsed > 7200000) {
      lockDeveloperMode();
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function unlockDeveloperMode(devId: string, accessKey: string): Promise<boolean> {
  const normalizedId = devId.trim();
  const normalizedKey = accessKey.trim();
  const inputStr = `${normalizedId}:${normalizedKey}`;
  const hashed = await sha256(inputStr);
  
  if (hashed === EXPECTED_HASH) {
    sessionStorage.setItem('PNJ_DEVELOPER_MODE_UNLOCKED', JSON.stringify({
      unlocked: true,
      unlockedAt: Date.now()
    }));
    return true;
  }
  return false;
}

export function lockDeveloperMode(): void {
  sessionStorage.removeItem('PNJ_DEVELOPER_MODE_UNLOCKED');
}

export function getDeveloperModeSession(): { unlocked: boolean; unlockedAt?: number } | null {
  try {
    const sessionStr = sessionStorage.getItem('PNJ_DEVELOPER_MODE_UNLOCKED');
    if (!sessionStr) return null;
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}
