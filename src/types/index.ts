export interface Credential {
  id: number;
  recipient: string;
  issuer: string;
  title: string;
  achievementType: number;
  category: number;
  descriptionHash: string;
  evidenceHash: string;
  skills: string[];
  points: number;
  issuedAt: number;
  revoked: boolean;
  revokedAt: number;
  revokedBy: string;
}

export type Status = "valid" | "revoked" | "not_found" | "unavailable";

export interface Opportunity {
  id: string;
  title: string;
  category: string;
  provider: string;
  description: string;
  location: string;
  date: string;
  price: string;
  level: string;
  url: string;
  checkedAt: string;
  whyRecommended: string;
  source: "live-search" | "curated-evergreen";
}

export type PlanStatus = "saved" | "planned" | "in_progress" | "completed";
export interface SavedItem { opp: Opportunity; status: PlanStatus; savedAt: string; evidenceHash?: string }
