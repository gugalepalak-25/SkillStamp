import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchByRecipient, fetchTxHash, isDeployed } from "../lib/contract";
import { computeScore, verifiedSkills } from "../lib/score";
import { CATEGORIES, TYPES } from "../config/policy";
import { fmtDate, short } from "../lib/utils";
import type { Credential } from "../types";
import { CopyButton, Monogram, Notice, Skeleton, StatusBadge, TxLink } from "./ui";
import { addrUrl } from "../config/chain";

function Evidence({ c }: { c: Credential }) {
  const [tx, setTx] = useState<string>();
  useEffect(() => { fetchTxHash(c.id).then(setTx).catch(() => undefined); }, [c.id]);
  return (
    <li className="rounded-md border border-sand bg-ivory p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/verify/${c.id}`} className="font-medium underline">{c.title}</Link>
        <StatusBadge status={c.revoked ? "revoked" : "valid"} />
      </div>
      <dl className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
        <div>Skills: {c.skills.join(", ") || "none listed"}</div>
        <div>Issued: {fmtDate(c.issuedAt)}</div>
        <div>Issuer: <a className="underline" href={addrUrl(c.issuer)} target="_blank" rel="noopener noreferrer">{short(c.issuer)}</a></div>
        <div>Tx: <TxLink hash={tx} /></div>
        <div className="break-all sm:col-span-2">Evidence hash: {c.evidenceHash}</div>
      </dl>
    </li>
  );
}

export default function PassportView({ address, isOwner }: { address: string; isOwner?: boolean }) {
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeployed) { setCreds([]); return; }
    setCreds(null); setErr(null);
    fetchByRecipient(address).then(setCreds).catch((e) => setErr(`Could not read the contract: ${e.shortMessage ?? e.message}`));
  }, [address]);

  if (err) return <Notice kind="error">{err}</Notice>;
  if (!creds) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>;

  const score = computeScore(creds);
  const skills = verifiedSkills(creds);
  const groups = Array.from(new Set(skills.map((s) => s.group)));
  const url = `${window.location.origin}/passport/${address}`;
  const topSkill = skills.find((s) => s.verified)?.skill;

  return (
    <div className="space-y-8">
      <section className="card flex flex-wrap items-center gap-4">
        <Monogram address={address} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl">{isOwner ? "Your passport" : "Student passport"}</h1>
          <p className="break-all text-sm text-muted">{address}</p>
        </div>
        <CopyButton text={url} label="Copy public link" />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="label">Active credentials</p><p className="font-serif text-4xl text-forest">{score.activeCount}</p></div>
        <div className="card"><p className="label">Active points</p><p className="font-serif text-4xl text-forest">{score.activePoints}</p></div>
        <div className="card"><p className="label">Growth Score</p><p className="font-serif text-4xl text-forest">{score.total}<span className="text-lg text-muted"> / 100</span></p></div>
      </section>

      <section className="card">
        <h2 className="text-xl">Growth Score breakdown</h2>
        <div className="mt-3 space-y-3">
          {score.perCategory.map((c) => (
            <div key={c.name}>
              <div className="flex justify-between text-sm"><span>{c.name} ({c.weight * 100}%)</span>
                <span className="text-muted">{c.count ? `${c.points} / ${c.cap} pts target` : "No credentials yet"}</span></div>
              <div className="mt-1 h-2 rounded bg-sand"><div className="h-2 rounded bg-sage" style={{ width: `${c.normalized}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Formula: sum of weight × min(active points ÷ category target, 1) × 100. Revoked credentials are excluded. It reflects only credentials recorded on this
          registry, so it is incomplete by design and is not a judgment of ability, employability or intelligence.
        </p>
      </section>

      <section className="card">
        <h2 className="text-xl">Proof of Experience</h2>
        <p className="text-sm text-muted">A skill is blockchain-verified only if at least one non-revoked credential lists it. Typing a skill does not make it verified.</p>
        {skills.length === 0 ? <p className="mt-3 text-sm">No verified skills yet.</p> : groups.map((g) => (
          <div key={g} className="mt-4">
            <h3 className="text-base">{g}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.filter((s) => s.group === g).map((s) => (
                <button key={s.skill} onClick={() => setOpen(open === s.skill ? null : s.skill)}
                  className={`rounded-full border px-3 py-1 text-sm ${s.verified ? "border-sage bg-eucalyptus" : "border-copper bg-white line-through"}`}
                  aria-expanded={open === s.skill}>
                  {s.skill} · {s.verified ? "verified" : "revoked"}
                </button>
              ))}
            </div>
            {skills.filter((s) => s.group === g && s.skill === open).map((s) => (
              <ul key={s.skill} className="mt-3 space-y-2">{s.evidence.map((c) => <Evidence key={c.id} c={c} />)}</ul>
            ))}
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-xl">Achievement timeline</h2>
        {creds.length === 0 ? <p className="mt-3 text-sm">No credentials recorded for this wallet.</p> : (
          <ol className="mt-4 space-y-4 border-l border-sand pl-4">
            {creds.map((c) => (
              <li key={c.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-copper" aria-hidden />
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/verify/${c.id}`} className="font-medium underline">{c.title}</Link>
                  <StatusBadge status={c.revoked ? "revoked" : "valid"} />
                </div>
                <p className="text-xs text-muted">{fmtDate(c.issuedAt)} · {TYPES[c.achievementType]} · {CATEGORIES[c.category]} · {c.points} pts{c.revoked ? " (not counted)" : ""} · issuer {short(c.issuer)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {isOwner && (
        <section className="card bg-eucalyptus">
          <h2 className="text-xl">Your next move</h2>
          <p className="text-sm">
            {topSkill ? `Based on your verified skill "${topSkill}", look for opportunities that build on it.` : "Earn your first credential, then Compass can tailor suggestions."}
          </p>
          <Link className="btn mt-3" to={`/opportunities${topSkill ? `?interest=${encodeURIComponent(topSkill)}` : ""}`}>Open Opportunity Compass</Link>
        </section>
      )}
    </div>
  );
}
