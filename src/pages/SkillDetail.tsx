import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Notice } from "../components/ui";
type Skill = { name: string; note: string; addedAt: string };
export default function SkillDetail() {
  const { skill: param } = useParams(); const name = decodeURIComponent(param || "");
  const [skill, setSkill] = useState<Skill | null>(null);
  useEffect(() => { try { const all: Skill[] = JSON.parse(localStorage.getItem("ss_self_declared_skills") || "[]"); setSkill(all.find(s=>s.name.toLowerCase()===name.toLowerCase()) || null); } catch { setSkill(null); } }, [name]);
  return <div className="mx-auto max-w-2xl space-y-4"><Link className="text-sm underline" to="/skills">← All skills</Link>{!skill ? <Notice kind="info">This self-declared skill was not found in this browser.</Notice> : <div className="card space-y-3"><span className="rounded-full bg-sand px-2 py-1 text-xs">Self-declared · not verified</span><h1 className="text-3xl">{skill.name}</h1><p>{skill.note || "No experience notes provided."}</p><p className="text-xs text-muted">Added {new Date(skill.addedAt).toLocaleDateString()}. To obtain a verified credential, complete an achievement and ask an authorized issuer to issue it.</p></div>}</div>;
}
