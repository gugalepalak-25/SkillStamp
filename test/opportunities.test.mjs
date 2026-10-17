import test from "node:test";
import assert from "node:assert/strict";
import { buildQueries, dedupe, makeRoadmap, verifySignedMessage, why } from "../server/index.mjs";
import { Wallet } from "ethers";

test("buildQueries builds selected categories and uses online when city is absent", () => {
  const q = buildQueries({ city: "", interest: "Solidity", level: "beginner", categories: ["course", "hackathon"], freeOnly: true, onlineOnly: false });
  assert.equal(q.length, 2);
  assert.match(q[0].q, /beginner Solidity course free/);
  assert.match(q[1].q, /online/);
});
test("buildQueries omits unsupported categories", () => {
  assert.deepEqual(buildQueries({ interest: "x", categories: ["invalid"], level: "beginner" }), []);
});
test("dedupe removes duplicate host/path and invalid URLs", () => {
  const result = dedupe([{ url: "https://example.com/a?q=1" }, { url: "https://example.com/a?q=2" }, { url: "javascript:alert(1)" }, { url: "not-a-url" }]);
  assert.equal(result.length, 1);
});
test("roadmap is bounded and includes one task per week", () => {
  const r = makeRoadmap({ goal: "Learn Solidity", level: "beginner", weeks: 99 });
  assert.equal(r.weeks, 12); assert.equal(r.plan.length, 12); assert.equal(r.goal, "Learn Solidity");
  assert.equal(makeRoadmap({ weeks: 0 }).weeks, 4);
});
test("roadmap normalizes invalid level and trims goal", () => {
  const r = makeRoadmap({ goal: "  ".concat("x".repeat(130)), level: "expert", weeks: 2 });
  assert.equal(r.level, "beginner"); assert.equal(r.goal.length, 120);
});
test("why recommendation distinguishes verified skills from no verified skills", () => {
  assert.match(why({ interest: "Solidity", verifiedSkills: ["JavaScript"], level: "beginner", category: "course" }), /verified credentials for JavaScript/);
  assert.match(why({ interest: "Solidity", verifiedSkills: [], level: "beginner", category: "course" }), /no verified skills yet/);
});

test("signed saved-plan challenge verifies only the signing wallet", async () => {
  const wallet = Wallet.createRandom();
  const message = "SkillStamp test challenge";
  const signature = await wallet.signMessage(message);
  assert.equal(await verifySignedMessage(wallet.address, message, signature), true);
  assert.equal(await verifySignedMessage(Wallet.createRandom().address, message, signature), false);
  assert.equal(await verifySignedMessage(wallet.address, message + " changed", signature), false);
});
