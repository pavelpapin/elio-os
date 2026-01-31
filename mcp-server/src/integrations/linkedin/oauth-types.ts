/**
 * LinkedIn OAuth 2.0 - Types and Configuration
 */

export const CREDENTIALS_PATH = '/root/.claude/secrets/linkedin.json'
export const TOKENS_PATH = '/root/.claude/secrets/linkedin-tokens.json'

export interface LinkedInCredentials {
  client_id: string
  client_secret: string
  redirect_uri: string
}

export interface LinkedInTokens {
  access_token: string
  expires_at: number
  refresh_token?: string
}

export interface LinkedInApiProfile {
  id: string
  firstName: string
  lastName: string
  name: string
  email?: string
  picture?: string
  locale?: string
}

export interface LinkedInUserInfoResponse {
  sub: string
  given_name: string
  family_name: string
  name: string
  email?: string
  picture?: string
  locale?: string
}

export interface LinkedInTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
}
