import { persistentStorageEnabled } from "./storage-policy";
export const uploadsReady = () =>
  persistentStorageEnabled() &&
  !!(
    process.env.BLIES_SCAN_URL &&
    process.env.BLIES_SCAN_KEY &&
    process.env.BLIES_SCAN_URL.startsWith("https://")
  );
