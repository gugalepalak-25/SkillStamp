import { CAPS, CATEGORIES, SKILL_GROUPS, WEIGHTS } from "../config/policy";
import type { Credential } from "../types";

export function computeScore(creds: Credential[]) {
  const active = creds.filter((c) => !c.revoked);
  const perCategory = CATEGORIES.map((name, i) => {
    const items = active.filter((c) => c.category === i);
    const points = items.reduce((s, c) => s + c.points, 0);
    const normalized = Math.min(points / CAPS[i], 1) * 100;
    return { name, points, count: items.length, cap: CAPS[i], weight: WEIGHTS[i], normalized, contribution: normalized * WEIGHTS[i] };
  });
  return {
    perCategory,
    total: Math.round(perCategory.reduce((s, c) => s + c.contribution, 0)),
    activePoints: active.reduce((s, c) => s + c.points, 0),
    activeCount: active.length,
  };
}

/** Skills are verified ONLY if backed by at least one non-revoked credential. */
export function verifiedSkills(creds: Credential[]) {
  const map = new Map<string, Credential[]>();
  for (const c of creds) {
    for (const s of c.skills) {
      const key = s.toLowerCase();
      const entry = map.get(key) ?? [];
      entry.push(c);
      map.set(key, entry);
    }
  }
  return Array.from(map.entries()).map(([skill, evidence]) => ({
    skill,
    evidence,
    verified: evidence.some((e) => !e.revoked),
    group: Object.entries(SKILL_GROUPS).find(([, words]) => words.some((w) => skill.includes(w)))?.[0] ?? "Other",
  }));
}
