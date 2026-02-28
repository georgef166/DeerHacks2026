/**
 * Fast keyword pre-filter for audio transcripts.
 * Runs in <1ms — used to gate whether a transcript needs LLM analysis.
 * Only transcripts that pass this filter get sent to Vultr/Gemini.
 */

const DISTRESS_PHRASES = [
  "help me",
  "leave me alone",
  "stop it",
  "let me go",
  "get away",
  "get off me",
  "don't touch me",
  "i'm scared",
  "i'm afraid",
  "please stop",
  "someone help",
  "call the police",
  "call 911",
  "you're hurting",
  "that hurts",
  "it hurts",
  "ow stop",
  "no don't",
  "no please",
  "shut up",
  "i hate you",
  "i'll kill",
  "kill you",
  "kill myself",
  "want to die",
  "wanna die",
  "give it back",
  "that's mine",
  "go away",
  "back off",
  "i can't breathe",
  "can't breathe",
];

const DISTRESS_WORDS = [
  "help",
  "stop",
  "hurt",
  "hurting",
  "hitting",
  "punching",
  "kicking",
  "slapping",
  "choking",
  "bleeding",
  "screaming",
  "crying",
  "bully",
  "bullying",
  "bullied",
  "fight",
  "fighting",
  "weapon",
  "knife",
  "gun",
  "blood",
  "die",
  "dying",
  "dead",
  "kill",
  "kidnap",
  "kidnapping",
  "stranger",
  "danger",
  "emergency",
  "ambulance",
  "attack",
  "attacked",
  "abuse",
  "abusing",
  "molest",
  "threat",
  "threatening",
  "scared",
  "terrified",
  "panic",
  "assault",
];

const PROFANITY = [
  "fuck",
  "shit",
  "bitch",
  "ass",
  "damn",
  "bastard",
  "crap",
  "dick",
  "piss",
  "whore",
  "slut",
  "hell",
  "cunt",
  "retard",
  "faggot",
  "nigger",
  "nigga",
];

export interface FilterResult {
  flagged: boolean;
  score: number;
  matched_phrases: string[];
  matched_words: string[];
  has_profanity: boolean;
}

export function filterTranscript(transcript: string): FilterResult {
  const text = transcript.toLowerCase().trim();

  if (!text || text.length < 3) {
    return { flagged: false, score: 0, matched_phrases: [], matched_words: [], has_profanity: false };
  }

  const matched_phrases: string[] = [];
  const matched_words: string[] = [];
  let has_profanity = false;
  let score = 0;

  for (const phrase of DISTRESS_PHRASES) {
    if (text.includes(phrase)) {
      matched_phrases.push(phrase);
      score += 3;
    }
  }

  const words = text.replace(/[^\w\s]/g, " ").split(/\s+/);
  const wordSet = new Set(words);

  for (const word of DISTRESS_WORDS) {
    if (wordSet.has(word)) {
      matched_words.push(word);
      score += 2;
    }
  }

  for (const word of PROFANITY) {
    if (wordSet.has(word) || text.includes(word)) {
      has_profanity = true;
      score += 1;
      break;
    }
  }

  const THRESHOLD = 2;
  const flagged = score >= THRESHOLD;

  return { flagged, score, matched_phrases, matched_words, has_profanity };
}
