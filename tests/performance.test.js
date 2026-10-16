// Performance tests: they do not measure time (that would be unreliable on a CI runner) but count
// the rows the storage engine reads for a request (the Handler_read_* counters). A missing index makes this number grow with the size of the
// whole table, not with the size of the data the request is about, so the limits are far below the
// table size, yet well above the number of rows a request really needs.
// They need a running server and database, see tests/README.md
const test = require('node:test');
const assert = require('node:assert/strict');
const { sql, sqlRows, resetDb, session, post, get, BASE } = require('./lib');

const TODOS = 10000;
const TAGS = 5000;

// 10,000 entries: the default user (0) has 2,000 of them in 4 lists, another user 8,000 in 20 lists;
// 75 % are completed, 2 % are in the trash, 1 / 37 of the completed ones recur (every 5 years,
// completed today, so that none of them is due)
function seed() {
    resetDb();
    sql(`
        INSERT INTO list (id, name, user_id) VALUES (10, 'a', 0), (11, 'b', 0);
        INSERT INTO list (id, name, user_id) SELECT 20 + n, CONCAT('other', n), 1
            FROM (SELECT a.d + 10 * b.d AS n FROM
                (SELECT 0 d UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
                (SELECT 0 d UNION SELECT 1) b) x;
        CREATE TEMPORARY TABLE numbers AS
            SELECT a.d + 10 * b.d + 100 * c.d + 1000 * e.d AS n FROM
                (SELECT 0 d UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
                (SELECT 0 d UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
                (SELECT 0 d UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c,
                (SELECT 0 d UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) e;
        INSERT INTO todo (id, creationDate, description, startDate, completed, completionDate, deleted,
                recurrenceMode, recurrenceInterval, list_id)
            SELECT n + 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL (n * 7 % 1500) DAY), CONCAT('todo ', n), UTC_DATE(),
                n % 4 <> 0,
                IF(n % 4 <> 0, IF(n % 37 = 0, UTC_TIMESTAMP(), DATE_SUB(UTC_TIMESTAMP(), INTERVAL (n * 13 % 900) DAY)), NULL),
                n % 50 = 0,
                IF(n % 37 = 0 AND n % 4 <> 0, 4, 0), IF(n % 37 = 0 AND n % 4 <> 0, 5, 1),
                IF(n < 2000, ELT(n % 4 + 1, 0, 1, 10, 11), 20 + n % 20)
            FROM numbers WHERE n < ${TODOS};
        INSERT INTO tags (name) SELECT CONCAT('tag', n) FROM numbers WHERE n < ${TAGS};
        INSERT INTO todo_tags (todo_id, tag_id) SELECT n + 1, n % ${TAGS} + 1 FROM numbers WHERE n < ${TODOS};
        ANALYZE TABLE todo, tags, todo_tags, list`);
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), String(TODOS));
}

// the counters of a connection are added to the global ones when it is closed, so wait until
// the connection of the application is gone (only the one of this query is left)
function rowsRead() {
    for (let i = 0; i < 100; i++) {
        if (sqlRows("SHOW GLOBAL STATUS LIKE 'Threads_connected'")[0][1] === '1') {
            break;
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
    return sqlRows("SHOW GLOBAL STATUS LIKE 'Handler_read%'")
        .filter(([name]) => /^Handler_read_(first|key|last|next|prev|rnd|rnd_next)$/.test(name))
        .reduce((sum, [, value]) => sum + Number(value), 0);
}

// runs the request and checks how many rows were read meanwhile
async function assertRowsRead(t, name, limit, request) {
    // reading the counters reads rows itself (about 850 with MySQL 8, none with MariaDB): the
    // number of an empty measurement is subtracted
    const idle = rowsRead();
    const overhead = rowsRead() - idle;
    const before = rowsRead();
    const res = await request();
    const read = rowsRead() - before - overhead;
    t.diagnostic(`${name}: ${read} rows read (limit ${limit})`);
    assert.ok(read <= limit, `${name} read ${read} rows, at most ${limit} expected (table size ${TODOS})`);
    return res;
}

test.before(seed);
test.after(resetDb);

test('loading a list reads the entries of the list, not the whole table', async (t) => {
    const res = await assertRowsRead(t, 'query-todos', 3000, () => get('query-todos.php?list_id=10&incomplete=true&age=30'));
    assert.equal(res.status, 200);
    // incomplete entries, and the ones completed during the last 30 days:
    assert.equal(JSON.parse(res.text).length, Number(sql(`SELECT COUNT(*) FROM todo WHERE list_id=10 AND
        (completed=0 OR DATEDIFF(UTC_TIMESTAMP(), completionDate) <= 30)`).trim()));
    assert.ok(JSON.parse(res.text).length > 0);
});

test('reactivating due entries reads only the completed entries of the own lists', async (t) => {
    const sess = await session();
    const res = await assertRowsRead(t, 'reactivate-due', 4500, () => post('reactivate-due.php', {}, sess));
    assert.equal(res.text, '1');
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), String(TODOS), 'nothing is due');
});

test('emptying the trash reads only the entries of the list', async (t) => {
    const sess = await session();
    const trashed = Number(sql('SELECT COUNT(*) FROM todo WHERE deleted=1 AND list_id=10').trim());
    assert.ok(trashed > 0);
    await assertRowsRead(t, 'empty-trash', 3000, () => post('empty-trash.php', { list_id: 10 }, sess));
    assert.equal(sql('SELECT COUNT(*) FROM todo WHERE deleted=1 AND list_id=10').trim(), '0');
    assert.ok(Number(sql('SELECT COUNT(*) FROM todo WHERE deleted=1').trim()) > 0, 'other lists are untouched');
});

test('creating an entry with an existing tag finds the tag by its index', async (t) => {
    const sess = await session();
    const id = (await assertRowsRead(t, 'enter', 150, () =>
        post('enter.php', { todo: 'new', due: '', start: '', tags: 'tag4321', list_id: 0 }, sess))).text;
    assert.match(id, /^\d+$/);
    assert.equal(sql(`SELECT COUNT(*) FROM tags WHERE name='tag4321'`).trim(), '1');
    assert.equal(sql(`SELECT COUNT(*) FROM todo_tags WHERE todo_id=${id}`).trim(), '1');
});

test('completing and trashing a single entry reads a few rows', async (t) => {
    const sess = await session();
    const row = sqlRows('SELECT id, version FROM todo WHERE list_id=0 AND completed=0 AND deleted=0 LIMIT 1')[0];
    await assertRowsRead(t, 'complete', 100, async () =>
        assert.equal((await post('complete.php', { id: row[0], completed: 1, version: row[1] }, sess)).text, '1'));
    await assertRowsRead(t, 'trash', 100, async () =>
        assert.equal((await post('trash.php', { id: row[0], trash: 1, version: Number(row[1]) + 1 }, sess)).text, '1'));
});

test('the statistics page counts per period without a scan per day', async (t) => {
    // the yearly charts have to read every entry once (2 charts), the others use the index of the date
    const res = await assertRowsRead(t, 'statistik', 3 * TODOS + 5000, async () => fetch(BASE + '/statistik.php'));
    assert.equal(res.status, 200);
    assert.match(await res.text(), /class="statbar"/);
});
