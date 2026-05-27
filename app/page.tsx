"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type ActionItem = {
  person: string;
  task: string;
  deadline: string | null;
};

type SummarizeResult = {
  meetingType: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  topicsDiscussed: string[];
  riskFlags: string[];
  followUpNeeded: string[];
  formattedOutput: string;
};

type SavedSummary = {
  id: number;
  title: string;
  meetingType: string;
  format: string;
  rawInput: string;
  summary: string;
  actionItems: string;
  riskFlags: string;
  createdAt: string;
};

const FORMAT_OPTIONS = [
  { value: "detailed", label: "Detailed Summary" },
  { value: "email", label: "Email Follow-Up" },
  { value: "slack", label: "Slack Update" },
];

const FORMAT_LABELS: Record<string, string> = {
  detailed: "Summary",
  email: "Email",
  slack: "Slack",
};

const MEETING_TYPE_COLORS: Record<string, string> = {
  standup: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  strategy: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "client call": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "1-on-1": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  other: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function typeColor(type: string) {
  const key = type.toLowerCase();
  return MEETING_TYPE_COLORS[key] ?? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
}

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [format, setFormat] = useState("detailed");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummarizeResult | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [summaries, setSummaries] = useState<SavedSummary[]>([]);
  // Track current generation so a stale async save can't affect a newer result
  const genRef = useRef(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchSummaries = useCallback(async () => {
    const res = await fetch("/api/summaries");
    if (res.ok) setSummaries(await res.json());
  }, []);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  async function handleSummarize() {
    if (!transcript.trim()) return;
    const gen = ++genRef.current;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, format }),
      });
      const data = await res.json();
      if (genRef.current !== gen) return;
      if (!res.ok) throw new Error(data.error || "Failed to summarize");
      setResult(data);
    } catch (e) {
      if (genRef.current !== gen) return;
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      if (genRef.current === gen) setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    const gen = genRef.current;
    setSaving(true);
    const title = `${result.meetingType} — ${new Date().toLocaleDateString()}`;
    const actionItemsText = result.actionItems
      .map((a) => `${a.person}: ${a.task}${a.deadline ? ` (by ${a.deadline})` : ""}`)
      .join("\n");
    try {
      const res = await fetch("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          meetingType: result.meetingType,
          format,
          rawInput: transcript,
          summary: result.formattedOutput,
          actionItems: actionItemsText,
          riskFlags: result.riskFlags.join("\n"),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      // Only clear result if no new generation has started since this save began
      if (genRef.current === gen) setResult(null);
      fetchSummaries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      if (genRef.current === gen) setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/summaries?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSummaries((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-500/6 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-indigo-400/80 tracking-widest uppercase">Meeting Intelligence</span>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Turn transcripts into clarity
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">Paste raw notes or a recording transcript — get structured decisions, action items, and risk flags.</p>
        </header>

        {/* Input card */}
        <GlassCard className="mb-4">
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Transcript</label>
          <textarea
            className="w-full h-44 bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-sm text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            placeholder="Paste your meeting notes or transcript here…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-lg px-1 py-1">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    format === opt.value
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleSummarize}
              disabled={loading || !transcript.trim()}
              className="ml-auto flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Summarize
                </>
              )}
            </button>
          </div>
        </GlassCard>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <GlassCard className="mb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${typeColor(result.meetingType)}`}>
                  {result.meetingType}
                </span>
                <span className="text-xs text-gray-500">
                  {result.topicsDiscussed.length} topics · {result.actionItems.length} action items
                </span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-gray-400 hover:text-white hover:border-white/20 bg-white/[0.03] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? "Saving…" : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>

            <div className="space-y-6">
              {result.keyDecisions.length > 0 && (
                <ResultSection icon="✦" label="Key Decisions">
                  <ul className="space-y-1.5">
                    {result.keyDecisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </ResultSection>
              )}

              {result.actionItems.length > 0 && (
                <ResultSection icon="→" label="Action Items">
                  <div className="space-y-2">
                    {result.actionItems.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                        <span className="text-xs font-semibold text-indigo-400 min-w-[80px] mt-0.5 truncate">{a.person}</span>
                        <span className="text-sm text-gray-300 flex-1">{a.task}</span>
                        {a.deadline && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">by {a.deadline}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ResultSection>
              )}

              {result.topicsDiscussed.length > 0 && (
                <ResultSection icon="◈" label="Topics">
                  <div className="flex flex-wrap gap-2">
                    {result.topicsDiscussed.map((t, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md text-xs text-gray-400 bg-white/[0.04] border border-white/[0.07]">
                        {t}
                      </span>
                    ))}
                  </div>
                </ResultSection>
              )}

              {result.riskFlags.length > 0 && (
                <ResultSection icon="⚠" label="Risk Flags" labelClass="text-amber-400/70">
                  <div className="space-y-1.5">
                    {result.riskFlags.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                        <span className="text-sm text-amber-300/80">{r}</span>
                      </div>
                    ))}
                  </div>
                </ResultSection>
              )}

              {result.followUpNeeded.length > 0 && (
                <ResultSection icon="↻" label="Follow-Up Needed">
                  <ul className="space-y-1.5">
                    {result.followUpNeeded.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </ResultSection>
              )}

              {(format === "email" || format === "slack") && result.formattedOutput && (
                <ResultSection icon="✉" label={format === "email" ? "Email Draft" : "Slack Message"}>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 font-mono leading-relaxed">
                    {result.formattedOutput}
                  </pre>
                </ResultSection>
              )}
            </div>
          </GlassCard>
        )}

        {/* History */}
        {summaries.length > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">History</span>
              <span className="text-xs text-gray-600">{summaries.length} saved</span>
            </div>
            <div className="space-y-2">
              {summaries.map((s) => (
                <HistoryItem
                  key={s.id}
                  summary={s}
                  isExpanded={!!expanded[s.id]}
                  isDeleting={deleting === s.id}
                  onToggle={() => setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }))}
                  onDelete={() => handleDelete(s.id)}
                />
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function ResultSection({
  icon,
  label,
  labelClass = "text-gray-500",
  children,
}: {
  icon: string;
  label: string;
  labelClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest mb-2.5 ${labelClass}`}>
        <span className="opacity-60">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function HistoryItem({
  summary,
  isExpanded,
  isDeleting,
  onToggle,
  onDelete,
}: {
  summary: SavedSummary;
  isExpanded: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      {/* Row: expand zone + action buttons as siblings, never nested */}
      <div className="flex items-center hover:bg-white/[0.03] transition-colors">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 px-4 py-3 text-left min-w-0"
        >
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded border capitalize ${typeColor(summary.meetingType)}`}>
            {summary.meetingType}
          </span>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded border border-white/10 text-gray-500 bg-white/[0.03]">
            {FORMAT_LABELS[summary.format] ?? summary.format}
          </span>
          <span className="text-sm text-gray-300 truncate">{summary.title}</span>
        </button>
        <div className="flex items-center gap-3 shrink-0 px-4">
          <span className="text-xs text-gray-600 hidden sm:block">
            {new Date(summary.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? "…" : "Delete"}
          </button>
          <svg
            onClick={onToggle}
            className={`w-3.5 h-3.5 text-gray-600 transition-transform cursor-pointer ${isExpanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/[0.07] px-4 py-4 space-y-4">
          {summary.actionItems && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Action Items</p>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{summary.actionItems}</pre>
            </div>
          )}
          {summary.riskFlags && (
            <div>
              <p className="text-xs text-amber-500/60 uppercase tracking-widest mb-1.5">Risk Flags</p>
              <pre className="text-sm text-amber-300/70 whitespace-pre-wrap font-sans">{summary.riskFlags}</pre>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Summary</p>
            <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans leading-relaxed bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
              {summary.summary}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
