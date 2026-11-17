import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('project switching has one persistent entry point in the global ERP header', () => {
  const shell = readSource('../app/ErpShellLayout.tsx');
  const identity = readSource('../shared/components/ProjectIdentityStrip.tsx');
  const workspace = readSource('../modules/module-b-projects/pages/ProjectWorkspaceView.tsx');
  const app = readSource('../app/App.tsx');

  assert.equal((shell.match(/onClick=\{onOpenSwitcher\}/g) ?? []).length, 1);
  assert.doesNotMatch(shell, /onOpenSwitcher\(\)/, 'the sidebar must not open a second switcher');
  assert.doesNotMatch(identity, /onOpenSwitcher|ArrowLeftRight|تبديل المشروع/);
  assert.doesNotMatch(workspace, /onOpenSwitcher|Active Project Tab Bar|WORKSPACE_TABS\.map\(/);

  const workspaceInvocation = app.match(/<ProjectWorkspaceView[\s\S]*?\/>/)?.[0] ?? '';
  assert.notEqual(workspaceInvocation, '', 'App must render the project workspace');
  assert.doesNotMatch(workspaceInvocation, /onOpenSwitcher=/);
});

test('the sidebar is the only project-section menu while identity and directory actions remain', () => {
  const shell = readSource('../app/ErpShellLayout.tsx');
  const identity = readSource('../shared/components/ProjectIdentityStrip.tsx');
  const workspace = readSource('../modules/module-b-projects/pages/ProjectWorkspaceView.tsx');

  assert.equal((shell.match(/PROJECT_ROUTE_META\.map\(/g) ?? []).length, 1);
  assert.match(identity, /onTogglePin/);
  assert.match(identity, /onBrowseDirectory/);
  assert.match(workspace, /ProjectIdentityStrip/);
  assert.match(workspace, /Section PageHeader/);
});
