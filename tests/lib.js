// helpers for the integration tests; they need a running server and database, see tests/README.md
const { execFileSync } = require('node:child_process');

const BASE = process.env.TODO_URL || 'http://127.0.0.1:8000';
// command line of a MySQL/MariaDB client connected to the test database
const MYSQL = (process.env.TODO_MYSQL || 'mysql -h127.0.0.1 -uroot -proot todo').split(' ');

function sql(query) {
    return execFileSync(MYSQL[0], [...MYSQL.slice(1), '--batch', '--raw', '--skip-column-names', '-e', query],
        { encoding: 'utf8' });
}

// rows as arrays of strings (NULL as null)
function sqlRows(query) {
    return sql(query).split('\n').filter((l) => l !== '')
        .map((l) => l.split('\t').map((v) => (v === 'NULL' ? null : v)));
}

function resetDb() {
    sql("SET FOREIGN_KEY_CHECKS=0; TRUNCATE recurringCopied; TRUNCATE todo_tags; TRUNCATE tags; " +
        "TRUNCATE todo; TRUNCATE list; SET FOREIGN_KEY_CHECKS=1; " +
        "SET SESSION sql_mode=CONCAT(@@sql_mode, ',NO_AUTO_VALUE_ON_ZERO'); " +
        // lists 0 and 1 belong to the (only, default) user 0, list 2 to another user
        "INSERT INTO list (id, name, user_id) VALUES (0, 'Main', 0), (1, 'Work', 0), (2, 'Other', 1)");
}

// loads the page like a browser and returns session cookie and CSRF token
async function session() {
    const res = await fetch(BASE + '/index.php');
    const cookie = res.headers.get('set-cookie').split(';')[0];
    const token = (await res.text()).match(/name="csrf-token" content="([0-9a-f]+)"/)[1];
    return { cookie, token };
}

async function post(path, params, sess, token) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (sess) {
        headers.Cookie = sess.cookie;
        headers['X-CSRF-Token'] = token === undefined ? sess.token : token;
    }
    const res = await fetch(BASE + '/queries/' + path, {
        method: 'POST', headers, body: new URLSearchParams(params).toString()
    });
    return { status: res.status, text: await res.text() };
}

async function get(path) {
    const res = await fetch(BASE + '/queries/' + path);
    return { status: res.status, text: await res.text() };
}

module.exports = { BASE, sql, sqlRows, resetDb, session, post, get };
