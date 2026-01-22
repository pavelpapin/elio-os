/**
 * Calendar Event Verifier
 * Validates calendar event was created via Google Calendar API
 */

import { getEvent } from '../../../integrations/calendar/api.js';
import type { VerifyConfig, VerifyResult } from '../types.js';

/**
 * Verify calendar event was created successfully
 */
export async function verifyCalendarEvent(config: VerifyConfig): Promise<VerifyResult> {
  const eventId = config.eventId;
  const calendarId = config.calendarId || 'primary';

  if (!eventId) {
    return {
      ok: true,
      details: { note: 'No eventId provided, skipping verification' }
    };
  }

  try {
    const event = await getEvent(calendarId, eventId);

    if (!event) {
      return {
        ok: false,
        error: `Calendar event not found: ${eventId}`
      };
    }

    // Check event status
    if (event.status === 'cancelled') {
      return {
        ok: false,
        error: `Calendar event ${eventId} was cancelled`,
        details: { status: event.status }
      };
    }

    return {
      ok: true,
      url: event.htmlLink,
      details: {
        eventId: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        status: event.status,
        location: event.location,
        attendees: event.attendees
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: `Calendar verification failed: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
