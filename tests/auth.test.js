const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

// The application relies on the web server's HTTP authentication and refuses to run without it.
// These tests start their own PHP servers on a copy of the application: the guard rejects
// requests before the database is used, so no database is needed here.
const ROOT = path.join(__dirname, '..');

function freePort() {
    return new Promise((resolve) => {
        const srv = net.createServer().listen(0, '127.0.0.1', () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });
}

async function startServer(dir, args) {
    const port = await freePort();
    const proc = spawn('php', ['-S', '127.0.0.1:' + port, '-t', dir, ...args], { stdio: 'ignore' });
    const base = 'http://127.0.0.1:' + port;
    for (let i = 0; i < 50; i++) {
        try { await fetch(base + '/lang-js.php'); return { base, proc }; } catch (e) { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 100));
    }
    proc.kill();
    throw new Error('PHP server did not start');
}

let dir;
const servers = [];
test.before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-auth-'));
    fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !/[\\/](node_modules|\.git)([\\/]|$)/.test(src) });
    fs.writeFileSync(path.join(dir, 'config.php'),
        '<?php\n$db_host = "127.0.0.1"; $db_user = "x"; $db_password = "x"; $db_database = "x";\n$language = "en-US";\n');
    // like a web server after checking the credentials:
    fs.writeFileSync(path.join(dir, 'router-auth.php'), "<?php\n$_SERVER['REMOTE_USER'] = 'alice';\nreturn false;\n");
});
test.after(() => {
    servers.forEach((s) => s.proc.kill());
    fs.rmSync(dir, { recursive: true, force: true });
});

const pages = ['index.php', 'statistik.php', 'log.js.php', 'lang-js.php', 'queries/query-lists.php', 'queries/query-todos.php?list_id=0'];

test('requests the web server did not authenticate are rejected', async () => {
    const srv = await startServer(dir, []);
    servers.push(srv);
    for (const page of pages) {
        for (const headers of [{}, { Authorization: 'Basic ' + Buffer.from('alice:secret').toString('base64') }]) {
            const res = await fetch(srv.base + '/' + page, { headers });
            assert.equal(res.status, 403, page);
            assert.match(await res.text(), /HTTP authentication/, page);
        }
    }
    const post = await fetch(srv.base + '/queries/trash.php', { method: 'POST' });
    assert.equal(post.status, 403);
});

test('requests authenticated by the web server (REMOTE_USER) are served', async () => {
    const srv = await startServer(dir, [path.join(dir, 'router-auth.php')]);
    servers.push(srv);
    const res = await fetch(srv.base + '/index.php');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /name="csrf-token"/);
});

test('the check can be switched off explicitly in config.php', async () => {
    const off = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-auth-off-'));
    try {
        fs.cpSync(dir, off, { recursive: true });
        fs.appendFileSync(path.join(off, 'config.php'), '$require_http_auth = false;\n');
        const srv = await startServer(off, []);
        servers.push(srv);
        assert.equal((await fetch(srv.base + '/index.php')).status, 200);
    } finally {
        servers.forEach((s) => s.proc.kill());
        fs.rmSync(off, { recursive: true, force: true });
    }
});

test('requests which are not authenticated get neither a session nor the PHP version', async () => {
    const srv = await startServer(dir, []);
    servers.push(srv);
    for (const [page, method] of [['index.php', 'GET'], ['queries/trash.php', 'POST'], ['lang-js.php', 'GET']]) {
        const res = await fetch(srv.base + '/' + page, { method });
        assert.equal(res.status, 403, page);
        assert.equal(res.headers.get('set-cookie'), null, page);
        assert.equal(res.headers.get('x-powered-by'), null, page);
    }
});

test('a request without session cookie does not start a session', async () => {
    const srv = await startServer(dir, [path.join(dir, 'router-auth.php')]);
    servers.push(srv);
    const res = await fetch(srv.base + '/queries/trash.php', { method: 'POST' });
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('set-cookie'), null);
});

test('X-Forwarded-Proto is only believed if configured', async () => {
    const proto = { 'X-Forwarded-Proto': 'https' };
    const plain = await startServer(dir, [path.join(dir, 'router-auth.php')]);
    servers.push(plain);
    assert.doesNotMatch((await fetch(plain.base + '/index.php', { headers: proto })).headers.get('set-cookie'), /secure/i);
    const trusting = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-auth-proxy-'));
    try {
        fs.cpSync(dir, trusting, { recursive: true });
        fs.appendFileSync(path.join(trusting, 'config.php'), '$trust_forwarded_proto = true;\n');
        const srv = await startServer(trusting, [path.join(trusting, 'router-auth.php')]);
        servers.push(srv);
        assert.match((await fetch(srv.base + '/index.php', { headers: proto })).headers.get('set-cookie'), /; secure/i);
        assert.doesNotMatch((await fetch(srv.base + '/index.php')).headers.get('set-cookie'), /secure/i);
    } finally {
        servers.forEach((s) => s.proc.kill());
        fs.rmSync(trusting, { recursive: true, force: true });
    }
});

test('config.php can be kept elsewhere (TODO_CONFIG)', async () => {
    const moved = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-auth-cfg-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-cfg-'));
    try {
        fs.cpSync(dir, moved, { recursive: true });
        fs.renameSync(path.join(moved, 'config.php'), path.join(outside, 'config.php'));
        process.env.TODO_CONFIG = path.join(outside, 'config.php');
        const srv = await startServer(moved, [path.join(moved, 'router-auth.php')]);
        servers.push(srv);
        assert.equal((await fetch(srv.base + '/index.php')).status, 200);
    } finally {
        delete process.env.TODO_CONFIG;
        servers.forEach((s) => s.proc.kill());
        fs.rmSync(moved, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
    }
});

