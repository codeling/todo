const test = require('node:test');
const assert = require('node:assert/strict');
const { sql, sqlRows, resetDb, session, post, get } = require('./lib');

const todoFields = (over) => Object.assign({
    todo: 'item', due: '', start: '', effort: 1, notes: '', tags: '',
    recurrenceMode: 0, recurrenceAnchor: 0, list_id: 0
}, over);

test.beforeEach(resetDb);

test('modifying endpoints reject requests without valid CSRF token', async () => {
    const sess = await session();
    const endpoints = ['enter.php', 'update.php', 'complete.php', 'trash.php', 'empty-trash.php',
        'reactivate-one.php', 'edit-tag.php', 'delete-tag.php', 'merge-tag.php'];
    for (const ep of endpoints) {
        assert.equal((await post(ep, { id: 1 })).status, 403, ep + ' without token');
        assert.equal((await post(ep, { id: 1 }, sess, 'wrong')).status, 403, ep + ' with wrong token');
        assert.equal((await get(ep + '?id=1')).status, 405, ep + ' via GET');
    }
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), '0');
});

test('create, update, complete, trash and empty trash with valid token', async () => {
    const sess = await session();
    const id = (await post('enter.php', { todo: 'first', due: '', start: '', tags: 'a,b,a', list_id: 0 }, sess)).text;
    assert.match(id, /^\d+$/);
    assert.deepEqual(sqlRows(`SELECT description, dueDate, startDate IS NOT NULL FROM todo WHERE id=${id}`),
        [['first', null, '1']]);
    assert.deepEqual(sqlRows(`SELECT t.name FROM todo_tags r JOIN tags t ON t.id=r.tag_id WHERE todo_id=${id} ORDER BY 1`),
        [['a'], ['b']]);
    assert.equal((await post('update.php', todoFields({ id, version: 1, todo: 'changed', notes: 'n',
        due: '2026-01-10', start: '2026-01-05', tags: 'c' }), sess)).text, '1');
    assert.equal((await post('complete.php', { id, completed: 1, version: 2 }, sess)).text, '1');
    assert.equal((await post('trash.php', { id, trash: 1, version: 3 }, sess)).text, '1');
    assert.equal((await post('empty-trash.php', { list_id: 0 }, sess)).text, '1');
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), '0');
});

test('reactivating a recurring entry copies stored values verbatim (no second-order SQL injection)', async () => {
    const sess = await session();
    const payload = ', NULL, 0, NULL, (SELECT CONCAT(user(), 0x20, version())), 1, 7, 1, 0)# ';
    const id = (await post('enter.php', { todo: 'x\\', due: '', start: '', tags: 't', list_id: 0 }, sess)).text;
    assert.equal((await post('update.php', todoFields({ id, version: 1, todo: 'x\\', notes: payload,
        recurrenceMode: 7, recurrenceAnchor: 1, tags: 't' }), sess)).text, '1');
    assert.equal((await post('complete.php', { id, completed: 1, version: 2 }, sess)).text, '1');
    assert.equal((await post('reactivate-one.php', { id }, sess)).text, 'Reactivated entry...');
    const rows = sqlRows('SELECT description, notes, completed FROM todo ORDER BY id');
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[1], ['x\\', payload, '0']);
    assert.equal(sql(`SELECT COUNT(*) FROM todo_tags WHERE todo_id=${Number(id) + 1}`).trim(), '1');
});

test('due recurring entries are reactivated when loading the list', async () => {
    const sess = await session();
    const id = (await post('enter.php', { todo: 'weekly', due: '2026-01-10', start: '2026-01-08', tags: 'w', list_id: 0 }, sess)).text;
    await post('update.php', todoFields({ id, version: 1, todo: 'weekly', due: '2026-01-10', start: '2026-01-08',
        recurrenceMode: 7, recurrenceAnchor: 1, tags: 'w' }), sess);
    await post('complete.php', { id, completed: 1, version: 2 }, sess);
    const res = await get('query-todos.php?list_id=0&age=10000&incomplete=true');
    const items = JSON.parse(res.text);
    const copy = items.find((i) => i.completed == 0);
    assert.equal(copy.todo, 'weekly');
    assert.equal(copy.due, '2026-01-17 00:00:00');
    assert.equal(copy.start, '2026-01-15 00:00:00');
    assert.equal(copy.tags, 'w');
});

test('lists and todos of other users can neither be read nor changed', async () => {
    const sess = await session();
    const denied = 'Access denied: this list or entry does not belong to you!';
    sql("INSERT INTO todo (id, creationDate, description, startDate, list_id) " +
        "VALUES (100, UTC_TIMESTAMP(), 'foreign', UTC_DATE(), 2)");
    const own = (await post('enter.php', { todo: 'own', due: '', start: '', list_id: 0 }, sess)).text;
    assert.match(own, /^\d+$/);
    assert.equal((await post('enter.php', { todo: 'x', due: '', start: '', list_id: 2 }, sess)).text, denied);
    assert.equal((await post('update.php', todoFields({ id: 100, version: 1, todo: 'changed' }), sess)).text, denied);
    // moving an own todo into a foreign list:
    assert.equal((await post('update.php', todoFields({ id: own, version: 1, list_id: 2 }), sess)).text, denied);
    assert.equal((await post('complete.php', { id: 100, completed: 1, version: 1 }, sess)).text, denied);
    assert.equal((await post('trash.php', { id: 100, trash: 1, version: 1 }, sess)).text, denied);
    assert.equal((await post('reactivate-one.php', { id: 100 }, sess)).text, denied);
    assert.equal((await post('empty-trash.php', { list_id: 2 }, sess)).text, denied);
    assert.equal((await get('query-todos.php?list_id=2')).text, denied);
    assert.equal((await get('query-tags.php?list_id=2')).text, denied);
    assert.deepEqual(JSON.parse((await get('query-lists.php')).text).map((l) => l.name), ['Main', 'Work']);
    assert.deepEqual(sqlRows('SELECT id, description, completed, deleted, list_id FROM todo ORDER BY id'),
        [['100', 'foreign', '0', '0', '2'], [own, 'own', '0', '0', '0']]);
});

test('invalid input is rejected', async () => {
    const sess = await session();
    assert.equal((await post('enter.php', { todo: 'a', due: '2026-01-10x', start: '', list_id: 0 }, sess)).text, 'Invalid due date!');
    assert.equal((await post('enter.php', { todo: 'a', due: '2026-01-01', start: '2026-01-05', list_id: 0 }, sess)).text,
        'Due date is earlier than start date!');
    const id = (await post('enter.php', { todo: 'a', due: '', start: '', list_id: 0 }, sess)).text;
    const bad = [
        [{ start: '2026-13-01' }, 'Invalid start date!'],
        [{ due: '2026-01-01', start: '2026-01-05' }, 'Due date is earlier than start date!'],
        [{ effort: 10000 }, 'Invalid effort!'],
        [{ recurrenceMode: -5 }, 'Invalid recurrence mode!'],
        [{ recurrenceAnchor: 2 }, 'Invalid recurrence anchor!'],
    ];
    for (const [over, msg] of bad) {
        assert.equal((await post('update.php', todoFields(Object.assign({ id, version: 1 }, over)), sess)).text, msg);
    }
});

test('database errors are not shown to the client', async () => {
    sql('RENAME TABLE tags TO tags_hidden');
    try {
        const res = await get('query-tags.php?list_id=0');
        assert.equal(res.status, 500);
        assert.equal(res.text, 'Database error!');
    } finally {
        sql('RENAME TABLE tags_hidden TO tags');
    }
});

test('pages send security headers', async () => {
    const res = await fetch(require('./lib').BASE + '/index.php');
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/i);
});
