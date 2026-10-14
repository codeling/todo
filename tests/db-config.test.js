// the connection settings of the database ($db_ssl); needs the test database, see tests/README.md
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

// runs the migration runner (which only connects and shows the version) with an additional config line
function status(extraConfig) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-config-'));
    try {
        const config = path.join(dir, 'config.php');
        const base = process.env.TODO_CONFIG || path.join(ROOT, 'config.php');
        fs.writeFileSync(config, `<?php\nrequire ${JSON.stringify(base)};\n${extraConfig}\n`);
        const res = spawnSync('php', [path.join(ROOT, 'scripts', 'migrate.php'), '--status'],
            { encoding: 'utf8', env: Object.assign({}, process.env, { TODO_CONFIG: config }) });
        return { status: res.status, out: res.stdout, err: res.stderr };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

test('the connection works without $db_ssl', () => {
    const res = status('');
    assert.equal(res.status, 0, res.err);
    assert.match(res.out, /database version: \d+/);
});

test('$db_ssl is applied: TLS with a certificate authority which does not exist fails', () => {
    for (const ssl of ["array('ca' => '/nonexistent/ca.pem')", "array('ca' => '/nonexistent/ca.pem', 'verify_server_cert' => false)"]) {
        const res = status(`$db_ssl = ${ssl};`);
        assert.equal(res.status, 1, ssl);
        assert.match(res.err, /cannot connect to the database/, ssl);
    }
});
