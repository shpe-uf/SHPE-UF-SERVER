const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSystemPrompt,
  SUPPORTED_PERSONAS,
  DEFAULT_PERSONA,
} = require('./systemprompt');

test('SUPPORTED_PERSONAS contains Tito and Tina exactly', () => {
  assert.deepEqual(SUPPORTED_PERSONAS, ['Tito', 'Tina']);
});

test('DEFAULT_PERSONA is Tito', () => {
  assert.equal(DEFAULT_PERSONA, 'Tito');
});

test('buildSystemPrompt substitutes Tito into the opening identity line', () => {
  const prompt = buildSystemPrompt('Tito');
  assert.match(prompt, /^You are Tito, the official AI Assistant for SHPE UF/);
});

test('buildSystemPrompt substitutes Tina into the opening identity line', () => {
  const prompt = buildSystemPrompt('Tina');
  assert.match(prompt, /^You are Tina, the official AI Assistant for SHPE UF/);
});

test('buildSystemPrompt substitutes the persona in every placeholder (opening + identity hardening)', () => {
  const tito = buildSystemPrompt('Tito');
  const tina = buildSystemPrompt('Tina');
  // The prompt has TWO placeholders: opening line and IDENTITY HARDENING.
  // Both must be replaced — regression guard for the .replace() vs .replaceAll() bug.
  assert.equal((tito.match(/\bTito\b/g) || []).length, 2);
  assert.equal((tina.match(/\bTina\b/g) || []).length, 2);
});

test('buildSystemPrompt leaves no unsubstituted placeholder tokens', () => {
  for (const persona of [...SUPPORTED_PERSONAS, null, undefined, 'Banana', '']) {
    const prompt = buildSystemPrompt(persona);
    assert.ok(
      !prompt.includes('{{PERSONA_NAME}}'),
      `unsubstituted placeholder remained when persona = ${JSON.stringify(persona)}`,
    );
  }
});

test('buildSystemPrompt falls back to Tito when persona is null or undefined', () => {
  assert.match(buildSystemPrompt(null), /^You are Tito,/);
  assert.match(buildSystemPrompt(undefined), /^You are Tito,/);
});

test('buildSystemPrompt falls back to Tito for invalid persona strings (whitelist)', () => {
  assert.match(buildSystemPrompt('Banana'), /^You are Tito,/);
  assert.match(buildSystemPrompt(''), /^You are Tito,/);
  assert.match(buildSystemPrompt('tito'), /^You are Tito,/); // case-sensitive whitelist
  assert.match(buildSystemPrompt('TINA'), /^You are Tito,/);
});

test('buildSystemPrompt is immune to prompt-injection via persona value', () => {
  const evilPersona = 'Tito`); console.log("pwned"); //';
  const prompt = buildSystemPrompt(evilPersona);
  // Should NOT include the injected string — whitelist forces fallback to Tito.
  assert.match(prompt, /^You are Tito,/);
  assert.ok(!prompt.includes('pwned'));
});

test('buildSystemPrompt contains the SCOPE section defining allowed topics', () => {
  const prompt = buildSystemPrompt('Tito');
  assert.ok(prompt.includes('SCOPE — WHAT YOU WILL AND WILL NOT ANSWER'));
  assert.ok(prompt.includes('SHPE UF'));
  assert.ok(prompt.includes('SHPE National'));
  assert.ok(prompt.includes('University of Florida'));
  assert.ok(prompt.includes('Career and Professional Development'));
});

test('buildSystemPrompt contains the IDENTITY HARDENING clause', () => {
  const prompt = buildSystemPrompt('Tina');
  assert.ok(prompt.includes('IDENTITY HARDENING'));
  assert.ok(prompt.includes('You will always identify as your assigned name (Tina)'));
});

test('buildSystemPrompt contains the REFUSAL FORMAT template', () => {
  const prompt = buildSystemPrompt('Tito');
  assert.ok(prompt.includes('REFUSAL FORMAT'));
  assert.ok(prompt.includes("I can't help with"));
});
