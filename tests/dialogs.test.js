const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { BASE, sql, resetDb } = require('./lib');

// The dialogs are native <dialog> elements (index.php, js/dialogs.js, the end of todo.css). Needs the server and
// the database, see tests/README.md.
let browser;
test.before(async () => {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
test.after(() => browser.close());

async function openPage(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 }, ...options });
    const page = await context.newPage();
    page.errors = [];
    page.requests = [];
    page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
    page.on('request', (r) => page.requests.push(r.url()));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
        (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.goto(BASE + '/index.php');
    await page.waitForFunction(() => typeof todoApp !== 'undefined' && Array.isArray(todoApp.state.itemList));
    await page.waitForSelector('#todoList > li');
    await page.waitForTimeout(300);
    return page;
}

function seed() {
    resetDb();
    sql("INSERT INTO todo (creationDate, description, notes, startDate, list_id) VALUES (UTC_TIMESTAMP(), 'First entry', 'some notes', UTC_DATE(), 0), " +
        "(UTC_TIMESTAMP(), 'Second entry', NULL, UTC_DATE(), 0); " +
        "INSERT INTO tags (name) VALUES ('work'), ('worry'), ('home'); " +
        "INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g WHERE t.description='First entry' AND g.name='home'; " +
        // (the tags of the page are those of entries: a tag without one is not offered)
        "INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g WHERE t.description='Second entry' AND g.name IN ('work', 'worry')");
}

const isOpen = (page, selector) => page.locator(selector).evaluate((d) => d.open && d.matches(':modal'));
// the dialog of a tag: the menu, "Manage tags", and the tag in that list
async function openTagDialogFor(page, name) {
    await page.click('#menu_button');
    await page.click('#manageTags');
    await page.locator('#tags_dialog_list .tagManage', { hasText: name }).first().click();
    await page.waitForSelector('#tag_dialog[open]');
}
const edit = (page) => page.locator('#todoList > li').first().locator('.todoMain').click();

test('jQuery UI is gone: no script, no style sheet, no $.ui', async () => {
    seed();
    const page = await openPage();
    assert.equal(await page.evaluate(() => typeof $.ui), 'undefined');
    assert.deepEqual(page.requests.filter((u) => /jquery-ui/.test(u)), []);
    assert.equal(await page.locator('.ui-dialog, .ui-widget-overlay').count(), 0);
    await page.context().close();
});

test('the entry dialog is modal, closes with Escape, Cancel and the close button, and keeps the focus off the fields', async () => {
    seed();
    const page = await openPage();
    assert.equal(await page.locator('#modify_dialog').isVisible(), false);
    await edit(page);
    assert.equal(await isOpen(page, '#modify_dialog'), true);
    assert.equal(await page.locator('#modify_dialog_title').textContent(), 'Modify ToDo entry');
    // the fields show the entry
    assert.equal(await page.inputValue('#modify_todo'), 'First entry');
    assert.equal(await page.inputValue('#modify_notes'), 'some notes');
    // no field has the focus, so the keyboard of a phone does not pop up; the page behind is inert
    assert.equal(await page.evaluate(() => document.activeElement.className), 'dialog_body');
    assert.equal(await page.evaluate(() => document.querySelector('#enter_todo').matches(':modal') || false), false);

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modify_dialog').isVisible(), false);
    await edit(page);
    await page.click('#modify_dialog .dialog_footer [data-dialog-close]');   // Cancel
    assert.equal(await page.locator('#modify_dialog').isVisible(), false);
    await edit(page);
    await page.click('#modify_dialog .dialog_close');
    assert.equal(await page.locator('#modify_dialog').isVisible(), false);
    // (the log says that it was closed, once for each time)
    // (the "close" event follows a moment after the dialog is closed)
    await page.waitForFunction(() => todoApp.logItems.filter((l) => l == 'Modify-Dialog closed').length == 3);

    // saving closes it and shows the change
    await edit(page);
    await page.fill('#modify_todo', 'First entry, changed');
    await page.click('#modify_save');
    await page.waitForFunction(() => document.querySelector('#modify_dialog').open === false);
    assert.equal(await page.locator('#todoList .todoTitle').first().textContent(), 'First entry, changed');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

// the list of suggestions of Tagify must be above the modal dialog (the top layer), not behind it
async function assertDropdownUsable(page, dialogSelector, inputBox) {
    const dropdown = page.locator('.tagify__dropdown:visible');
    await dropdown.first().waitFor();
    // (the list slides in for a third of a second)
    await page.waitForSelector('.tagify__dropdown:not(.tagify__dropdown--initial)');
    await page.waitForTimeout(500);
    const result = await page.evaluate(([dialogSel]) => {
        const dropdownEl = [...document.querySelectorAll('.tagify__dropdown')].find((d) => d.offsetParent !== null || getComputedStyle(d).display !== 'none');
        const item = dropdownEl.querySelector('.tagify__dropdown__item');
        const r = item.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
            inDialog: document.querySelector(dialogSel).contains(dropdownEl),
            itemOnTop: item === top || item.contains(top),
            itemTop: r.top, itemLeft: r.left
        };
    }, [dialogSelector]);
    assert.equal(result.inDialog, true, 'the list is in the dialog');
    assert.equal(result.itemOnTop, true, 'the first suggestion is not covered by anything');
    // below (not above or beside) the field which it belongs to
    assert.ok(result.itemTop >= inputBox.y + inputBox.height - 4, `list at ${result.itemTop}, field ends at ${inputBox.y + inputBox.height}`);
    assert.ok(Math.abs(result.itemLeft - inputBox.x) < 40, `list at x ${result.itemLeft}, field at ${inputBox.x}`);
}

test('the suggestions of the tag fields in the dialogs are shown above them, next to the field, and can be chosen', async () => {
    seed();
    const page = await openPage();
    await edit(page);
    const field = page.locator('#modify_dialog tags.tagify');
    const box = await field.boundingBox();
    await page.locator('#modify_dialog .tagify__input').click();
    await page.keyboard.type('wor');
    await assertDropdownUsable(page, '#modify_dialog', box);
    // "wor" is the start of two tags
    assert.equal(await page.locator('.tagify__dropdown__item:visible').count(), 2);
    await page.locator('.tagify__dropdown__item:visible', { hasText: 'worry' }).click();
    assert.deepEqual(await page.evaluate(() => todoApp.state.modifyTagify.value.map((t) => t.value)), ['home', 'worry']);
    await page.keyboard.press('Escape');   // closes the list, and then the dialog
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modify_dialog').isVisible(), false);

    // the tag dialog: the target of a merge
    await openTagDialogFor(page, 'work');
    assert.equal(await isOpen(page, '#tag_dialog'), true);
    assert.equal(await page.inputValue('#tag_name'), 'work');
    const mergeBox = await page.locator('#tag_dialog .modify_line tags.tagify').boundingBox();
    await page.locator('#tag_dialog .modify_line tags.tagify').click();
    await assertDropdownUsable(page, '#tag_dialog', mergeBox);
    await page.locator('.tagify__dropdown__item:visible', { hasText: 'worry' }).click();
    assert.deepEqual(await page.evaluate(() => todoApp.state.mergeTagify.value.map((t) => t.value)), ['worry']);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the log and the tag dialog open and close', async () => {
    seed();
    const page = await openPage();
    await page.click('#menu_button');
    await page.click('#showLog');
    assert.equal(await isOpen(page, '#log_dialog'), true);
    assert.match(await page.locator('#log_dialog_text').textContent(), /Loading finished/);
    assert.equal(await page.locator('#log_dialog_title').textContent(), 'Log');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#log_dialog').isVisible(), false);
    await openTagDialogFor(page, 'home');
    assert.equal(await isOpen(page, '#tag_dialog'), true);
    await page.click('#tag_dialog .dialog_close');
    assert.equal(await page.locator('#tag_dialog').isVisible(), false);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('on a narrow screen a dialog fills the screen, its body scrolls and the footer stays in view', async () => {
    seed();
    const page = await openPage({ viewport: { width: 400, height: 700 } });
    await page.locator('#todoList > li').first().locator('.todoMain').click();   // a tap on the entry
    assert.equal(await isOpen(page, '#modify_dialog'), true);
    const box = await page.locator('#modify_dialog').boundingBox();
    assert.deepEqual([box.x, box.y, box.width, box.height], [0, 0, 400, 700]);
    // a screen which is too low for the form: the body scrolls, the footer with Save is still on the screen
    await page.setViewportSize({ width: 400, height: 320 });
    const body = await page.locator('#modify_dialog .dialog_body').evaluate((e) => [e.scrollHeight, e.clientHeight]);
    assert.ok(body[0] > body[1], 'the body scrolls: ' + body);
    const save = await page.locator('#modify_save').boundingBox();
    assert.ok(save.y >= 0 && save.y + save.height <= 320, 'Save is on the screen: ' + JSON.stringify(save));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scrolling');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('on a wide screen a dialog is centered, not wider than its size and not wider than the screen', async () => {
    seed();
    const page = await openPage();
    await edit(page);
    const box = await page.locator('#modify_dialog').boundingBox();
    assert.ok(box.width <= 500.5, 'width ' + box.width);
    assert.ok(Math.abs(box.x + box.width / 2 - 500) < 2, 'centered: ' + box.x);
    await page.keyboard.press('Escape');
    // rotating or resizing a phone: the dialog is never wider than the screen
    await page.setViewportSize({ width: 450, height: 700 });
    await page.locator('#todoList > li').first().locator('.todoMain').click();
    assert.ok((await page.locator('#modify_dialog').boundingBox()).width <= 450);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the dialogs follow the color scheme: dark background, readable title, a visible backdrop', async () => {
    seed();
    const page = await openPage({ colorScheme: 'dark' });
    await edit(page);
    const colors = await page.locator('#modify_dialog').evaluate((d) => {
        const s = getComputedStyle(d);
        return { background: s.backgroundColor, color: s.color, backdrop: getComputedStyle(d, '::backdrop').backgroundColor,
            title: getComputedStyle(d.querySelector('.dialog_title')).color };
    });
    assert.equal(colors.background, 'rgb(28, 28, 30)');
    assert.equal(colors.title, 'rgb(228, 228, 228)');
    // (the backdrop was almost invisible with jQuery UI, so a modal dialog did not look modal)
    assert.match(colors.backdrop, /rgba\(0, 0, 0, 0\.65\)/);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});
