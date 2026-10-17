import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Compass, ExternalLink, MessageCircle, Send, X } from "lucide-react";
import { Notice } from "./ui";

type Message = { role: "user" | "assistant"; text: string };
const starters = [
  "Find blockchain workshops near me",
  "Which hackathons can I join this month?",
  "Recommend free beginner Solidity courses",
  "Help me plan a Web3 portfolio project",
];

/** A site-wide helper. Live listings are searched on /opportunities; this chat never invents event listings. */
export default function OpportunityCompass() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hi! I’m Opportunity Compass. I can help you choose what to learn next, prepare for hackathons, and plan portfolio projects. For current events and courses, I’ll guide you to source-linked discovery rather than guessing dates." }]);
  const navigate = useNavigate();

  async function send(e?: FormEvent, preset?: string) {
    e?.preventDefault();
    const question = (preset ?? input).trim();
    if (!question || busy) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assistant unavailable.");
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant unavailable. Please retry.");
    } finally { setBusy(false); }
  }

  return <>
    {open && <section className="fixed bottom-20 right-4 z-50 flex max-h-[min(75vh,620px)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-sand bg-ivory shadow-2xl" aria-label="Opportunity Compass assistant">
      <header className="flex items-center justify-between bg-forest px-4 py-3 text-ivory"><div className="flex items-center gap-2"><span className="rounded-full bg-sage p-2"><Bot size={17}/></span><div><h2 className="font-semibold">Opportunity Compass</h2><p className="text-xs opacity-80">Student learning companion</p></div></div><button onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18}/></button></header>
      <div className="space-y-3 overflow-y-auto p-3" aria-live="polite">
        {messages.map((m, i) => <div key={i} className={`whitespace-pre-wrap rounded-xl p-3 text-sm ${m.role === "user" ? "ml-8 bg-eucalyptus" : "mr-5 border border-sand bg-white"}`}>{m.text}</div>)}
        {busy && <p className="text-sm text-muted" role="status">Thinking…</p>}
        {error && <Notice kind="warn">{error} <button className="underline" onClick={() => send(undefined, messages.filter(m => m.role === "user")[messages.filter(m => m.role === "user").length - 1]?.text)}>Retry</button></Notice>}
        {messages.length === 1 && <div className="flex flex-wrap gap-2">{starters.map(s => <button key={s} className="rounded-full border border-sand px-3 py-2 text-left text-xs hover:bg-eucalyptus" onClick={() => send(undefined, s)}>{s}</button>)}</div>}
      </div>
      <div className="border-t border-sand p-3"><button className="mb-2 flex items-center gap-2 text-xs font-medium underline" onClick={() => { setOpen(false); navigate("/opportunities"); }}><Compass size={14}/> Find source-linked opportunities <ExternalLink size={12}/></button>
        <form className="flex gap-2" onSubmit={send}><input className="input min-w-0 flex-1" aria-label="Ask Opportunity Compass" maxLength={2000} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about skills, courses, hackathons…"/><button className="btn" disabled={busy || !input.trim()} aria-label="Send message"><Send size={15}/></button></form>
        <p className="mt-2 text-[11px] text-muted">AI suggestions are guidance, not verified credentials. Never share wallet secrets.</p>
      </div>
    </section>}
    <button className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-forest px-4 py-3 text-sm text-ivory shadow-lg" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? "Close Opportunity Compass" : "Open Opportunity Compass"}>{open ? <X size={16}/> : <MessageCircle size={16}/>} Compass</button>
  </>;
}
