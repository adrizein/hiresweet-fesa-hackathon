// Claude (Anthropic Messages API) connector, the orchestrator's copy-drafting
// tool. Encodes the copy doctrine from criteria/lead-criteria.md §6:
//   1. angle = a dated signal PLUS its implication (never a bare compliment).
//   2. proof = traceable, taken only from person.brief.social_proof (never invented).
//   3. warm path, when one exists, primes over a good cold angle.
// Kill-list: no congratulations without implication, no market-lesson
// platitudes, no unverifiable volumetrics, under 150 words, English.
// Falls back to a deterministic mock template when ANTHROPIC_API_KEY is
// absent, so this module never throws on a missing key and never makes a
// real network call in tests.

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 700;

/** True when the Anthropic API key is present and non-empty. */
export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '');
}

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

const SYSTEM_PROMPT = `You are the copy engine for a tech-recruitment marketplace (HireSweet) reaching out to prospective client accounts. Follow this doctrine strictly.

Angle (priority order):
1. The signal: specific and dated, always paired with its implication. A signal alone ("you opened 4 backend roles this month" / "congrats on the Series A") is FORBIDDEN without an implication: why it matters now, what is at stake, what changes.
2. The proof: traceable only. Use ONLY the social_proof entries given in the input. NEVER invent a placement, a client, or a metric that is not in the data. If no social_proof is given, say something honest and generic instead (success-fee model, candidates pre-qualified before intro).
3. The warm path, if one exists in the data (a shared contact, an existing thread): mention it, it outranks a good cold angle.

Kill-list, an email that contains any of this is bad:
- A compliment or congratulations with no implication attached.
- A market-lesson platitude ("tech hiring is hard", "talent is scarce").
- Any unverifiable volumetric claim not present in the input data.
- More than 150 words.
- Any language other than English.

Followup mode: when told this is a followup, the email must explicitly acknowledge that a previous thread/conversation already exists and read as a reply carrying a NEW signal forward. Never write it as a cold intro.

Output format: respond with ONLY a JSON object, no prose before or after: {"subject": "...", "body": "..."}`;

function buildUserPrompt({ account, person, mode }) {
  const payload = {
    mode,
    account: {
      name: account?.name,
      domain: account?.domain,
      stage: account?.stage,
      size: account?.size,
      signals: account?.signals,
      verdict_why: account?.verdict?.why,
    },
    person: {
      name: person?.name,
      role: person?.role,
      brief: person?.brief,
    },
  };

  return JSON.stringify(payload);
}

/** Strip an optional ```json ... ``` fence (or plain ``` fence) around a string. */
function stripCodeFence(text) {
  const trimmed = (text || '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseDraftResponse(rawText) {
  const candidate = stripCodeFence(rawText);

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed.subject === 'string' && typeof parsed.body === 'string') {
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch {
    // fall through to the raw-text fallback below
  }

  return {
    subject: 'Following up',
    body: candidate,
  };
}

// --- mock mode --------------------------------------------------------

function firstSignalDetail(account) {
  const signal = account?.signals?.[0];
  return signal?.detail || 'a recent signal on your team';
}

function mockSubject(account, mode) {
  const detail = firstSignalDetail(account);
  const prefix = mode === 'followup' ? 'Re: ' : '';
  return `${prefix}${detail}`.slice(0, 120);
}

function mockBody({ account, person, mode }) {
  const angle = person?.brief?.angle;
  const proof = person?.brief?.social_proof?.[0];
  const detail = firstSignalDetail(account);
  const name = person?.name ? person.name.split(' ')[0] : 'there';

  const opener =
    mode === 'followup'
      ? `Hi ${name}, picking up our earlier thread: since we last spoke, ${detail.toLowerCase()}.`
      : `Hi ${name}, ${detail}.`;

  const implication = angle
    ? ` ${angle}`
    : ' That kind of window is exactly where a pre-qualified pipeline changes the outcome.';

  const paragraph1 = `${opener}${implication}`;

  const paragraph2 = proof
    ? proof
    : 'We work on a success-fee model (0 if no hire) with candidates pre-qualified before intro, so your team only spends time on people worth meeting.';

  const paragraph3 = 'Worth a short call this week to see if it fits your plan?';

  const body = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;

  return body;
}

function mockDraftEmail({ account, person, mode }) {
  return {
    subject: mockSubject(account, mode),
    body: mockBody({ account, person, mode }),
    source: 'mock',
  };
}

// --- public API --------------------------------------------------------

/**
 * Draft an outreach email for a person at an account, in 'cold' or
 * 'followup' mode. Real mode calls the Anthropic Messages API; mock mode
 * builds a deterministic template respecting the same copy doctrine.
 */
export async function draftEmail({ account, person, mode }) {
  if (!isConfigured()) {
    return mockDraftEmail({ account, person, mode });
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt({ account, person, mode }),
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Claude: draftEmail request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const rawText = payload?.content?.[0]?.text || '';
  const { subject, body } = parseDraftResponse(rawText);

  return { subject, body, source: 'claude' };
}

// Exported for tests that want to sanity-check the doctrine without a key.
export const _internal = { wordCount };
