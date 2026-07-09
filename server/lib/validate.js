// Contract validation for incoming accounts.
// The contract = the shape of fixtures/accounts.example.json, documented in
// docs/FRONT-BRIEF.md. Additive contract: unknown extra fields are always
// allowed, we only check the fields we care about.

export const TIERS = ['GO', 'EXPLORE', 'SKIP', 'HUMAN'];
export const CONTACT_STATUSES = ['never', 'contacted', 'client'];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isStringOrNull(value) {
  return value === null || value === undefined || typeof value === 'string';
}

function pushIfInvalid(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validateSignal(signal, index, errors) {
  const prefix = `signals[${index}]`;

  if (!isPlainObject(signal)) {
    errors.push(`${prefix}: must be an object`);
    return;
  }

  pushIfInvalid(errors, isNonEmptyString(signal.type), `${prefix}.type: must be a non-empty string`);
  pushIfInvalid(errors, isNonEmptyString(signal.detail), `${prefix}.detail: must be a non-empty string`);

  if (signal.detected_at !== undefined) {
    pushIfInvalid(errors, typeof signal.detected_at === 'string', `${prefix}.detected_at: must be a string`);
  }
  if (signal.source !== undefined) {
    pushIfInvalid(errors, typeof signal.source === 'string', `${prefix}.source: must be a string`);
  }
}

function validateBrief(brief, index, errors) {
  const prefix = `people[${index}].brief`;

  if (!isPlainObject(brief)) {
    errors.push(`${prefix}: must be an object`);
    return;
  }

  for (const field of ['why', 'limits', 'angle']) {
    if (brief[field] !== undefined) {
      pushIfInvalid(errors, typeof brief[field] === 'string', `${prefix}.${field}: must be a string`);
    }
  }

  if (brief.social_proof !== undefined) {
    const isArrayOfStrings =
      Array.isArray(brief.social_proof) && brief.social_proof.every((item) => typeof item === 'string');
    pushIfInvalid(errors, isArrayOfStrings, `${prefix}.social_proof: must be an array of strings`);
  }
}

function validatePerson(person, index, errors) {
  const prefix = `people[${index}]`;

  if (!isPlainObject(person)) {
    errors.push(`${prefix}: must be an object`);
    return;
  }

  pushIfInvalid(errors, isNonEmptyString(person.name), `${prefix}.name: must be a non-empty string`);

  if (person.role !== undefined) {
    pushIfInvalid(errors, typeof person.role === 'string', `${prefix}.role: must be a string`);
  }

  for (const field of ['email', 'phone', 'linkedin_url']) {
    if (person[field] !== undefined) {
      pushIfInvalid(errors, isStringOrNull(person[field]), `${prefix}.${field}: must be a string or null`);
    }
  }

  if (person.highlighted !== undefined) {
    pushIfInvalid(errors, typeof person.highlighted === 'boolean', `${prefix}.highlighted: must be a boolean`);
  }

  if (person.contact_status !== undefined) {
    pushIfInvalid(
      errors,
      CONTACT_STATUSES.includes(person.contact_status),
      `${prefix}.contact_status: must be one of ${CONTACT_STATUSES.join('|')}`
    );
  }

  if (person.brief !== undefined) {
    validateBrief(person.brief, index, errors);
  }
}

/**
 * Validate an incoming account object against the contract.
 * Returns { ok, errors }. Errors are human-readable with field paths.
 */
export function validateAccount(obj) {
  const errors = [];

  if (!isPlainObject(obj)) {
    return { ok: false, errors: ['account: must be a non-null object'] };
  }

  pushIfInvalid(errors, isNonEmptyString(obj.id), 'id: must be a non-empty string');
  pushIfInvalid(errors, isNonEmptyString(obj.name), 'name: must be a non-empty string');

  if (!isPlainObject(obj.verdict)) {
    errors.push('verdict: must be an object');
  } else {
    pushIfInvalid(errors, TIERS.includes(obj.verdict.tier), `verdict.tier: must be one of ${TIERS.join('|')}`);
    pushIfInvalid(errors, isNonEmptyString(obj.verdict.why), 'verdict.why: must be a non-empty string');
  }

  for (const field of ['domain', 'url', 'location', 'stage']) {
    if (obj[field] !== undefined) {
      pushIfInvalid(errors, typeof obj[field] === 'string', `${field}: must be a string`);
    }
  }

  if (obj.size !== undefined) {
    pushIfInvalid(errors, typeof obj.size === 'number', 'size: must be a number');
  }

  if (obj.signals !== undefined) {
    if (!Array.isArray(obj.signals)) {
      errors.push('signals: must be an array');
    } else {
      obj.signals.forEach((signal, index) => validateSignal(signal, index, errors));
    }
  }

  if (obj.people !== undefined) {
    if (!Array.isArray(obj.people)) {
      errors.push('people: must be an array');
    } else {
      obj.people.forEach((person, index) => validatePerson(person, index, errors));
    }
  }

  return { ok: errors.length === 0, errors };
}

function defaultBrief() {
  return { why: '', limits: '', angle: '', social_proof: [] };
}

function normalizePerson(person) {
  return {
    ...person,
    highlighted: person.highlighted !== undefined ? person.highlighted : false,
    contact_status: person.contact_status !== undefined ? person.contact_status : 'never',
    brief: { ...defaultBrief(), ...(person.brief || {}) },
  };
}

/**
 * Return a shallow-normalized copy of an account: ensures signals/people
 * arrays exist, fills person-level and brief-level defaults.
 */
export function normalizeAccount(obj) {
  const signals = Array.isArray(obj.signals) ? obj.signals : [];
  const people = Array.isArray(obj.people) ? obj.people : [];

  return {
    ...obj,
    signals,
    people: people.map(normalizePerson),
  };
}
