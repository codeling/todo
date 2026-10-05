const test = require('node:test');
const assert = require('node:assert/strict');
const { BASE, sql, sqlRows, resetDb, session, post, get } = require('./lib');

const todoFields = (over) => Object.assign({
    todo: 'item', due: '', start: '', effort: 1, notes: '', tags: '',
    recurrenceMode: 0, recurrenceInterval: 1, recurrenceAnchor: 0, list_id: 0
}, over);

test.beforeEach(resetDb);

test('modifying endpoints reject requests without valid CSRF token', async () => {
    const sess = await session();
    const endpoints = ['enter.php', 'update.php', 'complete.php', 'trash.php', 'empty-trash.php',
        'reactivate-one.php', 'reactivate-due.php', 'edit-tag.php', 'delete-tag.php', 'merge-tag.php'];
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
        recurrenceMode: 1, recurrenceInterval: 7, recurrenceAnchor: 1, tags: 't' }), sess)).text, '1');
    assert.equal((await post('complete.php', { id, completed: 1, version: 2 }, sess)).text, '1');
    assert.equal((await post('reactivate-one.php', { id }, sess)).text, 'Reactivated entry...');
    const rows = sqlRows('SELECT description, notes, completed FROM todo ORDER BY id');
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[1], ['x\\', payload, '0']);
    assert.equal(sql(`SELECT COUNT(*) FROM todo_tags WHERE todo_id=${Number(id) + 1}`).trim(), '1');
});

// a completed weekly entry which is due for reactivation, in the given list
async function completedDueEntry(sess, list_id) {
    const id = (await post('enter.php', { todo: 'weekly', due: '2026-01-10', start: '2026-01-08', tags: 'w', list_id }, sess)).text;
    await post('update.php', todoFields({ id, version: 1, todo: 'weekly', due: '2026-01-10', start: '2026-01-08',
        recurrenceMode: 2, recurrenceInterval: 1, recurrenceAnchor: 1, tags: 'w', list_id }), sess);
    await post('complete.php', { id, completed: 1, version: 2 }, sess);
    return id;
}

test('due recurring entries are reactivated by reactivate-due.php', async () => {
    const sess = await session();
    await completedDueEntry(sess, 0);
    assert.equal((await post('reactivate-due.php', {}, sess)).text, '1');
    const items = JSON.parse((await get('query-todos.php?list_id=0&age=10000&incomplete=true')).text);
    const copy = items.find((i) => i.completed == 0);
    assert.equal(copy.todo, 'weekly');
    assert.equal(copy.due, '2026-01-17 00:00:00');
    assert.equal(copy.start, '2026-01-15 00:00:00');
    assert.equal(copy.tags, 'w');
});

test('loading the list does not modify any data', async () => {
    const sess = await session();
    await completedDueEntry(sess, 0);
    const before = sql('SELECT COUNT(*) FROM todo').trim();
    for (let i = 0; i < 2; i++) {
        assert.equal((await get('query-todos.php?list_id=0&age=10000&incomplete=true')).status, 200);
    }
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), before);
    assert.equal(sql('SELECT COUNT(*) FROM recurringCopied').trim(), '0');
});

test('reactivate-due.php only touches the lists of the current user', async () => {
    const sess = await session();
    sql("INSERT INTO todo (id, creationDate, description, startDate, dueDate, completed, completionDate, " +
        "recurrenceMode, recurrenceInterval, recurrenceAnchor, list_id) VALUES " +
        "(100, UTC_TIMESTAMP(), 'foreign', '2026-01-08', '2026-01-10', 1, '2026-01-10 10:00:00', 2, 1, 1, 2)");
    await completedDueEntry(sess, 0);
    await post('reactivate-due.php', {}, sess);
    assert.equal(sql("SELECT COUNT(*) FROM todo WHERE description='foreign'").trim(), '1');
    assert.equal(sql("SELECT COUNT(*) FROM todo WHERE description='weekly'").trim(), '2');
});

test('concurrent reactivation creates only one copy', async () => {
    const sess = await session();
    await completedDueEntry(sess, 0);
    await Promise.all(Array.from({ length: 6 }, () => post('reactivate-due.php', {}, sess)));
    assert.equal(sql("SELECT COUNT(*) FROM todo WHERE description='weekly'").trim(), '2');
    assert.equal(sql('SELECT COUNT(*) FROM recurringCopied').trim(), '1');
});

test('recurrence supports arbitrary intervals in days, weeks, months and years', async () => {
    const sess = await session();
    const cases = [[1, 10, '2026-01-20'], [2, 3, '2026-01-31'], [3, 2, '2026-03-10'], [4, 10, '2036-01-10']];
    for (const [mode, interval, expectedDue] of cases) {
        sql('DELETE FROM recurringCopied; DELETE FROM todo_tags; DELETE FROM todo');
        const id = (await post('enter.php', { todo: 'r', due: '2026-01-10', start: '2026-01-10', tags: '', list_id: 0 }, sess)).text;
        assert.equal((await post('update.php', todoFields({ id, version: 1, todo: 'r', due: '2026-01-10',
            start: '2026-01-10', recurrenceMode: mode, recurrenceInterval: interval, recurrenceAnchor: 1 }), sess)).text, '1');
        await post('complete.php', { id, completed: 1, version: 2 }, sess);
        assert.equal((await post('reactivate-one.php', { id }, sess)).text, 'Reactivated entry...');
        assert.deepEqual(sqlRows('SELECT DATE(dueDate), recurrenceMode, recurrenceInterval FROM todo WHERE completed=0'),
            [[expectedDue, String(mode), String(interval)]]);
    }
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

// two todos in list 0 with the given tags (comma separated), returns the tag ids by name
async function taggedTodos(sess, tagsOfTodo1, tagsOfTodo2) {
    await post('enter.php', { todo: 'one', due: '', start: '', tags: tagsOfTodo1, list_id: 0 }, sess);
    await post('enter.php', { todo: 'two', due: '', start: '', tags: tagsOfTodo2, list_id: 0 }, sess);
    return Object.fromEntries(sqlRows('SELECT name, id FROM tags'));
}
const assignments = () => sqlRows('SELECT t.description, g.name FROM todo_tags r JOIN todo t ON t.id=r.todo_id ' +
    'JOIN tags g ON g.id=r.tag_id ORDER BY 1, 2').map((r) => r.join(':'));

test('a tag cannot be merged into itself', async () => {
    const sess = await session();
    const tag = await taggedTodos(sess, 'a,b', 'a');
    assert.equal((await post('merge-tag.php', { id: tag.a, merge_id: tag.a }, sess)).text,
        'A tag cannot be merged into itself!');
    assert.deepEqual(assignments(), ['one:a', 'one:b', 'two:a']);
    assert.equal(sql('SELECT COUNT(*) FROM tags').trim(), '2');
});

test('merging tags moves the entries and keeps each only once', async () => {
    const sess = await session();
    const tag = await taggedTodos(sess, 'a,b', 'a');
    assert.equal((await post('merge-tag.php', { id: tag.a, merge_id: tag.b }, sess)).text, '1');
    assert.deepEqual(assignments(), ['one:b', 'two:b']);
});

test('tag endpoints validate their parameters', async () => {
    const sess = await session();
    const tag = await taggedTodos(sess, 'keep', '');
    assert.equal((await post('edit-tag.php', { id: tag.keep }, sess)).text, 'Invalid parameters!');
    assert.equal((await post('edit-tag.php', { id: tag.keep, tag_name: '  ' }, sess)).text, 'Invalid parameters!');
    assert.equal((await post('merge-tag.php', { id: tag.keep }, sess)).text, 'Invalid parameters!');
    assert.equal(sql('SELECT name FROM tags').trim(), 'keep');
    assert.equal((await post('edit-tag.php', { id: tag.keep, tag_name: ' <b> ' }, sess)).text, '1');
    assert.equal(sql('SELECT name FROM tags').trim(), '&lt;b&gt;');
});

test('tags of other users, or shared with them, can not be changed', async () => {
    const sess = await session();
    const denied = 'Access denied: this list or entry does not belong to you!';
    // 50 is only used by another user, 51 by both, 52 by nobody
    sql("INSERT INTO tags (id, name) VALUES (50, 'foreign'), (51, 'shared'), (52, 'unused'); " +
        "INSERT INTO todo (id, creationDate, description, startDate, list_id) VALUES " +
        "(100, UTC_TIMESTAMP(), 'foreign', UTC_DATE(), 2); " +
        "INSERT INTO todo_tags (todo_id, tag_id) VALUES (100, 50), (100, 51)");
    await post('enter.php', { todo: 'own', due: '', start: '', tags: 'shared,mine', list_id: 0 }, sess);
    const mine = sqlRows("SELECT id FROM tags WHERE name='mine'")[0][0];
    const tagsBefore = sqlRows('SELECT id, name FROM tags ORDER BY id');
    const assignmentsBefore = sql('SELECT todo_id, tag_id FROM todo_tags ORDER BY 1, 2');
    for (const tag of [50, 51, 52]) {
        assert.equal((await post('edit-tag.php', { id: tag, tag_name: 'x' }, sess)).text, denied, 'edit ' + tag);
        assert.equal((await post('delete-tag.php', { id: tag }, sess)).text, denied, 'delete ' + tag);
        assert.equal((await post('merge-tag.php', { id: tag, merge_id: mine }, sess)).text, denied, 'merge ' + tag);
        assert.equal((await post('merge-tag.php', { id: mine, merge_id: tag }, sess)).text, denied, 'merge into ' + tag);
    }
    assert.deepEqual(sqlRows('SELECT id, name FROM tags ORDER BY id'), tagsBefore);
    assert.equal(sql('SELECT todo_id, tag_id FROM todo_tags ORDER BY 1, 2'), assignmentsBefore);
    // an own tag can still be edited:
    assert.equal((await post('edit-tag.php', { id: mine, tag_name: 'renamed' }, sess)).text, '1');
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
        [{ recurrenceMode: 5 }, 'Invalid recurrence mode!'],
        [{ recurrenceMode: 2, recurrenceInterval: 0 }, 'Invalid recurrence interval!'],
        [{ recurrenceMode: 2, recurrenceInterval: 1000 }, 'Invalid recurrence interval!'],
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

test('data endpoints answer with a JSON content type', async () => {
    for (const path of ['query-lists.php', 'query-tags.php?list_id=0', 'query-todos.php?list_id=0']) {
        const res = await fetch(BASE + '/queries/' + path);
        assert.match(res.headers.get('content-type'), /^application\/json/, path);
        JSON.parse(await res.text());
    }
});

test('pages send security headers', async () => {
    const res = await fetch(BASE + '/index.php');
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/i);
});
