"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnalyzeButton({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/incidents/${incidentId}/analyze`, {
        method: "POST",
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-medium text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          "Run AI Analysis"
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
}
