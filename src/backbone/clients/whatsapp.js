// WhatsApp connector — dispatches an already-APPROVED voice-note action to
// a real phone. This is the only client in the backbone that can cause an
// irreversible side effect (a message landing on a real client's phone), so
// it is never called from the pipeline itself: only the explicit
// `node src/cli.js send <action-id>` command invokes it, and only after
// `node src/cli.js approve <action-id>` recorded a human decision. See the
// README / docs/gradium-voice-note-plan.md "what's missing" section for the
// real onboarding gaps before this can safely go live.
//
// Base API is Meta's official WhatsApp Cloud API (graph.facebook.com) —
// that part is public, stable documentation, unlike Sillage/Mantiks/
// Gradium's endpoints which were genuinely unconfirmed this session. What
// is still missing for HireSweet specifically is listed where this client
// is wired in (src/cli.js) and in the chat/README summary.
const DEFAULT_BASE = 'https://graph.facebook.com/v21.0';

export function createWhatsAppClient() {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const base = process.env.WHATSAPP_API_BASE || DEFAULT_BASE;
  const live = Boolean(token && phoneNumberId);

  return {
    name: 'whatsapp',
    mode: live ? 'live' : 'fixtures',

    // { toPhone, audioUrl, caption } -> { sent, messageId? , reason? }.
    // Never throws — a failed send is reported, not a crash.
    async sendVoiceNote({ toPhone, audioUrl, caption }) {
      if (!toPhone) return { sent: false, reason: 'no destination phone number' };
      if (!live) {
        return {
          sent: false,
          reason: 'fixtures mode — WHATSAPP_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set, nothing actually sent',
          wouldSendTo: toPhone,
          audioUrl,
        };
      }
      try {
        // Step 1: upload the media. NOTE: `audioUrl` must be a public,
        // Meta-fetchable URL — Gradium's fixtures placeholder
        // (fixtures://gradium/...) is not one; see "what's missing".
        const mediaResponse = await fetch(`${base}/${phoneNumberId}/media`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', type: 'audio', link: audioUrl }),
        });
        if (!mediaResponse.ok) {
          return { sent: false, reason: `media upload failed: HTTP ${mediaResponse.status}` };
        }
        const { id: mediaId } = await mediaResponse.json();

        // Step 2: send the audio message. NOTE (to verify before going
        // live): business-initiated audio outside an open 24h customer
        // service window normally requires a pre-approved message
        // template, and template header components may not accept
        // freeform audio the way an in-session message does — see
        // "what's missing".
        const messageResponse = await fetch(`${base}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: toPhone,
            type: 'audio',
            audio: { id: mediaId },
          }),
        });
        if (!messageResponse.ok) {
          return { sent: false, reason: `message send failed: HTTP ${messageResponse.status}` };
        }
        const json = await messageResponse.json();
        return { sent: true, messageId: json.messages?.[0]?.id ?? null, caption };
      } catch (error) {
        return { sent: false, reason: `network error: ${error.message}` };
      }
    },
  };
}
