import "server-only";
import { after } from "next/server";
import { drainOutbox } from "./notifications";
export function scheduleOutbox() {
  if (!process.env.BLIES_EMAIL_API_KEY || !process.env.BLIES_EMAIL_FROM) return;
  after(async () => {
    try {
      await drainOutbox(3);
    } catch {
      console.warn("BLIES notification retry needed");
    }
  });
}
