import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// ============================================================
// CORS: only allow known origins
// ============================================================
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = [
    "https://tennis-asiago.vercel.app",
    "http://localhost:5173",
  ];
  if (allowed.includes(origin)) return true;
  if (/^https:\/\/tennis-asiago-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin!;
  }
  return headers;
}

// ============================================================
// Config
// ============================================================
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const BOOKING_ADMIN_EMAIL = Deno.env.get("BOOKING_ADMIN_EMAIL") || "";
const EMAIL_TEST_RECIPIENT = Deno.env.get("EMAIL_TEST_RECIPIENT") || "";
const BOOKING_EMAIL_FROM = Deno.env.get("BOOKING_EMAIL_FROM") || "onboarding@resend.dev";
const RESEND_URL = "https://api.resend.com/emails";

type EventType = "booking_created" | "booking_cancelled" | "change_requested" | "booking_changed" | "manual_resend";

interface EmailRequest {
  booking_id: string;
  event_type: EventType;
  email_proof?: string;
  change_request_id?: string;
}

interface EmailJob {
  id: string;
  booking_id: string;
  change_request_id: string | null;
  template_type: string;
  recipient_type: string;
  recipient_email: string | null;
  status: string;
  retry_count: number;
}

// ============================================================
// Structured logging (no PII)
// ============================================================
function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  const allowed = ["booking_id", "event_type", "count", "processed", "sent", "failed", "skipped", "error_category"];
  const safe: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) safe[key] = fields[key];
  }
  console.log(JSON.stringify({ event, ...safe }));
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function categorizeResendError(status: number, body: string): string {
  if (status === 422) {
    if (/domain|verified|from_address|from address/i.test(body)) return "domain_not_verified";
    if (/validation|invalid/i.test(body)) return "validation_error";
    return "validation_error";
  }
  if (status === 401 || status === 403) return "invalid_api_key";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "provider_error";
  if (/restricted|recipient/i.test(body)) return "restricted_recipient";
  return `provider_error_${status}`;
}

function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Unknown error";
  return msg.replace(/key[^;\s]+/gi, "[redacted]").slice(0, 200);
}

function formatItalianDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

// ============================================================
// Supabase client (service role)
// ============================================================
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ============================================================
// Data access
// ============================================================
interface BookingData {
  id: string;
  public_code: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  courts: { name: string } | null;
}

async function fetchBooking(bookingId: string): Promise<BookingData | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, public_code, customer_name, customer_email, customer_phone, customer_notes,
      booking_date, start_time, end_time, status, courts(name)
    `)
    .eq("id", bookingId)
    .single();
  if (error || !data) return null;
  return data as unknown as BookingData;
}

interface ChangeRequestData {
  id: string;
  booking_id: string;
  requested_date: string | null;
  requested_start_time: string | null;
  customer_notes: string | null;
  courts: { name: string } | null;
}

async function fetchChangeRequest(requestId: string): Promise<ChangeRequestData | null> {
  const { data, error } = await supabase
    .from("booking_change_requests")
    .select(`id, booking_id, requested_date, requested_start_time, customer_notes, courts(name)`)
    .eq("id", requestId)
    .single();
  if (error || !data) return null;
  return data as unknown as ChangeRequestData;
}

async function verifyAdminFromHeader(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  return profile?.role === "admin";
}

// ============================================================
// Email job processing
// ============================================================
async function claimPendingJobs(bookingId: string, templateTypes: string[]): Promise<EmailJob[]> {
  const { data, error } = await supabase.rpc("claim_email_jobs", {
    p_booking_id: bookingId,
    p_template_types: templateTypes,
  });

  if (error || !data) return [];
  return data as unknown as EmailJob[];
}

async function updateJobStatus(
  jobId: string,
  status: "sent" | "failed" | "skipped",
  providerMessageId?: string,
  errorMsg?: string
): Promise<void> {
  const { error } = await supabase.rpc("update_email_job_status", {
    p_job_id: jobId,
    p_status: status,
    p_provider_message_id: providerMessageId ?? null,
    p_last_error: errorMsg ?? null,
  });
  if (error) {
    console.error("Failed to update job status:", sanitizeError(error));
  }
}

function resolveRecipient(job: EmailJob): string {
  // 1. EMAIL_TEST_RECIPIENT overrides all destinations (test mode)
  if (EMAIL_TEST_RECIPIENT && EMAIL_TEST_RECIPIENT.trim() !== "") {
    return EMAIL_TEST_RECIPIENT.trim();
  }
  // 2. Job recipient_email
  if (job.recipient_email && job.recipient_email.trim() !== "") {
    return job.recipient_email.trim();
  }
  // 3. BOOKING_ADMIN_EMAIL for admin-type jobs
  if (job.recipient_type === "admin" && BOOKING_ADMIN_EMAIL) {
    return BOOKING_ADMIN_EMAIL.trim();
  }
  // 4. Skipped
  return "";
}

async function sendSingleEmail(
  job: EmailJob,
  booking: BookingData,
  changeReq: ChangeRequestData | null
): Promise<{ sent: boolean; skipped: boolean; error: string | null }> {
  const recipientEmail = resolveRecipient(job);

  if (!recipientEmail || recipientEmail.trim() === "") {
    await updateJobStatus(job.id, "skipped");
    return { sent: false, skipped: true, error: null };
  }

  const subject = buildSubject(job.template_type);
  const html = buildHtml(job.template_type, booking, changeReq);

  try {
    const resendResponse = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: BOOKING_EMAIL_FROM,
        to: recipientEmail,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      const category = categorizeResendError(resendResponse.status, errText);
      logEvent("email_send_failed", { booking_id: booking.id, error_category: category });
      await updateJobStatus(job.id, "failed", undefined, category);
      return { sent: false, skipped: false, error: category };
    }

    const responseData = await resendResponse.json();
    const messageId = responseData?.id ?? null;
    await updateJobStatus(job.id, "sent", messageId ?? undefined);
    return { sent: true, skipped: false, error: null };
  } catch {
    const category = "network_error";
    logEvent("email_send_failed", { booking_id: booking.id, error_category: category });
    await updateJobStatus(job.id, "failed", undefined, category);
    return { sent: false, skipped: false, error: category };
  }
}

// ============================================================
// Email templates
// ============================================================
function buildSubject(template: string): string {
  const subjects: Record<string, string> = {
    booking_confirmation: "Conferma prenotazione — Tennis Asiago",
    booking_notification: "Nuova prenotazione ricevuta — Tennis Asiago",
    cancellation_confirmation: "Prenotazione annullata — Tennis Asiago",
    cancellation_notification: "Prenotazione annullata da un cliente — Tennis Asiago",
    change_request_confirmation: "Richiesta di modifica ricevuta — Tennis Asiago",
    change_request_notification: "Nuova richiesta di modifica — Tennis Asiago",
    change_completed_notification: "Modifica prenotazione completata — Tennis Asiago",
    manual_resend: "Aggiornamento prenotazione — Tennis Asiago",
  };
  return subjects[template] ?? "Tennis Asiago";
}

function buildHtml(template: string, booking: BookingData, changeReq?: ChangeRequestData | null): string {
  const courtName = escapeHtml(booking.courts?.name ?? "—");
  const dateStr = escapeHtml(formatItalianDate(booking.booking_date));
  const timeStr = `${escapeHtml(formatTime(booking.start_time))}–${escapeHtml(formatTime(booking.end_time))}`;
  const publicCode = escapeHtml(booking.public_code ?? "");
  const customerName = escapeHtml(booking.customer_name ?? "");
  const customerPhone = escapeHtml(booking.customer_phone ?? "");
  const customerEmail = escapeHtml(booking.customer_email ?? "");
  const customerNotes = escapeHtml(booking.customer_notes ?? "");

  const baseInfo = `
    <p><strong>Campo:</strong> ${courtName}</p>
    <p><strong>Data:</strong> ${dateStr}</p>
    <p><strong>Orario:</strong> ${timeStr}</p>
    <p><strong>Codice prenotazione:</strong> ${publicCode}</p>
  `;

  let body = "";

  switch (template) {
    case "booking_confirmation":
      body = `
        <h2>Prenotazione confermata!</h2>
        <p>La tua prenotazione è stata registrata con successo.</p>
        ${baseInfo}
        <p>Conserva il codice prenotazione e l'email usata per gestire la prenotazione su <a href="https://tennis-asiago.vercel.app/gestione-prenotazione">tennis-asiago.vercel.app/gestione-prenotazione</a>.</p>
      `;
      break;
    case "booking_notification":
      body = `
        <h2>Nuova prenotazione</h2>
        <p>È stata ricevuta una nuova prenotazione.</p>
        ${baseInfo}
        <p><strong>Cliente:</strong> ${customerName}</p>
        <p><strong>Telefono:</strong> ${customerPhone}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        ${customerNotes ? `<p><strong>Note:</strong> ${customerNotes}</p>` : ""}
      `;
      break;
    case "cancellation_confirmation":
      body = `
        <h2>Prenotazione annullata</h2>
        <p>La tua prenotazione è stata annullata con successo.</p>
        ${baseInfo}
      `;
      break;
    case "cancellation_notification":
      body = `
        <h2>Prenotazione annullata dal cliente</h2>
        <p>Un cliente ha annullato la propria prenotazione.</p>
        ${baseInfo}
        <p><strong>Cliente:</strong> ${customerName}</p>
      `;
      break;
    case "change_request_confirmation":
      body = `
        <h2>Richiesta di modifica ricevuta</h2>
        <p>Abbiamo ricevuto la tua richiesta di modifica. Il circolo ti contatterà per confermare.</p>
        <p><strong>Prenotazione attuale:</strong></p>
        ${baseInfo}
        ${changeReq?.requested_date ? `<p><strong>Data richiesta:</strong> ${escapeHtml(formatItalianDate(changeReq.requested_date))}</p>` : ""}
        ${changeReq?.requested_start_time ? `<p><strong>Orario richiesto:</strong> ${escapeHtml(formatTime(changeReq.requested_start_time))}</p>` : ""}
        ${changeReq?.courts?.name ? `<p><strong>Campo richiesto:</strong> ${escapeHtml(changeReq.courts.name)}</p>` : ""}
        ${changeReq?.customer_notes ? `<p><strong>Note:</strong> ${escapeHtml(changeReq.customer_notes)}</p>` : ""}
        <p style="font-size:13px;color:#8a7e6b;">La prenotazione attuale non è stata modificata automaticamente.</p>
      `;
      break;
    case "change_request_notification":
      body = `
        <h2>Nuova richiesta di modifica</h2>
        <p>Un cliente ha inviato una richiesta di modifica.</p>
        ${baseInfo}
        <p><strong>Cliente:</strong> ${customerName}</p>
        ${changeReq?.requested_date ? `<p><strong>Data richiesta:</strong> ${escapeHtml(formatItalianDate(changeReq.requested_date))}</p>` : ""}
        ${changeReq?.requested_start_time ? `<p><strong>Orario richiesto:</strong> ${escapeHtml(formatTime(changeReq.requested_start_time))}</p>` : ""}
        ${changeReq?.courts?.name ? `<p><strong>Campo richiesto:</strong> ${escapeHtml(changeReq.courts.name)}</p>` : ""}
        ${changeReq?.customer_notes ? `<p><strong>Note:</strong> ${escapeHtml(changeReq.customer_notes)}</p>` : ""}
      `;
      break;
    case "change_completed_notification":
      body = `
        <h2>Modifica prenotazione completata</h2>
        <p>La tua prenotazione è stata modificata dal circolo.</p>
        ${baseInfo}
      `;
      break;
    default:
      body = `
        <h2>Aggiornamento prenotazione</h2>
        <p>Riepilogo della tua prenotazione.</p>
        ${baseInfo}
      `;
  }

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a3a2a;">
      <div style="background: #1a3a2a; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Tennis Asiago</h1>
      </div>
      <div style="padding: 30px; background: #f9f7f2;">
        ${body}
        <hr style="border: none; border-top: 1px solid #e0ddd5; margin: 30px 0;">
        <p style="font-size: 12px; color: #8a7e6b;">
          Tennis Asiago — Parco Millepini, Asiago (VI)<br>
          Per gestire la tua prenotazione: tennis-asiago.vercel.app/gestione-prenotazione
        </p>
      </div>
    </div>
  `;
}

// ============================================================
// Main handler
// ============================================================
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 503, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const body: EmailRequest = await req.json();
    const { booking_id, event_type, email_proof, change_request_id } = body;

    if (!booking_id || !event_type) {
      logEvent("email_request_invalid", { event_type: event_type ?? null });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    logEvent("email_processing_started", { booking_id, event_type });

    const booking = await fetchBooking(booking_id);
    if (!booking) {
      logEvent("email_request_invalid", { booking_id, event_type });
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const isAdminEvent = event_type === "manual_resend" || event_type === "booking_changed";

    if (isAdminEvent) {
      const authHeader = req.headers.get("Authorization");
      if (!(await verifyAdminFromHeader(authHeader))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
        );
      }
    }

    let templateTypes: string[] = [];
    let changeReq: ChangeRequestData | null = null;

    switch (event_type) {
      case "booking_created":
        templateTypes = ["booking_confirmation", "booking_notification"];
        break;
      case "booking_cancelled":
        if (!email_proof || email_proof.toLowerCase().trim() !== (booking.customer_email ?? "").toLowerCase().trim()) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
          );
        }
        templateTypes = ["cancellation_confirmation", "cancellation_notification"];
        break;
      case "change_requested":
        if (!email_proof || email_proof.toLowerCase().trim() !== (booking.customer_email ?? "").toLowerCase().trim()) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
          );
        }
        if (change_request_id) {
          changeReq = await fetchChangeRequest(change_request_id);
        }
        templateTypes = ["change_request_confirmation", "change_request_notification"];
        break;
      case "booking_changed":
        templateTypes = ["change_completed_notification"];
        break;
      case "manual_resend": {
        templateTypes = booking.status === "cancelled"
          ? ["cancellation_confirmation"]
          : ["booking_confirmation"];
        break;
      }
      default:
        logEvent("email_request_invalid", { booking_id, event_type });
        return new Response(
          JSON.stringify({ error: "Unknown event type" }),
          { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
        );
    }

    const jobs = await claimPendingJobs(booking_id, templateTypes);
    logEvent("email_jobs_claimed", { booking_id, event_type, count: jobs.length });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      const result = await sendSingleEmail(job, booking, changeReq);
      if (result.sent) sent++;
      else if (result.skipped) skipped++;
      else failed++;
    }

    logEvent("email_processing_completed", { booking_id, event_type, processed: jobs.length, sent, failed, skipped });

    return new Response(
      JSON.stringify({
        status: "processed",
        processed: jobs.length,
        sent,
        failed,
        skipped,
      }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  } catch (err) {
    logEvent("email_processing_failed", { error_category: sanitizeError(err) });
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
