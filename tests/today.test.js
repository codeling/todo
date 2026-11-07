const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { BASE, sql, resetDb } = require('./lib');

// Issue #2: a due date is soft (it only orders the list) or fixed (a real deadline). The open entries with a fixed
// due date which has passed or is today are in the sections "Overdue" and "Today" above all others ("Later");
// "Today only" shows just these; "Do today" makes an entry due today. Needs the server and the database, see
// tests/README.md.
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
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
        (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.goto(BASE + '/index.php');
    await page.waitForFunction(() => typeof todoApp !== 'undefined' && Array.isArray(todoApp.state.itemList) && todoApp.state.tagList);
    await page.waitForSelector('#todoList > li');
    return page;
}

// (the dates are those of the database; the browser runs in the same time zone in the tests)
function seed() {
    resetDb();
    sql("INSERT INTO todo (creationDate, description, startDate, dueDate, dueFixed, list_id) VALUES " +
        "(UTC_TIMESTAMP(), 'Soft overdue', DATE_SUB(UTC_DATE(), INTERVAL 30 DAY), DATE_SUB(UTC_DATE(), INTERVAL 20 DAY), 0, 0), " +
        "(UTC_TIMESTAMP(), 'Fixed overdue recently', DATE_SUB(UTC_DATE(), INTERVAL 10 DAY), DATE_SUB(UTC_DATE(), INTERVAL 1 DAY), 1, 0), " +
        "(UTC_TIMESTAMP(), 'Fixed overdue long ago', DATE_SUB(UTC_DATE(), INTERVAL 5 DAY), DATE_SUB(UTC_DATE(), INTERVAL 3 DAY), 1, 0), " +
        "(UTC_TIMESTAMP(), 'Fixed today', DATE_SUB(UTC_DATE(), INTERVAL 40 DAY), UTC_DATE(), 1, 0), " +
        "(UTC_TIMESTAMP(), 'Soft today', DATE_SUB(UTC_DATE(), INTERVAL 2 DAY), UTC_DATE(), 0, 0), " +
        "(UTC_TIMESTAMP(), 'Fixed later', DATE_SUB(UTC_DATE(), INTERVAL 1 DAY), DATE_ADD(UTC_DATE(), INTERVAL 9 DAY), 1, 0), " +
        "(UTC_TIMESTAMP(), 'No due date', UTC_DATE(), NULL, 0, 0), " +
        "(UTC_TIMESTAMP(), 'Done', UTC_DATE(), DATE_SUB(UTC_DATE(), INTERVAL 1 DAY), 1, 0); " +
        "UPDATE todo SET completed=1, completionDate=UTC_TIMESTAMP() WHERE description='Done'; " +
        "INSERT INTO tags (name) VALUES ('work'); " +
        "INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g WHERE t.description IN ('Fixed today', 'No due date')");
}
const row = (page, text) => page.locator('#todoList > li.todoItem', { hasText: text });
const titles = (page) => page.locator('#todoList .todoTitle').allTextContents();
const headings = (page) => page.locator('#todoList .sectionHeading').evaluateAll((items) =>
    items.map((h) => h.getAttribute('data-section') + ' ' + h.querySelector('.sectionCount').textContent));
const idOf = (page, text) => page.evaluate((t) => todoApp.state.itemList.find((i) => i.todo == t).id, text);

test('fixed due dates which have passed or are today are in sections on top; soft ones stay in the order of the list', async () => {
    seed();
    const page = await openPage();
    assert.deepEqual(await titles(page), [
        // the oldest due date first
        'Fixed overdue long ago', 'Fixed overdue recently',
        'Fixed today',
        // by start, as before (a soft due date which has passed is no reason to be on top)
        'Soft overdue', 'Soft today', 'Fixed later', 'No due date',
        'Done']);
    assert.deepEqual(await headings(page), ['overdue 2', 'today 1', 'later 4']);
    assert.deepEqual(await page.locator('#todoList .sectionTitle').evaluateAll((h) => h.map((e) => e.firstChild.textContent)),
        ['Overdue', 'Today', 'Later']);
    // the headings are list items before the first entry of their section
    assert.equal(await page.locator('#todoList > li').first().getAttribute('data-section'), 'overdue');
    // red: only the fixed dates which have passed; the one of today is highlighted, not red
    const has = (text, cls) => row(page, text).evaluate((e, c) => e.classList.contains(c), cls);
    for (const [text, overdue, today, soft] of [['Fixed overdue long ago', true, false, false], ['Fixed today', false, true, false],
        ['Soft overdue', false, false, true], ['Soft today', false, false, true], ['Fixed later', false, false, false]]) {
        assert.deepEqual([await has(text, 'overdue'), await has(text, 'dueToday'), await has(text, 'dueSoft')], [overdue, today, soft], text);
    }
    const color = (text) => row(page, text).locator('.todoDue').evaluate((e) => getComputedStyle(e).color);
    const background = (text) => row(page, text).evaluate((e) => getComputedStyle(e).backgroundColor);
    assert.notEqual(await color('Fixed today'), await color('Fixed overdue long ago'));
    assert.notEqual(await background('Fixed today'), await background('Soft today'));
    assert.notEqual(await background('Fixed today'), await background('Fixed overdue recently'));
    // the tooltip of the date says what kind of date it is
    assert.equal(await row(page, 'Fixed overdue long ago').locator('.todoDue').getAttribute('title'), 'Overdue for 3 day(s)');
    assert.equal(await row(page, 'Soft today').locator('.todoDue').getAttribute('title'), 'Due date which only orders the list');
    assert.equal(await row(page, 'Fixed later').locator('.todoDue').getAttribute('title'), 'Fixed date');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('without a fixed date which has passed or is today there are no headings', async () => {
    seed();
    sql("UPDATE todo SET dueFixed=0 WHERE description IN ('Fixed overdue recently', 'Fixed overdue long ago', 'Fixed today')");
    const page = await openPage();
    assert.equal(await page.locator('#todoList .sectionHeading').count(), 0);
    assert.equal(await page.locator('#todoList .overdue, #todoList .dueToday').count(), 0);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('"Today only" shows only the sections "Overdue" and "Today", also with a tag filter, and says when there is nothing', async () => {
    seed();
    const page = await openPage();
    const toggle = page.locator('#todayOnly');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await toggle.getAttribute('aria-label'), 'Show only overdue and today');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(await toggle.getAttribute('aria-label'), 'Show all entries');
    assert.deepEqual(await titles(page), ['Fixed overdue long ago', 'Fixed overdue recently', 'Fixed today']);
    assert.deepEqual(await headings(page), ['overdue 2', 'today 1']);
    // the tag filter applies as well
    await page.click('#tagbar .tagFilter[data-tag="work"]');
    assert.deepEqual(await titles(page), ['Fixed today']);
    assert.deepEqual(await headings(page), ['today 1']);
    // nothing left: a line says so
    await row(page, 'Fixed today').locator('input[type="checkbox"]').click();
    await page.waitForFunction(() => todoApp.state.itemList.find((i) => i.todo == 'Fixed today').completed == 1);
    assert.deepEqual(await titles(page), []);
    assert.equal(await page.locator('#todoList .sectionEmpty').textContent(), 'Nothing is overdue or due today.');
    // and all again
    await page.click('#tagbar .tagFilter[data-tag="work"]');
    await toggle.click();
    assert.equal((await titles(page)).length, 8);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('"Fixed date" in the dialog is a toggle (the pin), is saved, and moves the entry into its section', async () => {
    seed();
    const page = await openPage();
    await row(page, 'Soft today').locator('.todoMain').click();
    const fixed = page.locator('#modify_dueFixed');
    const pressed = () => fixed.getAttribute('aria-pressed');
    assert.equal(await pressed(), 'false');
    assert.equal(await fixed.getAttribute('aria-label'), 'Fixed date');
    // what it means is in the help text of the due date (shown with the help button, else only a tooltip)
    assert.match(await page.locator('#modify_due_help').textContent(), /real deadline/);
    assert.equal(await page.locator('#modify_due_help').isVisible(), false);
    await fixed.click();
    assert.equal(await pressed(), 'true');
    await page.click('#modify_save');
    await page.waitForFunction(() => todoApp.state.itemList.find((i) => i.todo == 'Soft today').dueFixed == 1);
    assert.equal(sql("SELECT dueFixed FROM todo WHERE description='Soft today'").trim(), '1');
    assert.deepEqual(await headings(page), ['overdue 2', 'today 2', 'later 3']);
    assert.equal(await row(page, 'Soft today').evaluate((e) => e.classList.contains('dueToday')), true);
    // it is shown pressed when the dialog is opened again; clearing the due date switches it off
    await row(page, 'Soft today').locator('.todoMain').click();
    assert.equal(await pressed(), 'true');
    await page.fill('#modify_due', '');
    assert.equal(await pressed(), 'false');
    await page.keyboard.press('Escape');
    // as in the line to enter an entry: without a due date it enters today, and takes it away again
    await row(page, 'No due date').locator('.todoMain').click();
    assert.equal(await pressed(), 'false');
    await fixed.click();
    assert.equal(await pressed(), 'true');
    assert.equal(await page.inputValue('#modify_due'), await page.evaluate(() => {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }));
    await fixed.click();
    assert.equal(await page.inputValue('#modify_due'), '');
    await page.fill('#modify_due', '2099-01-01');
    await fixed.click();
    assert.equal(await page.inputValue('#modify_due'), '2099-01-01');
    await page.click('#modify_save');
    await page.waitForFunction(() => todoApp.state.itemList.find((i) => i.todo == 'No due date').dueFixed == 1);
    assert.equal(sql("SELECT dueDate, dueFixed FROM todo WHERE description='No due date'").trim(), '2099-01-01\t1');
    await page.keyboard.press('Escape');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('"Do today" makes any open entry due today (fixed), and Undo brings its dates back', async () => {
    seed();
    const page = await openPage();
    const id = await idOf(page, 'Fixed later');
    const before = sql(`SELECT startDate, dueDate, dueFixed FROM todo WHERE id=${id}`).trim();
    await row(page, 'Fixed later').locator('.todoMain').click();
    // (an entry which started long ago: "Do today" is there all the same)
    assert.equal(await page.locator('#modify_dotoday').isVisible(), true);
    await page.click('#modify_dotoday');
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).version == 2, id);
    assert.equal(sql(`SELECT dueDate = UTC_DATE(), dueFixed FROM todo WHERE id=${id}`).trim(), '1\t1');
    assert.deepEqual(await headings(page), ['overdue 2', 'today 2', 'later 3']);
    assert.equal(await row(page, 'Fixed later').evaluate((e) => e.classList.contains('dueToday')), true);
    // it is in "Today" now, so the dialog does not offer it again
    await row(page, 'Fixed later').locator('.todoMain').click();
    assert.equal(await page.locator('#modify_dotoday').isVisible(), false);
    await page.keyboard.press('Escape');
    const toast = page.locator('#toasts .toast', { hasText: 'Due today' });
    await toast.locator('.toast_action').click();
    await page.waitForFunction((i) => todoApp.state.itemList.find((e) => e.id == i).version == 3, id);
    assert.equal(sql(`SELECT startDate, dueDate, dueFixed FROM todo WHERE id=${id}`).trim(), before);
    assert.deepEqual(await headings(page), ['overdue 2', 'today 1', 'later 4']);
    // an entry which starts later starts today as well (it would be hidden else)
    sql("INSERT INTO todo (creationDate, description, startDate, list_id) VALUES (UTC_TIMESTAMP(), 'Starts later', DATE_ADD(UTC_DATE(), INTERVAL 5 DAY), 0)");
    await page.click('#loadIncomplete');
    await page.waitForFunction(() => todoApp.state.itemList.some((i) => i.todo == 'Starts later'));
    await row(page, 'Starts later').locator('.todoMain').click();
    await page.click('#modify_dotoday');
    await page.waitForFunction(() => todoApp.state.itemList.find((e) => e.todo == 'Starts later').version == 2);
    assert.equal(sql("SELECT startDate = UTC_DATE(), dueDate = UTC_DATE(), dueFixed FROM todo WHERE description='Starts later'").trim(), '1\t1\t1');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('"Fixed date" in the line to enter an entry makes the due date a deadline; without a date it enters today', async () => {
    seed();
    const page = await openPage();
    const pressed = () => page.getAttribute('#enter_fixed', 'aria-pressed');
    const added = (text) => page.waitForFunction((t) => todoApp.state.itemList.some((i) => i.todo == t && i.id > 0), text);
    const today = await page.evaluate(() => new Date().toLocaleDateString('sv'));
    const isToday = (text) => row(page, text).evaluate((e) => e.classList.contains('dueToday'));
    assert.equal(await pressed(), 'false');
    // a due date of today which is picked only orders the list
    await page.fill('#enter_todo', 'Picked today');
    await page.fill('#enter_due', today);
    await page.click('#enter_save');
    await added('Picked today');
    assert.equal(sql("SELECT dueDate = UTC_DATE(), dueFixed FROM todo WHERE description='Picked today'").trim(), '1\t0');
    assert.equal(await isToday('Picked today'), false);
    // switched on without a date: today, one click; switched off again, the date goes away
    await page.click('#enter_fixed');
    assert.equal(await pressed(), 'true');
    assert.equal(await page.inputValue('#enter_due'), today);
    await page.click('#enter_fixed');
    assert.equal(await page.inputValue('#enter_due'), '');
    await page.fill('#enter_todo', 'work: For today');
    await page.click('#enter_fixed');
    await page.focus('#enter_todo');
    await page.keyboard.press('Enter');
    await added('For today');
    assert.equal(sql("SELECT startDate = UTC_DATE(), dueDate = UTC_DATE(), dueFixed FROM todo WHERE description='For today'").trim(), '1\t1\t1');
    assert.equal(await isToday('For today'), true);
    assert.deepEqual(await headings(page), ['overdue 2', 'today 2', 'later 5']);
    // it is off again for the next one, and the line is empty
    assert.equal(await pressed(), 'false');
    assert.equal(await page.inputValue('#enter_due'), '');
    // a date which was picked stays when it is switched on, and off again
    await page.fill('#enter_todo', 'Deadline later');
    await page.fill('#enter_due', '2099-01-01');
    await page.click('#enter_fixed');
    await page.click('#enter_fixed');
    assert.equal(await page.inputValue('#enter_due'), '2099-01-01');
    await page.click('#enter_fixed');
    await page.click('#enter_save');
    await added('Deadline later');
    assert.equal(sql("SELECT dueDate, dueFixed FROM todo WHERE description='Deadline later'").trim(), '2099-01-01\t1');
    // while only overdue and today are shown it is on (with today), else a new entry would not be seen
    await page.click('#todayOnly');
    assert.equal(await pressed(), 'true');
    assert.equal(await page.inputValue('#enter_due'), today);
    await page.fill('#enter_todo', 'Seen in today only');
    await page.click('#enter_save');
    await added('Seen in today only');
    assert.ok((await titles(page)).includes('Seen in today only'));
    assert.equal(await pressed(), 'true');
    await page.click('#todayOnly');
    assert.equal(await pressed(), 'false');
    assert.equal(await page.inputValue('#enter_due'), '');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('on a phone the toggle is in the header row, nothing scrolls sideways, and the sections are shown the same way', async () => {
    seed();
    const page = await openPage({ viewport: { width: 320, height: 700 } });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page is wider than the screen');
    const title = await page.locator('#headerLine h1').boundingBox();
    const toggle = await page.locator('#todayOnly').boundingBox();
    assert.ok(toggle.x >= 0 && toggle.x + toggle.width <= 320, 'the toggle is on the screen: ' + JSON.stringify(toggle));
    assert.ok(Math.abs((toggle.y + toggle.height / 2) - (title.y + title.height / 2)) < 12, 'in the row of the title');
    assert.ok(toggle.width >= 32 && toggle.height >= 32, 'the toggle can be tapped: ' + JSON.stringify(toggle));
    assert.deepEqual(await headings(page), ['overdue 2', 'today 1', 'later 4']);
    // the entries are at least 44px high, the headings do not have to be
    for (const height of await page.locator('#todoList > li.todoItem').evaluateAll((rows) => rows.map((r) => r.getBoundingClientRect().height))) {
        assert.ok(height >= 44, 'a row is ' + height + 'px high');
    }
    await page.click('#todayOnly');
    assert.deepEqual(await titles(page), ['Fixed overdue long ago', 'Fixed overdue recently', 'Fixed today']);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});
