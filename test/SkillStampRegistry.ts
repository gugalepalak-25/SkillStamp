import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const EVIDENCE = ethers.sha256(ethers.toUtf8Bytes("workshop-attendance-sheet"));
const DESC = ethers.sha256(ethers.toUtf8Bytes("Completed the Solidity workshop"));

async function deploy() {
  const [owner, issuer, student, stranger] = await ethers.getSigners();
  const reg = await ethers.deployContract("SkillStampRegistry", [owner.address]);
  await reg.setIssuer(issuer.address, true);
  return { reg, owner, issuer, student, stranger };
}

async function issue(reg: any, from: any, to: string, points = 10) {
  return reg.connect(from).issueCredential(to, "Solidity Workshop Completed", 0, 0, DESC, EVIDENCE, "Solidity,Smart Contracts", points);
}

describe("SkillStampRegistry", () => {
  it("lets an authorized issuer issue a credential and emits an event", async () => {
    const { reg, issuer, student } = await loadFixture(deploy);
    await expect(issue(reg, issuer, student.address, 10))
      .to.emit(reg, "CredentialIssued").withArgs(1, student.address, issuer.address, 10);
    const c = await reg.getCredential(1);
    expect(c.recipient).to.equal(student.address);
    expect(c.issuer).to.equal(issuer.address);
    expect(c.points).to.equal(10);
    expect(c.revoked).to.equal(false);
    expect(await reg.isValid(1)).to.equal(true);
    expect(await reg.activePoints(student.address)).to.equal(10);
    expect(await reg.getCredentialIdsByRecipient(student.address)).to.deep.equal([1n]);
  });

  it("lets the owner issue without separate authorization", async () => {
    const { reg, owner, student } = await loadFixture(deploy);
    await issue(reg, owner, student.address);
    expect(await reg.totalCredentials()).to.equal(1);
  });

  it("rejects issuance from unauthorized accounts", async () => {
    const { reg, stranger, student } = await loadFixture(deploy);
    await expect(issue(reg, stranger, student.address)).to.be.revertedWithCustomError(reg, "NotIssuer");
  });

  it("only the owner can manage issuers", async () => {
    const { reg, issuer, stranger } = await loadFixture(deploy);
    await expect(reg.connect(stranger).setIssuer(stranger.address, true))
      .to.be.revertedWithCustomError(reg, "OwnableUnauthorizedAccount");
    await reg.setIssuer(issuer.address, false);
    expect(await reg.isIssuer(issuer.address)).to.equal(false);
  });

  it("rejects invalid inputs", async () => {
    const { reg, issuer, student } = await loadFixture(deploy);
    const r = reg.connect(issuer);
    await expect(r.issueCredential(ethers.ZeroAddress, "T", 0, 0, DESC, EVIDENCE, "", 5)).to.be.revertedWithCustomError(reg, "InvalidRecipient");
    await expect(r.issueCredential(student.address, "", 0, 0, DESC, EVIDENCE, "", 5)).to.be.revertedWithCustomError(reg, "EmptyTitle");
    await expect(r.issueCredential(student.address, "x".repeat(81), 0, 0, DESC, EVIDENCE, "", 5)).to.be.revertedWithCustomError(reg, "TitleTooLong");
    await expect(r.issueCredential(student.address, "T", 8, 0, DESC, EVIDENCE, "", 5)).to.be.revertedWithCustomError(reg, "InvalidAchievementType");
    await expect(r.issueCredential(student.address, "T", 0, 4, DESC, EVIDENCE, "", 5)).to.be.revertedWithCustomError(reg, "InvalidCategory");
    await expect(r.issueCredential(student.address, "T", 0, 0, DESC, EVIDENCE, "", 0)).to.be.revertedWithCustomError(reg, "InvalidPoints");
    await expect(r.issueCredential(student.address, "T", 0, 0, DESC, EVIDENCE, "", 101)).to.be.revertedWithCustomError(reg, "InvalidPoints");
    await expect(r.issueCredential(student.address, "T", 0, 0, DESC, ethers.ZeroHash, "", 5)).to.be.revertedWithCustomError(reg, "EmptyEvidenceHash");
  });

  it("revokes a credential: stays on record, no longer valid, points removed", async () => {
    const { reg, issuer, student } = await loadFixture(deploy);
    await issue(reg, issuer, student.address, 10);
    await issue(reg, issuer, student.address, 20);
    await expect(reg.connect(issuer).revokeCredential(1)).to.emit(reg, "CredentialRevoked").withArgs(1, issuer.address);
    expect(await reg.isValid(1)).to.equal(false);
    expect((await reg.getCredential(1)).revoked).to.equal(true);
    expect((await reg.getCredential(1)).title).to.equal("Solidity Workshop Completed");
    expect(await reg.activePoints(student.address)).to.equal(20);
    expect(await reg.activeCount(student.address)).to.equal(1);
    await expect(reg.connect(issuer).revokeCredential(1)).to.be.revertedWithCustomError(reg, "AlreadyRevoked");
  });

  it("rejects revocation by unauthorized accounts and unknown ids", async () => {
    const { reg, issuer, student, stranger } = await loadFixture(deploy);
    await issue(reg, issuer, student.address);
    await expect(reg.connect(stranger).revokeCredential(1)).to.be.revertedWithCustomError(reg, "NotAuthorizedToRevoke");
    await expect(reg.connect(student).revokeCredential(1)).to.be.revertedWithCustomError(reg, "NotAuthorizedToRevoke");
    await expect(reg.revokeCredential(99)).to.be.revertedWithCustomError(reg, "CredentialNotFound");
    expect(await reg.isValid(1)).to.equal(true);
  });

  it("owner can revoke any credential; de-authorized issuer cannot", async () => {
    const { reg, owner, issuer, student } = await loadFixture(deploy);
    await issue(reg, issuer, student.address);
    await reg.setIssuer(issuer.address, false);
    await expect(reg.connect(issuer).revokeCredential(1)).to.be.revertedWithCustomError(reg, "NotAuthorizedToRevoke");
    await reg.connect(owner).revokeCredential(1);
    expect(await reg.isValid(1)).to.equal(false);
  });

  it("unknown credential is not valid and lookup reverts", async () => {
    const { reg } = await loadFixture(deploy);
    expect(await reg.isValid(1)).to.equal(false);
    await expect(reg.getCredential(1)).to.be.revertedWithCustomError(reg, "CredentialNotFound");
  });

  it("tracks recipients with paging and disables renounceOwnership", async () => {
    const { reg, issuer, student, stranger } = await loadFixture(deploy);
    await issue(reg, issuer, student.address);
    await issue(reg, issuer, student.address);
    await issue(reg, issuer, stranger.address);
    expect(await reg.recipientCount()).to.equal(2);
    expect(await reg.getRecipients(0, 10)).to.deep.equal([student.address, stranger.address]);
    expect(await reg.getRecipients(5, 10)).to.deep.equal([]);
    await expect(reg.renounceOwnership()).to.be.revertedWithCustomError(reg, "RenounceDisabled");
  });
});
