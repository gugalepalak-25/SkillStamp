// Transparent scoring policy. Points are stored in each credential at issuance.
// Illustrative values only, not a universal measure of student quality.
export const CATEGORIES = ["Academic", "Technical", "Leadership", "Community"] as const;
export const TYPES = [
  "Workshop", "Hackathon", "Internship", "Project",
  "Open-source", "Volunteering", "Mentoring", "Event organization",
] as const;

export interface Preset { label: string; type: number; category: number; points: number }
export const PRESETS: Preset[] = [
  { label: "Workshop attended", type: 0, category: 0, points: 5 },
  { label: "Workshop completed", type: 0, category: 0, points: 10 },
  { label: "Hackathon participation", type: 1, category: 1, points: 15 },
  { label: "Hackathon winner", type: 1, category: 1, points: 50 },
  { label: "Event organized", type: 7, category: 2, points: 30 },
  { label: "Mentoring", type: 6, category: 2, points: 25 },
  { label: "Open-source contribution", type: 4, category: 1, points: 20 },
  { label: "Verified project completed", type: 3, category: 1, points: 20 },
  { label: "Verified internship", type: 2, category: 1, points: 30 },
  { label: "Volunteering", type: 5, category: 3, points: 10 },
];

// Growth Score = sum over categories of weight * min(activePoints / cap, 1) * 100
export const WEIGHTS = [0.4, 0.3, 0.15, 0.15];
export const CAPS = [50, 100, 50, 50];
export const MAX_POINTS = 100;

export const SKILL_GROUPS: Record<string, string[]> = {
  Blockchain: ["solidity", "smart contracts", "ethereum", "web3", "hardhat", "blockchain"],
  Programming: ["python", "javascript", "typescript", "git", "c++", "java", "rust"],
  "Web Development": ["react", "html", "css", "frontend", "node", "web development"],
  "Data Analytics": ["data", "sql", "analytics", "machine learning", "ai"],
  Leadership: ["leadership", "mentoring", "organizing", "teamwork"],
  Communication: ["communication", "presentation", "writing"],
};
