import { test } from "node:test";
import assert from "node:assert/strict";
import { persistentStorageEnabled } from "../lib/storage-policy.ts";
test("Vercel cannot enable filesystem persistence with flags or directory overrides", () => {
  for (const env of [
    { VERCEL: "1" },
    { VERCEL_ENV: "production" },
    {
      VERCEL: "1",
      BLIES_STORAGE_MODE: "sqlite",
      BLIES_DATA_DIR: "/tmp/unsafe",
    },
  ])
    assert.equal(persistentStorageEnabled(env), false);
});
test("persistent host retains SQLite capability while disabled and unknown modes fail closed", () => {
  assert.equal(persistentStorageEnabled({}), true);
  assert.equal(
    persistentStorageEnabled({ BLIES_STORAGE_MODE: "sqlite" }),
    true,
  );
  assert.equal(
    persistentStorageEnabled({ BLIES_STORAGE_MODE: "disabled" }),
    false,
  );
  assert.equal(
    persistentStorageEnabled({ BLIES_STORAGE_MODE: "managed" }),
    false,
  );
});
