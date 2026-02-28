export interface SensorData {
  heart_rate?: {
    bpm: number;
    elevated: boolean;
    baseline: number;
  };
  accelerometer?: {
    fall_detected: boolean;
    magnitude_g?: number;
    axis?: string;
  };
  audio?: {
    level_db: number;
    anomaly: boolean;
    duration_sec?: number;
  };
}

export interface Incident {
  id: string;
  user_id: string;
  event_type: string;
  sensor_data: SensorData;
  audio_url: string | null;
  transcript: string | null;
  severity: string;
  summary: string | null;
  categories: string[];
  suggested_actions: string[];
  status: string;
  is_simulation: boolean;
  created_at: string;
}

export interface AnalysisResult {
  severity: string;
  summary: string;
  categories: string[];
  suggested_actions: string[];
  transcript: string;
}
