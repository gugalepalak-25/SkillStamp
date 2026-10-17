import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/ui";
type Skill = { name: string; note: string; addedAt: string };
const KEY = "ss_self_declared_skills";
export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [name, setName] = useState(""); const [note, setNote] = useState("");
  useEffect(() => { try { setSkills(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setSkills([]); } }, []);
  function save(next: Skill[]) { setSkills(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  function add(e: FormEvent) { e.preventDefault(); const n = name.trim(); if (!n || skills.some(s=>s.name.toLowerCase()===n.toLowerCase())) return; save([...skills, { name:n, note:note.trim(), addedAt:new Date().toISOString() }]); setName(""); setNote(""); }
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-3xl">My Skills</h1><p className="text-sm text-muted">Keep your claimed skills separate from on-chain credentials.</p></div>
    <Notice kind="warn"><b>Self-declared is not verified.</b> These skills are stored in this browser only and do not affect your on-chain Growth Score or leaderboard.</Notice>
    <form className="card space-y-3" onSubmit={add}><div><label className="label" htmlFor="skill">Skill name</label><input className="input" id="skill" value={name} onChange={e=>setName(e.target.value)} required maxLength={80} placeholder="e.g. JavaScript"/></div><div><label className="label" htmlFor="note">Experience or evidence notes (optional)</label><textarea className="input" id="note" value={note} onChange={e=>setNote(e.target.value)} maxLength={500}/></div><button className="btn">Add self-declared skill</button></form>
    {skills.length===0 ? <p className="text-sm text-muted">No self-declared skills yet.</p> : <ul className="grid gap-3 sm:grid-cols-2">{skills.map(s=><li className="card space-y-2" key={s.name}><div className="flex items-start justify-between gap-2"><Link className="font-semibold underline" to={`/skills/${encodeURIComponent(s.name)}`}>{s.name}</Link><span className="rounded-full bg-sand px-2 py-1 text-xs">Self-declared</span></div><p className="text-sm text-muted">{s.note || "No notes added."}</p><button className="text-sm underline" onClick={()=>save(skills.filter(x=>x.name!==s.name))}>Remove</button></li>)}</ul>}
    <Link className="text-sm underline" to="/dashboard">Back to passport</Link>
  </div>;
}
