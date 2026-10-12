import "server-only";
import { persistentStorageEnabled, StorageUnavailable } from "./storage-policy";
// Public marketing content is repository-owned. SQLite CMS overrides are an
// optional persistent-host enhancement, not a dependency of public rendering.
export async function published(kind: string, slug?: string) {
  if (!persistentStorageEnabled()) return [];
  try {
    const store = await import("./store");
    return store.published(kind, slug);
  } catch (error) {
    if (error instanceof StorageUnavailable) {
      console.warn("BLIES public CMS unavailable; serving repository content.");
      return [];
    }
    throw error;
  }
}
