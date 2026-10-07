const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Tests the basic-auth/ library on its own, as a drop-in in an otherwise empty app,
// with PHP's built-in server and a router which sets $_SERVER like a web server would.
const LIB = path.join(__dirname, '..', 'basic-auth', 'basic-auth.php');

function freePort() {
    return new Promise((resolve) => {
        const srv = net.createServer().listen(0, '127.0.0.1', () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });
}

let dir;
let proc;
let base;
test.before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'basic-auth-'));
    fs.mkdirSync(path.join(dir, 'basic-auth'));
    fs.copyFileSync(LIB, path.join(dir, 'basic-auth', 'basic-auth.php'));
    // simulates the web server: X-Test-User sets REMOTE_USER, X-Test-Https sets HTTPS
    fs.writeFileSync(path.join(dir, 'router.php'),
        "<?php\n" +
        "if (isset($_SERVER['HTTP_X_TEST_USER'])) { $_SERVER[$_SERVER['HTTP_X_TEST_USER_KEY'] ?? 'REMOTE_USER'] = $_SERVER['HTTP_X_TEST_USER']; }\n" +
        "if (isset($_SERVER['HTTP_X_TEST_HTTPS'])) { $_SERVER['HTTPS'] = $_SERVER['HTTP_X_TEST_HTTPS']; }\n" +
        "return false;\n");
    fs.writeFileSync(path.join(dir, 'app.php'),
        "<?php\nrequire_once __DIR__ . '/basic-auth/basic-auth.php';\n" +
        "$user = basicAuthRequire(isset($_GET['trust']) ? array('trust_forwarded_proto' => true) : array());\n" +
        "echo 'hello ' . $user;\n");
    fs.writeFileSync(path.join(dir, 'custom.php'),
        "<?php\nrequire_once __DIR__ . '/basic-auth/basic-auth.php';\n" +
        "$user = basicAuthRequire(array('require_https' => isset($_GET['https']), 'require_auth' => isset($_GET['auth']),\n" +
        "    'messages' => array('https' => 'nur HTTPS', 'auth' => 'nicht angemeldet')));\n" +
        "echo 'hello ' . var_export($user, true);\n");
    const port = await freePort();
    proc = spawn('php', ['-S', '127.0.0.1:' + port, '-t', dir, path.join(dir, 'router.php')], { stdio: 'ignore' });
    base = 'http://127.0.0.1:' + port;
    for (let i = 0; i < 50; i++) {
        try { await fetch(base + '/app.php'); return; } catch (e) { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('PHP server did not start');
});
test.after(() => {
    proc.kill();
    fs.rmSync(dir, { recursive: true, force: true });
});

const get = (url, headers) => fetch(base + url, { headers });
const AUTHED = { 'X-Test-Https': 'on', 'X-Test-User': 'alice' };

test('HTTPS with an authenticated user is let through, the user is returned', async () => {
    const res = await get('/app.php', AUTHED);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'hello alice');
    assert.match(res.headers.get('strict-transport-security'), /max-age=\d+/);
});

test('plain HTTP is rejected, even with an authenticated user', async () => {
    for (const headers of [{ 'X-Test-User': 'alice' }, { 'X-Test-Https': 'off', 'X-Test-User': 'alice' }]) {
        const res = await get('/app.php', headers);
        assert.equal(res.status, 403);
        assert.match(await res.text(), /only available over HTTPS/);
        assert.equal(res.headers.get('strict-transport-security'), null);
    }
});

test('HTTPS without an authenticated user is rejected', async () => {
    const res = await get('/app.php', { 'X-Test-Https': 'on' });
    assert.equal(res.status, 403);
    assert.match(await res.text(), /did not authenticate/);
});

test('an Authorization header or a forged header does not count as authenticated', async () => {
    const res = await get('/app.php', {
        'X-Test-Https': 'on',
        Authorization: 'Basic ' + Buffer.from('alice:secret').toString('base64'),
        'X-Remote-User': 'alice',
        'Remote-User': 'alice',
    });
    assert.equal(res.status, 403);
});

test('REDIRECT_REMOTE_USER counts as authenticated', async () => {
    const res = await get('/app.php', { ...AUTHED, 'X-Test-User-Key': 'REDIRECT_REMOTE_USER' });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'hello alice');
});

test('X-Forwarded-Proto: https is only believed if trust_forwarded_proto is on', async () => {
    const headers = { 'X-Forwarded-Proto': 'https', 'X-Test-User': 'alice' };
    assert.equal((await get('/app.php', headers)).status, 403);
    assert.equal((await get('/app.php?trust=1', headers)).status, 200);
    assert.equal((await get('/app.php?trust=1', { ...headers, 'X-Forwarded-Proto': 'HTTPS ' })).status, 200);
    assert.equal((await get('/app.php?trust=1', { ...headers, 'X-Forwarded-Proto': 'http' })).status, 403);
    assert.equal((await get('/app.php?trust=1', { 'X-Test-User': 'alice' })).status, 403);
});

test('options switch the checks off', async () => {
    const res = await get('/custom.php');
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'hello NULL');
    const authed = await get('/custom.php', { 'X-Test-User': 'alice' });
    assert.equal(await authed.text(), "hello 'alice'");
});

test('options replace the messages', async () => {
    let res = await get('/custom.php?https');
    assert.equal(res.status, 403);
    assert.equal(await res.text(), 'nur HTTPS');
    res = await get('/custom.php?https&auth', { 'X-Test-Https': 'on' });
    assert.equal(res.status, 403);
    assert.equal(await res.text(), 'nicht angemeldet');
    res = await get('/custom.php?https&auth', AUTHED);
    assert.equal(res.status, 200);
});
