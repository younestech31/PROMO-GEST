import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import {
  clearModalStackForTests,
  getFocusableElements,
  isTopMostModal,
  registerOpenModal,
  resolveNextFocusTarget,
  unregisterOpenModal,
} from '../shared/utils/modalFocus';

test('getFocusableElements filters disabled, hidden, inert, and negative tabindex controls', () => {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <div id="dialog">
        <button id="btn-first" type="button">Close</button>
        <button id="btn-disabled" type="button" disabled>Disabled</button>
        <input id="input-text" type="text" />
        <input id="input-hidden-type" type="hidden" />
        <input id="input-hidden-attr" type="text" hidden />
        <div style="display: none"><button id="btn-display-none" type="button">Hidden</button></div>
        <div aria-hidden="true"><button id="btn-aria-hidden" type="button">Aria hidden</button></div>
        <div inert><button id="btn-inert" type="button">Inert</button></div>
        <button id="btn-neg-tab" type="button" tabindex="-1">No tab</button>
        <a id="link-valid" href="#details">Details</a>
      </div>
    </body></html>`,
  );

  const container = dom.window.document.getElementById('dialog');
  assert.ok(container);
  const focusables = getFocusableElements(container as unknown as HTMLElement);
  assert.deepEqual(
    focusables.map((el) => el.id),
    ['btn-first', 'input-text', 'link-valid'],
  );
});

test('resolveNextFocusTarget wraps forward on Tab and backward on Shift+Tab', () => {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <div id="dialog">
        <button id="a" type="button">A</button>
        <input id="b" type="text" />
        <button id="c" type="button">C</button>
      </div>
    </body></html>`,
  );

  const container = dom.window.document.getElementById('dialog');
  assert.ok(container);
  const focusables = getFocusableElements(container as unknown as HTMLElement);

  assert.equal(resolveNextFocusTarget(focusables, focusables[2], false)?.id, 'a');
  assert.equal(resolveNextFocusTarget(focusables, focusables[0], true)?.id, 'c');
  assert.equal(resolveNextFocusTarget(focusables, null, false)?.id, 'a');
  assert.equal(resolveNextFocusTarget(focusables, null, true)?.id, 'c');
  assert.equal(resolveNextFocusTarget([], null, false), null);
});

test('modal stack ensures only the top-most stacked modal handles Escape/Tab', () => {
  clearModalStackForTests();
  registerOpenModal('base-modal');
  assert.equal(isTopMostModal('base-modal'), true);

  registerOpenModal('confirm-discard-dialog');
  assert.equal(isTopMostModal('base-modal'), false);
  assert.equal(isTopMostModal('confirm-discard-dialog'), true);

  unregisterOpenModal('confirm-discard-dialog');
  assert.equal(isTopMostModal('base-modal'), true);

  unregisterOpenModal('base-modal');
  assert.equal(isTopMostModal('base-modal'), false);
});
