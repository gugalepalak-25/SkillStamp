import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLeaderboard, isDeployed } from "../lib/contract";
import { Notice, Skeleton } from "../components/ui";
import { short } from "../lib/utils";

type Data = Awaited<ReturnType<typeof fetchLeaderboard>>;
export default function Leaderboard() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (isDeployed) fetchLeaderboard().then(setD).catch((e) => setErr(e.shortMessage ?? e.message)); }, []);
  if (!isDeployed) return <Notice kind="warn">No contract configured.</Notice>;
  if (err) return <Notice kind="error">Could not read the contract: {err}</Notice>;
  if (!d) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Achievement leaderboard</h1>
      <p className="text-sm text-muted">Ranked by active (non-revoked) points. Ties share a rank and are ordered by address. Reads up to 200 wallets directly from the contract;
        a production version would use an event indexer. Points follow an illustrative policy, not a measure of student quality.</p>
      {d.truncated && <Notice kind="warn">Showing the first 200 of {d.total} wallets.</Notice>}
      {d.rows.length === 0 ? <Notice kind="info">No credentials have been issued yet.</Notice> : (
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b border-sand text-muted"><th className="py-2">Rank</th><th>Wallet</th><th>Credentials</th><th>Points</th></tr></thead>
          <tbody>{d.rows.map((r) => (
            <tr key={r.address} className="border-b border-sand"><td className="py-2">{r.rank}</td>
              <td><Link className="underline" to={`/passport/${r.address}`}>{short(r.address)}</Link></td><td>{r.count}</td><td>{r.points}</td></tr>))}
          </tbody></table></div>)}
    </div>
  );
}
