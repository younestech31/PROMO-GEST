import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';

import { ChangePasswordModal, ChangePasswordRequiredScreen, LoginScreen } from '../modules/auth';
import { LanguageSwitcher } from '../shared/components/LanguageSwitcher';
import { Modal } from '../shared/components/Modal';
import { PageHeader } from '../shared/components/PageHeader';
import { ConfirmDialog, EmptyState, ErrorBanner, LoadingSkeleton } from '../shared/components/StateViews';
import type { AppLanguage } from '../types/erp';

/**
 * Server-rendered accessibility audit.
 *
 * These checks catch the structural defects that both languages can introduce:
 * unlabelled inputs, unnamed buttons and links, images without alternative text,
 * broken ARIA attributes, and duplicated ids. Colour contrast, focus order and
 * keyboard trapping need a real browser and stay a manual gate.
 */

const RULES = [
  'aria-allowed-attr',
  'aria-required-attr',
  'aria-valid-attr-value',
  'button-name',
  'duplicate-id-aria',
  'form-field-multiple-labels',
  'image-alt',
  'input-button-name',
  'label',
  'link-name',
  'select-name',
];

interface AxeCapableWindow extends Window {
  axe: { run(context: Document, options: unknown): Promise<{ violations: { id: string; nodes: { html: string }[] }[] }> };
}

async function audit(label: string, element: ReactElement, language: AppLanguage): Promise<void> {
  const markup = renderToStaticMarkup(element);
  assert.ok(markup.length > 0, `${label} rendered nothing`);

  const dom = new JSDOM(
    `<!doctype html><html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">` +
      `<head><title>PROMO GEST accessibility audit</title></head><body>${markup}</body></html>`,
    { runScripts: 'outside-only' },
  );

  // axe-core is injected into the jsdom document so it audits the rendered markup,
  // not a synthetic fixture that could drift from the real components.
  (dom.window as unknown as { eval(code: string): void }).eval(axe.source);
  const results = await (dom.window as unknown as AxeCapableWindow).axe.run(dom.window.document, {
    runOnly: { type: 'rule', values: RULES },
    resultTypes: ['violations'],
  });

  // Array.from keeps the result in this realm: arrays created inside jsdom have a
  // different prototype and would fail a deepStrictEqual comparison even when empty.
  const violations = Array.from(
    results.violations,
    (violation) => `${violation.id}: ${Array.from(violation.nodes, (node) => node.html).join(' | ')}`,
  );
  assert.deepEqual(violations, [], `${label} (${language}) has accessibility violations:\n${violations.join('\n')}`);
}

const noop = () => undefined;
const noopAsync = async () => undefined;

function loginScreen(language: AppLanguage): ReactElement {
  return createElement(LoginScreen, {
    language,
    onLanguageChange: noop,
    organizationName: 'مؤسسة الاختبار',
    setupCompleted: true,
    passwordChangedNotice: true,
    onLoggedIn: noop,
    isPreviewMode: false,
    onPreviewLogin: noopAsync,
  });
}

function changePasswordScreen(language: AppLanguage): ReactElement {
  return createElement(ChangePasswordRequiredScreen, {
    language,
    fullName: 'Agent One',
    username: 'agent.one',
    onCompleted: noop,
    onLogout: noop,
    logoutFailed: false,
  });
}

function workspaceHeader(language: AppLanguage): ReactElement {
  return createElement(PageHeader, {
    title: language === 'ar' ? 'لوحة المشاريع' : 'Tableau des projets',
    subtitle: language === 'ar' ? 'نظرة عامة على المشاريع' : 'Vue d’ensemble des projets',
    language,
    breadcrumbs: [
      { label: language === 'ar' ? 'الرئيسية' : 'Accueil' },
      { label: language === 'ar' ? 'المشاريع' : 'Projets' },
    ],
    moduleCode: 'MODULE-B',
    actions: createElement(LanguageSwitcher, { language, onChange: noop }),
  });
}

test('the sign-in screen has labelled fields and named controls in both directions', async () => {
  await audit('LoginScreen', loginScreen('ar'), 'ar');
  await audit('LoginScreen', loginScreen('fr'), 'fr');
});

test('the forced password-change screen is anchored by labelled fields', async () => {
  await audit('ChangePasswordRequiredScreen', changePasswordScreen('ar'), 'ar');
  await audit('ChangePasswordRequiredScreen', changePasswordScreen('fr'), 'fr');
});

test('the workspace header keeps breadcrumb navigation and actions accessible', async () => {
  await audit('PageHeader', workspaceHeader('ar'), 'ar');
  await audit('PageHeader', workspaceHeader('fr'), 'fr');
});

test('shared state views and dialogs carry accessible names', async () => {
  for (const language of ['ar', 'fr'] as const) {
    await audit('LoadingSkeleton', createElement(LoadingSkeleton, { rows: 2 }), language);
    await audit(
      'EmptyState',
      createElement(EmptyState, {
        title: language === 'ar' ? 'لا توجد مشاريع' : 'Aucun projet',
        description: language === 'ar' ? 'ابدأ بإنشاء مشروع' : 'Commencez par créer un projet',
        action: createElement('button', { type: 'button' }, language === 'ar' ? 'مشروع جديد' : 'Nouveau projet'),
      }),
      language,
    );
    await audit(
      'ErrorBanner',
      createElement(ErrorBanner, {
        message: language === 'ar' ? 'تعذّر تحميل البيانات' : 'Impossible de charger les données',
        actionLabel: language === 'ar' ? 'إعادة المحاولة' : 'Réessayer',
        onAction: noop,
      }),
      language,
    );
    await audit(
      'ConfirmDialog',
      createElement(ConfirmDialog, {
        open: true,
        title: language === 'ar' ? 'تأكيد الحذف' : 'Confirmer la suppression',
        message: language === 'ar' ? 'لا يمكن التراجع.' : 'Cette action est irréversible.',
        confirmLabel: language === 'ar' ? 'حذف' : 'Supprimer',
        cancelLabel: language === 'ar' ? 'إلغاء' : 'Annuler',
        onConfirm: noop,
        onCancel: noop,
      }),
      language,
    );
    await audit(
      'Modal',
      createElement(
        Modal,
        {
          open: true,
          titleId: `modal-audit-title-${language}`,
          onClose: noop,
          dir: language === 'ar' ? 'rtl' : 'ltr',
        },
        createElement('h2', { id: `modal-audit-title-${language}` }, language === 'ar' ? 'نافذة' : 'Fenêtre'),
        createElement('button', { type: 'button' }, language === 'ar' ? 'إغلاق' : 'Fermer'),
      ),
      language,
    );
    await audit(
      'ChangePasswordModal',
      createElement(ChangePasswordModal, {
        language,
        onClose: noop,
        onCompleted: noop,
      }),
      language,
    );
  }
});
