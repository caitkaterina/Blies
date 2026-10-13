// Capability selection is shared by public rendering and private handlers.
// Vercel's filesystem is never a persistent backend, even with a path override.
export function persistentStorageEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.BLIES_STORAGE_MODE === "supabase")
    return !!(env.BLIES_SUPABASE_URL && env.BLIES_SUPABASE_SERVICE_ROLE_KEY);
  return (
    env.VERCEL !== "1" &&
    !env.VERCEL_ENV &&
    (env.BLIES_STORAGE_MODE === undefined ||
      env.BLIES_STORAGE_MODE === "sqlite")
  );
}
export class StorageUnavailable extends Error {
  constructor() {
    super("Persistent backend unavailable");
    this.name = "StorageUnavailable";
  }
}
export function requirePersistence() {
  if (!persistentStorageEnabled()) throw new StorageUnavailable();
}
