#!/usr/bin/env node

/*
  Response audit script for SHPE UF chatbot.

  Usage:
    node graphql/chatbot/evals/auditResponses.js --responses path/to/responses.json

  responses.json format:
    {
      "oos-cook-rice": "...model response...",
      "rag-resume-bullets": "...model response..."
    }

  Optional live run (requires env vars used by graphql/chatbot/chatbotService.js):
    node graphql/chatbot/evals/auditResponses.js --live
*/

const fs = require('node:fs');
const path = require('node:path');

const EVAL_PATH = path.join(__dirname, 'test_cases.json');
const REPO_ROOT_ENV = path.join(__dirname, '..', '..', '..', '.env');

function parseArgs(argv) {
  const args = { responsesPath: null, live: false, outPath: null, print: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--responses') {
      args.responsesPath = argv[i + 1];
      i += 1;
    } else if (a === '--live') {
      args.live = true;
    } else if (a === '--out') {
      args.outPath = argv[i + 1];
      i += 1;
    } else if (a === '--print') {
      args.print = true;
    }
  }
  return args;
}

function approxTokens(text) {
  // Cheap approximation: ~4 chars/token for English-ish text.
  const s = String(text || '').trim();
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

function countSentences(text) {
  const s = String(text || '').trim();
  if (!s) return 0;
  // Split on sentence-ending punctuation, ignore trailing empties.
  return s
    .split(/[.!?]+/)
    .map((x) => x.trim())
    .filter(Boolean).length;
}

function containsListFormatting(text) {
  const s = String(text || '');
  return (
    /^\s*[-•]\s+/m.test(s) ||
    /^\s*\d+\.\s+/m.test(s)
  );
}

function containsAnyOfficialLink(text) {
  const s = String(text || '');
  return /https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(s);
}

function findTechLeakage(text) {
  const s = String(text || '');
  const hits = [];
  if (/\bapi\b/i.test(s)) hits.push('API');
  if (/\bjson\b/i.test(s)) hits.push('JSON');
  if (/\btools?\b/i.test(s)) hits.push('Tool');
  return hits;
}

function looksLikeRefusal(text) {
  const s = String(text || '').toLowerCase();
  return (
    /\b(can't|cannot|can\u2019t|unable|not able)\b/.test(s) ||
    /\b(i can help with|i can help you with)\b/.test(s) ||
    /\b(shpe uf|shpe)\b/.test(s)
  );
}

function auditOne(testCase, responseText) {
  const response = String(responseText || '').trim();
  const reasons = [];

  // Global: no tech leakage
  const leakage = findTechLeakage(response);
  if (leakage.length) {
    reasons.push(`technical-leakage:${leakage.join(',')}`);
  }

  const target = testCase.target || {};

  // Token policy
  const t = approxTokens(response);
  const hasLink = containsAnyOfficialLink(response);
  const hasList = containsListFormatting(response);

  const baseLimit = Number.isFinite(Number(target.max_tokens)) ? Number(target.max_tokens) : 200;
  const exceptionLimit = baseLimit + 40; // slight allowance when links/lists are necessary
  const limit = hasLink || hasList ? exceptionLimit : baseLimit;

  if (t > limit) {
    reasons.push(`too-long:${t}>${limit}`);
  }

  // Per-case expectations

  if (target.type === 'refusal') {
    if (!looksLikeRefusal(response)) {
      reasons.push('expected-refusal');
    }
    const sCount = countSentences(response);
    if (Number.isFinite(target.max_sentences) && sCount > target.max_sentences) {
      reasons.push(`too-many-sentences:${sCount}>${target.max_sentences}`);
    }
  }

  if (target.type === 'doc_grounded') {
    if (target.required_link && !response.includes(target.required_link)) {
      reasons.push('missing-required-link');
    }
  }

  if (target.type === 'concise_summary') {
    const sCount = countSentences(response);
    if (Number.isFinite(target.max_sentences) && sCount > target.max_sentences && !hasLink) {
      // If they included a link, we already allow more.
      reasons.push(`too-many-sentences:${sCount}>${target.max_sentences}`);
    }
  }

  return {
    id: testCase.id,
    pass: reasons.length === 0,
    approx_tokens: t,
    reasons,
  };
}

async function loadResponses({ live, responsesPath, testCases }) {
  if (live) {
    // Load .env for local runs (index.js does this, but this script runs standalone).
    try {
      // eslint-disable-next-line global-require
      const dotenv = require('dotenv');
      dotenv.config();
      if (fs.existsSync(REPO_ROOT_ENV)) {
        dotenv.config({ path: REPO_ROOT_ENV });
      }
    } catch {
      // Ignore if dotenv isn't available.
    }

    // Lazy-load to avoid requiring env vars when not needed.
    const { queryRAG } = require('../chatbotService');
    const out = {};
    for (const tc of testCases) {
      // eslint-disable-next-line no-await-in-loop
      out[tc.id] = await queryRAG(tc.question);
    }
    return out;
  }

  if (!responsesPath) {
    throw new Error('Missing --responses path (or use --live)');
  }

  const raw = fs.readFileSync(path.resolve(process.cwd(), responsesPath), 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv);
  const evalRaw = fs.readFileSync(EVAL_PATH, 'utf8');
  const evalData = JSON.parse(evalRaw);
  const testCases = evalData.test_cases || [];

  const responses = await loadResponses({
    live: args.live,
    responsesPath: args.responsesPath,
    testCases,
  });

  if (args.outPath) {
    const resolved = path.resolve(process.cwd(), args.outPath);
    fs.writeFileSync(resolved, `${JSON.stringify(responses, null, 2)}\n`, 'utf8');
    console.log(`Saved outputs to ${resolved}`);
  }

  if (args.print) {
    for (const tc of testCases) {
      const text = String(responses[tc.id] || '').trim();
      console.log(`\n===== ${tc.id} (${tc.category}) =====`);
      console.log(`Q: ${tc.question}`);
      console.log(`A: ${text || '[no response]'}\n`);
    }
  }

  const results = testCases.map((tc) => auditOne(tc, responses[tc.id]));

  const failed = results.filter((r) => !r.pass);
  const passed = results.filter((r) => r.pass);

  // Summary
  console.log(`Passed ${passed.length}/${results.length}`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) {
      console.log(`- ${f.id}: ${f.reasons.join(' | ')} (tokens≈${f.approx_tokens})`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
