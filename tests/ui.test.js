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

test('a tag named like JSON is shown as a plain tag, it cannot inject HTML', async () => {
    resetDb();
    // names with a comma can not be created any more (rename is rejected), but may exist from earlier versions
    const attr = '[{"value":"x","onmouseover=window.__xss=1 a":"1"}]';
    const meta = '[{"value":"y","\\"><meta http-equiv=refresh content=\\"0;url=http://127.0.0.1:9/\\"> a":"1"}]';
    const enc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // one todo for each: the tag list of a todo is the single tag name, so it is valid JSON
    for (const name of [attr, meta]) {
        sql("INSERT INTO todo (creationDate, description, startDate, list_id) VALUES (UTC_TIMESTAMP(), 'tagged', UTC_DATE(), 0); " +
            "SET @t=LAST_INSERT_ID(); " +
            `INSERT INTO tags (name) VALUES ('${enc(name)}'); INSERT INTO todo_tags VALUES (@t, LAST_INSERT_ID())`);
    }
    const page = await openPage();
    await page.waitForSelector('#todoTable tbody tr .tagify__tag');
    const values = await page.locator('#todoTable tbody tr .tagify__tag').evaluateAll(
        (tags) => tags.map((t) => t.__tagifyTagData.value));
    assert.ok(values.length > 0 && values.every((v) => typeof v === 'string'), JSON.stringify(values));
    assert.ok(values.some((v) => v.includes('onmouseover=window.__xss=1')), JSON.stringify(values));
    // not a single attribute or element came from the JSON
    assert.equal(await page.locator('tag[onmouseover], tag[a], meta[http-equiv]').count(), 0);
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.equal(new URL(page.url()).pathname, '/index.php');
    assert.deepEqual(page.errors, []);
    await page.close();
});


test('completed entries with the same completion date and start are ordered by description', async () => {
    resetDb();
    // inserted in ascending order: when the comparison said "less" in both directions, the sort reversed them
    sql("SET @c = UTC_TIMESTAMP(); " +
        "INSERT INTO todo (creationDate, description, startDate, completed, completionDate, list_id) VALUES " +
        "(@c, 'apple', UTC_DATE(), 1, @c, 0), " +
        "(@c, 'banana', UTC_DATE(), 1, @c, 0), " +
        "(@c, 'cherry', UTC_DATE(), 1, @c, 0), " +
        "(@c, 'newest', UTC_DATE(), 1, @c + INTERVAL 1 SECOND, 0), " +
        "(@c, 'no start', NULL, 1, @c, 0); " +
        "INSERT INTO todo (creationDate, description, startDate, list_id) VALUES (@c, 'open', UTC_DATE(), 0)");
    const page = await openPage();
    await page.waitForSelector('#todoTable tbody tr');
    // open before completed, then the most recently completed, a missing start is last
    assert.deepEqual(await page.locator('#todoTable tbody td.todo > span:not([class])').allTextContents(),
        ['open', 'newest', 'apple', 'banana', 'cherry', 'no start']);
    const violations = await page.evaluate(() => {
        const bad = [];
        for (const a of itemList) {
            for (const b of itemList) {
                const ab = Math.sign(ItemSort(a, b));
                const ba = Math.sign(ItemSort(b, a));
                // antisymmetric, and only an item is equal to itself
                if (ab !== -ba || (a === b) !== (ab === 0)) {
                    bad.push(a.todo + ' / ' + b.todo + ': ' + ab + ', ' + ba);
                }
            }
        }
        return bad;
    });
    assert.deepEqual(violations, []);
    assert.deepEqual(page.errors, []);
    await page.close();
});

test('a todo just added can be started today and tapped to edit without reloading', async () => {
    resetDb();
    const page = await openPage();
    // start in the future, else "do today" has nothing to change
    await page.fill('#enter_todo', 'first');
    await page.fill('#enter_start', '2099-01-01');
    await page.click('#enter_save');
    await page.waitForFunction(() => itemList.length == 1 && itemList[0].id > 0);
    const first = await page.evaluate(() => itemList[0].id);
    const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('queries/update.php'), { timeout: 5000 }),
        page.click('#dotoday' + first)
    ]);
    assert.match(await response.text(), /^\d+$/);
    await page.waitForFunction(() => itemList[0].version == 2);
    assert.equal(sql(`SELECT startDate = UTC_DATE() FROM todo WHERE id=${first}`).trim(), '1');

    // the edit button is hidden on narrow screens, a tap on the todo opens the dialog
    await page.setViewportSize({ width: 400, height: 800 });
    await page.fill('#enter_todo', 'second');
    await page.click('#enter_save');
    await page.waitForFunction(() => itemList.length == 2 && itemList.every((i) => i.id > 0));
    const second = await page.evaluate(() => itemList.find((i) => i.todo == 'second').id);
    assert.equal(await page.locator('#modify_dialog').isVisible(), false);
    await page.click(`#todo${second} td.todo`);
    assert.equal(await page.locator('#modify_dialog').isVisible(), true);
    assert.equal(await page.inputValue('#modify_id'), String(second));
    assert.equal(await page.inputValue('#modify_todo'), 'second');
    assert.deepEqual(page.errors, []);
    await page.close();
});

test('the checkbox is unchecked again when completing an entry fails', async () => {
    resetDb();
    sql("INSERT INTO todo (creationDate, description, startDate, list_id) VALUES (UTC_TIMESTAMP(), 'open', UTC_DATE(), 0)");
    const page = await openPage();
    await page.waitForSelector('#todoTable tbody tr');
    const id = await page.evaluate(() => itemList[0].id);
    const alerts = [];
    page.on('dialog', (d) => alerts.push(d.message()));

    // the server answers something else than 1
    await page.route('**/queries/complete.php*', (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'some error' }));
    let dialog = page.waitForEvent('dialog');
    await page.click('#completed' + id);
    await dialog;
    await page.evaluate(() => 0);  // the handler goes on after the alert was accepted
    assert.equal(alerts.length, 1);
    assert.ok(alerts[0].endsWith('some error'), alerts[0]);
    assert.equal(await page.isChecked('#completed' + id), false);

    // the request fails
    await page.unroute('**/queries/complete.php*');
    await page.route('**/queries/complete.php*', (r) => r.abort());
    dialog = page.waitForEvent('dialog');
    await page.click('#completed' + id);
    await dialog;
    await page.evaluate(() => 0);
    assert.equal(alerts.length, 2);
    assert.equal(await page.isChecked('#completed' + id), false);

    // nothing was changed, and the entry can still be completed
    assert.equal(sql(`SELECT completed FROM todo WHERE id=${id}`).trim(), '0');
    await page.unroute('**/queries/complete.php*');
    await page.click('#completed' + id);
    await page.waitForFunction(() => itemList[0].completed == 1);
    assert.equal(await page.isChecked('#completed' + id), true);
    assert.equal(sql(`SELECT completed FROM todo WHERE id=${id}`).trim(), '1');
    // the failed request is reported by the browser, on purpose
    assert.deepEqual(page.errors, ['Failed to load resource: net::ERR_FAILED']);
    await page.close();
});
