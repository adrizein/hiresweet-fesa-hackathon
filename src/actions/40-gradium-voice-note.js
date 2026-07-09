import { matchesForCompany, pickPrimaryContact, signalsForCompany } from '../backbone/selectors.js';

const HIRING_SIGNAL_TYPES = ['hiring_wave', 'job_posting_keyword', 'mantiks_job_posting'];

const SCRIPT_SYSTEM_PROMPT =
  'You write the script for a short WhatsApp voice note from HireSweet to an EXISTING client ' +
  '(this is account expansion, not cold outreach — write like you already know them). Max 70 ' +
  'words, ~25-30 seconds spoken. Cite the one signal given as the reason you are reaching out ' +
  'now, and if candidate profiles are given, mention there are matching profiles ready to share. ' +
  'One clear call to action (propose a call, or offer to send the profiles). Tutoiement, ' +
  'direct, no greeting formula beyond "Hello [prénom]", no sign-off. Use only the provided ' +
  'facts — never invent a number or a name. Plain text only, no placeholders.';

function fallbackScript(contact, signalSummary, candidates) {
  const firstName = contact.name.split(' ')[0];
  const parts = [`Hello ${firstName},`, `on a vu que ${signalSummary.toLowerCase()}.`];
  if (candidates.length > 0) {
    parts.push(`On a ${candidates.length} profil${candidates.length > 1 ? 's' : ''} qui matche${candidates.length > 1 ? 'nt' : ''} direct.`);
  }
  parts.push('Dis-moi si un call cette semaine t’intéresse.');
  return parts.join(' ');
}

// Tier 3, client-expansion channel: a hiring-type signal on an EXISTING
// client account becomes a short Gradium voice note, not a cold email —
// same architecture as the other planners (propose only, the gate
// disposes), but gated on `existing_client` and a verified phone. Delivery
// channel is Slack (src/backbone/clients/slack.js): a human forwards the
// audio to the client's WhatsApp themselves — see README "what's missing"
// for why the direct WhatsApp API isn't wired live yet.
export default {
  name: 'gradium-voice-note',
  description: 'Client-expansion voice note (Gradium) triggered by a hiring signal on an existing client',

  async plan(ctx) {
    const { store, clients, llm, log } = ctx;
    const actions = [];

    for (const company of store.all('companies')) {
      if (!(company.flags ?? []).includes('existing_client')) continue;
      if ((company.flags ?? []).some((f) => ['do_not_contact', 'protected'].includes(f))) continue;

      const signals = signalsForCompany(store, company.id).filter((s) =>
        HIRING_SIGNAL_TYPES.includes(s.type),
      );
      if (signals.length === 0) continue;

      const contact = pickPrimaryContact(store, company.id);
      if (!contact || !contact.phone) continue; // not enriched yet — nothing to act on this run

      const candidates = matchesForCompany(store, company.id)
        .slice(0, 2)
        .map((m) => {
          const c = store.get('candidates', m.candidateId);
          return { handle: c.handle, headline: c.headline };
        });

      let script = null;
      if (llm.enabled) {
        try {
          script = await llm.complete({
            system: SCRIPT_SYSTEM_PROMPT,
            prompt: JSON.stringify({
              contact: { name: contact.name, role: contact.role },
              signal: signals[0].summary,
              candidates,
            }),
            maxTokens: 250,
          });
        } catch (error) {
          log(`gradium-voice-note: Claude draft failed for ${company.name} (${error.message}), using template`);
        }
      }
      if (!script) script = fallbackScript(contact, signals[0].summary, candidates);

      const voiceNote = await clients.gradium.textToVoiceNote(script);

      actions.push({
        id: `act-voicenote-${company.id}`,
        kind: 'voice_note',
        channel: 'slack',
        companyId: company.id,
        targetPersonId: contact.id,
        evidenceSignalIds: signals.map((s) => s.id),
        payload: {
          message: script,
          audioUrl: voiceNote.audioUrl,
          durationSeconds: voiceNote.durationSeconds,
          candidates,
        },
      });
    }
    return actions;
  },
};
