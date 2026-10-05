const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

// The application relies on the web server's HTTP authentication over HTTPS and refuses to run
// without it. The PHP test servers only speak HTTP, so most requests carry the header of a TLS proxy.
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

const HTTPS = { 'X-Forwarded-Proto': 'https' };
const pages = ['index.php', 'statistik.php', 'log.js.php', 'queries/query-lists.php', 'queries/query-todos.php?list_id=0'];

test('requests the web server did not authenticate are rejected', async () => {
    const srv = await startServer(dir, []);
    servers.push(srv);
    for (const page of pages) {
        for (const headers of [HTTPS, { ...HTTPS, Authorization: 'Basic ' + Buffer.from('alice:secret').toString('base64') }]) {
            const res = await fetch(srv.base + '/' + page, { headers });
            assert.equal(res.status, 403, page);
            assert.match(await res.text(), /HTTP authentication/, page);
        }
    }
    const post = await fetch(srv.base + '/queries/trash.php', { method: 'POST', headers: HTTPS });
    assert.equal(post.status, 403);
});

test('requests over plain HTTP are rejected, even if authenticated', async () => {
    const srv = await startServer(dir, [path.join(dir, 'router-auth.php')]);
    servers.push(srv);
    for (const page of pages) {
        const res = await fetch(srv.base + '/' + page);
        assert.equal(res.status, 403, page);
        assert.match(await res.text(), /only available over HTTPS/, page);
    }
});

test('requests authenticated by the web server (REMOTE_USER) are served', async () => {
    const srv = await startServer(dir, [path.join(dir, 'router-auth.php')]);
    servers.push(srv);
    const res = await fetch(srv.base + '/index.php', { headers: HTTPS });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /name="csrf-token"/);
});

test('the checks can be switched off explicitly in config.php', async () => {
    const off = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-auth-off-'));
    try {
        fs.cpSync(dir, off, { recursive: true });
        fs.appendFileSync(path.join(off, 'config.php'), '$require_http_auth = false;\n$require_https = false;\n');
        const srv = await startServer(off, []);
        servers.push(srv);
        assert.equal((await fetch(srv.base + '/index.php')).status, 200);
    } finally {
        servers.forEach((s) => s.proc.kill());
        fs.rmSync(off, { recursive: true, force: true });
    }
});
