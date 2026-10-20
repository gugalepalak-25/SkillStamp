import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Wallet } from "ethers";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let child = null;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error("server did not start");
}

before(async () => {
  child = spawn(process.execPath, ["server/index.mjs"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  await waitForServer();
});

after(() => {
  if (child) child.kill();
});

test("evidence routes are registered at boot", async () => {
  const address = Wallet.createRandom().address;
  const r = await fetch(`${BASE}/api/evidence/${address}`);
  assert.equal(r.status, 401, "route must exist and require a signature");
});

test("opportunities returns results and validates input", async () => {
  const ok = await fetch(`${BASE}/api/opportunities`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interest: "Solidity", city: "Pune", level: "beginner", categories: ["workshop", "course"] }),
  });
  const data = await ok.json();
  assert.ok(ok.ok);
  assert.ok(Array.isArray(data.results) && data.results.length > 0);

  const bad = await fetch(`${BASE}/api/opportunities`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city: "Pune" }),
  });
  assert.equal(bad.status, 400);
});

test("roadmap generates the requested number of weeks", async () => {
  const r = await fetch(`${BASE}/api/roadmap`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal: "learn solidity", level: "beginner", weeks: 4 }),
  });
  const data = await r.json();
  assert.ok(r.ok);
  assert.equal(data.plan.length, 4);
});

test("assistant reports missing configuration instead of failing", async () => {
  const r = await fetch(`${BASE}/api/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hi" }),
  });
  assert.equal(r.status, 503);
  const data = await r.json();
  assert.match(data.error, /OPENAI_API_KEY/);
});

test("wallet-signature flow gates store and evidence access", async () => {
  const wallet = Wallet.createRandom();
  const address = wallet.address;

  const unsigned = await fetch(`${BASE}/api/store/${address}`);
  assert.equal(unsigned.status, 401);

  const challengeRes = await fetch(`${BASE}/api/auth/challenge/${address}`);
  assert.ok(challengeRes.ok);
  const { message } = await challengeRes.json();
  const signature = await wallet.signMessage(message);

  const store = await fetch(`${BASE}/api/store/${address}`, { headers: { "x-wallet-signature": signature } });
  assert.ok(store.ok);
  const storeData = await store.json();
  assert.equal(typeof storeData.saved, "object");

  const replay = await fetch(`${BASE}/api/store/${address}`, { headers: { "x-wallet-signature": signature } });
  assert.equal(replay.status, 401, "a used challenge must not be reusable");

  const challenge2Res = await fetch(`${BASE}/api/auth/challenge/${address}`);
  assert.ok(challenge2Res.ok);
  const { message: message2 } = await challenge2Res.json();
  const signature2 = await wallet.signMessage(message2);
  const evidence = await fetch(`${BASE}/api/evidence/${address}`, { headers: { "x-wallet-signature": signature2 } });
  assert.ok(evidence.ok);
  const evidenceData = await evidence.json();
  assert.ok(Array.isArray(evidenceData.submissions));
});

test("invalid signature is rejected", async () => {
  const address = Wallet.createRandom().address;
  await fetch(`${BASE}/api/auth/challenge/${address}`);
  const r = await fetch(`${BASE}/api/store/${address}`, { headers: { "x-wallet-signature": "0x" + "11".repeat(65) } });
  assert.equal(r.status, 401);
});
