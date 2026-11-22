// main.ts — Ember Court's hand-in program.
// It copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json there, built with buildDossier from
// the kit's vendor/makefun-game.ts. It uses only the Node standard library,
// writes the same bytes on every run, and never removes the output
// directory itself — only the entries inside it.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/** Where the grader's output goes, or MAKEFUN_OUTPUT_DIR outside it. */
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The repository root: the directory this file lives in. */
const REPO_DIR = new URL('.', import.meta.url).pathname;

/** Remove every entry inside a directory, leaving the directory itself. */
function emptyDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return;
  }
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

/** Copy a whole directory, entries in sorted order, into the output. */
function copyDir(name: string): void {
  const from = join(REPO_DIR, name);
  const to = join(OUTPUT_DIR, name);
  if (!existsSync(from)) throw new Error(`main.ts: ${name}/ is missing from the repository`);
  cpSync(from, to, { recursive: true });
}

function main(): void {
  emptyDir(OUTPUT_DIR);
  copyDir('game');
  copyDir('screenshots');
  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
}

main();
