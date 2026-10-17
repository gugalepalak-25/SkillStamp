import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchCredential, fetchRevokeTxHash, fetchTxHash, isDeployed } from "../lib/contract";
import { CATEGORIES, TYPES } from "../config/policy";
import { fmtDate, short } from "../lib/utils";
import { addrUrl } from "../config/chain";
import type { Credential, Status } from "../types";
import { Notice, Skeleton, StatusBadge, TxLink } from "../components/ui";

export default function Verify() {
  const { credentialId } = useParams();
  const nav = useNavigate();
  const [input, setInput] = useState(credentialId ?? "");
  const [status, setStatus] = useState<Status | null>(null);
  const [cred, setCred] = useState<Credential | null>(null);
  const [tx, setTx] = useState<string>();
  const [revTx, setRevTx] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(credentialId ?? ""); setCred(null); setTx(undefined); setRevTx(undefined);
    if (!credentialId) { setStatus(null); return; }
    if (!isDeployed) { setStatus("unavailable"); return; }
    const id = Number(credentialId);
    setLoading(true);
    fetchCredential(id)
      .then(async (c) => {
        if (!c) { setStatus("not_found"); return; }
        setCred(c); setStatus(c.revoked ? "revoked" : "valid");
        fetchTxHash(id).then(setTx).catch(() => undefined);
        if (c.revoked) fetchRevokeTxHash(id).then(setRevTx).catch(() => undefined);
      })
      .catch(() => setStatus("unavailable"))
      .finally(() => setLoading(false));
  }, [credentialId]);

  const submit = (e: FormEvent) => { e.preventDefault(); if (/^\d+$/.test(input.trim())) nav(`/verify/${input.trim()}`); };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl">Verify a credential</h1>
      <form onSubmit={submit} className="flex gap-2">
        <input className="input" inputMode="numeric" placeholder="Credential ID, e.g. 1" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Credential ID" />
        <button className="btn" type="submit">Verify</button>
      </form>
      {loading && <Skeleton className="h-48" />}
      {!loading && status === "not_found" && <Notice kind="warn"><StatusBadge status="not_found" /> No credential with ID {credentialId} exists on this registry. It is not valid.</Notice>}
      {!loading && status === "unavailable" && <Notice kind="error"><StatusBadge status="unavailable" /> The registry could not be read right now (no contract configured, or RPC failure). Nothing is shown as valid.</Notice>}
      {!loading && cred && status && (
        <article className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl">{cred.title}</h2><StatusBadge status={status} />
          </div>
          {cred.revoked && <Notice kind="warn">Revoked on {fmtDate(cred.revokedAt)} by {short(cred.revokedBy)}. The record stays visible for audit.{" "}
            {revTx && <>Revocation tx: <TxLink hash={revTx} /></>}</Notice>}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="label">Credential ID</dt><dd>{cred.id}</dd></div>
            <div><dt className="label">Issued</dt><dd>{fmtDate(cred.issuedAt)}</dd></div>
            <div><dt className="label">Type / category</dt><dd>{TYPES[cred.achievementType]} · {CATEGORIES[cred.category]}</dd></div>
            <div><dt className="label">Points {cred.revoked ? "(not counted)" : ""}</dt><dd>{cred.points}</dd></div>
            <div><dt className="label">Recipient</dt><dd><Link className="underline" to={`/passport/${cred.recipient}`}>{short(cred.recipient)}</Link></dd></div>
            <div><dt className="label">Issuer</dt><dd><a className="underline" href={addrUrl(cred.issuer)} target="_blank" rel="noopener noreferrer">{short(cred.issuer)}</a></dd></div>
            <div><dt className="label">Skills</dt><dd>{cred.skills.join(", ") || "None listed"}</dd></div>
            <div><dt className="label">Issuance tx</dt><dd><TxLink hash={tx} /></dd></div>
            <div className="sm:col-span-2"><dt className="label">Evidence hash (SHA-256)</dt><dd className="break-all font-mono text-xs">{cred.evidenceHash}</dd></div>
            <div className="sm:col-span-2"><dt className="label">Description hash (SHA-256)</dt><dd className="break-all font-mono text-xs">{cred.descriptionHash}</dd></div>
          </dl>
          <p className="text-xs text-muted">
            This verifies the on-chain record and which wallet issued it. It does not prove the issuer is honest; trust depends on who the issuer is and
            on the supporting evidence. A hash matches content only if you hash the same original file.
          </p>
        </article>
      )}
    </div>
  );
}
