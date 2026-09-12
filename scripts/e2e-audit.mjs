#!/usr/bin/env node
/**
 * Comprehensive E2E audit: enumerate pages, click buttons, submit forms,
 * capture console + network errors.
 */
import { chromium } from 'playwright';
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, relative } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const START_PATH = process.env.START_PATH || '/editor';
const REPORT_DIR = join(process.cwd(), 'scripts', 'audit-reports');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Placeholder values for dynamic route segments
const DYNAMIC_PLACEHOLDERS = {
  id: 'test-id-001',
  slug: 'mailer-box',
  token: 'test-reset-token',
  commentId: 'comment-001',
  versionId: 'version-001',
  shareId: 'share-001',
  stepId: 'step-001',
  fileId: 'file-001',
};

const SKIP_CLICK_PATTERNS = [
  /delete/i, /remove/i, /logout/i, /sign.?out/i, /destroy/i,
  /cancel.?order/i, /pay now/i, /confirm.?payment/i, /purchase/i,
  /checkout/i, /place.?order/i,
];

const TEST_FORM_DATA = {
  email: 'audit-test@example.com',
  password: 'AuditTest123!@#',
  confirmPassword: 'AuditTest123!@#',
  name: 'Audit Test User',
  firstName: 'Audit',
  lastName: 'Tester',
  phone: '+15551234567',
  company: 'Audit Corp',
  message: 'Automated audit test message.',
  subject: 'Audit Test Subject',
  search: 'mailer box',
  quantity: '100',
  address: '123 Test Street',
  city: 'Test City',
  zip: '90210',
  country: 'US',
  title: 'Audit Test Title',
  description: 'Automated test description.',
};

/** Discover routes from Next.js app directory */
function discoverRoutes(appDir, base = '') {
  const routes = [];
  let entries;
  try {
    entries = readdirSync(appDir);
  } catch {
    return routes;
  }

  for (const entry of entries) {
    const fullPath = join(appDir, entry);
    if (!statSync(fullPath).isDirectory()) continue;

    // Skip API routes, special Next.js dirs
    if (entry === 'api' || entry.startsWith('_') || entry === 'components') continue;

    const segment = entry.startsWith('(') && entry.endsWith(')')
      ? '' // route group - no URL segment
      : entry.startsWith('[') && entry.endsWith(']')
        ? `[${entry.slice(1, -1)}]`
        : entry;

    const routePath = segment ? `${base}/${segment}` : base;

    const pageFile = join(fullPath, 'page.tsx');
    const pageFileJs = join(fullPath, 'page.jsx');
    try {
      if (statSync(pageFile).isFile() || statSync(pageFileJs).isFile()) {
        routes.push(routePath || '/');
      }
    } catch { /* no page */ }

    routes.push(...discoverRoutes(fullPath, routePath));
  }
  return routes;
}

function resolveDynamicRoute(route) {
  return route.replace(/\[([^\]]+)\]/g, (_, param) => {
    return DYNAMIC_PLACEHOLDERS[param] || `test-${param}`;
  });
}

function getUniqueRoutes(appDir) {
  const raw = discoverRoutes(appDir);
  const resolved = raw.map(r => resolveDynamicRoute(r === '' ? '/' : r));
  return [...new Set(resolved)].sort();
}

function shouldSkipClick(text, ariaLabel) {
  const combined = `${text || ''} ${ariaLabel || ''}`;
  return SKIP_CLICK_PATTERNS.some(p => p.test(combined));
}

function inferInputValue(input) {
  const type = (input.type || 'text').toLowerCase();
  const name = (input.name || input.id || input.placeholder || '').toLowerCase();
  const ariaLabel = (input.getAttribute?.('aria-label') || '').toLowerCase();
  const key = `${name} ${ariaLabel}`;

  if (type === 'email' || key.includes('email')) return TEST_FORM_DATA.email;
  if (type === 'password' || key.includes('password')) {
    return key.includes('confirm') ? TEST_FORM_DATA.confirmPassword : TEST_FORM_DATA.password;
  }
  if (key.includes('first') && key.includes('name')) return TEST_FORM_DATA.firstName;
  if (key.includes('last') && key.includes('name')) return TEST_FORM_DATA.lastName;
  if (key.includes('name')) return TEST_FORM_DATA.name;
  if (key.includes('phone') || key.includes('tel')) return TEST_FORM_DATA.phone;
  if (key.includes('company')) return TEST_FORM_DATA.company;
  if (key.includes('message') || key.includes('comment')) return TEST_FORM_DATA.message;
  if (key.includes('subject')) return TEST_FORM_DATA.subject;
  if (key.includes('search')) return TEST_FORM_DATA.search;
  if (key.includes('quantity') || key.includes('qty')) return TEST_FORM_DATA.quantity;
  if (key.includes('address')) return TEST_FORM_DATA.address;
  if (key.includes('city')) return TEST_FORM_DATA.city;
  if (key.includes('zip') || key.includes('postal')) return TEST_FORM_DATA.zip;
  if (key.includes('country')) return TEST_FORM_DATA.country;
  if (key.includes('title')) return TEST_FORM_DATA.title;
  if (key.includes('description')) return TEST_FORM_DATA.description;
  if (type === 'number') return '1';
  if (type === 'tel') return TEST_FORM_DATA.phone;
  if (type === 'url') return 'https://example.com';
  if (type === 'date') return '2026-06-01';
  if (type === 'checkbox') return true;
  if (type === 'radio') return true;
  return 'test value';
}

async function interactWithPage(page, pageUrl, results) {
  const interaction = {
    url: pageUrl,
    buttonsClicked: [],
    buttonsSkipped: [],
    buttonsFailed: [],
    formsSubmitted: [],
    formsFailed: [],
    linksFound: [],
  };

  // Collect internal links
  const links = await page.evaluate((base) => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.getAttribute('href'))
      .filter(h => h && (h.startsWith('/') || h.startsWith(base)))
      .map(h => h.startsWith('/') ? h.split('?')[0].split('#')[0] : h);
  }, BASE_URL);
  interaction.linksFound = [...new Set(links)];

  // Click buttons (safe ones)
  const buttons = await page.locator('button:visible, [role="button"]:visible, input[type="submit"]:visible, input[type="button"]:visible').all();
  const maxButtons = Math.min(buttons.length, 30);

  for (let i = 0; i < maxButtons; i++) {
    try {
      const btn = buttons[i];
      const text = await btn.innerText().catch(() => '');
      const ariaLabel = await btn.getAttribute('aria-label').catch(() => '') || '';
      const disabled = await btn.isDisabled().catch(() => true);

      if (disabled) {
        interaction.buttonsSkipped.push({ text: text.slice(0, 80), reason: 'disabled' });
        continue;
      }
      if (shouldSkipClick(text, ariaLabel)) {
        interaction.buttonsSkipped.push({ text: text.slice(0, 80), reason: 'destructive/payment' });
        continue;
      }

      await btn.click({ timeout: 3000 });
      interaction.buttonsClicked.push(text.slice(0, 80) || ariaLabel || `[button ${i}]`);
      await page.waitForTimeout(300);
    } catch (err) {
      interaction.buttonsFailed.push({ index: i, error: err.message?.slice(0, 200) });
    }
  }

  // Submit forms
  const forms = await page.locator('form:visible').all();
  for (let fi = 0; fi < Math.min(forms.length, 5); fi++) {
    try {
      const form = forms[fi];
      const inputs = await form.locator('input:not([type="hidden"]):not([type="file"]), textarea, select').all();

      for (const input of inputs) {
        try {
          const tag = await input.evaluate(el => el.tagName.toLowerCase());
          const type = await input.getAttribute('type').catch(() => 'text') || 'text';
          const visible = await input.isVisible().catch(() => false);
          if (!visible) continue;

          const val = await input.evaluate(el => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
          }));

          const fillValue = inferInputValue(val);

          if (tag === 'select') {
            const options = await input.locator('option').all();
            if (options.length > 1) {
              const optVal = await options[1].getAttribute('value');
              if (optVal) await input.selectOption(optVal);
            }
          } else if (type === 'checkbox' || type === 'radio') {
            await input.check({ force: true }).catch(() => {});
          } else {
            await input.fill(String(fillValue));
          }
        } catch { /* skip input */ }
      }

      const submitBtn = form.locator('button[type="submit"], input[type="submit"]').first();
      const hasSubmit = await submitBtn.count() > 0;
      if (hasSubmit) {
        await submitBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        interaction.formsSubmitted.push(`form-${fi}`);
      }
    } catch (err) {
      interaction.formsFailed.push({ form: fi, error: err.message?.slice(0, 200) });
    }
  }

  results.interactions.push(interaction);
  return interaction.linksFound;
}

async function main() {
  mkdirSync(REPORT_DIR, { recursive: true });

  const appDir = join(process.cwd(), 'frontend', 'app');
  const staticRoutes = getUniqueRoutes(appDir);
  console.log(`Discovered ${staticRoutes.length} static routes from app directory`);

  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    startPath: START_PATH,
    staticRoutes,
    pagesVisited: [],
    pagesFailed: [],
    consoleErrors: [],
    networkErrors: [],
    pageErrors: [],
    interactions: [],
    summary: {},
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const visited = new Set();
  const toVisit = new Set([START_PATH, ...staticRoutes]);

  // BFS crawl starting from editor
  while (toVisit.size > 0) {
    const route = [...toVisit][0];
    toVisit.delete(route);
    if (visited.has(route)) continue;
    visited.add(route);

    const url = `${BASE_URL}${route}`;
    console.log(`Auditing: ${url}`);

    const page = await context.newPage();
    const pageConsoleErrors = [];
    const pageNetworkErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageConsoleErrors.push({ url, message: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      pageConsoleErrors.push({ url, message: err.message, type: 'pageerror', stack: err.stack?.slice(0, 500) });
    });

    page.on('requestfailed', req => {
      pageNetworkErrors.push({
        url,
        requestUrl: req.url(),
        method: req.method(),
        failure: req.failure()?.errorText || 'unknown',
      });
    });

    page.on('response', resp => {
      const status = resp.status();
      if (status >= 400) {
        const reqUrl = resp.url();
        // Skip external analytics, favicon noise
        if (reqUrl.includes('google-analytics') || reqUrl.includes('favicon')) return;
        pageNetworkErrors.push({
          url,
          requestUrl: reqUrl,
          method: resp.request().method(),
          status,
          statusText: resp.statusText(),
        });
      }
    });

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000); // allow client hydration / 3D init

      const status = response?.status() ?? 0;
      const title = await page.title().catch(() => '');

      const pageResult = {
        route,
        url,
        httpStatus: status,
        title,
        consoleErrorCount: 0,
        networkErrorCount: 0,
      };

      // Interact
      const newLinks = await interactWithPage(page, url, results);
      for (const link of newLinks) {
        if (link.startsWith('/') && !visited.has(link) && !link.includes('[')) {
          toVisit.add(link);
        }
      }

      pageResult.consoleErrorCount = pageConsoleErrors.length;
      pageResult.networkErrorCount = pageNetworkErrors.length;

      if (status >= 400) {
        results.pagesFailed.push({ ...pageResult, reason: `HTTP ${status}` });
      } else {
        results.pagesVisited.push(pageResult);
      }

      results.consoleErrors.push(...pageConsoleErrors);
      results.networkErrors.push(...pageNetworkErrors);

    } catch (err) {
      results.pagesFailed.push({ route, url, reason: err.message });
      results.pageErrors.push({ route, url, error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Deduplicate errors
  const dedupe = (arr, keyFn) => {
    const seen = new Set();
    return arr.filter(item => {
      const k = keyFn(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  results.consoleErrors = dedupe(results.consoleErrors, e => `${e.url}|${e.message}`);
  results.networkErrors = dedupe(results.networkErrors, e => `${e.requestUrl}|${e.status || e.failure}`);

  // Build summary
  const brokenPages = results.pagesVisited.filter(p => p.consoleErrorCount > 0 || p.networkErrorCount > 0 || p.httpStatus >= 400);
  const apiFailures = results.networkErrors.filter(e => e.requestUrl?.includes('/api/'));
  const criticalConsole = results.consoleErrors.filter(e =>
    !e.message?.includes('favicon') &&
    !e.message?.includes('ResizeObserver') &&
    !e.message?.includes('Loading chunk') &&
    !e.message?.includes('Non-Error promise rejection')
  );

  results.summary = {
    totalRoutesDiscovered: staticRoutes.length,
    totalPagesVisited: results.pagesVisited.length,
    totalPagesFailed: results.pagesFailed.length,
    totalConsoleErrors: results.consoleErrors.length,
    totalNetworkErrors: results.networkErrors.length,
    criticalConsoleErrors: criticalConsole.length,
    apiFailures: apiFailures.length,
    brokenPagesCount: brokenPages.length,
    buttonsClickedTotal: results.interactions.reduce((s, i) => s + i.buttonsClicked.length, 0),
    buttonsFailedTotal: results.interactions.reduce((s, i) => s + i.buttonsFailed.length, 0),
    formsSubmittedTotal: results.interactions.reduce((s, i) => s + i.formsSubmitted.length, 0),
    formsFailedTotal: results.interactions.reduce((s, i) => s + i.formsFailed.length, 0),
  };

  // Generate markdown report
  const reportPath = join(REPORT_DIR, `audit-${TIMESTAMP}.md`);
  const jsonPath = join(REPORT_DIR, `audit-${TIMESTAMP}.json`);

  writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  let md = `# E2E Audit Report\n\n`;
  md += `**Generated:** ${results.timestamp}\n`;
  md += `**Base URL:** ${BASE_URL}\n`;
  md += `**Start Path:** ${START_PATH}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n|--------|-------|\n`;
  for (const [k, v] of Object.entries(results.summary)) {
    md += `| ${k.replace(/([A-Z])/g, ' $1').trim()} | ${v} |\n`;
  }

  md += `\n## All Discovered Routes (${staticRoutes.length})\n\n`;
  for (const r of staticRoutes) md += `- \`${r}\`\n`;

  md += `\n## Pages That Failed to Load (${results.pagesFailed.length})\n\n`;
  if (results.pagesFailed.length === 0) md += `_None_\n`;
  else for (const p of results.pagesFailed) md += `- **${p.route}** — ${p.reason} (HTTP ${p.httpStatus || 'N/A'})\n`;

  md += `\n## Broken Pages (console or network errors)\n\n`;
  if (brokenPages.length === 0) md += `_None detected_\n`;
  else {
    for (const p of brokenPages) {
      md += `### ${p.route}\n`;
      md += `- HTTP: ${p.httpStatus}\n`;
      md += `- Console errors: ${p.consoleErrorCount}\n`;
      md += `- Network errors: ${p.networkErrorCount}\n\n`;
    }
  }

  md += `\n## Console Errors (${criticalConsole.length} critical)\n\n`;
  if (criticalConsole.length === 0) md += `_None_\n`;
  else {
    const grouped = {};
    for (const e of criticalConsole) {
      const key = e.message?.slice(0, 120) || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e.url);
    }
    for (const [msg, urls] of Object.entries(grouped)) {
      md += `- **${msg}**\n`;
      md += `  - Pages: ${[...new Set(urls)].slice(0, 5).join(', ')}${urls.length > 5 ? ` (+${urls.length - 5} more)` : ''}\n`;
    }
  }

  md += `\n## Network Errors\n\n`;
  md += `### API Failures (${apiFailures.length})\n\n`;
  if (apiFailures.length === 0) md += `_None_\n`;
  else {
    const apiGrouped = {};
    for (const e of apiFailures) {
      const key = `${e.method || 'GET'} ${e.requestUrl} → ${e.status || e.failure}`;
      apiGrouped[key] = (apiGrouped[key] || 0) + 1;
    }
    for (const [k, count] of Object.entries(apiGrouped).sort((a, b) => b[1] - a[1])) {
      md += `- \`${k}\` (×${count})\n`;
    }
  }

  md += `\n### All Network Failures (${results.networkErrors.length})\n\n`;
  const netGrouped = {};
  for (const e of results.networkErrors) {
    const key = `${e.status || e.failure} ${e.requestUrl?.slice(0, 100)}`;
    netGrouped[key] = (netGrouped[key] || 0) + 1;
  }
  for (const [k, count] of Object.entries(netGrouped).sort((a, b) => b[1] - a[1]).slice(0, 50)) {
    md += `- \`${k}\` (×${count})\n`;
  }

  md += `\n## Interaction Failures\n\n`;
  md += `### Button Click Failures\n\n`;
  const btnFails = results.interactions.flatMap(i => i.buttonsFailed.map(b => ({ page: i.url, ...b })));
  if (btnFails.length === 0) md += `_None_\n`;
  else for (const b of btnFails.slice(0, 30)) md += `- ${b.page}: button ${b.index} — ${b.error}\n`;

  md += `\n### Form Submission Failures\n\n`;
  const formFails = results.interactions.flatMap(i => i.formsFailed.map(f => ({ page: i.url, ...f })));
  if (formFails.length === 0) md += `_None_\n`;
  else for (const f of formFails) md += `- ${f.page}: form ${f.form} — ${f.error}\n`;

  md += `\n## Broken Functionality Assessment\n\n`;
  const issues = [];

  if (results.pagesFailed.length > 0) {
    issues.push({ severity: 'HIGH', area: 'Routing', detail: `${results.pagesFailed.length} page(s) failed to load`, items: results.pagesFailed.map(p => p.route) });
  }
  if (apiFailures.length > 0) {
    const uniqueApis = [...new Set(apiFailures.map(e => e.requestUrl))];
    issues.push({ severity: 'HIGH', area: 'API', detail: `${apiFailures.length} API request failure(s) across ${uniqueApis.length} endpoint(s)`, items: uniqueApis.slice(0, 20) });
  }
  if (criticalConsole.length > 0) {
    issues.push({ severity: 'MEDIUM', area: 'Client JS', detail: `${criticalConsole.length} console error(s)`, items: [...new Set(criticalConsole.map(e => e.message?.slice(0, 100)))].slice(0, 15) });
  }
  if (btnFails.length > 5) {
    issues.push({ severity: 'MEDIUM', area: 'UI Interactions', detail: `${btnFails.length} button click failure(s)`, items: btnFails.slice(0, 10).map(b => `${b.page}: ${b.error}`) });
  }
  if (formFails.length > 0) {
    issues.push({ severity: 'MEDIUM', area: 'Forms', detail: `${formFails.length} form submission failure(s)`, items: formFails.map(f => `${f.page}: ${f.error}`) });
  }

  if (issues.length === 0) {
    md += `_No major broken functionality detected during automated audit._\n`;
  } else {
    for (const issue of issues) {
      md += `### [${issue.severity}] ${issue.area}\n\n`;
      md += `${issue.detail}\n\n`;
      for (const item of issue.items) md += `- ${item}\n`;
      md += `\n`;
    }
  }

  writeFileSync(reportPath, md);

  console.log('\n=== AUDIT COMPLETE ===');
  console.log(JSON.stringify(results.summary, null, 2));
  console.log(`\nReport: ${reportPath}`);
  console.log(`JSON:   ${jsonPath}`);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
