import { Contract, ContractRunner, JsonRpcProvider, Network, isAddress } from "ethers";
import { ABI } from "./abi";
import deployment from "../config/deployment.json";
import { SEPOLIA } from "../config/chain";
import type { Credential } from "../types";

export const CONTRACT_ADDRESS: string = deployment.address;
export const isDeployed = isAddress(CONTRACT_ADDRESS);
const RPC = (import.meta.env.VITE_SEPOLIA_RPC_URL as string) || "https://ethereum-sepolia-rpc.publicnode.com";
export const readProvider = new JsonRpcProvider(RPC, SEPOLIA.chainId, {
  staticNetwork: Network.from(SEPOLIA.chainId),
});

export function registry(runner?: ContractRunner) {
  if (!isDeployed) throw new Error("No contract address configured. Run the Sepolia deployment first (see README).");
  return new Contract(CONTRACT_ADDRESS, ABI, runner ?? readProvider);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parse(r: any): Credential {
  return {
    id: Number(r.id),
    recipient: r.recipient,
    issuer: r.issuer,
    title: r.title,
    achievementType: Number(r.achievementType),
    category: Number(r.category),
    descriptionHash: r.descriptionHash,
    evidenceHash: r.evidenceHash,
    skills: String(r.skills).split(",").map((s: string) => s.trim()).filter(Boolean),
    points: Number(r.points),
    issuedAt: Number(r.issuedAt),
    revoked: r.revoked,
    revokedAt: Number(r.revokedAt),
    revokedBy: r.revokedBy,
  };
}

/** Returns null when the credential does not exist. Throws on network errors. */
export async function fetchCredential(id: number): Promise<Credential | null> {
  const c = registry();
  const total = Number(await c.totalCredentials());
  if (!Number.isInteger(id) || id < 1 || id > total) return null;
  return parse(await c.getCredential(id));
}

export async function fetchTxHash(id: number): Promise<string | undefined> {
  const c = registry();
  const logs = await c.queryFilter(c.filters.CredentialIssued(id), deployment.deployBlock || 0);
  return logs[0]?.transactionHash;
}

export async function fetchRevokeTxHash(id: number): Promise<string | undefined> {
  const c = registry();
  const logs = await c.queryFilter(c.filters.CredentialRevoked(id), deployment.deployBlock || 0);
  return logs[0]?.transactionHash;
}

export async function fetchByRecipient(address: string): Promise<Credential[]> {
  const c = registry();
  const ids: bigint[] = await c.getCredentialIdsByRecipient(address);
  const list = await Promise.all(ids.map((i) => c.getCredential(i)));
  return list.map(parse).sort((a, b) => b.issuedAt - a.issuedAt);
}

export async function fetchLeaderboard() {
  const c = registry();
  const n = Number(await c.recipientCount());
  const limit = Math.min(n, 200);
  const addrs: string[] = limit ? await c.getRecipients(0, limit) : [];
  const rows = await Promise.all(
    addrs.map(async (a) => ({
      address: a,
      points: Number(await c.activePoints(a)),
      count: Number(await c.activeCount(a)),
    })),
  );
  // Deterministic: points desc, then address asc. Ties share a rank.
  rows.sort((x, y) => y.points - x.points || x.address.toLowerCase().localeCompare(y.address.toLowerCase()));
  let rank = 0;
  let prev = -1;
  return {
    total: n,
    truncated: n > limit,
    rows: rows.map((r, i) => {
      if (r.points !== prev) { rank = i + 1; prev = r.points; }
      return { ...r, rank };
    }),
  };
}

export function friendlyError(e: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = e as any;
  if (err?.code === "ACTION_REJECTED" || err?.info?.error?.code === 4001) return "You rejected the request in MetaMask.";
  if (err?.code === "INSUFFICIENT_FUNDS") return "Not enough Sepolia ETH to pay gas. Get test ETH from a Sepolia faucet.";
  const name = err?.revert?.name ?? err?.errorName;
  const map: Record<string, string> = {
    NotIssuer: "This wallet is not an authorized issuer.",
    NotAuthorizedToRevoke: "This wallet is not allowed to revoke this credential (only the owner, or the original issuer while still authorized).",
    InvalidRecipient: "Recipient address is invalid.",
    EmptyTitle: "Title is required.",
    TitleTooLong: "Title is too long (max 80 bytes).",
    SkillsTooLong: "Skills text is too long (max 120 bytes).",
    InvalidAchievementType: "Invalid achievement type.",
    InvalidCategory: "Invalid category.",
    InvalidPoints: "Points must be between 1 and 100.",
    EmptyEvidenceHash: "An evidence hash is required.",
    CredentialNotFound: "No credential with that ID exists.",
    AlreadyRevoked: "That credential is already revoked.",
    OwnableUnauthorizedAccount: "Only the contract owner can do this.",
  };
  if (name && map[name]) return map[name];
  return err?.shortMessage || err?.reason || err?.message || "Unknown error.";
}
