import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
test("offline staff bootstrap protects secrets and refuses overwrite", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "blies-bootstrap-test-"));
  const out = path.join(dir, "settings.env");
  try {
    const stdout = execFileSync(
      process.execPath,
      ["scripts/bootstrap-admin.mjs", "test@example.test", out],
      { input: "test-only-long-password" },
    ).toString();
    const settings = readFileSync(out, "utf8");
    assert.ok(!stdout.includes("BLIES_SESSION_SECRET="));
    assert.ok(!settings.includes("test-only-long-password"));
    assert.equal(statSync(out).mode & 0o777, 0o600);
    assert.ok(
      /BLIES_ADMIN_PASSWORD_HASH=scrypt:[a-f0-9]+:[a-f0-9]{128}/.test(settings),
    );
    assert.throws(() =>
      execFileSync(
        process.execPath,
        ["scripts/bootstrap-admin.mjs", "test@example.test", out],
        {
          input: "test-only-long-password",
          stdio: ["pipe", "ignore", "ignore"],
        },
      ),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
