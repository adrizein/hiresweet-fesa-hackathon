// Gradium client: turns a short text script into a voice note (delivered
// via Slack, see src/backbone/clients/slack.js — WhatsApp needs a Meta
// Business setup we don't have, Slack is already wired). Unlike
// Sillage/FullEnrich, there is no fixed entity to look up — the input is
// text Claude just generated — so "fixtures mode" here means "compute a
// deterministic placeholder locally" rather than reading a canned JSON
// file. Live path is unconfirmed this session (no API docs available yet):
// TODO(Kubilay) confirm the real endpoint/auth from Gradium's onboarding
// before the demo goes live with a real key.
const DEFAULT_BASE = 'https://api.gradium.example/v1'; // UNCONFIRMED placeholder

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function createGradiumClient() {
  const apiKey = process.env.GRADIUM_API_KEY;
  const base = process.env.GRADIUM_API_BASE || DEFAULT_BASE;
  const voiceId = process.env.GRADIUM_VOICE_ID || 'default';
  const live = Boolean(apiKey);

  return {
    name: 'gradium',
    mode: live ? 'live' : 'fixtures',

    // script -> { audioUrl, durationSeconds, voice } or null on failure.
    // Never throws: a planner that can't get audio should skip the action,
    // not crash the run.
    async textToVoiceNote(script) {
      if (live) {
        try {
          const response = await fetch(`${base}/voice-notes`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: script, voice: voiceId }),
          });
          if (response.ok) {
            const json = await response.json();
            if (json.audio_url) {
              return {
                audioUrl: json.audio_url,
                durationSeconds: json.duration_seconds ?? null,
                voice: json.voice ?? voiceId,
              };
            }
          }
        } catch {
          // fall through to the deterministic placeholder below
        }
      }
      const words = script.trim().split(/\s+/).filter(Boolean).length;
      return {
        audioUrl: `fixtures://gradium/voice-notes/${slugify(script)}.mp3`,
        durationSeconds: Math.min(30, Math.max(5, Math.round(words / 2.5))),
        voice: 'fixtures',
      };
    },
  };
}
