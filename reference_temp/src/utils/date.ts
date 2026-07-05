export function calculateAge(birthdateStr: string): number {
  if (!birthdateStr) return 0;
  const birthdate = new Date(birthdateStr);
  const today = new Date(); // Current year is 2026
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

export function isUnderage(birthdateStr: string): boolean {
  if (!birthdateStr) return false;
  return calculateAge(birthdateStr) < 18;
}
