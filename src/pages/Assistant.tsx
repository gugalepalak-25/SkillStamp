import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/ui";

type Roadmap = { goal: string; level: string; weeks: number; plan: { week: number; title: string; task: string }[] };
export default function Assistant() {
  const [goal, setGoal] = useState("Learn Solidity and build a smart contract project");
  const [level, setLevel] = useState("beginner");
  const [weeks, setWeeks] = useState(4);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function generate(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await fetch("/api/roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, level, weeks }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setRoadmap(d); }
    catch (e) { setError((e as Error).message || "Could not generate roadmap."); } finally { setBusy(false); }
  }
  async function ask(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setReply("");
    try { const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setReply(d.reply); }
    catch (e) { setError((e as Error).message || "Assistant unavailable."); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-6">
    <div><h1 className="text-3xl">Learning Assistant</h1><p className="text-sm text-muted">Plan learning in small steps. Roadmaps are rule-generated; chat requires an optional server-side AI key. Neither creates verified credentials.</p></div>
    {error && <Notice kind="warn">{error}</Notice>}
    <section className="card space-y-4"><h2 className="text-xl">Roadmap generator</h2>
      <form className="space-y-3" onSubmit={generate}>
        <label className="label" htmlFor="goal">Learning goal</label><input id="goal" className="input" value={goal} onChange={e=>setGoal(e.target.value)} required maxLength={120}/>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="level">Current level</label><select id="level" className="input" value={level} onChange={e=>setLevel(e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
        <div><label className="label" htmlFor="weeks">Duration (weeks)</label><input id="weeks" className="input" type="number" min={1} max={12} value={weeks} onChange={e=>setWeeks(Number(e.target.value))}/></div></div>
        <button className="btn" disabled={busy}>Generate roadmap</button>
      </form>
      {roadmap && <div className="space-y-3"><h3 className="font-semibold">{roadmap.goal} · {roadmap.weeks} weeks</h3>{roadmap.plan.map(p=><div className="rounded-lg border border-sand p-3" key={p.week}><b>Week {p.week}: {p.title}</b><p className="text-sm">{p.task}</p></div>)}</div>}
    </section>
    <section className="card space-y-3"><h2 className="text-xl">Ask the AI assistant</h2><form className="space-y-3" onSubmit={ask}><label className="label" htmlFor="question">Question</label><textarea id="question" className="input min-h-24" value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} required placeholder="How should I structure my first Solidity project?"/><button className="btn" disabled={busy}>Ask assistant</button></form>{reply && <div className="whitespace-pre-wrap rounded-lg bg-eucalyptus p-4 text-sm">{reply}</div>}<p className="text-xs text-muted">Do not share seed phrases, private keys, or sensitive information. Configure OPENAI_API_KEY on the server to enable chat.</p></section>
    <Link className="underline text-sm" to="/skills">Manage your self-declared skills →</Link>
  </div>;
}
