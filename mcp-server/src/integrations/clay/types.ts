/**
 * Clay Integration Types
 * Type definitions and interfaces for Clay webhook integration
 */

export interface ClayCredentials {
  api_key: string;
  webhook_url?: string;      // URL для отправки данных В Clay
  callback_url?: string;     // URL куда Clay отправит результат
}

export interface WebhookPayload {
  [key: string]: unknown;
}

export interface ConfigureOptions {
  api_key?: string;
  webhook_url?: string;
  callback_url?: string;
}

export interface ConfigureResult {
  success: boolean;
  message: string;
}

export interface StatusResult {
  configured: boolean;
  has_webhook: boolean;
  has_callback: boolean;
  webhook_url?: string;
  instructions?: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export interface EnrichPersonInput {
  linkedin_url?: string;
  name?: string;
  email?: string;
  company?: string;
  [key: string]: unknown;
}

export interface EnrichPersonResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface BatchResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

export interface CallbackResult {
  success: boolean;
  id: string;
}

export interface ResultEntry {
  id: string;
  received_at: string;
}

// Re-export all types for convenience
export type {
  ClayCredentials,
  WebhookPayload,
  ConfigureOptions,
  ConfigureResult,
  StatusResult,
  SendResult,
  EnrichPersonInput,
  EnrichPersonResult,
  BatchResult,
  CallbackResult
};
