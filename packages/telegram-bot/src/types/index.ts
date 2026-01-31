/**
 * Type definitions for Elio Bot
 */

export interface WhitelistUser {
  id: number;
  name: string;
  role: string;
}

export interface TelegramConfig {
  whitelist_enabled: boolean;
  whitelist: WhitelistUser[];
  max_message_length: number;
  typing_interval_ms: number;
}

export interface BrainConfig {
  cli_path: string;
  default_max_turns: number;
  timeout_seconds: number;
}

export interface PathsConfig {
  workspace: string;
}

export interface ElioConfig {
  telegram: TelegramConfig;
  brain: BrainConfig;
  paths: PathsConfig;
}

export interface ClaudeResult {
  sessionId: string | null;
  response: string;
  code: number;
  error: string | null;
}
