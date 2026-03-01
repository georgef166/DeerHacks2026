import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisResult, SensorData } from "./types";

const SYSTEM_PROMPT = `You are a child safety monitoring AI. You analyze sensor data and transcribed audio from a wearable device carried by a child. Your job is to help parents understand what happened and what to do.

You will receive sensor readings and, if audio was captured, an accurate transcript produced by a dedicated speech-to-text engine. Base your analysis on the ACTUAL transcript provided — do NOT alter, summarise, or fabricate any words.

Respond with ONLY a valid JSON object (no markdown fences, no commentary) with these exact keys:
- "severity": one of "low", "medium", "high", "critical"
- "summary": 2-3 sentence plain-language summary of what likely happened
- "categories": array from ["bullying", "distress", "conflict", "physical_safety", "medical", "environmental", "false_positive", "normal"]
- "suggested_actions": array of 3-4 specific, empathetic actions the parent should take`;

const MAX_RETRIES = 3;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelay(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/retry in ([\d.]+)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000);
  return null;
}

export async function analyzeIncident(
  eventType: string,
  sensorData: SensorData,
  transcript?: string
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to .env.local to enable real analysis."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let prompt = `Event type: ${eventType}\nSensor readings: ${JSON.stringify(sensorData, null, 2)}`;

  if (transcript) {
    prompt += `\n\nTranscript of captured audio:\n"""\n${transcript}\n"""`;
    prompt += `\n\nAnalyze the transcript and sensor data together for child safety concerns. Consider the language, tone, and context of what was said.`;
  } else {
    prompt += `\n\nNo audio was captured for this event. Analyze based on sensor data only.`;
  }

  const request = {
    contents: [{ role: "user" as const, parts: [{ text: prompt }] }],
    systemInstruction: SYSTEM_PROMPT,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(request);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[gemini] Response was not valid JSON:", text);
        throw new Error("Gemini returned an invalid response format");
      }

      return JSON.parse(jsonMatch[0]) as AnalysisResult;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota");

      if (!isRateLimit) throw err;

      const retryMs = parseRetryDelay(err) ?? (attempt + 1) * 15_000;
      console.log(
        `[gemini] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(retryMs / 1000)}s...`
      );
      await sleep(retryMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini analysis failed after retries");
}
