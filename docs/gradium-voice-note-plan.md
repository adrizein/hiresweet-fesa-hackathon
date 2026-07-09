# Gradium voice-note feature — plan

> New activation module, not yet implemented. Owner per `CLAUDE.md`: Mathieu (activation /
> warm-path "high notes") — check with him before implementing to avoid duplicating work.

## The use case

Not an acquisition flow (new prospect) — an **expansion flow on an existing client**. Already
surfaced by the pipeline: iAdvize and Upway route to `HUMAN` with strong hiring-wave signals
(5 and 37 open roles) and a note "good upsell signal, escalate internally". This feature turns
that passive human routing into a concrete, ready-to-approve action.

Sillage detects a new job posting on a tracked **client** account → prepare a short, synthetic,
sharp voice note via Gradium → draft it for WhatsApp to that client.

## Pipeline end-to-end

```
Sillage (job posting on a tracked CLIENT account)
   -> guard "active client" confirmed (not a cold prospect)
   -> FullEnrich: contact's verified phone number (blocking condition for WhatsApp)
   -> HireSweet marketplace: candidates matching the open role (the value angle)
   -> Claude: drafts a short script (30s max), cites the exact role + 1-2 anonymized profiles
   -> Gradium: script -> audio file (voice note)
   -> GATE: verified phone + active-client confirmed + no-placeholder script + real (not
      invented) candidates
   -> Inbox: "voice_note" action with the audio link, pending human approval
   -> human listens, approves -> manual WhatsApp send (never auto-sent)
```

## What to build (existing architecture, nothing new to invent)

| Piece | Role |
|---|---|
| `src/backbone/clients/gradium.js` | Gradium client (text → audio), same pattern as `sillage.js`/`fullenrich.js`: live/fixtures mode depending on API key |
| `src/actions/40-gradium-voice-note.js` | Planner: only fires on an active-client account + a recent hiring signal; builds the script via `llm.complete()`, calls Gradium, produces a `kind: 'voice_note', channel: 'whatsapp'` action |
| Extend `gate.js` | Add a `verified-phone` check (WhatsApp equivalent of the existing `verified-contact` email check) — blocks without a FullEnrich-verified phone number |
| `fixtures/gradium/*.json` | Fictional case to run without an API key |
| `test/gradium-voice-note.test.js` | Verifies: no generation without an active client, no action without a verified phone, script cites the real signal |
| `.env.example` + README | `GRADIUM_API_KEY`, document the new planner (same format as the others) |

## The script (what Claude must draft, hard constraints)

- One precise fact cited (the open role detected by Sillage, with date)
- One value sentence: "we have 2 profiles that match" (anonymized marketplace candidates, never
  candidate PII)
- One single CTA: propose a call or sending the profiles
- Tone: synthetic, short, direct — consistent with the existing writing style (tutoiement,
  `Hello [Prénom]`, single CTA)
- The gate rejects any script that cites no real `evidenceSignalId` (same rule as other planners)

## The guardrail that matters most here

If the account isn't marked as an active client, or FullEnrich returns no verified phone for that
exact contact → the action stays blocked in the inbox with the reason shown, never a voice note
generated blind onto an unconfirmed number. Same principle as the existing Astrelle/Fluxline
blocks, applied to a new channel.
