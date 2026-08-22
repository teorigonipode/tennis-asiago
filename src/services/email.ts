export type EmailEventType =
  | 'booking_created'
  | 'booking_cancelled'
  | 'change_requested'
  | 'booking_changed'
  | 'manual_resend';

interface TriggerEmailParams {
  booking_id: string;
  event_type: EmailEventType;
  email_proof?: string;
  change_request_id?: string;
}

export type EmailTriggerResult =
  | {
      ok: true;
      status: 'processed' | 'sent' | 'failed' | 'skipped';
      sent?: number;
      failed?: number;
      skipped?: number;
    }
  | {
      ok: false;
      reason:
        | 'invalid_request'
        | 'network'
        | 'cors'
        | 'gateway'
        | 'unauthorized'
        | 'booking_not_found'
        | 'function'
        | 'provider'
        | 'unknown';
    };

const TIMEOUT_MS = 15000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeLog(value: unknown): string {
  return String(value ?? '').replace(/[^\w\s-]/g, '').slice(0, 100);
}

export async function triggerBookingEmail(params: TriggerEmailParams): Promise<EmailTriggerResult> {
  if (!params.booking_id || !UUID_RE.test(params.booking_id)) {
    return { ok: false, reason: 'invalid_request' };
  }
  if (!params.event_type) {
    return { ok: false, reason: 'invalid_request' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-email`;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        booking_id: params.booking_id,
        event_type: params.event_type,
        email_proof: params.email_proof,
        change_request_id: params.change_request_id,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (import.meta.env.DEV) {
      console.log('[email]', sanitizeLog(params.event_type), 'HTTP', response.status);
    }

    if (response.status === 403) return { ok: false, reason: 'unauthorized' };
    if (response.status === 404) return { ok: false, reason: 'booking_not_found' };
    if (response.status === 503) return { ok: false, reason: 'gateway' };
    if (response.status === 429) return { ok: false, reason: 'provider' };

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.warn('[email] non-OK status', response.status);
      }
      return { ok: false, reason: 'function' };
    }

    const data = await response.json() as {
      status?: string;
      sent?: number;
      failed?: number;
      skipped?: number;
      processed?: number;
    };

    if (import.meta.env.DEV) {
      console.log('[email] result', sanitizeLog(data.status), 'sent', data.sent ?? 0, 'failed', data.failed ?? 0, 'skipped', data.skipped ?? 0);
    }

    return {
      ok: true,
      status: 'processed',
      sent: data.sent ?? 0,
      failed: data.failed ?? 0,
      skipped: data.skipped ?? 0,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, reason: 'network' };
    }
    if (import.meta.env.DEV) {
      console.warn('[email] error', sanitizeLog(err));
    }
    return { ok: false, reason: 'unknown' };
  }
}
