import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            SafeDay Companion
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Your monitoring dashboard is ready.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98]"
            >
              Open Dashboard
            </Link>
            <Link
              href="/simulate"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98]"
            >
              Simulation Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-3xl">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
              SafeDay Companion
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-zinc-400">
              Wearable sensors detect distress. AI analyzes what happened.
              You get a clear alert with exactly what to do.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/auth/signup"
                className="w-full rounded-lg bg-emerald-500 px-8 py-3 text-sm font-medium text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98] sm:w-auto"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-8 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98] sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
            {[
              "Heart Rate Monitoring",
              "Fall Detection",
              "Audio Analysis",
              "AI-Powered Insights",
            ].map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-zinc-400"
              >
                {label}
              </span>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-20 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Device Detects",
                desc: "Sensors capture heart rate spikes, falls, and audio anomalies in real time.",
              },
              {
                step: "02",
                title: "AI Analyzes",
                desc: "Gemini transcribes audio, rates severity, and summarizes what happened.",
              },
              {
                step: "03",
                title: "Parent Acts",
                desc: "You receive a clear alert with severity and step-by-step actions.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700/60 hover:bg-zinc-900/70"
              >
                <span className="font-mono text-xs text-zinc-600">
                  {item.step}
                </span>
                <h3 className="mt-2 text-sm font-medium text-zinc-200">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
