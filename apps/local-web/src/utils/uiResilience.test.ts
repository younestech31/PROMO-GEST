import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
}

test('route-level code splitting keeps the authenticated workspaces out of the entry bundle', () => {
  const appSource = read('app/App.tsx');

  for (const modulePath of [
    "'../modules/module-a-organization'",
    "'../modules/module-b-projects'",
    "'../modules/technical-admin'",
    "'../modules/module-l-reporting'",
    "'../modules/module-d-customers-parties'",
  ]) {
    assert.ok(
      appSource.includes(`import(${modulePath})`),
      `App.tsx must load ${modulePath} through a dynamic import`,
    );
    assert.ok(
      !appSource.includes(`from ${modulePath};`),
      `App.tsx must not statically import ${modulePath}`,
    );
  }

  assert.match(appSource, /<Suspense fallback=/);
  assert.match(appSource, /const \w+ = lazy\(\(\) =>/);
});

test('the routed workspace is wrapped in an error boundary that resets on navigation', () => {
  const appSource = read('app/App.tsx');

  assert.match(appSource, /<ErrorBoundary[^>]*scope=\{`route:\$\{activeRoute\.kind\}`\}/);
  assert.match(appSource, /key=\{JSON\.stringify\(activeRoute\)\}/);

  const boundaryStart = appSource.indexOf('<ErrorBoundary');
  const routerIndex = appSource.indexOf('<AppContentRouter');
  assert.ok(boundaryStart >= 0 && routerIndex > boundaryStart, 'AppContentRouter must render inside ErrorBoundary');
});

test('the error boundary catches render failures without leaking details or raw HTML', () => {
  const boundarySource = read('shared/components/ErrorBoundary.tsx');

  assert.match(boundarySource, /static getDerivedStateFromError/);
  assert.match(boundarySource, /componentDidCatch\(/);
  assert.match(boundarySource, /role="alert"/);
  assert.doesNotMatch(boundarySource, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(boundarySource, /innerHTML/);
  // The fallback must not print the caught error or its stack into the UI.
  assert.doesNotMatch(boundarySource, /\{this\.state\.error/);
  assert.doesNotMatch(boundarySource, /error\.stack/);
});
