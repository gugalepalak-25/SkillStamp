export const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Only allow http(s) links from untrusted sources. */
export const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : "#");
