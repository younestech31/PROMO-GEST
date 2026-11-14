import test from 'node:test';
import assert from 'node:assert/strict';
import { ALGERIAN_WILAYAS, findWilaya, formatDzd, formatLocalDate } from './algerianFormat';

test('Algerian Wilayas catalog includes all 69 officially numbered wilayas', () => {
  assert.equal(ALGERIAN_WILAYAS.length, 69);
  assert.equal(findWilaya('16')?.nameFr, 'Alger');
  assert.equal(findWilaya('16')?.nameAr, 'الجزائر');
  assert.equal(findWilaya('58')?.nameFr, 'El Meniaa');
  assert.equal(findWilaya('59')?.nameAr, 'أفلو');
  assert.equal(findWilaya('59')?.nameFr, 'Aflou');
  assert.equal(findWilaya('65')?.nameFr, 'Aïn Oussera');
  assert.equal(findWilaya('69')?.nameAr, 'الأبيض سيدي الشيخ');
  assert.equal(findWilaya('69')?.nameFr, 'El Abiodh Sidi Cheikh');
  assert.equal(findWilaya('70'), undefined);
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
