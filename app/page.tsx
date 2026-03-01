import { getSession } from "@/lib/auth";
import Link from "next/link";
import { Rocky } from "@/components/mascot/Rocky";

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 bg-transparent font-sans">
        <div className="w-full max-w-md text-center card-soft p-10 bg-white/70 backdrop-blur-md">
          <div className="mx-auto mb-6 flex justify-center">
            <Rocky mood="happy" className="scale-110" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-800">
            Rocky Companion
          </h1>
          <p className="mt-2 text-base text-slate-500 font-medium">
            Your monitoring dashboard is ready.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-[#d1fae5] px-6 py-3 text-sm font-semibold text-[#065f46] transition-all hover:bg-[#a7f3d0] active:scale-[0.98] card-hover shadow-sm"
            >
              Open Dashboard
            </Link>
            <Link
              href="/simulate"
              className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] card-hover"
            >
              Simulation Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent font-sans">
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl">
          <div className="text-center">
            <div className="mx-auto mb-8 flex justify-center">
              <Rocky mood="happy" className="scale-125" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-800 sm:text-5xl">
              Rocky Companion
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-slate-500 font-medium">
              Wearable sensors detect distress. AI analyzes what happened.
              You get a clear, calm alert with exactly what to do.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/auth/signup"
                className="w-full rounded-2xl bg-[#e0f2fe] px-8 py-3.5 text-base font-semibold text-[#075985] transition-all hover:bg-[#bae6fd] active:scale-[0.98] sm:w-auto card-hover shadow-sm"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] sm:w-auto card-hover"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "Heart Rate Monitoring", color: "bg-[#ffe4e6] text-[#9f1239] border-[#fecdd3]" },
              { label: "Fall Detection", color: "bg-[#fef08a] text-[#854d0e] border-[#fde047]" },
              { label: "Audio Analysis", color: "bg-[#f3e8ff] text-[#581c87] border-[#e9d5ff]" },
              { label: "AI-Powered Insights", color: "bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]" },
            ].map((feature) => (
              <span
                key={feature.label}
                className={`inline-flex items-center rounded-2xl border-2 px-4 py-2 text-sm font-semibold transition-transform hover:scale-105 ${feature.color}`}
              >
                {feature.label}
              </span>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Device Detects",
                desc: "Sensors softly capture heart rate spikes, falls, and audio anomalies in real time.",
              },
              {
                step: "02",
                title: "AI Analyzes",
                desc: "Gemini transcribes audio, rates severity, and summarizes what happened gently.",
              },
              {
                step: "03",
                title: "Parent Acts",
                desc: "You receive a clear alert with severity and step-by-step calming actions.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="card-soft p-8 bg-white/60 backdrop-blur-md border border-slate-100"
              >
                <span className="font-mono text-sm font-bold text-slate-400">
                  {item.step}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-800">
                  {item.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-500 font-medium">
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
