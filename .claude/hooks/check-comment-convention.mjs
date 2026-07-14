#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  analyzeSource,
  formatViolations,
  shouldCheckFile,
} from './comment-convention/analyze.mjs';

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) chunks.push(chunk);

  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const raw = await readStdin();
  let input;

  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = input && input.tool_input && input.tool_input.file_path;

  if (!filePath || !shouldCheckFile(filePath)) process.exit(0);

  let source;

  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }

  let violations;

  try {
    violations = analyzeSource(source, filePath);
  } catch {
    process.exit(0);
  }

  if (!violations.length) process.exit(0);

  const repoRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const rel = path.relative(repoRoot, filePath) || filePath;

  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: formatViolations(violations, rel),
    }),
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
