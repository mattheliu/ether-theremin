import fs from 'node:fs';
import ts from 'typescript';

const urls = new Map();

// Test the production TypeScript without writing generated files into the repo.
export function moduleUrl(file) {
  const href = file.href;
  if (urls.has(href)) return urls.get(href);
  let code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  code = code.replace(/from\s+(['"])(\.[^'"]+)\1/g, (_, quote, specifier) => {
    const dependency = new URL(
      specifier.endsWith('.ts') ? specifier : specifier + '.ts',
      file,
    );
    return 'from ' + JSON.stringify(moduleUrl(dependency));
  });
  const url =
    'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  urls.set(href, url);
  return url;
}

export const loadTypeScript = (file) => import(moduleUrl(file));
