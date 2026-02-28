"use client";

import { useState } from "react";
import { SimulationPanel } from "./SimulationPanel";
import { MonitoringPanel } from "./MonitoringPanel";

const TABS = [
  {
    id: "monitor",
    label: "Live Monitoring",
    description:
      "Continuous heart rate tracking and rolling audio capture with automatic incident detection.",
  },
  {
    id: "simulate",
    label: "Simulation Studio",
    description:
      "Record audio or run sensor scenarios. Every incident flows through the full AI analysis pipeline.",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SimulationTabs() {
  const [active, setActive] = useState<TabId>("monitor");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                active === t.id
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <h1 className="text-xl font-semibold text-zinc-100">{tab.label}</h1>
          <p className="mt-1 text-sm text-zinc-500">{tab.description}</p>
        </div>
      </div>

      {active === "monitor" && <MonitoringPanel />}
      {active === "simulate" && <SimulationPanel />}
    </>
  );
}
