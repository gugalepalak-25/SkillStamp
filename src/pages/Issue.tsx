import { FormEvent, useCallback, useEffect, useState } from "react";
import { isAddress } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { friendlyError, registry, isDeployed } from "../lib/contract";
import { CATEGORIES, MAX_POINTS, PRESETS, TYPES } from "../config/policy";
import { sha256Hex } from "../lib/utils";
import { Notice, Spinner, TxLink } from "../components/ui";
import { Link } from "react-router-dom";

type Tx = { state: "idle" | "pending" | "success" | "error"; msg?: string; hash?: string; id?: number };

export default function Issue() {
  const w = useWallet();
  const [isIssuer, setIsIssuer] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [f, setF] = useState({ recipient: "", title: "", preset: 1, type: 0, category: 0, description: "", skills: "", evidenceText: "", points: 10 });
  const [evidenceHash, setEvidenceHash] = useState("");
  const [tx, setTx] = useState<Tx>({ state: "idle" });
  const [revId, setRevId] = useState("");
  const [revTx, setRevTx] = useState<Tx>({ state: "idle" });
  const [issuerAddr, setIssuerAddr] = useState("");
  const [adminTx, setAdminTx] = useState<Tx>({ state: "idle" });

  const loadRole = useCallback(async () => {
    if (!w.address || !isDeployed) return;
    const c = registry();
    setIsIssuer(await c.isIssuer(w.address));
    setIsOwner((await c.owner()).toLowerCase() === w.address.toLowerCase());
  }, [w.address]);
  useEffect(() => { loadRole().catch(() => setIsIssuer(null)); }, [loadRole]);

  const run = async (set: (t: Tx) => void, fn: () => Promise<Partial<Tx>>) => {
    if (!w.onSepolia) { set({ state: "error", msg: "Switch MetaMask to Sepolia first." }); return; }
    set({ state: "pending", msg: "Confirm in MetaMask, then wait for the block…" });
    try { set({ state: "success", ...(await fn()) }); }
    catch (e) { set({ state: "error", msg: friendlyError(e) }); }
  };

  const pickPreset = (i: number) => { const p = PRESETS[i]; setF({ ...f, preset: i, type: p.type, category: p.category, points: p.points, title: f.title || p.label }); };
  const hashFile = async (file?: File) => { if (file) setEvidenceHash(await sha256Hex(await file.arrayBuffer())); };
  const hashText = async () => { if (f.evidenceText.trim()) setEvidenceHash(await sha256Hex(f.evidenceText.trim())); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAddress(f.recipient)) return setTx({ state: "error", msg: "Recipient is not a valid address." });
    if (!f.title.trim() || new TextEncoder().encode(f.title).length > 80) return setTx({ state: "error", msg: "Title is required (max 80 bytes)." });
    if (new TextEncoder().encode(f.skills).length > 120) return setTx({ state: "error", msg: "Skills text too long (max 120 bytes)." });
    if (!/^0x[0-9a-f]{64}$/.test(evidenceHash)) return setTx({ state: "error", msg: "Provide evidence (file or text) and compute its hash." });
    if (!Number.isInteger(f.points) || f.points < 1 || f.points > MAX_POINTS) return setTx({ state: "error", msg: `Points must be 1–${MAX_POINTS}.` });
    const descHash = await sha256Hex(f.description.trim() || f.title.trim());
    await run(setTx, async () => {
      const c = registry(await w.getSigner());
      const sent = await c.issueCredential(f.recipient, f.title.trim(), f.type, f.category, descHash, evidenceHash, f.skills.trim(), f.points);
      const receipt = await sent.wait();
      let id: number | undefined;
      for (const log of receipt.logs) {
        try { const p = c.interface.parseLog(log); if (p?.name === "CredentialIssued") id = Number(p.args.credentialId); } catch { /* not ours */ }
      }
      return { hash: receipt.hash, id, msg: "Credential issued." };
    });
  };

  if (!w.address) return <Notice kind="info">Connect the issuer wallet first. <button className="underline" onClick={w.connect}>Connect</button></Notice>;
  if (!isDeployed) return <Notice kind="warn">Deploy the contract to Sepolia first (see README).</Notice>;
  if (isIssuer === null) return <Spinner text="Checking issuer status…" />;
  // Frontend check is for usability only; the contract enforces authorization.
  if (!isIssuer) return <Notice kind="warn">This wallet is not an authorized issuer. Ask the contract owner to authorize it.</Notice>;

  const result = (t: Tx) => t.state === "idle" ? null : t.state === "pending" ? <Spinner text={t.msg ?? ""} /> : (
    <Notice kind={t.state === "success" ? "success" : "error"}>
      {t.msg} {t.hash && <>Tx: <TxLink hash={t.hash} /></>} {t.id !== undefined && <> Credential ID <Link className="underline" to={`/verify/${t.id}`}>{t.id}</Link>.</>}
    </Notice>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-3xl">Issue a credential</h1>
        <p className="text-sm text-muted">Do not enter names, student IDs, grades or private data. Only hashes and short labels go on a public chain.</p>
        <div><label className="label" htmlFor="r">Recipient wallet</label><input id="r" className="input" value={f.recipient} onChange={(e) => setF({ ...f, recipient: e.target.value })} placeholder="0x…" /></div>
        <div><label className="label" htmlFor="p">Scoring preset</label>
          <select id="p" className="input" value={f.preset} onChange={(e) => pickPreset(Number(e.target.value))}>
            {PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label} ({p.points} pts)</option>)}
          </select></div>
        <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Solidity Workshop Completed" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label" htmlFor="ty">Type</label><select id="ty" className="input" value={f.type} onChange={(e) => setF({ ...f, type: Number(e.target.value) })}>{TYPES.map((t, i) => <option key={t} value={i}>{t}</option>)}</select></div>
          <div><label className="label" htmlFor="ca">Category</label><select id="ca" className="input" value={f.category} onChange={(e) => setF({ ...f, category: Number(e.target.value) })}>{CATEGORIES.map((t, i) => <option key={t} value={i}>{t}</option>)}</select></div>
          <div><label className="label" htmlFor="pt">Points</label><input id="pt" type="number" min={1} max={MAX_POINTS} className="input" value={f.points} onChange={(e) => setF({ ...f, points: Number(e.target.value) })} /></div>
        </div>
        <div><label className="label" htmlFor="d">Description (hashed; the text stays off-chain)</label><textarea id="d" className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><label className="label" htmlFor="s">Skills (comma-separated)</label><input id="s" className="input" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="Solidity, Smart Contracts" /></div>
        <div className="card space-y-2">
          <p className="label">Evidence (SHA-256 computed in your browser; the file is not uploaded)</p>
          <input type="file" onChange={(e) => hashFile(e.target.files?.[0])} aria-label="Evidence file" />
          <textarea className="input" rows={2} placeholder="…or paste canonical evidence text" value={f.evidenceText} onChange={(e) => setF({ ...f, evidenceText: e.target.value })} />
          <button type="button" className="btn-ghost" onClick={hashText}>Hash text</button>
          <p className="break-all font-mono text-xs">{evidenceHash || "No hash yet"}</p>
        </div>
        <button className="btn" type="submit" disabled={tx.state === "pending"}>Issue on Sepolia</button>
        {result(tx)}
      </form>

      <section className="space-y-3">
        <h2 className="text-2xl">Revoke a credential</h2>
        <div className="flex gap-2"><input className="input" placeholder="Credential ID" value={revId} onChange={(e) => setRevId(e.target.value)} aria-label="Credential ID to revoke" />
          <button className="btn" disabled={revTx.state === "pending" || !/^\d+$/.test(revId)} onClick={() => {
            if (!window.confirm(`Revoke credential #${revId}? The record stays on-chain but is marked revoked.`)) return;
            run(setRevTx, async () => { const sent = await registry(await w.getSigner()).revokeCredential(BigInt(revId)); const r = await sent.wait(); return { hash: r.hash, id: Number(revId), msg: "Credential revoked." }; });
          }}>Revoke</button></div>
        {result(revTx)}
      </section>

      {isOwner && (
        <section className="space-y-3">
          <h2 className="text-2xl">Manage issuers (owner only)</h2>
          <input className="input" placeholder="Issuer wallet 0x…" value={issuerAddr} onChange={(e) => setIssuerAddr(e.target.value)} aria-label="Issuer address" />
          <div className="flex gap-2">
            {[true, false].map((on) => (
              <button key={String(on)} className={on ? "btn" : "btn-ghost"} disabled={!isAddress(issuerAddr) || adminTx.state === "pending"}
                onClick={() => run(setAdminTx, async () => { const r = await (await registry(await w.getSigner()).setIssuer(issuerAddr, on)).wait(); return { hash: r.hash, msg: on ? "Issuer authorized." : "Issuer removed." }; })}>
                {on ? "Authorize" : "Remove"}
              </button>
            ))}
          </div>
          {result(adminTx)}
        </section>
      )}
    </div>
  );
}
