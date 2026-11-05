const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { BASE, sql, resetDb } = require('./lib');

// The entries are list items: the checkbox, the text with what else there is to know below it, the date and the
// button for the trash; a tap on the text opens the dialog which has all other actions. Needs the server and the
// database, see tests/README.md.
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
    page.on('dialog', (d) => d.accept());
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
        (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.goto(BASE + '/index.php');
    await page.waitForFunction(() => typeof todoApp !== 'undefined' && Array.isArray(todoApp.state.itemList) && todoApp.state.tagList);
    await page.waitForSelector('#todoList > li');
    // entries which start later are only shown on request ("Peek upcoming")
    await page.click('#loadIncomplete');
    await page.waitForFunction(() => todoApp.state.itemList.some((i) => i.todo == 'Starts later'));
    await page.waitForTimeout(200);
    return page;
}

const LONG = 'A very long title which goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on';

function seed() {
    resetDb();
    sql("INSERT INTO todo (creationDate, description, notes, startDate, dueDate, list_id, recurrenceMode, recurrenceInterval) VALUES " +
        "(UTC_TIMESTAMP(), 'Overdue with a note', 'remember the milk', DATE_SUB(UTC_DATE(), INTERVAL 5 DAY), DATE_SUB(UTC_DATE(), INTERVAL 2 DAY), 0, 0, 1), " +
        "(UTC_TIMESTAMP(), 'Starts later', NULL, DATE_ADD(UTC_DATE(), INTERVAL 20 DAY), NULL, 0, 0, 1), " +
        "(UTC_TIMESTAMP(), 'Plain', NULL, UTC_DATE(), DATE_ADD(UTC_DATE(), INTERVAL 400 DAY), 0, 0, 1), " +
        `(UTC_TIMESTAMP(), '${LONG}', NULL, UTC_DATE(), NULL, 0, 0, 1), ` +
        "(UTC_TIMESTAMP(), 'Done and repeating', NULL, UTC_DATE(), NULL, 0, 4, 1), " +
        "(UTC_TIMESTAMP(), 'In the trash', NULL, UTC_DATE(), NULL, 0, 0, 1); " +
        "UPDATE todo SET completed=1, completionDate=UTC_TIMESTAMP() WHERE description='Done and repeating'; " +
        "UPDATE todo SET deleted=1 WHERE description='In the trash'; " +
        "INSERT INTO tags (name) VALUES ('home'); INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g WHERE t.description='Plain'");
}
const row = (page, text) => page.locator('#todoList > li', { hasText: text });
const idOf = (page, text) => page.evaluate((t) => todoApp.state.itemList.find((i) => i.todo.startsWith(t)).id, text);

test('an entry is a list item: checkbox, text, date and the button for the trash; no table, line number or effort', async () => {
    seed();
    const page = await openPage();
    assert.equal(await page.locator('table, td, th, tr').count(), 0);
    assert.equal(await page.locator('#todoList').evaluate((e) => e.tagName), 'UL');
    const plain = row(page, 'Plain');
    assert.equal(await plain.evaluate((e) => e.tagName), 'LI');
    assert.equal(await plain.locator('input[type="checkbox"]').count(), 1);
    assert.equal(await plain.locator('.todoMain').evaluate((e) => e.tagName), 'BUTTON');
    assert.equal(await plain.locator('.todoTitle').textContent(), 'Plain');
    assert.match(await plain.locator('.todoDue').textContent(), /^\d{4}-\d\d-\d\d\s*$/);
    assert.equal(await plain.locator('.todoActions button').count(), 1);
    assert.equal(await plain.locator('.todoActions button').getAttribute('aria-label'), 'Delete');
    // (the buttons which were in every row are in the dialog now)
    assert.equal(await plain.locator('.editButton, .todayButton, .reactivateButton').count(), 0);
    assert.equal(await plain.locator('.todo_lineNr, .effort').count(), 0);
    // the checkbox has a name for assistive technology, and a place of at least 36 x 44 to tap
    assert.equal(await plain.locator('input[type="checkbox"]').getAttribute('aria-label'), 'Done');
    const tap = await plain.locator('.completed').boundingBox();
    assert.ok(tap.width >= 36 && tap.height >= 44, 'the checkbox can be tapped: ' + JSON.stringify(tap));
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('what else there is to know is below the text: a note, that it recurs, a start which is to come, the tags', async () => {
    seed();
    const page = await openPage();
    const note = row(page, 'Overdue with a note');
    assert.equal(await note.locator('.todoMeta .note').getAttribute('title'), 'remember the milk');
    assert.equal(await note.locator('.todoMeta .note svg').count(), 1);
    assert.equal(await note.locator('.todoStart').count(), 0, 'a start in the past is not shown');
    const later = row(page, 'Starts later');
    assert.match(await later.locator('.todoStart').textContent(), /^Start \d{4}-\d\d-\d\d$/);
    assert.equal(await row(page, 'Plain').locator('.todoMeta .tagChip').textContent(), 'home');
    assert.equal(await row(page, 'Done and repeating').locator('.todoMeta .recurring svg').count(), 1);
    assert.match(await row(page, 'Done and repeating').locator('.recurring').getAttribute('title'), /year/);
    // the tooltip of the entry says when it was created
    assert.match(await row(page, 'Plain').locator('.todoMain').getAttribute('title'), /^Created: \d{4}-\d\d-\d\d/);
    // below the text, not beside it
    const title = await note.locator('.todoTitle').boundingBox();
    const meta = await note.locator('.todoMeta').boundingBox();
    assert.ok(meta.y >= title.y + title.height - 1, 'the meta line is below the title');
    // an entry without any of it has no empty line
    assert.equal(await row(page, 'In the trash').locator('.todoMeta').count(), 0);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('a long title has two lines at most, and does not push the date or the button out', async () => {
    seed();
    for (const width of [1000, 320]) {
        const page = await openPage({ viewport: { width, height: 700 } });
        const long = row(page, 'A very long title');
        const title = await long.locator('.todoTitle').evaluate((e) => {
            const lineHeight = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2;
            return { height: e.getBoundingClientRect().height, lineHeight, full: e.scrollHeight };
        });
        if (width === 320) {
            assert.ok(title.height <= title.lineHeight * 2 + 2, `two lines at most at ${width}px: ${JSON.stringify(title)}`);
            assert.ok(title.full > title.height, 'and more text than that');
        }
        const button = await long.locator('.todoActions button').boundingBox();
        assert.ok(button.x + button.width <= width, `the button is on the screen at ${width}px`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `the page is not wider than ${width}px`);
        await page.context().close();
    }
});

test('a tap or click on the entry opens its dialog, on a wide and on a narrow screen, and so does the keyboard', async () => {
    seed();
    for (const width of [1000, 400]) {
        const page = await openPage({ viewport: { width, height: 700 } });
        const id = await idOf(page, 'Plain');
        await row(page, 'Plain').locator('.todoMain').click();
        assert.equal(await page.locator('#modify_dialog').evaluate((d) => d.open), true, `${width}px`);
        assert.equal(await page.inputValue('#modify_todo'), 'Plain');
        assert.equal(await page.inputValue('#modify_id'), String(id));
        await page.keyboard.press('Escape');
        // the checkbox and the trash button do not open it
        await row(page, 'Plain').locator('input[type="checkbox"]').click();
        await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).completed == 1, id);
        assert.equal(await page.locator('#modify_dialog').evaluate((d) => d.open), false);
        // keyboard: the entry is a button
        await page.focus('#open' + id);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#modify_dialog').evaluate((d) => d.open), true);
        await page.keyboard.press('Escape');
        assert.deepEqual(page.errors, []);
        await page.context().close();
        seed();
    }
});

test('the dialog of an entry has the actions which only make sense for that entry', async () => {
    seed();
    const page = await openPage();
    const visible = async () => {
        const result = [];
        for (const id of ['dotoday', 'reactivate', 'trash', 'restore']) {
            if (await page.locator('#modify_' + id).isVisible()) result.push(id);
        }
        result.push((await page.locator('#modify_save').isDisabled()) ? 'save disabled' : 'save');
        return result;
    };
    const open = async (text) => {
        await row(page, text).locator('.todoMain').click();
        return visible();
    };
    // an open entry which starts in the future: do today, delete
    assert.deepEqual(await open('Starts later'), ['dotoday', 'trash', 'save']);
    await page.keyboard.press('Escape');
    // an open one which has started: nothing to do today
    assert.deepEqual(await open('Plain'), ['trash', 'save']);
    await page.keyboard.press('Escape');
    // a completed recurring one: reactivate
    assert.deepEqual(await open('Done and repeating'), ['reactivate', 'trash', 'save']);
    await page.keyboard.press('Escape');
    // one in the trash: restore, and it cannot be changed
    assert.deepEqual(await open('In the trash'), ['restore', 'save disabled']);
    await page.keyboard.press('Escape');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the actions of the dialog work and close it: do today, delete, restore, reactivate', async () => {
    seed();
    const page = await openPage();
    const closed = async () => assert.equal(await page.locator('#modify_dialog').evaluate((d) => d.open), false);

    const later = await idOf(page, 'Starts later');
    await row(page, 'Starts later').locator('.todoMain').click();
    await page.click('#modify_dotoday');
    await closed();
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).version == 2, later);
    assert.equal(sql(`SELECT startDate = UTC_DATE() FROM todo WHERE id=${later}`).trim(), '1');
    assert.equal(await row(page, 'Starts later').locator('.todoStart').count(), 0);

    const plain = await idOf(page, 'Plain');
    const plainVersion = await page.evaluate((i) => todoApp.state.itemList.find((e) => e.id == i).version, plain);
    await row(page, 'Plain').locator('.todoMain').click();
    await page.click('#modify_trash');
    await closed();
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).deleted == 1, plain);
    assert.equal(await page.locator(`#todo${plain}`).evaluate((e) => e.classList.contains('todo_deleted')), true);
    await row(page, 'Plain').locator('.todoMain').click();
    await page.click('#modify_restore');
    await closed();
    // (shown at once; the version is that of the server's answers: one for the trash, one for the restore)
    await page.waitForFunction(([i, v]) => todoApp.state.itemList.find((e) => e.id == i).version == v + 2,
        [plain, plainVersion]);
    assert.equal(await page.evaluate((i) => todoApp.state.itemList.find((e) => e.id == i).deleted, plain), 0);
    assert.equal(sql(`SELECT deleted FROM todo WHERE id=${plain}`).trim(), '0');

    await row(page, 'Done and repeating').locator('.todoMain').click();
    await page.click('#modify_reactivate');
    await closed();
    await page.waitForFunction(() => todoApp.state.itemList.filter((e) => e.todo == 'Done and repeating').length == 2);
    assert.equal(sql("SELECT COUNT(*) FROM todo WHERE description='Done and repeating'").trim(), '2');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the trash button of a row moves the entry to the trash and back, the checkbox completes it', async () => {
    seed();
    const page = await openPage();
    const id = await idOf(page, 'Plain');
    await page.click('#trash' + id);
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).deleted == 1, id);
    assert.equal(await page.locator('#restore' + id).getAttribute('aria-label'), 'Restore');
    assert.equal(await page.locator('#todo' + id + ' input[type="checkbox"]').isDisabled(), true);
    // a deleted entry is struck through and grey
    const style = await page.locator('#todo' + id + ' .todoTitle').evaluate((e) => getComputedStyle(e).textDecorationLine);
    assert.equal(style, 'line-through');
    await page.click('#restore' + id);
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).deleted == 0, id);
    await page.click('#completed' + id);
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).completed == 1, id);
    assert.equal(await page.locator('#todo' + id).evaluate((e) => e.classList.contains('todo_completed')), true);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('an overdue entry has its date in red, with a warning sign on a wide screen only', async () => {
    seed();
    const wide = await openPage();
    const date = row(wide, 'Overdue with a note').locator('.todoDue');
    assert.equal(await row(wide, 'Overdue with a note').evaluate((e) => e.classList.contains('overdue')), true);
    assert.equal(await date.locator('.exclamation svg').isVisible(), true);
    const red = await date.evaluate((e) => getComputedStyle(e).color);
    const plain = await row(wide, 'Plain').locator('.todoDue').evaluate((e) => getComputedStyle(e).color);
    assert.notEqual(red, plain);
    await wide.context().close();
    const narrow = await openPage({ viewport: { width: 400, height: 700 } });
    assert.equal(await row(narrow, 'Overdue with a note').locator('.exclamation').isVisible(), false);
    assert.equal(await row(narrow, 'Overdue with a note').locator('.todoDue').evaluate((e) => getComputedStyle(e).color), red);
    // the year of a date is not shown on a narrow screen if it is the current one
    assert.equal(await row(narrow, 'Overdue with a note').locator('.date_year').isVisible(), false);
    assert.match(await row(narrow, 'Overdue with a note').locator('.todoDue').innerText(), /^\d\d-\d\d\s*$/);
    assert.match(await row(narrow, 'Plain').locator('.todoDue').innerText(), /^\d{4}-\d\d-\d\d\s*$/);   // (next year: with the year)
    await narrow.context().close();
});

test('at 320px a row is at least 44px high, nothing scrolls sideways, and the bar to enter an entry fits', async () => {
    seed();
    const page = await openPage({ viewport: { width: 320, height: 700 } });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page is wider than the screen');
    for (const height of await page.locator('#todoList > li').evaluateAll((rows) => rows.map((r) => r.getBoundingClientRect().height))) {
        assert.ok(height >= 44, 'a row is ' + height + 'px high');
    }
    for (const selector of ['#enter_todo', '.due_picker', '#enter_save']) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= 320, `${selector} is on the screen: ${JSON.stringify(box)}`);
    }
    const picker = await page.locator('.due_picker').boundingBox();
    assert.ok(picker.width >= 44 && picker.height >= 36, 'the due date can be tapped: ' + JSON.stringify(picker));
    // the text field, the due date and the button are one row (the bar at the bottom), and the field has the rest
    const field = await page.locator('#enter_todo').boundingBox();
    assert.ok(field.width >= 180, 'the field is wide: ' + field.width);
    assert.ok(Math.abs(field.y + field.height / 2 - (picker.y + picker.height / 2)) < 12, 'one row');
    // an entry which is added shows at once, with a due date
    await page.fill('#enter_todo', 'added on a phone');
    await page.fill('#enter_due', '2099-12-31');
    assert.equal(await page.locator('#enter_due_label').textContent(), '2099-12-31');
    await page.click('#enter_save');
    await page.waitForFunction(() => todoApp.state.itemList.some((i) => i.todo == 'added on a phone' && i.id > 0));
    assert.equal(await row(page, 'added on a phone').locator('.todoDue').textContent().then((t) => t.trim()), '2099-12-31');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the entries are ordered as before, and striped', async () => {
    seed();
    const page = await openPage();
    assert.deepEqual(await page.locator('#todoList .todoTitle').allTextContents(),
        ['Overdue with a note', 'Plain', LONG, 'Starts later', 'Done and repeating', 'In the trash']);
    const background = (n) => page.locator('#todoList > li').nth(n).evaluate((e) => getComputedStyle(e).backgroundColor);
    assert.notEqual(await background(0), await background(1));
    assert.equal(await background(0), await background(2));
    assert.deepEqual(page.errors, []);
    await page.context().close();
});
