export type Language = "python" | "go" | "typescript" | "clojure";

export type Environment = "sandbox" | "staging" | "production";

export type DoraEventType =
  | "deploy"
  | "failure"
  | "recovery"
  | "pr_merged";

export interface DoraEvent {
  work_id: string;
  service: string;
  language: Language;
  event_type: DoraEventType;
  timestamp: string;
  environment: Environment;
  commit_sha: string;
  lead_time_seconds?: number;
}

export interface PipelineConfig {
  service: string;
  language: Language;
  workIdPattern: RegExp;
  environments: Environment[];
  testCommand: string;
}