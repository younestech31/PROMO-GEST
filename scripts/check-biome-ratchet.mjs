#!/usr/bin/env node
/**
 * Lint ratchet for the SPA.
 *
 * Biome is configured with every rule that the current codebase cannot satisfy yet
 * downgraded to `warn` or `info`. Those severities must never grow: new code has to
 * be clean, and existing debt can only shrink. Errors are always fatal.
 *
 * Usage:
 *   node scripts/check-biome-ratchet.mjs            # verify against biome-baseline.json
 *   node scripts/check-biome-ratchet.mjs --update   # record the current counts
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'biome-baseline.json');
// Lint everything the configuration includes (SPA sources and repository .mjs scripts).
const targets = [];
const severities = ['error', 'warning', 'info'];

const update = process.argv.includes('--update');

const result = spawnSync(
  'npx',
  ['--no-install', 'biome', 'lint', ...targets, '--reporter=json', '--max-diagnostics=5000'],
  { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, shell: process.platform === 'win32' }
);

if (result.error) {
  console.error(`Could not run Biome: ${result.error.message}`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error('Biome did not return a JSON report.');
  console.error(result.stdout?.slice(0, 2000));
  console.error(result.stderr?.slice(0, 2000));
  process.exit(2);
}

const counts = Object.fromEntries(severities.map((severity) => [severity, 0]));
const byCategory = new Map();

for (const diagnostic of report.diagnostics ?? []) {
  const severity = diagnostic.severity;
  if (!(severity in counts)) continue;
  counts[severity] += 1;
  if (severity === 'error') {
    const category = diagnostic.category ?? 'unknown';
    const location = diagnostic.location
      ? `${diagnostic.location.path}:${diagnostic.location.start?.line ?? '?'}`
      : 'unknown';
    byCategory.set(`${category} (${location})`, (byCategory.get(`${category} (${location})`) ?? 0) + 1);
  }
}

if (update) {
  writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        $comment:
          'Lint debt ceiling. Errors must stay at zero; warning/info counts may only shrink. Regenerate with: node scripts/check-biome-ratchet.mjs --update',
        ...counts,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  console.log(`Recorded lint baseline: ${JSON.stringify(counts)}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const failures = [];

for (const severity of severities) {
  const current = counts[severity];
  const allowed = baseline[severity] ?? 0;
  if (current > allowed) {
    failures.push(`${severity} diagnostics increased: ${current} > ${allowed}`);
  }
}

if (counts.error > 0) {
  console.error('Lint errors must be fixed, not ratcheted:');
  for (const [entry, count] of byCategory) console.error(`  ${count}× ${entry}`);
}

if (failures.length > 0) {
  console.error('\nLint ratchet failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nNew code must be clean. If a rule is genuinely inapplicable, suppress it at the');
  console.error('line with a justified biome-ignore comment instead of raising the baseline.');
  process.exit(1);
}

const improvements = severities
  .filter((severity) => counts[severity] < (baseline[severity] ?? 0))
  .map((severity) => `${severity} ${baseline[severity]} → ${counts[severity]}`);

console.log(`Lint ratchet holds: ${JSON.stringify(counts)} (baseline ${JSON.stringify({
  error: baseline.error ?? 0,
  warning: baseline.warning ?? 0,
  info: baseline.info ?? 0,
})})`);

if (improvements.length > 0) {
  console.log(`Debt shrank (${improvements.join(', ')}). Run --update to lock in the improvement.`);
}
