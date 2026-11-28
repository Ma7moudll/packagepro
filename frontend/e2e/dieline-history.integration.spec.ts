import { test, expect } from './local-customer-fixture';
import { loginViaApi } from './helpers';
import { readFileSync } from 'node:fs';
import { serializeSVG } from '../lib/editor/services/dieline-service';
const API = 'http://localhost:3000/api';
// Real disposable API, real editor store and cloud Save. Fixtures were captured
// from the pre-relayout serializer, not reconstructed with the candidate engine.
for (const label of ['mailer-enlarged', 'rigid'])
    test(`historical revision consistency ${label}`, async ({ page, localCustomer }, testInfo) => {
        const auth = await loginViaApi(page, localCustomer.email);
        const headers = { Authorization: `Bearer ${auth.tokens.accessToken}` };
        const file = label === 'rigid' ? 'tests/fixtures/historical-rigid-design.json' : 'tests/fixtures/historical-mailer-enlarged-design.json';
        const old = JSON.parse(readFileSync(file, 'utf8'));
        const cr = await page.request.post(API + '/designs/session', { headers, data: { name: 'Historical revision regression' } });
        const sid = (await cr.json()).data.sessionId;
        const seeded = await page.request.post(API + '/designs/save', { headers, data: { sessionId: sid, designData: old, productId: old.product.id } });
        expect(seeded.ok()).toBeTruthy();
        await page.goto(`/editor?sessionId=${sid}&editorDebug=1`);
        await page.waitForFunction(() => (window as any).__editorStore?.getState().product?.dieline);
        await page.evaluate(() => { (window as any).__qaStore = (window as any).__editorStore; (window as any).__qaStore.getState().setViewMode('dieline'); (window as any).__historicalCore = structuredClone((window as any).__qaStore.getState().history.present); });
        async function inspect(stage: string) {
            const state = await page.evaluate(() => {
                const s = (window as any).__qaStore.getState();
                return {
                    liveCarrier: !!s.storedDielineSnapshot,
                    presentCarrier: !!s.history.present.storedDielineSnapshot,
                };
            });
            expect(state.liveCarrier, `${stage}: live/history agreement`).toBe(state.presentCarrier);
            const cleared = ['edited', 'redo', 'returned', 'material', 'product', 'init-clean', 'init-picker'];
            const preserved = ['loaded', 'undo', 'layer', 'indexeddb'];
            if (cleared.includes(stage)) expect(state.liveCarrier, stage).toBe(false);
            if (preserved.includes(stage)) expect(state.liveCarrier, stage).toBe(true);
        }
        async function save(stage: string) {
            const [response] = await Promise.all([
                page.waitForResponse(r => r.url().endsWith('/designs/save') && r.request().method() === 'POST'),
                page.getByRole('button', { name: /^Save$/ }).click(),
            ]);
            expect(response.ok()).toBeTruthy();
            const result = await page.request.get(API + `/designs/session/${sid}`, { headers });
            const payload = await result.json();
            if (stage === 'loaded') expect(payload.data.designData.manifest.dieline).toEqual(old.manifest.dieline);
            if (stage === 'returned' && label === 'mailer-enlarged') {
                expect(payload.data.designData.manifest.dieline).not.toEqual(old.manifest.dieline);
            }
        }
        await inspect('loaded');
        await save('loaded');
        await page.evaluate(() => (window as any).__qaStore.getState().applyCoreState((c: any) => ({ ...c, layers: [...c.layers, { id: 'history-probe', type: 'text', faceId: 'front', name: 'Synthetic history regression', text: 'QA', position: { x: 20, y: 20 }, size: { width: 80, height: 20 }, rotation: 0, opacity: 1, visible: true, locked: false }] })));
        await inspect('layer');
        const exp = page.getByRole('button', { name: /Export SVG/ });
        if (label === 'mailer-enlarged') {
            await exp.click();
            expect(await page.getByText(/Export blocked:/).count()).toBeGreaterThan(0);
        }
        else {
            const [dl] = await Promise.all([page.waitForEvent('download'), exp.click()]);
            const path = testInfo.outputPath('rigid-historical.svg');
            await dl.saveAs(path);
            expect(readFileSync(path, 'utf8')).toBe(serializeSVG(old.manifest.dieline));
        }
        await page.screenshot({ path: testInfo.outputPath(`${label}-loaded.png`) });
        const dims = old.model.dimensions;
        await page.evaluate(d => (window as any).__qaStore.getState().applyCoreState((c: any) => ({ ...c, model: { ...c.model, dimensions: { ...d, length: d.length + 11 } } })), dims);
        await inspect('edited');
        await page.evaluate(() => (window as any).__qaStore.getState().undo());
        await inspect('undo');
        await page.evaluate(() => (window as any).__qaStore.getState().redo());
        await inspect('redo');
        await page.evaluate(d => (window as any).__qaStore.getState().applyCoreState((c: any) => ({ ...c, model: { ...c.model, dimensions: d } })), dims);
        await inspect('returned');
        await save('returned');
        await page.reload();
        await page.waitForFunction(() => (window as any).__editorStore?.getState().product?.dieline);
        await page.evaluate(() => { (window as any).__qaStore = (window as any).__editorStore; });
        await inspect('reloaded');
        await page.evaluate(() => (window as any).__qaStore.getState().applyCoreState((c: any) => ({ ...c, model: { ...c.model, material: c.model.material + '-edited' } })));
        await inspect('material');
        const switchResponse = await page.request.get(API + '/catalog/custom-product-box/editor-config');
        expect(switchResponse.ok()).toBeTruthy();
        await page.evaluate(cfg => (window as any).__qaStore.getState().initFromEditorConfig(cfg, {preserveHistory:true}), (await switchResponse.json()).data);
        await inspect('product');
        await page.evaluate(old => { (window as any).__historicalCore = { ...old, storedDielineSnapshot: { geometry: old.manifest.dieline, productId: old.product.id } }; }, old);
        const configResponse = await page.request.get(API + '/catalog/custom-mailer-box/editor-config');
        expect(configResponse.ok()).toBeTruthy();
        const cfg = (await configResponse.json()).data;
        await page.evaluate(() => (window as any).__qaStore.getState().applyCoreState(() => structuredClone((window as any).__historicalCore)));
        await page.evaluate(cfg => { const s = (window as any).__qaStore.getState(); s.initFromEditorConfig(cfg, { preserveHistory: true }); }, cfg);
        await inspect('init-picker');
        await page.evaluate(() => (window as any).__qaStore.getState().undo());
        await inspect('undo');
        await page.evaluate(cfg => (window as any).__qaStore.getState().initFromEditorConfig(cfg), cfg);
        await inspect('init-clean');
        // Existing cloud-load failure path falls back to IndexedDB state. Save the
        // restored revision shape there, then exercise the actual loader through UI.
        const restored = { ...old, storedDielineSnapshot: { geometry: old.manifest.dieline, productId: old.product.id } };
        delete restored.manifest;
        await page.evaluate(async ({ sid, restored }) => { await new Promise<void>((resolve, reject) => { const req = indexedDB.open('packagepro-editor', 1); req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('designs'))
            db.createObjectStore('designs', { keyPath: 'id' }); }; req.onerror = () => reject(req.error); req.onsuccess = () => { const db = req.result; const tx = db.transaction('designs', 'readwrite'); tx.objectStore('designs').put({ id: sid, name: 'Synthetic local restore', state: restored, createdAt: 1, updatedAt: 1 }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }; }); }, { sid, restored });
        await page.route('**/api/designs/session/' + sid, route => route.abort());
        await page.goto(`/editor?sessionId=${sid}&editorDebug=1`);
        await page.waitForFunction(() => (window as any).__editorStore?.getState().storedDielineSnapshot);
        await page.evaluate(() => { (window as any).__qaStore = (window as any).__editorStore; });
        await inspect('indexeddb');
        expect(await page.evaluate(() => (window as any).__qaStore.getState().storedDielineSnapshot.geometry)).toEqual(old.manifest.dieline);
        expect(await page.evaluate(() => (window as any).__qaStore.getState().model.dimensions)).toEqual(old.model.dimensions);
    });
for (const slug of ['custom-shipping-box', 'custom-pizza-box'])
    test(`runtime blocked ${slug}`, async ({ page, localCustomer }, testInfo) => { await loginViaApi(page, localCustomer.email); await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(`/editor?product=${slug}&editorDebug=1`); await page.waitForFunction(() => (window as any).__editorStore?.getState().product?.dieline); await page.evaluate(() => (window as any).__editorStore.getState().setViewMode('dieline')); await expect(page.locator('[data-dieline-status]')).toHaveAttribute('data-dieline-status', 'unsupported'); await expect(page.locator('[data-dieline-blocked]')).toHaveAttribute('data-dieline-blocked', 'unsupported-size'); await expect(page.getByRole('button', { name: 'Export SVG' })).toHaveCount(0); await page.screenshot({ path: testInfo.outputPath(slug + '.png') }); });
