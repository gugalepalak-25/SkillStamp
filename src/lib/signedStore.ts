import type { JsonRpcSigner } from "ethers";

export async function signedStoreRequest(address: string, signer: JsonRpcSigner, method: "GET" | "PUT", saved?: unknown) {
  const challengeResponse = await fetch(`/api/auth/challenge/${address}`);
  const challenge = await challengeResponse.json();
  if (!challengeResponse.ok) throw new Error(challenge.error || "Could not authenticate wallet.");
  const signature = await signer.signMessage(challenge.message);
  const response = await fetch(`/api/store/${address}`, {
    method, headers: { "Content-Type": "application/json", "X-Wallet-Signature": signature },
    ...(method === "PUT" ? { body: JSON.stringify({ saved }) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Saved plan request failed.");
  return data;
}
