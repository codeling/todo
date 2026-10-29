// helpers for the integration tests; they need a running server and database, see tests/README.md
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const BASE = process.env.TODO_URL || 'http://127.0.0.1:8000';
// command line of a MySQL/MariaDB client connected to the test database
const MYSQL = (process.env.TODO_MYSQL || 'mysql -h127.0.0.1 -uroot -proot todo').split(' ');

function sql(query) {
    return execFileSync(MYSQL[0], [...MYSQL.slice(1), '--default-character-set=utf8mb4', '--batch', '--raw', '--skip-column-names', '-e', query],
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

// the parsed JSON of a response body, null if it is not JSON
function parseJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

// status, body (text, and json: null if it is not JSON) and content type of a response
async function answer(res) {
    const text = await res.text();
    return { status: res.status, text, json: parseJson(text), type: res.headers.get('content-type') };
}

async function post(path, params, sess, token) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (sess) {
        headers.Cookie = sess.cookie;
        headers['X-CSRF-Token'] = token === undefined ? sess.token : token;
    }
    return answer(await fetch(BASE + '/queries/' + path, {
        method: 'POST', headers, body: new URLSearchParams(params).toString()
    }));
}

async function get(path) {
    return answer(await fetch(BASE + '/queries/' + path));
}

// asserts that an endpoint did its work: status 200 and the JSON {"ok": true, ...fields}
function assertOk(res, fields = {}, what) {
    assert.match(res.type, /^application\/json; charset=utf-8$/, what);
    assert.deepEqual({ status: res.status, json: res.json }, { status: 200, json: { ok: true, ...fields } }, what);
}

// asserts that an endpoint refused the request: the status and the JSON {"error": message}, with
// the translated message as text, or as regular expression which has to match it
function assertError(res, status, error, what) {
    assert.match(res.type, /^application\/json; charset=utf-8$/, what);
    if (error instanceof RegExp) {
        assert.equal(res.status, status, what);
        assert.deepEqual(Object.keys(res.json || {}), ['error'], what);
        assert.match(res.json.error, error, what);
    } else {
        assert.deepEqual({ status: res.status, json: res.json }, { status, json: { error } }, what);
    }
}

// the id of the entry which enter.php created (asserts that it did: 200 and {"ok": true, "id": id})
function createdId(res, what) {
    assert.match(res.type, /^application\/json; charset=utf-8$/, what);
    assert.equal(res.status, 200, what || res.text);
    assert.deepEqual(Object.keys(res.json || {}), ['ok', 'id'], what || res.text);
    assert.equal(res.json.ok, true, what);
    assert.ok(Number.isInteger(res.json.id) && res.json.id > 0, what || res.text);
    return res.json.id;
}

module.exports = { BASE, sql, sqlRows, resetDb, session, post, get, answer, assertOk, assertError, createdId };
