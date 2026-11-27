import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { ProjectBudgetValue } from '../modules/module-b-projects';

function renderBudget(amount: number | null, language: 'ar' | 'fr') {
  const markup = renderToStaticMarkup(createElement(ProjectBudgetValue, { amount, language }));
  const document = new JSDOM(markup).window.document;
  const element = document.querySelector('span');
  assert.ok(element, 'budget renderer must expose one text value');
  return { markup, element };
}

for (const language of ['ar', 'fr'] as const) {
  test(`directory budget (${language}): redaction is a dash, never a fabricated zero or hidden amount`, () => {
    const { markup, element } = renderBudget(null, language);
    assert.equal(element.textContent, '—');
    assert.equal(element.getAttribute('dir'), 'ltr');
    assert.doesNotMatch(markup, /[0-9]|DZD|دج|title=|data-/);
  });

  test(`directory budget (${language}): zero is distinct from redaction and decimal precision is retained`, () => {
    for (const amount of [0, 23456789.75]) {
      const { element } = renderBudget(amount, language);
      const expected = new Intl.NumberFormat(language === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-DZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + (language === 'ar' ? ' دج' : ' DZD');
      assert.equal(element.textContent, expected);
      assert.equal(element.getAttribute('dir'), 'ltr');
      assert.notEqual(element.textContent, '—');
    }
  });
}
