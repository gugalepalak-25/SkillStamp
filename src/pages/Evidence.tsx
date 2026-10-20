
import { FormEvent, useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { Notice } from "../components/ui";

const API = "";

export default function Evidence() {
  const w = useWallet();
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!w.address) {
      setError("Connect your wallet before submitting evidence.");
      return;
    }
    if (!file) {
      setError("Please choose a PDF or image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("The file must be 5 MB or smaller.");
      return;
    }

    setBusy(true);
    try {
      // Authenticate the request with a fresh wallet signature.
      const challengeResponse = await fetch(
        `${API}/api/auth/challenge/${w.address}`
      );
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) {
        throw new Error(challenge.error || "Could not authenticate wallet.");
      }

      const signer = await w.getSigner();
      const signature = await signer.signMessage(challenge.message);

      const form = new FormData();
      form.append("title", title);
      form.append("organization", organization);
      form.append("date", date);
      form.append("description", description);
      form.append("file", file);

      const response = await fetch(`${API}/api/evidence/${w.address}`, {
        method: "POST",
        headers: { "x-wallet-signature": signature },
        body: form,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Evidence submission failed.");
      }

      setMessage(
        `Submitted successfully. Status: Pending verification. Reference: ${result.submission.id}`
      );
      setTitle("");
      setOrganization("");
      setDate("");
      setDescription("");
      setFile(null);

      const input = document.getElementById("evidence-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit evidence."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl">Submit Evidence</h1>
        <p className="mt-2 text-sm text-muted">
          Submit a certificate or achievement document for review by an
          authorized issuer. Uploading evidence does not automatically verify
          a skill or award points.
        </p>
      </div>

      {!w.address && (
        <Notice kind="info">
          Connect your wallet using the button in the navigation bar first.
        </Notice>
      )}

      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="evidence-title">
            Certificate or achievement title
          </label>
          <input
            id="evidence-title"
            className="input"
            maxLength={120}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Blockchain Development Workshop"
          />
        </div>

        <div>
          <label className="label" htmlFor="evidence-org">
            Issuing organization
          </label>
          <input
            id="evidence-org"
            className="input"
            maxLength={120}
            required
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. College or training provider"
          />
        </div>

        <div>
          <label className="label" htmlFor="evidence-date">
            Issue date (optional)
          </label>
          <input
            id="evidence-date"
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="evidence-description">
            Additional details (optional)
          </label>
          <textarea
            id="evidence-description"
            className="input"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the achievement."
          />
        </div>

        <div>
          <label className="label" htmlFor="evidence-file">
            Certificate file (PDF, JPEG, PNG or WebP; maximum 5 MB)
          </label>
          <input
            id="evidence-file"
            className="input"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-2 text-xs text-muted">
            The file is stored off-chain on the development server, not on
            Ethereum. Submit only documents you are permitted to share.
          </p>
        </div>

        <button
          className="btn"
          type="submit"
          disabled={busy || !w.address}
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </form>

      <p className="text-sm text-muted">
        Workflow: submission → issuer review → authorized credential issuance
        → public verification.
      </p>
    </div>
  );
}
