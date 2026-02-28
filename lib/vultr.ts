import type { AnalysisResult, SensorData } from "./types";

const VULTR_MODEL = "mistral";
const VULTR_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You are a child safety AI. Analyze sensor data and audio transcripts from a child's wearable device.

RULES:
- Consider time context: high heart rate during gym class is normal, at midnight is not.
- Consider activity: running/playing/sports = normal. Do NOT flag normal play.
- If profanity or aggression is in the transcript, assess whether the child is the target.

Respond with ONLY a JSON object (no markdown, no extra text):
{"severity":"low|medium|high|critical","summary":"2-3 sentences","categories":["from: bullying,distress,conflict,physical_safety,medical,environmental,false_positive,normal"],"suggested_actions":["3-4 actions"]}`;

function getTemporalContext(): string {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hour = now.getHours();

  let period = "night";
  if (hour >= 6 && hour < 12) period = "morning";
  else if (hour >= 12 && hour < 17) period = "afternoon";
  else if (hour >= 17 && hour < 21) period = "evening";

  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
  const schoolContext = isWeekday && hour >= 8 && hour < 15
    ? "Child is likely at school."
    : isWeekday && hour >= 15 && hour < 18
      ? "After-school hours."
      : "";

  return `${days[now.getDay()]} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${period}). ${isWeekday ? "Weekday" : "Weekend"}. ${schoolContext}`.trim();
}

export async function analyzeWithVultr(
  eventType: string,
  sensorData: SensorData,
  transcript?: string,
  patternNotes?: string
): Promise<AnalysisResult> {
  const ollamaUrl = process.env.VULTR_OLLAMA_URL;

  if (!ollamaUrl) {
    throw new Error("VULTR_OLLAMA_URL is not configured.");
  }

  const temporal = getTemporalContext();

  let prompt = `Time: ${temporal}\nEvent: ${eventType}\nSensors: ${JSON.stringify(sensorData)}`;

  if (patternNotes) {
    prompt += `\nPatterns: ${patternNotes}`;
  }

  if (transcript) {
    prompt += `\nTranscript: "${transcript}"`;
  } else {
    prompt += `\nNo audio captured.`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VULTR_TIMEOUT_MS);

  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VULTR_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 300,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Vultr Ollama error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[vultr] Response was not valid JSON:", text.slice(0, 300));
      throw new Error("Vultr model returned an invalid response format");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      severity: parsed.severity ?? "medium",
      summary: parsed.summary ?? "Analysis completed.",
      categories: Array.isArray(parsed.categories) ? parsed.categories : ["distress"],
      suggested_actions: Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions : ["Check on your child."],
    } as AnalysisResult;
  } finally {
    clearTimeout(timeout);
  }
}
