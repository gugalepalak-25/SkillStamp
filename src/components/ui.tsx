import { ReactNode, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Loader2, XCircle, HelpCircle, WifiOff } from "lucide-react";
import type { Status } from "../types";
import { txUrl } from "../config/chain";
import { short } from "../lib/utils";

const STATUS = {
  valid: { label: "Valid", cls: "bg-eucalyptus text-forest border-sage", Icon: CheckCircle2 },
  revoked: { label: "Revoked", cls: "bg-white text-ink border-copper", Icon: XCircle },
  not_found: { label: "Not found", cls: "bg-sand text-ink border-muted", Icon: HelpCircle },
  unavailable: { label: "Network unavailable", cls: "bg-sand text-ink border-muted", Icon: WifiOff },
} as const;

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls, Icon } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon size={14} aria-hidden /> {label}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const styles = {
    info: "bg-eucalyptus border-sage", success: "bg-eucalyptus border-sage",
    error: "bg-white border-copper", warn: "bg-sand border-copper",
  }[kind];
  const Icon = kind === "success" ? CheckCircle2 : kind === "info" ? HelpCircle : AlertTriangle;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex gap-2 rounded-md border p-3 text-sm ${styles}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden /><div>{children}</div>
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="animate-spin" size={16} />{text}</div>;
}

export function Skeleton({ className = "h-20" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-sand ${className}`} />;
}

export function TxLink({ hash }: { hash?: string }) {
  if (!hash) return <span className="text-muted">Not found</span>;
  return (
    <a className="inline-flex items-center gap-1 underline" href={txUrl(hash)} target="_blank" rel="noopener noreferrer">
      {short(hash)} <ExternalLink size={12} aria-label="opens Sepolia Etherscan" />
    </a>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn-ghost" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      <Copy size={14} /> {done ? "Copied" : label}
    </button>
  );
}

export function Monogram({ address }: { address: string }) {
  const hue = address.slice(2, 10);
  return (
    <div aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-forest text-ivory">
      <svg viewBox="0 0 48 48" width="40" height="40">
        <rect x="4" y="4" width="40" height="40" fill="none" stroke="#A87550" strokeWidth="1.5" />
        <path d="M4 44 L44 4" stroke="#789477" strokeWidth="1.5" />
        <text x="24" y="31" textAnchor="middle" fontFamily="DM Serif Display" fontSize="18" fill="#F5F3EB">{hue.slice(0, 2).toUpperCase()}</text>
      </svg>
    </div>
  );
}
