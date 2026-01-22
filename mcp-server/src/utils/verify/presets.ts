/**
 * Verification Presets
 * Common verification configurations for different deliverable types
 */

import type { VerifyConfig } from './types.js';

export const VERIFY_PRESETS = {
  /**
   * Deep research report - comprehensive Notion page
   */
  deepResearchReport: (pageId: string): VerifyConfig => ({
    type: 'notion_page',
    pageId,
    minBlocks: 15,
    requiredHeadings: [
      'Executive Summary',
      'Компании',
      'Recommendations'
    ]
  }),

  /**
   * Meeting preparation document
   */
  meetingPrep: (pageId: string): VerifyConfig => ({
    type: 'notion_page',
    pageId,
    minBlocks: 5,
    requiredHeadings: [
      'About',
      'Talking Points'
    ]
  }),

  /**
   * Email draft file
   */
  emailDraft: (filePath: string): VerifyConfig => ({
    type: 'file',
    filePath,
    minSize: 100,
    containsText: ['Subject:', 'Body:']
  }),

  /**
   * Research file with sources
   */
  researchFile: (filePath: string): VerifyConfig => ({
    type: 'file',
    filePath,
    minSize: 500,
    containsText: ['##', 'Sources']
  }),

  /**
   * CTO nightly report
   */
  ctoReport: (pageId: string): VerifyConfig => ({
    type: 'notion_page',
    pageId,
    minBlocks: 10,
    requiredHeadings: [
      'Summary',
      'Code Quality',
      'Recommendations'
    ]
  }),

  /**
   * CPO analysis document
   */
  cpoAnalysis: (pageId: string): VerifyConfig => ({
    type: 'notion_page',
    pageId,
    minBlocks: 8,
    requiredHeadings: [
      'Product Health',
      'User Feedback',
      'Improvements'
    ]
  }),

  /**
   * Sent email verification
   */
  emailSent: (messageId: string, recipientEmail?: string): VerifyConfig => ({
    type: 'email_sent',
    messageId,
    recipientEmail
  }),

  /**
   * Calendar event verification
   */
  calendarEvent: (eventId: string, calendarId = 'primary'): VerifyConfig => ({
    type: 'calendar_event',
    eventId,
    calendarId
  })
};
