/**
 * Script to extract route sections from the monolithic routes.ts
 * Run: node scripts/split-routes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const routesPath = path.resolve('apps/api/src/routes.ts');
const content = fs.readFileSync(routesPath, 'utf-8');
const lines = content.split('\n');

// Section boundaries (line numbers, 1-indexed)
const sections = [
  { name: 'auth',       start: 698,  end: 1914, file: 'auth.ts' },
  { name: 'matters',    start: 1915, end: 2197, file: 'matters.ts' },
  { name: 'documents',  start: 2198, end: 3007, file: 'documents.ts' },
  { name: 'admin',      start: 3008, end: 3501, file: 'admin.ts' },
  { name: 'research',   start: 3502, end: 3959, file: 'research.ts' },
  { name: 'legal-ops',  start: 3960, end: 4650, file: 'legal-ops.ts' },
  { name: 'analytics',  start: 4651, end: 4721, file: 'analytics.ts' },
  { name: 'billing',    start: 4722, end: 4836, file: 'billing.ts' },
  { name: 'legal-rules', start: 4837, end: 4946, file: 'legal-rules.ts' },
  { name: 'jobs',       start: 4947, end: 4991, file: 'jobs.ts' },
  { name: 'documents-extra', start: 4992, end: 5157, file: 'documents-extra.ts' },
  { name: 'portal',     start: 5158, end: 5671, file: 'portal.ts' },
  { name: 'obligations', start: 5672, end: 5972, file: 'obligations.ts' },
  { name: 'analytics-extra', start: 5973, end: 6010, file: 'analytics-extra.ts' },
  { name: 'ai',         start: 6011, end: 6073, file: 'ai.ts' },
  { name: 'webhooks',   start: 6074, end: 6181, file: 'webhooks.ts' },
  { name: 'billing-extra', start: 6182, end: 6216, file: 'billing-extra.ts' },
  { name: 'auth-extra', start: 6217, end: 6386, file: 'auth-extra.ts' },
  { name: 'review',     start: 6387, end: 6468, file: 'review.ts' },
  { name: 'context-agent', start: 6469, end: 6661, file: 'context-agent.ts' },
];

const outDir = path.resolve('apps/api/src/routes');
fs.mkdirSync(outDir, { recursive: true });

for (const section of sections) {
  // Extract lines (convert 1-indexed to 0-indexed)
  const sectionLines = lines.slice(section.start - 1, section.end);
  const raw = sectionLines.join('\n');
  
  const outPath = path.join(outDir, `_raw_${section.file}`);
  fs.writeFileSync(outPath, raw, 'utf-8');
  console.log(`Extracted ${section.name}: lines ${section.start}-${section.end} → ${section.file} (${sectionLines.length} lines)`);
}

console.log('\nDone! Raw sections saved to apps/api/src/routes/_raw_*.ts');
