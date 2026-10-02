const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { BASE, sql, resetDb } = require('./lib');
const vendored = (pkg) => JSON.parse(require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'node_modules', pkg, 'package.json'), 'utf8')).version;

let browser;
test.before(async () => {
    // CHROMIUM_PATH: use an already installed browser instead of 'npx playwright install chromium'
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
test.after(() => browser.close());

// opens the page, records JS errors, CSP violations and dialogs
async function openPage() {
    const page = await browser.newPage();
    page.errors = [];
    page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
    page.on('dialog', (d) => d.accept());
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
        (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.goto(BASE + '/index.php');
    await page.waitForFunction(() => typeof itemList !== 'undefined' && Array.isArray(itemList));
    return page;
}

test('HTML stored in the database is shown as text, not executed', async () => {
    resetDb();
    sql("INSERT INTO todo (creationDate, description, notes, startDate, list_id) VALUES " +
        "(UTC_TIMESTAMP(), '<img src=x onerror=window.__xss=1>', '\"><img src=x onerror=window.__xss=2>', UTC_DATE(), 0); " +
        "SET @t=LAST_INSERT_ID(); " +
        "INSERT INTO tags (name) VALUES ('<img src=x onerror=window.__xss=3>'); " +
        "INSERT INTO todo_tags VALUES (@t, LAST_INSERT_ID()); " +
        "UPDATE list SET name='Work<img src=x onerror=window.__xss=4>' WHERE id=1; " +
        "INSERT INTO todo (creationDate, description, startDate, list_id) VALUES " +
        "(UTC_TIMESTAMP(), 'Tom &amp; Jerry &lt;b&gt;', UTC_DATE(), 0)");
    const page = await openPage();
    await page.waitForSelector('#todoTable tbody tr');
    await page.waitForTimeout(500);
    const texts = await page.locator('#todoTable tbody td.todo > span:not([class])').allTextContents();
    assert.ok(texts.includes('<img src=x onerror=window.__xss=1>'), texts.join('|'));
    assert.ok(texts.includes('Tom & Jerry <b>'), texts.join('|'));
    assert.deepEqual(await page.locator('#lists li').allTextContents(), ['Main', 'Work<img src=x onerror=window.__xss=4>']);
    await page.locator('#taglist .tagify__tag').first().click();
    await page.keyboard.press('Escape');  // tag dialog is modal
    await page.click('#smallLog');
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.deepEqual(page.errors, []);
    await page.close();
});

test('main workflows work (and do not violate the Content-Security-Policy)', async () => {
    resetDb();
    const page = await openPage();
    // runs with the versions from package-lock.json (vendor/ is checked to match them)
    assert.equal(await page.evaluate(() => $.fn.jquery), vendored('jquery'));
    assert.equal(await page.evaluate(() => $.ui.version), vendored('jquery-ui'));
    await page.fill('#enter_todo', 'tag1: new <i>item</i>');
    await page.click('#enter_save');
    await page.waitForFunction(() => itemList.length == 1 && itemList[0].id > 0);
    const id = await page.evaluate(() => itemList[0].id);
    assert.equal(await page.locator('#todo' + id + ' td.todo > span:not([class])').textContent(), 'new <i>item</i>');

    await page.click('#modify' + id);
    await page.fill('#modify_notes', 'a note');
    await page.click('#modify_save');
    await page.waitForFunction(() => itemList[0].version == 2);
    assert.equal(sql(`SELECT notes FROM todo WHERE id=${id}`).trim(), 'a note');

    // tags are only listed while a todo of the current list has them
    await page.locator('#taglist .tagify__tag').first().click();
    assert.equal(await page.locator('#tag_dialog').isVisible(), true);
    assert.equal(await page.inputValue('#tag_name'), 'tag1');
    await page.click('#tag_delete');
    await page.waitForFunction(() => tagList.length == 0);
    assert.equal(sql('SELECT COUNT(*) FROM tags').trim(), '0');

    await page.click('#completed' + id);
    await page.waitForFunction(() => itemList[0].version == 3);
    await page.click('#trash' + id);
    await page.waitForFunction(() => itemList[0].deleted == 1);
    await page.click('#emptyTrash');
    await page.waitForFunction(() => itemList.length == 0);
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), '0');

    assert.deepEqual(page.errors, []);
    await page.close();
});
