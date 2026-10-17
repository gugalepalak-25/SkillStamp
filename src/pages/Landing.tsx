import { Link } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";

export default function Landing() {
  const w = useWallet();
  return (
    <div className="space-y-12">
      <section className="py-8">
        <p className="label">Quiet Proof</p>
        <h1 className="max-w-3xl text-5xl leading-tight">One passport for everything a student has actually done.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Workshops, hackathons, internships and projects are scattered across certificates and websites. SkillStamp records them as
          revocable, verifiable credentials on Ethereum, then Opportunity Compass finds real next steps that build on them.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {w.address ? <Link className="btn" to="/dashboard">Open my passport</Link> : <button className="btn" onClick={w.connect}>Connect MetaMask</button>}
          <Link className="btn-ghost" to="/verify">Verify a credential</Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["The problem", "Achievements live in PDFs and platforms nobody can verify quickly, and revoked ones keep circulating."],
          ["Proof of Experience", "A skill shows as verified only when a valid, non-revoked credential from an authorized issuer backs it."],
          ["Opportunity Compass", "Live-sourced workshops, hackathons and courses, matched to your verified skills, with every source linked."],
        ].map(([t, d]) => <div key={t} className="card"><h2 className="text-xl">{t}</h2><p className="mt-2 text-sm text-muted">{d}</p></div>)}
      </section>
      <section className="card">
        <h2 className="text-xl">Trust and privacy</h2>
        <p className="mt-2 text-sm text-muted">
          Only wallet addresses, short titles, hashes and points go on-chain. No names, grades or documents. A hash proves a match with the hashed
          content, not that a document is authentic, and a valid credential proves what the issuer recorded, not that the issuer is honest.
        </p>
      </section>
    </div>
  );
}
