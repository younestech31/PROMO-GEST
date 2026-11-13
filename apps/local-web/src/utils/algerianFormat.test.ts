import test from 'node:test';
import assert from 'node:assert/strict';
import { ALGERIAN_WILAYAS, findWilaya, formatDzd, formatLocalDate } from './algerianFormat';

test('Algerian Wilayas catalog includes 58 wilayas including Alger (16) and El Meniaa (58)', () => {
  assert.equal(ALGERIAN_WILAYAS.length, 58);
  assert.equal(findWilaya('16')?.nameFr, 'Alger');
  assert.equal(findWilaya('16')?.nameAr, 'الجزائر');
  assert.equal(findWilaya('58')?.nameFr, 'El Meniaa');
});

test('DZD currency formatting displays Arabic Dinar symbol or French DZD code', () => {
  const ar = formatDzd(1250000.5, 'ar');
  const fr = formatDzd(1250000.5, 'fr');
  assert.ok(ar.includes('دج'));
  assert.ok(fr.includes('DZD'));
  assert.ok(formatDzd(null, 'ar').includes('—'));
});

test('Local date formatting handles empty and valid ISO strings', () => {
  assert.equal(formatLocalDate(null, 'fr'), '—');
  const formatted = formatLocalDate('2026-11-13T10:00:00Z', 'fr');
  assert.ok(formatted.includes('2026'));
});
