const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// PHP files which are only included by other scripts must not be reachable over the web. They are
// denied by hand in .htaccess and in nginx.conf.sample (and checked by tests/apache-access.sh), so
// the lists drift apart, and a new helper is easily forgotten. This derives the files from the code
// and compares them with both lists (no server or database needed):
// - endpoints = the queries/<name>.php URLs in the client JavaScript (*.js in the root and in js/);
//   helpers = all other queries/*.php files
// - pages = index.php and the root .php files which index.php references with src="" or href="";
//   include-only files = all other root .php files, except config*.php (denied by its own pattern)
// tests/apache-access.sh derives the same lists, keep the rules in sync.
const ROOT = path.join(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

// names (without .php) of the .php files directly in a directory
function phpNames(dir) {
    return fs.readdirSync(path.join(ROOT, dir))
        .filter((f) => f.endsWith('.php'))
        .map((f) => f.slice(0, -'.php'.length))
        .sort();
}

// all *.js files of the root directory and of js/ (if there is one)
function clientScripts() {
    const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.js'));
    const walk = (dir) => {
        for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.js')) files.push(p);
        }
    };
    if (fs.existsSync(path.join(ROOT, 'js'))) walk('js');
    return files;
}

function uniqueSorted(list) {
    return [...new Set(list)].sort();
}

function matches(text, regex) {
    return [...text.matchAll(regex)].map((m) => m[1]);
}

const endpoints = uniqueSorted(clientScripts().flatMap((f) => matches(read(f), /queries\/([A-Za-z0-9_-]+)\.php/g)));
const helpers = phpNames('queries').filter((n) => !endpoints.includes(n));
const pages = uniqueSorted(['index', ...matches(read('index.php'), /(?:src|href)="([A-Za-z0-9_.-]+)\.php["?#]/g)]);
const includeOnly = phpNames('.').filter((n) => !pages.includes(n) && !n.startsWith('config'));

// the one match of a regex in a file, or a failure which says what to look for
function find(file, regex, what) {
    const found = matches(read(file), regex);
    assert.equal(found.length, 1, `${file}: expected exactly one ${what}, found ${found.length}`);
    return found[0];
}

// the names of an alternation like "a|b|c", sorted
function names(alternation) {
    return alternation.split('|').sort();
}

function assertSameSet(actual, expected, where, what) {
    const missing = expected.filter((n) => !actual.includes(n));
    const extra = uniqueSorted(actual.filter((n) => !expected.includes(n)));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] },
        `${where} must list exactly the ${what} (${expected.join(', ')}); ` +
        `missing, add: [${missing.join(', ')}]; extra, remove: [${extra.join(', ')}]`);
}

// the FilesMatch patterns of .htaccess
const filesMatch = matches(read('.htaccess'), /^\s*<FilesMatch "(.*)">\s*$/gm);

// the helpers of queries/: <FilesMatch "^(a|b|c)\.php$">
function htaccessHelpers() {
    const lists = filesMatch.map((p) => /^\^\(([\w|-]+)\)\\\.php\$$/.exec(p)).filter(Boolean);
    assert.equal(lists.length, 1, `.htaccess: expected exactly one <FilesMatch "^(a|b)\\.php$"> for the helpers of queries/, found ${lists.length}`);
    return names(lists[0][1]);
}

// the include-only files of the root: the <FilesMatch> with ^config.*\.php$ also has ^name\.php$ entries
function htaccessIncludeOnly() {
    const lists = filesMatch.filter((p) => p.includes('^config.*\\.php$'));
    assert.equal(lists.length, 1, `.htaccess: expected exactly one <FilesMatch> with ^config.*\\.php$ and the include-only files of the root, found ${lists.length}`);
    return matches(lists[0], /\^([A-Za-z0-9_-]+)\\\.php\$/g).sort();
}

test('client JavaScript and index.php yield endpoints and pages', () => {
    assert.notDeepEqual(endpoints, [], 'no queries/<name>.php URL found in the client JavaScript');
    assert.ok(pages.length > 1, 'index.php references no .php page');
});

test('every endpoint and every page exists as a file', () => {
    const missing = (dir, list) => list.filter((n) => !fs.existsSync(path.join(ROOT, dir, n + '.php')));
    assert.deepEqual(missing('queries', endpoints), [], 'queries/<name>.php called by the client JavaScript, but not a file');
    assert.deepEqual(missing('.', pages), [], 'pages referenced by index.php, but not a file');
});

test('.htaccess denies exactly the helpers of queries/', () => {
    assertSameSet(htaccessHelpers(), helpers, '.htaccess (FilesMatch for queries/)', 'queries/*.php files which are not called by the client JavaScript');
});

test('nginx.conf.sample denies exactly the helpers of queries/', () => {
    const list = find('nginx.conf.sample', /^\s*location ~ \^\/todo\/queries\/\(([\w|-]+)\)\\\.php\$ \{ return 404; \}/gm,
        'location ~ ^/todo/queries/(a|b)\\.php$ { return 404; }');
    assertSameSet(names(list), helpers, 'nginx.conf.sample (location for queries/)', 'queries/*.php files which are not called by the client JavaScript');
});

test('.htaccess denies exactly the include-only files of the root', () => {
    assertSameSet(htaccessIncludeOnly(), includeOnly, '.htaccess (FilesMatch with the files of the root)', 'root .php files which are not index.php, not referenced by index.php and not config*.php');
});

test('nginx.conf.sample denies exactly the include-only files of the root', () => {
    const list = find('nginx.conf.sample', /^\s*location ~ \^\/todo\/\(([\w|-]+)\)\\\.php\$ \{ return 404; \}/gm,
        'location ~ ^/todo/(a|b)\\.php$ { return 404; }');
    assertSameSet(names(list), includeOnly, 'nginx.conf.sample (location for the root)', 'root .php files which are not index.php, not referenced by index.php and not config*.php');
});
