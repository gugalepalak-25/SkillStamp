import { useWallet } from "../hooks/useWallet";
import { CONTRACT_ADDRESS, isDeployed } from "../lib/contract";
import { addrUrl, SEPOLIA } from "../config/chain";
import deployment from "../config/deployment.json";
import { short } from "../lib/utils";

export default function Settings() {
  const w = useWallet();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-3xl">Settings</h1>
      <div className="card space-y-2 text-sm">
        <p>Wallet: {w.address ? short(w.address) : "not connected"}</p>
        <p>Network: {w.chainId ?? "unknown"} {w.onSepolia ? "(Sepolia)" : `(need ${SEPOLIA.name})`}</p>
        {w.address && !w.onSepolia && <button className="btn" onClick={w.switchToSepolia}>Switch to Sepolia</button>}
        {w.address && <button className="btn-ghost" onClick={w.disconnect}>Disconnect from app</button>}
        <p className="text-xs text-muted">To fully revoke site access, disconnect the site inside MetaMask.</p>
      </div>
      <div className="card space-y-1 text-sm">
        <p>Contract: {isDeployed ? <a className="underline" href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer">{CONTRACT_ADDRESS}</a> : "not deployed yet"}</p>
        {deployment.txHash && <p className="break-all">Deployment tx: {deployment.txHash}</p>}
      </div>
    </div>
  );
}
