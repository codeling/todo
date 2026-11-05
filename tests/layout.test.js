const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { BASE, sql, resetDb } = require('./lib');

// The layout of the list page: the header with its menu, the lists as tabs, the tags as chips which filter,
// and the statistics page with the same header. Needs the server and the database, see tests/README.md.
let browser;
test.before(async () => {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
test.after(() => browser.close());

async function openPage(pagePath = '/index.php', options = {}) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 }, ...options });
    const page = await context.newPage();
    page.errors = [];
    page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
    page.on('dialog', (d) => d.accept());
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
        (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.goto(BASE + pagePath);
    if (pagePath.startsWith('/index.php')) {
        await page.waitForFunction(() => typeof todoApp !== 'undefined' && Array.isArray(todoApp.state.itemList) && todoApp.state.tagList);
        await page.waitForSelector('#todoList > li');
        await page.waitForTimeout(200);
    }
    return page;
}

function seed({ trash = false } = {}) {
    resetDb();
    sql("INSERT INTO todo (creationDate, description, startDate, list_id) VALUES " +
        "(UTC_TIMESTAMP(), 'Buy milk', UTC_DATE(), 0), (UTC_TIMESTAMP(), 'Write report', UTC_DATE(), 0), " +
        "(UTC_TIMESTAMP(), 'Call Bob', UTC_DATE(), 0), (UTC_TIMESTAMP(), 'Untagged', UTC_DATE(), 0), " +
        "(UTC_TIMESTAMP(), 'Work item', UTC_DATE(), 1); " +
        "INSERT INTO tags (name) VALUES ('home'), ('work'), ('office'); " +
        "INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g WHERE " +
        "(t.description='Buy milk' AND g.name='home') OR (t.description='Write report' AND g.name='work') OR " +
        "(t.description='Call Bob' AND g.name IN ('home', 'work')) OR (t.description='Work item' AND g.name='office')");
    if (trash) sql("UPDATE todo SET deleted=1 WHERE description='Untagged'");
}

const titles = (page) => page.locator('#todoList .todoTitle').allTextContents();
const chips = (page) => page.locator('#tagbar .tagFilter').evaluateAll((c) => c.map((e) => [e.getAttribute('data-tag'), e.getAttribute('aria-pressed'), e.querySelector('.tagCount').textContent]));
const openMenu = async (page) => {
    await page.click('#menu_button');
    await page.waitForSelector('#main_menu:popover-open');
};

test('the sidebar and the small log are gone', async () => {
    seed();
    const page = await openPage();
    assert.equal(await page.locator('#sidebar, #smallLog, #logLink, #taglist, #filter, #filter_tag_edit').count(), 0);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the lists are tabs: the one which is shown is marked, a tab shows its entries and clears the filter', async () => {
    seed();
    const page = await openPage();
    const tabs = () => page.locator('#lists .listTab').evaluateAll((t) => t.map((e) => [e.textContent, e.getAttribute('aria-current')]));
    assert.deepEqual(await tabs(), [['Main', 'true'], ['Work', 'false']]);
    assert.equal(await page.locator('#lists').getAttribute('aria-label'), 'Lists');
    // the lists are chosen rarely: the tabs are below the entries
    const list = await page.locator('#todoList').boundingBox();
    const lists = await page.locator('#lists').boundingBox();
    assert.ok(lists.y >= list.y + list.height, 'the tabs are below the entries');
    assert.deepEqual((await titles(page)).sort(), ['Buy milk', 'Call Bob', 'Untagged', 'Write report']);

    // a filter of this list ...
    await page.click('#tagbar .tagFilter[data-tag="home"]');
    assert.deepEqual((await titles(page)).sort(), ['Buy milk', 'Call Bob']);
    // ... does not stay when another list is shown
    await page.click('#lists .listTab:has-text("Work")');
    await page.waitForFunction(() => todoApp.state.itemList.length == 1 && todoApp.state.itemList[0].todo == 'Work item');
    assert.deepEqual(await tabs(), [['Main', 'false'], ['Work', 'true']]);
    assert.deepEqual(await titles(page), ['Work item']);
    assert.deepEqual(await page.evaluate(() => todoApp.state.filterTags), []);
    await page.waitForFunction(() => document.querySelectorAll('#tagbar .tagFilter').length == 1);
    assert.deepEqual((await chips(page)).map((c) => c[0]), ['office']);
    // and back
    await page.click('#lists .listTab:has-text("Main")');
    await page.waitForFunction(() => todoApp.state.itemList.length == 4);
    assert.deepEqual(await tabs(), [['Main', 'true'], ['Work', 'false']]);
    // a tab is a button, so the keyboard works
    await page.focus('#lists .listTab:has-text("Work")');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => todoApp.state.itemList.length == 1);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the tags are chips above the table: a pressed chip filters, any of the pressed tags counts, pressing again undoes it', async () => {
    seed();
    const page = await openPage();
    assert.deepEqual(await chips(page), [['home', 'false', '2'], ['work', 'false', '2']]);
    assert.equal(await page.locator('#tagbar').getAttribute('aria-label'), 'Filter by tag');
    await page.click('#tagbar .tagFilter[data-tag="work"]');
    assert.deepEqual(await chips(page), [['home', 'false', '2'], ['work', 'true', '2']]);
    assert.deepEqual((await titles(page)).sort(), ['Call Bob', 'Write report']);
    await page.click('#tagbar .tagFilter[data-tag="home"]');
    assert.deepEqual((await titles(page)).sort(), ['Buy milk', 'Call Bob', 'Write report']);
    await page.click('#tagbar .tagFilter[data-tag="work"]');
    assert.deepEqual((await titles(page)).sort(), ['Buy milk', 'Call Bob']);
    await page.click('#tagbar .tagFilter[data-tag="home"]');
    assert.deepEqual((await titles(page)).sort(), ['Buy milk', 'Call Bob', 'Untagged', 'Write report']);
    // the tags of an entry are plain chips too, which do not filter
    assert.deepEqual(await page.locator('#todoList > li', { hasText: 'Call Bob' }).locator('.tagChip').allTextContents(), ['home', 'work']);
    assert.equal(await page.locator('#todoList .tagChip').first().evaluate((e) => e.tagName), 'SPAN');
    // there is no Tagify in the rows any more: it is only in the fields of the dialogs
    assert.equal(await page.locator('#todoList .tagify, #tagbar .tagify').count(), 0);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the tag chips are only those of the entries which are shown, with their counts', async () => {
    seed();
    // a tag of a completed entry which is too old to be shown, and of a second entry which is shown
    sql("INSERT INTO todo (creationDate, description, startDate, list_id, completed, completionDate) VALUES " +
        "(UTC_TIMESTAMP(), 'Ancient', UTC_DATE(), 0, 1, UTC_TIMESTAMP() - INTERVAL 100 DAY); " +
        "INSERT INTO tags (name) VALUES ('archive'); " +
        "INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g WHERE t.description='Ancient' AND g.name IN ('archive', 'home')");
    const page = await openPage();
    assert.deepEqual((await titles(page)).sort(), ['Buy milk', 'Call Bob', 'Untagged', 'Write report']);
    // (the count of 'home' is of the shown entries, too: 'Ancient' is not one of them)
    assert.deepEqual(await chips(page), [['home', 'false', '2'], ['work', 'false', '2']]);
    // after "load more", the entry and its tag are there
    await page.evaluate(() => { todoApp.state.reloadData.age = 200; });
    await page.evaluate(() => document.querySelector('#loadMoreCompleted').click());
    await page.waitForFunction(() => document.querySelector('#tagbar .tagFilter[data-tag="archive"]'));
    assert.deepEqual(await chips(page), [['home', 'false', '3'], ['work', 'false', '2'], ['archive', 'false', '1']]);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('many tag chips take at most two rows on a narrow screen, a button shows all of them', async () => {
    resetDb();
    const names = Array.from({ length: 16 }, (_, i) => 'tag-number-' + String(i).padStart(2, '0'));
    sql("INSERT INTO todo (creationDate, description, startDate, list_id) VALUES (UTC_TIMESTAMP(), 'Many tags', UTC_DATE(), 0); " +
        "INSERT INTO tags (name) VALUES " + names.map((n) => "('" + n + "')").join(', ') + "; " +
        "INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g");
    const page = await openPage('/index.php', { viewport: { width: 360, height: 700 } });
    const rows = () => page.evaluate(() => new Set([...document.querySelectorAll('#tagbar .tagFilter')]
        .filter((c) => !c.inert).map((c) => c.offsetTop)).size);
    const toggle = page.locator('#tagToggle');
    assert.equal(await toggle.isVisible(), true);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await rows(), 2);
    assert.match(await toggle.textContent(), /^\+\d+/);
    // a chip which does not fit cannot be reached with the keyboard
    assert.ok(await page.locator('#tagbar .tagFilter[inert]').count() > 0);
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.ok(await rows() > 2);
    assert.equal(await page.locator('#tagbar .tagFilter[inert]').count(), 0);
    await toggle.click();
    assert.equal(await rows(), 2);
    // a wider window fits more chips into the two rows: fewer are left for the button
    const hiddenBefore = Number((await toggle.textContent()).match(/\d+/)[0]);
    await page.setViewportSize({ width: 700, height: 700 });
    await page.waitForFunction((before) => Number(document.querySelector('#tagToggle').textContent.match(/\d+/)[0]) < before, hiddenBefore);
    assert.equal(await rows(), 2);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('a tag which is deleted is no filter any more', async () => {
    seed();
    const page = await openPage();
    await page.click('#tagbar .tagFilter[data-tag="work"]');
    assert.deepEqual((await titles(page)).sort(), ['Call Bob', 'Write report']);
    await openMenu(page);
    await page.click('#manageTags');
    await page.locator('#tags_dialog_list .tagManage[data-tag="work"]').click();
    await page.click('#tag_delete');
    await page.waitForFunction(() => !document.querySelector('#tagbar .tagFilter[data-tag="work"]'));
    await page.waitForFunction(() => todoApp.state.filterTags.length == 0);
    assert.deepEqual((await titles(page)).sort(), ['Buy milk', 'Call Bob', 'Untagged', 'Write report']);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the menu has Statistics, Manage tags, Show log, and Empty trash only if there is something in the trash', async () => {
    seed();
    const page = await openPage();
    assert.equal(await page.locator('#main_menu').isVisible(), false);
    await openMenu(page);
    assert.equal(await page.locator('#emptyTrash').isVisible(), false);
    assert.equal(await page.getAttribute('#statisticsLink', 'href'), 'statistics.php');
    for (const id of ['#manageTags', '#statisticsLink', '#showLog']) assert.equal(await page.locator(id).isVisible(), true, id);
    // below its button, inside the screen
    const menu = await page.locator('#main_menu').boundingBox();
    const button = await page.locator('#menu_button').boundingBox();
    assert.ok(menu.y >= button.y + button.height, 'below the button');
    assert.ok(menu.x >= 0 && menu.x + menu.width <= 1000, 'inside the screen: ' + JSON.stringify(menu));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#main_menu').isVisible(), false);

    // an item closes the menu
    await openMenu(page);
    await page.click('#showLog');
    assert.equal(await page.locator('#main_menu').isVisible(), false);
    assert.equal(await page.locator('#log_dialog').evaluate((d) => d.open), true);
    await page.keyboard.press('Escape');

    // a click elsewhere closes it too
    await openMenu(page);
    await page.mouse.click(20, 400);
    assert.equal(await page.locator('#main_menu').isVisible(), false);

    // with something in the trash: shown, and it empties it (and is hidden again)
    await page.click('#trash' + await page.evaluate(() => todoApp.state.itemList.find((i) => i.todo == 'Untagged').id));
    await page.waitForFunction(() => todoApp.state.itemList.some((i) => i.deleted == 1));
    await openMenu(page);
    assert.equal(await page.locator('#emptyTrash').isVisible(), true);
    await page.click('#emptyTrash');
    await page.waitForFunction(() => !todoApp.state.itemList.some((i) => i.deleted == 1));
    assert.equal(sql("SELECT COUNT(*) FROM todo WHERE description='Untagged'").trim(), '0');
    await openMenu(page);
    assert.equal(await page.locator('#emptyTrash').isVisible(), false);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the dialog "Manage tags" lists the tags with their counts and leads to the dialog of the tag; without tags it says so', async () => {
    seed();
    const page = await openPage();
    await openMenu(page);
    await page.click('#manageTags');
    assert.equal(await page.locator('#tags_dialog').evaluate((d) => d.open && d.matches(':modal')), true);
    assert.equal(await page.locator('#tags_dialog_title').textContent(), 'Manage tags');
    assert.deepEqual(await page.locator('#tags_dialog_list .tagManage').allTextContents(), ['home2', 'work2']);
    await page.locator('#tags_dialog_list .tagManage[data-tag="home"]').click();
    assert.equal(await page.locator('#tags_dialog').evaluate((d) => d.open), false);
    assert.equal(await page.locator('#tag_dialog').evaluate((d) => d.open), true);
    assert.equal(await page.inputValue('#tag_name'), 'home');
    assert.equal(await page.inputValue('#tag_count'), '2');
    await page.keyboard.press('Escape');

    resetDb();
    sql("INSERT INTO todo (creationDate, description, startDate, list_id) VALUES (UTC_TIMESTAMP(), 'No tags', UTC_DATE(), 0)");
    await page.reload();
    await page.waitForFunction(() => todoApp.state.tagList && todoApp.state.itemList);
    await openMenu(page);
    await page.click('#manageTags');
    assert.equal(await page.locator('#tags_dialog_list').textContent(), 'There are no tags yet.');
    assert.equal(await page.locator('#tagbar .tagFilter').count(), 0);
    assert.equal(await page.locator('#tagbar').isVisible(), false);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

for (const width of [320, 400]) {
    test(`at ${width}px the header fits, the page does not scroll sideways and the tabs and chips are big enough to tap`, async () => {
        seed({ trash: true });
        sql("INSERT INTO list (id, name, user_id) VALUES (3, 'A list with a long name', 0), (4, 'Another one', 0), (5, 'And one more', 0)");
        const page = await openPage('/index.php', { viewport: { width, height: 700 } });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page is wider than the screen');
        for (const selector of ['#headerLine h1', '.themeswitch', '#menu_button']) {
            const box = await page.locator(selector).boundingBox();
            assert.ok(box.x >= 0 && box.x + box.width <= width, `${selector} is on the screen: ${JSON.stringify(box)}`);
        }
        // many lists scroll in their own row, not the page
        const scroll = await page.locator('#lists').evaluate((e) => [e.clientWidth, e.scrollWidth]);
        assert.ok(scroll[1] > scroll[0], 'the lists scroll: ' + scroll);
        for (const selector of ['#lists .listTab', '#tagbar .tagFilter', '#menu_button', '.themeswitch']) {
            const box = await page.locator(selector).first().boundingBox();
            assert.ok(box.height >= 32 && box.width >= 32, `${selector} can be tapped: ${JSON.stringify(box)}`);
        }
        await openMenu(page);
        for (const box of await page.locator('#main_menu .menuItem:visible').evaluateAll((items) => items.map((i) => i.getBoundingClientRect().height))) {
            assert.ok(box >= 40, 'menu item ' + box);
        }
        const menu = await page.locator('#main_menu').boundingBox();
        assert.ok(menu.x >= 0 && menu.x + menu.width <= width, 'the menu is on the screen: ' + JSON.stringify(menu));
        assert.deepEqual(page.errors, []);
        await page.context().close();
        resetDb();
    });
}

test('the statistics page has the same header: title, link back, color scheme button; no sideways scrolling at 320px', async () => {
    resetDb();
    const page = await openPage('/statistics.php', { viewport: { width: 320, height: 700 } });
    await page.waitForSelector('.stat_chart');
    assert.equal(await page.locator('#headerLine h1').textContent(), 'Statistics');
    assert.equal(await page.getAttribute('#headerActions a', 'href'), 'index.php');
    assert.equal(await page.locator('#headerActions .themeswitch').count(), 1);
    for (const selector of ['#headerLine h1', '#headerActions a', '.themeswitch']) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= 320, `${selector} is on the screen: ${JSON.stringify(box)}`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page is wider than the screen');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});
