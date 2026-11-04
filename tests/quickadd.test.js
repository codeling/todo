const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { BASE, sql, resetDb, session } = require('./lib');

// Adding an entry (Enter, the bar at the bottom of a phone), the messages (they were alert() boxes), and the web app
// manifest. Needs the server and the database, see tests/README.md.
const ROOT = path.join(__dirname, '..');
let browser;
test.before(async () => {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
test.after(() => browser.close());

async function openPage(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 }, ...options });
    const page = await context.newPage();
    page.errors = [];
    page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
    page.on('dialog', (d) => { page.dialogs = (page.dialogs || []).concat(d.type()); d.accept(); });
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
        (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.goto(BASE + '/index.php');
    await page.waitForFunction(() => typeof todoApp !== 'undefined' && Array.isArray(todoApp.state.itemList) && todoApp.state.tagList);
    await page.waitForTimeout(200);
    return page;
}
function seed(count = 1) {
    resetDb();
    for (let i = 1; i <= count; i++) {
        sql(`INSERT INTO todo (creationDate, description, startDate, list_id) VALUES (UTC_TIMESTAMP(), 'Entry ${i}', UTC_DATE(), 0)`);
    }
}
const titles = (page) => page.locator('#todoList .todoTitle').allTextContents();
const toast = (page) => page.locator('.toasts .toast');

test('Enter in the field adds the entry, the field is cleared and keeps the focus for the next one', async () => {
    seed(0);
    const page = await openPage();
    const field = page.locator('#enter_todo');
    assert.equal(await field.getAttribute('placeholder'), 'New entry (or: tag1, tag2: new entry)');
    assert.equal(await field.getAttribute('enterkeyhint'), 'done');
    assert.equal(await field.getAttribute('autocomplete'), 'off');
    assert.equal(await page.locator('#enter_save').getAttribute('aria-label'), 'Add');
    await field.click();
    await page.keyboard.type('home, errands: buy milk');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => todoApp.state.itemList.length == 1 && todoApp.state.itemList[0].id > 0);
    assert.deepEqual(await titles(page), ['buy milk']);
    assert.deepEqual(await page.locator('#todoList .tagChip').allTextContents(), ['home', 'errands']);
    assert.equal(await field.inputValue(), '');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'enter_todo');
    // the next one at once
    await page.keyboard.type('second');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => todoApp.state.itemList.length == 2 && todoApp.state.itemList.every((i) => i.id > 0));
    assert.deepEqual((await titles(page)).sort(), ['buy milk', 'second']);
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), '2');
    assert.deepEqual(page.errors, []);
    assert.equal(page.dialogs, undefined, 'no alert or confirm box');
    await page.context().close();
});

test('an empty entry is refused with a message, not with a box', async () => {
    seed(0);
    const page = await openPage();
    await page.focus('#enter_todo');
    await page.keyboard.press('Enter');
    await toast(page).waitFor();
    assert.equal(await toast(page).locator('.toast_text').textContent(), 'Todo may not be empty!');
    assert.equal(await toast(page).getAttribute('role'), 'alert');
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), '0');
    assert.equal(page.dialogs, undefined, 'no alert box');
    // the page works while the message is there, and the message has a close button
    await page.fill('#enter_todo', 'now it works');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => todoApp.state.itemList.length == 1);
    await toast(page).locator('.toast_close').click();
    assert.equal(await toast(page).count(), 0);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('on a phone the bar to enter an entry is at the bottom and stays there while the list scrolls; the last entry can be reached', async () => {
    seed(40);
    const page = await openPage({ viewport: { width: 360, height: 640 } });
    const bar = () => page.locator('#inputform').boundingBox();
    let box = await bar();
    assert.ok(Math.abs(box.y + box.height - 640) < 1, 'at the bottom: ' + JSON.stringify(box));
    assert.equal(box.width, 360);
    assert.equal(await page.locator('#inputform').evaluate((e) => getComputedStyle(e).position), 'fixed');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    box = await bar();
    assert.ok(Math.abs(box.y + box.height - 640) < 1, 'still at the bottom after scrolling: ' + JSON.stringify(box));
    // the last entry is not hidden behind it
    const last = await page.locator('#todoList > li').last().boundingBox();
    assert.ok(last.y + last.height <= box.y + 1);
    // the field, the due date and the button are one row in it, and big enough
    for (const selector of ['#enter_todo', '.due_picker', '#enter_save']) {
        const b = await page.locator(selector).boundingBox();
        assert.ok(b.y >= box.y && b.y + b.height <= box.y + box.height, `${selector} is in the bar`);
        assert.ok(b.height >= 32, `${selector} is high enough: ${b.height}`);
    }
    // adding from the bar
    await page.fill('#enter_todo', 'from the bar');
    await page.click('#enter_save');
    await page.waitForFunction(() => todoApp.state.itemList.some((i) => i.todo == 'from the bar' && i.id > 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('on a wide screen the line to enter an entry is part of the page, with the start and due date', async () => {
    seed(1);
    const page = await openPage();
    assert.equal(await page.locator('#inputform').evaluate((e) => getComputedStyle(e).position), 'static');
    for (const selector of ['#enter_todo', '#enter_start', '#enter_due', '#enter_save']) {
        assert.equal(await page.locator(selector).isVisible(), true, selector);
    }
    await page.fill('#enter_todo', 'with dates');
    await page.fill('#enter_start', '2099-01-01');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => todoApp.state.itemList.some((i) => i.todo == 'with dates' && i.id > 0));
    assert.equal(sql("SELECT startDate FROM todo WHERE description='with dates'").trim(), '2099-01-01');
    await page.context().close();
});

test('moving an entry to the trash shows a message with Undo, which takes it back', async () => {
    seed(2);
    const page = await openPage();
    const id = await page.evaluate(() => todoApp.state.itemList.find((i) => i.todo == 'Entry 1').id);
    await page.click('#trash' + id);
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).deleted == 1, id);
    await toast(page).waitFor();
    assert.equal(await toast(page).getAttribute('role'), 'status');
    assert.equal(await toast(page).locator('.toast_text').textContent(), 'Successfully deleted.');
    assert.equal(await toast(page).locator('.toast_action').textContent(), 'Undo');
    await toast(page).locator('.toast_action').click();
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).deleted == 0, id);
    assert.equal(sql(`SELECT deleted FROM todo WHERE id=${id}`).trim(), '0');
    assert.equal(await toast(page).count(), 0, 'the message is gone');
    // (restoring from the trash shows no message of this kind)
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('a message which comes while a dialog is open is in the dialog: it is seen and can be closed', async () => {
    seed(1);
    const page = await openPage();
    await page.locator('#todoList > li').first().locator('.todoMain').click();
    assert.equal(await page.locator('#modify_dialog').evaluate((d) => d.open), true);
    await page.route('**/queries/update.php*', (r) => r.fulfill({
        status: 409, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ error: 'changed meanwhile' }) }));
    await page.fill('#modify_todo', 'changed');
    await page.click('#modify_save');
    await toast(page).waitFor();
    assert.match(await toast(page).locator('.toast_text').textContent(), /changed meanwhile$/);
    const onTop = await toast(page).evaluate((t) => {
        const r = t.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return t.contains(hit);
    });
    assert.equal(onTop, true, 'nothing covers the message');
    // it is in the dialog, so that it can be used: the close button works although the dialog is modal
    assert.equal(await page.locator('#modify_dialog .toasts .toast').count(), 1);
    await toast(page).locator('.toast_close').click();
    assert.equal(await toast(page).count(), 0);
    // the dialog stays open, so that the input is not lost
    assert.equal(await page.locator('#modify_dialog').evaluate((d) => d.open), true);
    assert.equal(await page.inputValue('#modify_todo'), 'changed');
    // (the failed request is reported by the browser, on purpose)
    assert.ok(page.errors.every((e) => /409/.test(e)), page.errors.join('|'));
    await page.context().close();
});

test('the web app manifest is linked with credentials, valid, and its files exist', async () => {
    const page = await openPage();
    const link = page.locator('link[rel="manifest"]');
    // (without this the browser asks for the manifest without the login, which the web server answers with 401)
    assert.equal(await link.getAttribute('crossorigin'), 'use-credentials');
    assert.equal(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'), 'todo-180.png');
    assert.match(await page.locator('meta[name="viewport"]').getAttribute('content'), /viewport-fit=cover/);
    const url = new URL(await link.getAttribute('href'), BASE + '/index.php').href;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    const manifest = await response.json();
    const php = fs.readFileSync(path.join(ROOT, 'todo-core.php'), 'utf8');
    assert.equal(manifest.name, php.match(/const AppName = "([^"]+)"/)[1]);
    assert.equal(manifest.short_name, php.match(/const AppTitle = "([^"]+)"/)[1]);
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, 'index.php');
    // the colors are the page background of the light scheme
    const [, light] = fs.readFileSync(path.join(ROOT, 'todo.css'), 'utf8').match(/--page-bg: light-dark\((#[0-9A-Fa-f]{6}),/);
    assert.equal(manifest.background_color.toLowerCase(), light.toLowerCase());
    assert.equal(manifest.theme_color.toLowerCase(), light.toLowerCase());
    for (const icon of manifest.icons) {
        const [width, height] = icon.sizes.split('x').map(Number);
        const png = Buffer.from(await (await fetch(new URL(icon.src, url))).arrayBuffer());
        assert.equal(png.subarray(1, 4).toString(), 'PNG', icon.src);
        assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width, height], icon.src);
    }
    assert.deepEqual(manifest.icons.map((i) => i.sizes), ['192x192', '512x512']);
    const apple = Buffer.from(await (await fetch(BASE + '/todo-180.png')).arrayBuffer());
    assert.deepEqual([apple.readUInt32BE(16), apple.readUInt32BE(20)], [180, 180]);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the manifest and the icons need no more protection than the page: they are not in the deny lists', async () => {
    // (the page and the manifest are both behind the same login; a denied manifest would be a 404 for every phone)
    for (const file of ['manifest.webmanifest', 'todo-180.png', 'todo-192.png', 'todo-512.png']) {
        assert.ok(fs.existsSync(path.join(ROOT, file)), file);
        assert.equal((await fetch(`${BASE}/${file}`)).status, 200, file);
    }
    const htaccess = fs.readFileSync(path.join(ROOT, '.htaccess'), 'utf8');
    assert.match(htaccess, /AddType application\/manifest\+json \.webmanifest/);
    assert.ok(await session());
});
