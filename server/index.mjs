import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(__dirname, "data", "store.json");
const EVIDENCE_DIR = path.join(__dirname, "data", "evidence");
const EVIDENCE_STORE = path.join(__dirname, "data", "evidence-submissions.json");

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const evidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, EVIDENCE_DIR),
    filename: (_req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error("Only PDF, JPEG, PNG, and WebP files are allowed."));
  },
});
const PORT = Number(process.env.PORT || 8787);
const KEY = process.env.TAVILY_API_KEY; // server-side only
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const challenges = new Map();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error("Origin not allowed by CORS")); } }));
app.use(express.json({ limit: "200kb" }));
// Lightweight per-process protection for the demo API; use a shared store/API gateway in production.
const rateBuckets = new Map();
app.use("/api", (req, res, next) => {
  const key = req.ip || "unknown"; const now = Date.now(); const bucket = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1; rateBuckets.set(key, bucket);
  if (bucket.count > 60) return res.status(429).json({ error: "Too many requests. Please wait a minute and retry." });
  next();
});

// Official URLs known to exist; shown ONLY when live search is unavailable.
export const EVERGREEN = [
  { title: "Solidity documentation", url: "https://docs.soliditylang.org", provider: "Solidity team", category: "course", description: "Official language documentation.", level: "all" },
  { title: "Ethereum developer docs", url: "https://ethereum.org/en/developers/", provider: "ethereum.org", category: "course", description: "Official learning paths and tutorials for Ethereum developers.", level: "beginner" },
  { title: "CryptoZombies", url: "https://cryptozombies.io", provider: "Loom Network", category: "course", description: "Interactive Solidity tutorial.", level: "beginner" },
  { title: "Hardhat documentation", url: "https://hardhat.org/docs", provider: "Nomic Foundation", category: "course", description: "Tooling used to compile, test and deploy contracts.", level: "beginner" },
  { title: "ETHGlobal events", url: "https://ethglobal.com/events", provider: "ETHGlobal", category: "hackathon", description: "Listing of Ethereum hackathons (check the page for current dates).", level: "all" },
];

const NS = "Not specified";
const clean = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

export function buildQueries({ city, interest, level, categories, freeOnly, onlineOnly }) {
  const year = new Date().getFullYear();
  const where = onlineOnly || !city ? "online" : city;
  const free = freeOnly ? "free" : "";
  const map = {
    workshop: `${interest} workshop meetup ${where} ${year}`,
    hackathon: `${interest} hackathon ${where} ${year} register`,
    course: `${level} ${interest} course ${free}`,
    internship: `${interest} internship student ${where} ${year}`,
    community: `${interest} student community open source ${where}`,
  };
  return categories.filter((c) => map[c]).map((c) => ({ category: c, q: clean(map[c], 200) }));
}

export function why({ interest, verifiedSkills, level, category }) {
  const have = (verifiedSkills || []).slice(0, 3);
  const base = have.length
    ? `You have verified credentials for ${have.join(", ")}. This ${category} relates to "${interest}" and could add practical evidence at ${level} level.`
    : `You asked about "${interest}" at ${level} level. You have no verified skills yet, so this is based only on your stated interest.`;
  return base;
}

export function dedupe(items) {
  const seen = new Set();
  return items.filter((o) => {
    try { const u = new URL(o.url); if (!["http:", "https:"].includes(u.protocol)) return false;
      const k = u.hostname + u.pathname; if (seen.has(k)) return false; seen.add(k); return true;
    } catch { return false; }
  });
}

export function makeRoadmap({ goal = "Blockchain development", level = "beginner", weeks = 4 } = {}) {
  const n = Math.max(1, Math.min(12, Number(weeks) || 4));
  const stages = [
    ["Foundations", "Review core concepts and terminology; write a short summary."],
    ["Guided practice", "Follow an official tutorial and reproduce a small example."],
    ["Build", "Create a small project related to your goal and document decisions."],
    ["Evidence & review", "Test the project, write a README, and ask a peer or mentor for feedback."]
  ];
  return { goal: clean(goal, 120), level: ["beginner", "intermediate", "advanced"].includes(level) ? level : "beginner",
    weeks: n, plan: Array.from({ length: n }, (_, i) => ({ week: i + 1, title: stages[Math.min(3, Math.floor(i * 4 / n))][0],
      task: stages[Math.min(3, Math.floor(i * 4 / n))][1] })) };
}

export async function verifySignedMessage(address, message, signature) {
  const { verifyMessage, getAddress } = await import("ethers");
  try { return getAddress(verifyMessage(message, signature)) === getAddress(address); } catch { return false; }
}

function validate(b) {
  const arr = (x, n) => (Array.isArray(x) ? x.slice(0, n).map((s) => clean(s, 60)).filter(Boolean) : []);
  return {
    city: clean(b.city, 80), interest: clean(b.interest, 80),
    level: ["beginner", "intermediate", "advanced"].includes(b.level) ? b.level : "beginner",
    categories: arr(b.categories, 5), freeOnly: !!b.freeOnly, onlineOnly: !!b.onlineOnly, verifiedSkills: arr(b.verifiedSkills, 10),
  };
}

app.get("/api/health", (_q, r) => r.json({ ok: true, liveSearch: !!KEY }));

app.post("/api/opportunities", async (req, res) => {
  const p = validate(req.body || {});
  if (!p.interest) return res.status(400).json({ error: "Interest is required." });
  const checkedAt = new Date().toISOString();
  if (!KEY) {
    return res.json({ live: false, note: "Live opportunity discovery is unavailable (no TAVILY_API_KEY configured on the server).",
      results: EVERGREEN.map((e) => ({ id: crypto.createHash("sha1").update(e.url).digest("hex").slice(0, 12), ...e, location: "Online", date: NS, price: NS, checkedAt, source: "curated-evergreen", whyRecommended: why({ ...p, category: e.category }) })) });
  }
  try {
    const jobs = buildQueries(p).map(async ({ category, q }) => {
      const r = await fetch("https://api.tavily.com/search", { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ query: q, max_results: 5, search_depth: "basic" }), signal: AbortSignal.timeout(12_000) });
      if (!r.ok) throw new Error(`search provider returned ${r.status}`);
      const d = await r.json();
      return (d.results || []).filter((x) => /^https?:\/\//.test(x.url)).map((x) => ({
        id: crypto.createHash("sha1").update(x.url).digest("hex").slice(0, 12),
        title: clean(x.title, 140), category, provider: host(x.url), description: clean(x.content, 280),
        location: p.onlineOnly ? "Online (per search query)" : NS, date: NS, price: NS, level: p.level, url: x.url, checkedAt,
        source: "live-search", whyRecommended: why({ ...p, category }),
      }));
    });
    const results = dedupe((await Promise.all(jobs)).flat());
    res.json({ live: true, results });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "Live search failed. Please retry shortly." });
  }
});

// ---- Saved opportunities / learning plan (off-chain, JSON file) ----
const readStore = () => { try { return JSON.parse(fs.readFileSync(STORE, "utf8")); } catch { return {}; } };
const ADDR = /^0x[a-fA-F0-9]{40}$/;
app.get("/api/auth/challenge/:address", (req, res) => {
  if (!ADDR.test(req.params.address)) return res.status(400).json({ error: "Invalid address" });
  const address = req.params.address.toLowerCase();
  const nonce = crypto.randomBytes(24).toString("hex");
  const message = `SkillStamp saved-plan access\\nWallet: ${address}\\nNonce: ${nonce}\\nThis signature authenticates this request only; it does not send a transaction.`;
  challenges.set(address, { message, expires: Date.now() + 5 * 60 * 1000 });
  res.json({ message });
});
async function authenticate(req, res, next) {
  const address = req.params.address?.toLowerCase();
  const signature = req.get("x-wallet-signature");
  const challenge = challenges.get(address);
  if (!ADDR.test(address || "") || !signature || !challenge || challenge.expires < Date.now()) {
    return res.status(401).json({ error: "Wallet signature required. Request a fresh challenge and sign it in your wallet." });
  }
  const valid = await verifySignedMessage(address, challenge.message, signature);
  challenges.delete(address);
  if (!valid) return res.status(401).json({ error: "Wallet signature is invalid or expired." });
  next();
}

function readEvidenceStore() {
  try {
    return JSON.parse(fs.readFileSync(EVIDENCE_STORE, "utf8"));
  } catch {
    return [];
  }
}

function writeEvidenceStore(items) {
  fs.mkdirSync(path.dirname(EVIDENCE_STORE), { recursive: true });
  fs.writeFileSync(EVIDENCE_STORE, JSON.stringify(items, null, 2), {
    mode: 0o600,
  });
}

app.post(
  "/api/evidence/:address",
  authenticate,
  (req, res, next) => evidenceUpload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  }),
  (req, res) => {
    const address = req.params.address.toLowerCase();
    const title = clean(req.body?.title, 120);
    const organization = clean(req.body?.organization, 120);
    const date = clean(req.body?.date, 20);
    const description = clean(req.body?.description, 500);

    if (!req.file) {
      return res.status(400).json({ error: "Choose a PDF or image first." });
    }

    if (!title || !organization) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "Certificate title and issuing organization are required.",
      });
    }

    const fileHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(req.file.path))
      .digest("hex");

    const submission = {
      id: crypto.randomUUID(),
      wallet: address,
      title,
      organization,
      date,
      description,
      storedName: req.file.filename,
      originalName: path.basename(req.file.originalname).slice(0, 180),
      mimeType: req.file.mimetype,
      size: req.file.size,
      sha256: fileHash,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    const items = readEvidenceStore();
    items.push(submission);
    writeEvidenceStore(items);

    res.status(201).json({
      message: "Evidence submitted for review. It is not yet verified.",
      submission: {
        id: submission.id,
        title: submission.title,
        status: submission.status,
        sha256: submission.sha256,
        submittedAt: submission.submittedAt,
      },
    });
  }
);

app.get("/api/evidence/:address", authenticate, (req, res) => {
  const address = req.params.address.toLowerCase();
  const submissions = readEvidenceStore()
    .filter((item) => item.wallet === address)
    .map(({ storedName, ...item }) => item);

  res.json({ submissions });
});
app.get("/api/store/:address", authenticate, (req, res) => {
  res.json(readStore()[req.params.address.toLowerCase()] ?? { saved: {} });
});
app.put("/api/store/:address", authenticate, (req, res) => {
  const saved = req.body?.saved;
  if (typeof saved !== "object" || saved === null || Array.isArray(saved) || Object.keys(saved).length > 200) return res.status(400).json({ error: "Invalid body" });
  for (const [id, item] of Object.entries(saved)) {
    if (!/^[a-f0-9]{1,40}$/i.test(id) || !item || typeof item !== "object" ||
        !item.opp || typeof item.opp.title !== "string" || typeof item.opp.url !== "string" ||
        !/^https?:\/\//i.test(item.opp.url) || !["saved", "planned", "in_progress", "completed"].includes(item.status)) {
      return res.status(400).json({ error: "Invalid saved plan item" });
    }
  }
  const store = readStore();
  store[req.params.address.toLowerCase()] = { saved };
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(store, null, 2));
  res.json({ ok: true });
});

app.post("/api/roadmap", (req, res) => {
  const { goal, level, weeks } = req.body || {};
  if (!clean(goal, 120)) return res.status(400).json({ error: "A learning goal is required." });
  res.json(makeRoadmap({ goal, level, weeks }));
});

app.post("/api/assistant", async (req, res) => {
  const message = clean(req.body?.message, 2000);
  if (!message) return res.status(400).json({ error: "Enter a question first." });
  if (!OPENAI_API_KEY) return res.status(503).json({ error: "AI chat needs OPENAI_API_KEY configured on the server. The roadmap generator works without it." });
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: OPENAI_MODEL, temperature: 0.3, messages: [
        { role: "system", content: "You are SkillStamp's learning assistant. Give practical, concise education and career guidance. Never claim a skill is verified unless an on-chain credential confirms it. Do not request private keys, seed phrases, or sensitive personal data. For current workshops, hackathons, internships, and courses, do not invent event names, dates, prices, deadlines, or URLs; direct the student to SkillStamp Opportunity Compass live search at /opportunities when source-backed results are needed. Distinguish your general advice from verified on-chain credentials and external search results." },
        { role: "user", content: message }
      ] }), signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "No response returned." });
  } catch (error) { console.error(error); res.status(502).json({ error: "AI assistant is temporarily unavailable. Please retry." }); }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => console.log(`SkillStamp server on :${PORT} (live search ${KEY ? "ON" : "OFF"})`));
}
