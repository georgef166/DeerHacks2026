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
        className="rounded-xl bg-[#d1fae5] px-5 py-2.5 text-xs font-bold text-[#065f46] transition-all hover:bg-[#a7f3d0] active:scale-[0.97] disabled:opacity-50 card-hover shadow-sm"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#065f46] border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          "Run AI Analysis"
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>
      )}
    </div>
  );
}
