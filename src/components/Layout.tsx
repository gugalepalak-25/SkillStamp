import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, Wallet, X } from "lucide-react";
import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { short } from "../lib/utils";
import { Notice } from "./ui";
import { isDeployed } from "../lib/contract";
import OpportunityCompass from "./OpportunityCompass";

const links = [
  ["/dashboard", "Passport"], ["/skills", "Skills"], ["/assistant", "Assistant"], ["/opportunities", "Opportunities"], ["/issue", "Issuer"],
  ["/verify", "Verify"], ["/leaderboard", "Leaderboard"], ["/settings", "Settings"],["/evidence", "Submit Evidence"],
];

export default function Layout() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="bg-forest text-ivory">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-serif text-xl">SkillStamp</Link>
          <nav className="hidden gap-5 text-sm md:flex" aria-label="Main">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "underline underline-offset-4" : "opacity-80 hover:opacity-100")}>{label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {w.address ? (
              <button onClick={w.disconnect} className="flex items-center gap-2 rounded-md border border-sage px-3 py-1.5 text-sm" title="Forget this account in the app">
                <Wallet size={14} /> {short(w.address)}
              </button>
            ) : (
              <button onClick={w.connect} className="rounded-md bg-ivory px-3 py-1.5 text-sm font-medium text-forest">Connect wallet</button>
            )}
            <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
          </div>
        </div>
        {open && (
          <nav className="flex flex-col gap-3 px-4 pb-4 text-sm md:hidden">
            {links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}
          </nav>
        )}
      </header>
      <div className="mx-auto max-w-6xl space-y-3 px-4 pt-4">
        {w.error && <Notice kind="error">{w.error}</Notice>}
        {w.address && !w.onSepolia && (
          <Notice kind="warn">
            You are on chain {w.chainId}. Transactions need Sepolia.{" "}
            <button className="underline" onClick={w.switchToSepolia}>Switch to Sepolia</button>
          </Notice>
        )}
        {!w.hasMetaMask && <Notice kind="info">MetaMask was not detected. You can still verify credentials; install MetaMask to connect.</Notice>}
        {!isDeployed && <Notice kind="warn">No contract address configured yet. Deploy to Sepolia (see README) so this app can read real data.</Notice>}
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
      <OpportunityCompass />
      <footer className="border-t border-sand py-6 text-center text-xs text-muted">
        On-chain data: Sepolia testnet. Off-chain: preferences &amp; saved plans. AI/search suggestions are never credentials.
      </footer>
    </div>
  );
}
