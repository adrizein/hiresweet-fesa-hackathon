// Slack connector — the actual dispatch path for a Gradium voice note,
// chosen over WhatsApp's direct Meta Cloud API (see
// src/backbone/clients/whatsapp.js, parked: real onboarding gaps — Meta
// Business setup, template/session rules, opt-in). Posting to Slack is
// already-integrated infrastructure, so the "send" step here posts the
// ready-to-use script + audio link into an internal Slack channel; a human
// then forwards it to the client's WhatsApp themselves. Same fail-closed
// discipline as every other client: never called by the pipeline itself,
// only by the explicit `node src/cli.js send <action-id>` command, and only
// after `approve`.
const BASE_URL = 'https://slack.com/api';

export function createSlackClient() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;
  const live = Boolean(token && channelId);

  return {
    name: 'slack',
    mode: live ? 'live' : 'fixtures',

    // { company, contact, message, audioUrl, durationSeconds } -> { posted, ts?, reason? }.
    // Never throws.
    async postVoiceNote({ company, contact, message, audioUrl, durationSeconds }) {
      if (!live) {
        return {
          posted: false,
          reason: 'fixtures mode — SLACK_BOT_TOKEN/SLACK_CHANNEL_ID not set, nothing actually posted',
        };
      }
      const text = [
        `🎙️ Voice note ready for *${company}* — forward to *${contact.name}* on WhatsApp (${contact.phone ?? 'no phone on file'}).`,
        `Script (${durationSeconds ?? '?'}s): "${message}"`,
        `Audio: ${audioUrl}`,
      ].join('\n');
      try {
        const response = await fetch(`${BASE_URL}/chat.postMessage`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: channelId, text }),
        });
        const json = await response.json();
        if (!response.ok || !json.ok) {
          return { posted: false, reason: `Slack API error: ${json.error ?? `HTTP ${response.status}`}` };
        }
        return { posted: true, ts: json.ts };
      } catch (error) {
        return { posted: false, reason: `network error: ${error.message}` };
      }
    },
  };
}
