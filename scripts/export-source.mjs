import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const argument = process.argv[2];
if (!argument)
  throw new Error('Usage: npm run export:source -- /path/to/new-directory');
const destination = path.resolve(argument);
if (destination === root || root.startsWith(destination + path.sep)) {
  throw new Error('The destination must not contain the source checkout.');
}
if (fs.existsSync(destination))
  throw new Error('Choose a new, empty destination path.');

// An explicit allowlist excludes history, builds, local settings and recordings.
const roots = [
  'app',
  'components',
  'lib',
  'public',
  'tests',
  'scripts',
  'README.md',
  'README.zh-CN.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'next.config.ts',
  'components.json',
  '.gitignore',
  '.oxfmtrc.json',
  '.oxlintrc.json',
  '.openai/hosting.example.json',
];
const sensitive = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk-(?:proj-)?|gh[pousr]_)[A-Za-z0-9_-]{30,}\b/,
  /\bappgprj_[a-f0-9]{32}\b/,
  /\/Users\/[^/\s]+\//,
  /git\.chatgpt-team\.site/,
];
const files = [];
function collect(relative) {
  const source = path.join(root, relative);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink())
    throw new Error(`Symlinks are not exported: ${relative}`);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(source).sort())
      collect(path.join(relative, entry));
    return;
  }
  const data = fs.readFileSync(source);
  if (sensitive.some((pattern) => pattern.test(data.toString('utf8')))) {
    throw new Error(
      `Potential private data in ${relative}; inspect before export.`,
    );
  }
  files.push({ relative, data });
}
for (const relative of roots) collect(relative);
// Validate every file before creating a partial export.
fs.mkdirSync(destination, { recursive: true });
for (const { relative, data } of files) {
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
}
console.log(`Exported ${files.length} source files to ${destination}`);
