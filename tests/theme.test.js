const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { BASE, sql, resetDb, session, post } = require('./lib');

// The color scheme: system, light or dark (cookie todo_theme, queries/theme.php, js/theme.js, the custom properties
// of todo.css). Needs the server and the database, see tests/README.md.
const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

let browser;
test.before(async () => {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
test.after(() => browser.close());

// ---- the endpoint and the pages (no browser)

async function rawPost(sess, params, withToken = true) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (sess) {
        headers.Cookie = sess.cookie;
        if (withToken) headers['X-CSRF-Token'] = sess.token;
    }
    return fetch(BASE + '/queries/theme.php', { method: 'POST', headers, body: new URLSearchParams(params).toString() });
}

test('the endpoint sets the cookie for a valid mode and refuses everything else', async () => {
    const sess = await session();
    // no session, or no token: like the other endpoints
    assert.equal((await rawPost(null, { mode: 'dark' })).status, 403);
    assert.equal((await rawPost(sess, { mode: 'dark' }, false)).status, 403);
    assert.equal((await fetch(BASE + '/queries/theme.php')).status, 405);

    for (const mode of ['', 'blue', 'DARK', 'dark ']) {
        const res = await rawPost(sess, { mode });
        assert.equal(res.status, 400, JSON.stringify(mode));
        assert.equal(typeof (await res.json()).error, 'string');
        assert.equal(res.headers.get('set-cookie'), null, 'no cookie for ' + JSON.stringify(mode));
    }

    const dark = await rawPost(sess, { mode: 'dark' });
    assert.equal(dark.status, 200);
    assert.deepEqual(await dark.json(), { ok: true, mode: 'dark' });
    const cookie = dark.headers.get('set-cookie');
    assert.match(cookie, /^todo_theme=dark;/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /path=\/(;|$)/i);
    assert.match(cookie, /Expires=/i);

    // "auto" is the default and needs no cookie: the cookie is deleted
    const auto = await rawPost(sess, { mode: 'auto' });
    assert.equal(auto.status, 200);
    assert.match(auto.headers.get('set-cookie'), /^todo_theme=;|^todo_theme=deleted;/);
    assert.match(auto.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970|Max-Age=0|Expires=\w+, \d+-\w+-19/i);
});

async function html(pagePath, cookie) {
    const res = await fetch(BASE + pagePath, cookie ? { headers: { Cookie: cookie } } : {});
    assert.equal(res.status, 200, pagePath);
    return res.text();
}
const rootTag = (text) => text.match(/<html[^>]*>/)[0];

test('the pages are drawn in the chosen scheme from the start; no or a wrong cookie is the system\'s', async () => {
    for (const page of ['/index.php', '/statistics.php']) {
        assert.doesNotMatch(rootTag(await html(page)), /data-theme/, page + ' without a cookie');
        assert.doesNotMatch(rootTag(await html(page, 'todo_theme=blue')), /data-theme/, page + ' with a wrong value');
        assert.doesNotMatch(rootTag(await html(page, 'todo_theme=auto')), /data-theme/, page + ' with "auto"');
        assert.match(rootTag(await html(page, 'todo_theme=dark')), / data-theme="dark"/, page);
        assert.match(rootTag(await html(page, 'todo_theme=light')), / data-theme="light"/, page);
        const text = await html(page);
        // both schemes are declared, so that form controls and scroll bars follow; the colors of the address bar
        assert.match(text, /<meta name="color-scheme" content="light dark">/);
        assert.match(text, /<meta name="theme-color" media="\(prefers-color-scheme: light\)" content="#F8F8F8">/);
        assert.match(text, /<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="#1c1c1e">/);
        // the button, with the label of the scheme in use and the icons of all three
        assert.match(text, /<button type="button" class="themeswitch" title="Color scheme: system/);
        for (const mode of ['auto', 'light', 'dark']) assert.match(text, new RegExp('icon-theme-' + mode));
        assert.match(await html(page, 'todo_theme=dark'), /class="themeswitch" title="Color scheme: dark/);
    }
});

test('the colors of the address bar are the page background of todo.css, and the files which the button needs exist', () => {
    const css = read('todo.css');
    const [, light, dark] = css.match(/--page-bg: light-dark\((#[0-9A-Fa-f]{6}), (#[0-9A-Fa-f]{6})\)/);
    const php = read('todo-core.php');
    assert.ok(php.includes(`'light' => '${light}'`), 'light ' + light);
    assert.ok(php.includes(`'dark' => '${dark}'`), 'dark ' + dark);
    for (const mode of ['auto', 'light', 'dark']) {
        assert.ok(fs.existsSync(path.join(ROOT, 'webicons', 'icons', `theme-${mode}.svg`)), mode);
    }
    for (const lang of ['en-US', 'de-DE']) {
        const ini = read(`lang/${lang}.ini`);
        for (const key of ['THEME_AUTO', 'THEME_LIGHT', 'THEME_DARK']) assert.match(ini, new RegExp('^' + key + '=', 'm'), lang + ' ' + key);
    }
    // the favicon is visible on a dark tab strip too, and has no color of its own for its dark parts
    const favicon = read('todo.svg');
    assert.match(favicon, /prefers-color-scheme:dark/);
    assert.doesNotMatch(favicon, /stroke="#000"/);
});

// ---- in the browser

async function openPage(pagePath, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 }, ...options });
    const page = await context.newPage();
    page.errors = [];
    page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
        (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.goto(BASE + pagePath);
    await page.waitForSelector('.themeswitch');
    if (pagePath.startsWith('/index.php')) {
        await page.waitForFunction(() => typeof todoApp !== 'undefined' && Array.isArray(todoApp.state.itemList));
        await page.waitForTimeout(300);
    }
    return page;
}

const mode = (page) => page.evaluate(() => document.documentElement.dataset.theme || 'auto');
const colors = (page, selector) => page.locator(selector).first().evaluate((e) => {
    const s = getComputedStyle(e);
    return { color: s.color, background: s.backgroundColor, scheme: s.colorScheme };
});

// the effective colors of an element as [r, g, b] (the background is that of the nearest ancestor which has one)
async function textAndBackground(page, selector) {
    return page.locator(selector).first().evaluate((element) => {
        // (computed colors may come as rgb(), rgba() or color(srgb ...))
        const parse = (value) => {
            const numbers = value.match(/[\d.]+/g).map(Number);
            if (value.startsWith('color(')) return { rgb: numbers.slice(0, 3).map((n) => Math.round(n * 255)), alpha: numbers[3] ?? 1 };
            return { rgb: numbers.slice(0, 3), alpha: numbers[3] ?? 1 };
        };
        let background = null;
        for (let e = element; e && !background; e = e.parentElement) {
            const c = parse(getComputedStyle(e).backgroundColor);
            if (c.alpha > 0.99) background = c.rgb;
        }
        return { text: parse(getComputedStyle(element).color).rgb, background: background || [255, 255, 255] };
    });
}
function luminance([r, g, b]) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

test('the button cycles system, light, dark; the page, its label and the cookie follow; one icon is shown', async () => {
    const page = await openPage('/index.php', { colorScheme: 'light' });
    const context = page.context();
    const label = () => page.locator('.themeswitch').getAttribute('aria-label');
    const shownIcons = () => page.locator('.themeswitch svg.icon').evaluateAll((icons) =>
        icons.filter((i) => getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('class')));

    assert.equal(await mode(page), 'auto');
    assert.match(await label(), /system/);
    assert.deepEqual(await shownIcons(), ['icon icon-theme-auto']);

    await page.click('.themeswitch');
    assert.equal(await mode(page), 'light');
    assert.match(await label(), /light/);
    assert.equal(await page.locator('.themeswitch').getAttribute('title'), await label());
    assert.deepEqual(await shownIcons(), ['icon icon-theme-light']);
    assert.equal((await colors(page, 'body')).scheme, 'light');

    await page.click('.themeswitch');
    assert.equal(await mode(page), 'dark');
    assert.match(await label(), /dark/);
    assert.deepEqual(await shownIcons(), ['icon icon-theme-dark']);
    assert.equal((await colors(page, 'body')).scheme, 'dark');
    // dark background and light text; the color of the address bar is the dark one although the system is light
    assert.deepEqual(await textAndBackground(page, 'body').then((c) => c.background), [28, 28, 30]);
    assert.deepEqual(await page.locator('meta[name="theme-color"]').evaluateAll((m) => m.map((e) => e.content)), ['#1c1c1e', '#1c1c1e']);
    // the choice is kept: the cookie, and the next page is dark from the start
    const cookies = await context.cookies(BASE);
    assert.equal(cookies.find((c) => c.name === 'todo_theme')?.value, 'dark');
    assert.equal(cookies.find((c) => c.name === 'todo_theme')?.httpOnly, true);
    await page.reload();
    await page.waitForSelector('.themeswitch');
    assert.equal(await mode(page), 'dark');
    assert.match(await label(), /dark/);

    await page.click('.themeswitch');
    assert.equal(await mode(page), 'auto');
    assert.deepEqual(await page.locator('meta[name="theme-color"]').evaluateAll((m) => m.map((e) => e.content)), ['#F8F8F8', '#1c1c1e']);
    await page.waitForTimeout(300);
    assert.equal((await context.cookies(BASE)).find((c) => c.name === 'todo_theme'), undefined);
    assert.deepEqual(page.errors, []);
    await context.close();
});

test('the system scheme decides as long as nothing is chosen, a choice wins over it', async () => {
    const page = await openPage('/index.php', { colorScheme: 'dark' });
    assert.equal(await mode(page), 'auto');
    assert.deepEqual((await textAndBackground(page, 'body')).background, [28, 28, 30]);
    await page.click('.themeswitch');   // light
    assert.equal(await mode(page), 'light');
    assert.deepEqual((await textAndBackground(page, 'body')).background, [248, 248, 248]);
    await page.click('.themeswitch');   // dark
    await page.click('.themeswitch');   // system again
    assert.deepEqual((await textAndBackground(page, 'body')).background, [28, 28, 30]);
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

test('the statistics page has the button too, and the choice is shared with the main page', async () => {
    const page = await openPage('/statistics.php', { colorScheme: 'light' });
    assert.equal(await mode(page), 'auto');
    await page.click('.themeswitch');
    await page.click('.themeswitch');
    assert.equal(await mode(page), 'dark');
    // the text of the charts is light on the dark page, the bars have their own color
    const chart = await textAndBackground(page, '.statlabel');
    assert.ok(contrast(chart.text, chart.background) >= 4.5, 'chart labels ' + JSON.stringify(chart));
    assert.deepEqual((await textAndBackground(page, 'body')).background, [28, 28, 30]);
    await page.waitForTimeout(300);
    await page.goto(BASE + '/index.php');
    await page.waitForSelector('.themeswitch');
    assert.equal(await mode(page), 'dark');
    // and back: the button of the main page changes what the statistics page shows
    await page.click('.themeswitch');
    await page.waitForTimeout(300);
    await page.goto(BASE + '/statistics.php');
    assert.equal(await mode(page), 'auto');
    assert.deepEqual(page.errors, []);
    await page.context().close();
});

// every text of the main page which is readable in the light scheme is readable in the dark one
for (const scheme of ['light', 'dark']) {
    test(`texts and borders have enough contrast in the ${scheme} scheme`, async () => {
        resetDb();
        sql("INSERT INTO todo (creationDate, description, notes, startDate, dueDate, list_id) VALUES " +
            "(UTC_TIMESTAMP(), 'Overdue entry', 'a note', DATE_SUB(UTC_DATE(), INTERVAL 5 DAY), DATE_SUB(UTC_DATE(), INTERVAL 2 DAY), 0), " +
            "(UTC_TIMESTAMP(), 'Plain entry', NULL, UTC_DATE(), DATE_ADD(UTC_DATE(), INTERVAL 9 DAY), 0), " +
            "(UTC_TIMESTAMP(), 'Done entry', NULL, UTC_DATE(), NULL, 0)");
        sql("UPDATE todo SET completed=1, completionDate=UTC_TIMESTAMP() WHERE description='Done entry'; " +
            "INSERT INTO tags (name) VALUES ('work'); INSERT INTO todo_tags SELECT t.id, g.id FROM todo t, tags g WHERE t.description='Plain entry'");
        const page = await openPage('/index.php?', { colorScheme: scheme, viewport: { width: 420, height: 800 } });
        await page.waitForSelector('#todoList > li');
        const checks = {
            'the page': 'body',
            'an entry': '#todoList .todoTitle',
            'a completed entry': '.todo_completed .todoTitle',
            'a tag in a row': '#todoList .tagChip',
            'an overdue date': '.todoItem.overdue .todoDue',
            'a date': '.todoItem:not(.overdue) .todoDue',
            'a date shown as a caption': '#enterLine .date_caption',
            'a link': '#loadMoreBox a',
            'a list': '#lists .listTab[aria-current="false"]',
            'the list which is shown': '#lists .listTab[aria-current="true"]',
            'a tag which filters': '#tagbar .tagFilter[aria-pressed="false"]',
            'the entry field': '#enter_todo',
        };
        for (const [name, selector] of Object.entries(checks)) {
            const c = await textAndBackground(page, selector);
            const ratio = contrast(c.text, c.background);
            assert.ok(ratio >= 4.5, `${name} (${selector}): ${ratio.toFixed(2)} ${JSON.stringify(c)}`);
        }
        // a tag which is pressed (a filter), and the menu, which is a layer of its own
        await page.click('#tagbar .tagFilter');
        const pressed = await textAndBackground(page, '#tagbar .tagFilter[aria-pressed="true"]');
        assert.ok(contrast(pressed.text, pressed.background) >= 4.5, 'a tag which filters ' + JSON.stringify(pressed));
        await page.click('#menu_button');
        await page.waitForSelector('#main_menu:popover-open');
        const menu = await textAndBackground(page, '#manageTags');
        assert.ok(contrast(menu.text, menu.background) >= 4.5, 'the menu ' + JSON.stringify(menu));
        await page.keyboard.press('Escape');
        // the border of the list is visible against the page (a graphical object needs 3:1)
        const border = await page.locator('#todoList').evaluate((e) => getComputedStyle(e).borderTopColor);
        const page_ = await textAndBackground(page, 'body');
        const rgb = border.match(/[\d.]+/g).slice(0, 3).map(Number);
        assert.ok(contrast(rgb, page_.background) >= 3, 'table border ' + border);
        assert.deepEqual(page.errors, []);
        await page.context().close();
        resetDb();
    });
}
