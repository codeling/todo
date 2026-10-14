// integrity constraints, input limits and the upgrade script update-013.sql;
// they need a running server and database, see tests/README.md
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sql, sqlRows, resetDb, session, post, get } = require('./lib');

const sqlFile = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

// the error of a statement which has to fail (the client prints it on stderr)
function sqlError(query) {
    try {
        sql(query);
    } catch (e) {
        return String(e.stderr || e.message);
    }
    assert.fail('statement did not fail: ' + query);
}

test.beforeEach(resetDb);

test('tag names are unique, ignoring case', () => {
    sql("INSERT INTO tags (name) VALUES ('Work')");
    assert.match(sqlError("INSERT INTO tags (name) VALUES ('Work')"), /Duplicate entry/);
    assert.match(sqlError("INSERT INTO tags (name) VALUES ('work')"), /Duplicate entry/);
});

test('entries with the same tag in a different case share the tag', async () => {
    const sess = await session();
    for (const tags of ['Work, home', 'work', 'WORK,Home']) {
        assert.match((await post('enter.php', { todo: 'a', due: '', start: '', tags, list_id: 0 }, sess)).text, /^\d+$/);
    }
    assert.deepEqual(sqlRows('SELECT name FROM tags ORDER BY name'), [['home'], ['Work']]);
    assert.equal(sql('SELECT COUNT(*) FROM todo_tags').trim(), '5');
});

test('requests creating the same new tag at the same time create it once', async () => {
    const sess = await session();
    const results = await Promise.all([...Array(12).keys()].map(() =>
        post('enter.php', { todo: 'a', due: '', start: '', tags: 'brandnew, other', list_id: 0 }, sess)));
    for (const res of results) {
        assert.match(res.text, /^\d+$/);
    }
    assert.deepEqual(sqlRows('SELECT name FROM tags ORDER BY name'), [['brandnew'], ['other']]);
    assert.equal(sql('SELECT COUNT(*) FROM todo_tags').trim(), '24');
});

test('a tag cannot be renamed to the name of another tag', async () => {
    const sess = await session();
    sql("INSERT INTO todo (id, creationDate, description, list_id) VALUES (1, UTC_TIMESTAMP(), 'a', 0); " +
        "INSERT INTO tags (id, name) VALUES (1, 'one'), (2, 'Two'); INSERT INTO todo_tags VALUES (1, 1)");
    for (const name of ['Two', 'two', ' TWO ']) {
        assert.equal((await post('edit-tag.php', { id: 1, tag_name: name }, sess)).text, 'A tag with this name already exists!');
    }
    assert.deepEqual(sqlRows('SELECT id, name FROM tags ORDER BY id'), [['1', 'one'], ['2', 'Two']]);
    // another case of the own name is fine:
    assert.equal((await post('edit-tag.php', { id: 1, tag_name: 'ONE' }, sess)).text, '1');
    assert.equal(sql('SELECT name FROM tags WHERE id=1').trim(), 'ONE');
});

test('an entry needs an existing list, and is deleted with its list', () => {
    assert.match(sqlError("INSERT INTO todo (creationDate, description, list_id) VALUES (UTC_TIMESTAMP(), 'a', 99)"),
        /foreign key constraint fails/i);
    sql("INSERT INTO todo (id, creationDate, description, list_id) VALUES (1, UTC_TIMESTAMP(), 'a', 1)");
    sql('DELETE FROM list WHERE id=1');
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), '0');
});

test('recurringCopied needs an existing entry, and is deleted with it', () => {
    assert.match(sqlError('INSERT INTO recurringCopied VALUES (5, UTC_TIMESTAMP())'), /foreign key constraint fails/i);
    sql("INSERT INTO todo (id, creationDate, description, list_id) VALUES (5, UTC_TIMESTAMP(), 'a', 0); " +
        'INSERT INTO recurringCopied VALUES (5, UTC_TIMESTAMP())');
    sql('DELETE FROM todo WHERE id=5');
    assert.equal(sql('SELECT COUNT(*) FROM recurringCopied').trim(), '0');
});

test('values outside of their range are rejected by the database', () => {
    const insert = (col, value) => `INSERT INTO todo (creationDate, description, list_id, ${col}) ` +
        `VALUES (UTC_TIMESTAMP(), 'a', 0, ${value})`;
    for (const [col, value] of [['completed', 2], ['deleted', 2], ['recurrenceAnchor', 2], ['recurrenceMode', 5],
        ['recurrenceInterval', 0], ['recurrenceInterval', 1000], ['effort', 10000], ['effort', -1]]) {
        assert.ok(sqlError(insert(col, value)), `${col} = ${value}`);
    }
    sql(insert('effort', 9999));
    sql(insert('recurrenceMode', 4));
});

test('over-long input is rejected with a message (counted after HTML-encoding)', async () => {
    const sess = await session();
    const fields = (todo) => ({ todo, due: '', start: '', tags: '', list_id: 0 });
    // 255 characters fit, but each & is stored as 5 characters (&amp;):
    assert.match((await post('enter.php', fields('x'.repeat(255)), sess)).text, /^\d+$/);
    for (const todo of ['x'.repeat(256), '&'.repeat(52), 'ä'.repeat(100) + '&'.repeat(40)]) {
        assert.equal((await post('enter.php', fields(todo), sess)).text, 'Todo is too long (at most 255 characters, ' +
            'special characters like & count more than once)!', todo.length + ' characters');
    }
    assert.match((await post('enter.php', fields('&'.repeat(51)), sess)).text, /^\d+$/);
    assert.equal(sql('SELECT COUNT(*) FROM todo').trim(), '2');

    const id = (await post('enter.php', fields('a'), sess)).text;
    const update = (over) => post('update.php', Object.assign({ id, version: 1, todo: 'a', due: '', start: '', effort: 1,
        notes: '', tags: '', recurrenceMode: 0, recurrenceInterval: 1, recurrenceAnchor: 0, list_id: 0 }, over), sess);
    const tooLong = 'Notes are too long (at most 10000 characters, special characters like & count more than once)!';
    assert.equal((await update({ notes: 'n'.repeat(10001) })).text, tooLong);
    assert.equal((await update({ notes: '&'.repeat(2001) })).text, tooLong);
    assert.match((await update({ todo: 'x'.repeat(256) })).text, /^Todo is too long/);
    assert.equal(sql(`SELECT version FROM todo WHERE id=${id}`).trim(), '1', 'nothing was changed');
    assert.equal((await update({ notes: 'n'.repeat(10000) })).text, '1');
    assert.equal((await update({ version: 2, notes: '&'.repeat(2000) })).text, '1');
});

test('emoji and other 4-byte characters can be stored, in all text fields and tags', async () => {
    const sess = await session();
    const id = (await post('enter.php', { todo: 'buy 🎂 cake', due: '', start: '', tags: '🎂, 🍕, Ünï', list_id: 0 }, sess)).text;
    assert.match(id, /^\d+$/);
    const update = await post('update.php', { id, version: 1, todo: 'buy 🎂 cake 𝔘', due: '', start: '', effort: 1,
        notes: 'notes 😀', tags: '🎂, 🍕, 😀', recurrenceMode: 0, recurrenceInterval: 1, recurrenceAnchor: 0, list_id: 0 }, sess);
    assert.equal(update.text, '1');
    const list = JSON.parse((await get('query-todos.php?list_id=0&incomplete=true')).text);
    assert.equal(list[0].todo, 'buy 🎂 cake 𝔘');
    assert.equal(list[0].notes, 'notes 😀');
    assert.deepEqual(list[0].tags, ['🍕', '🎂', '😀']); // ordered by code point
    // different emoji are different tags, the same emoji is the same tag:
    assert.equal(sql('SELECT COUNT(*) FROM tags').trim(), '4');
    assert.equal((await post('edit-tag.php', { id: sqlRows("SELECT id FROM tags WHERE name='🍕'")[0][0], tag_name: '🎂' }, sess)).text,
        'A tag with this name already exists!');
});

test('the length limits count characters, not bytes', async () => {
    const sess = await session();
    const fields = (todo) => ({ todo, due: '', start: '', tags: '', list_id: 0 });
    assert.match((await post('enter.php', fields('🎂'.repeat(255)), sess)).text, /^\d+$/);
    assert.match((await post('enter.php', fields('🎂'.repeat(256)), sess)).text, /^Todo is too long/);
    assert.match((await post('enter.php', Object.assign(fields('a'), { tags: '🎂'.repeat(255) }), sess)).text, /^\d+$/);
    assert.equal((await post('enter.php', Object.assign(fields('a'), { tags: '🎂'.repeat(256) }), sess)).text,
        'Invalid tags (at most 50 tags, none longer than 255 characters)!');
});

// the upgrade scripts: run on a copy of the schema of version 12 (tests/fixtures/install-v12.sql),
// with and without the foreign key which update-009.sql added, and with data to repair
const DB_OLD = 'todo_migration_old';
const DB_FRESH = 'todo_migration_fresh';
const TABLES = ['todo', 'list', 'tags', 'todo_tags', 'recurringCopied', 'settings'];

function createDb(name, script) {
    sql(`DROP DATABASE IF EXISTS ${name}; CREATE DATABASE ${name}; USE ${name}; ${script}`);
}

const schemaOf = (db) => TABLES.map((table) =>
    sql(`USE ${db}; SHOW CREATE TABLE ${table}`).replace(/ AUTO_INCREMENT=\d+/, '')).join('\n');

const OLD_DATA = `
    INSERT INTO list (id, name, user_id) VALUES (1, 'x', 0);
    INSERT INTO todo (id, creationDate, description, list_id, completed, completionDate, recurrenceMode)
        VALUES (1, UTC_TIMESTAMP(), 'a', 0, 1, UTC_TIMESTAMP(), 1), (2, UTC_TIMESTAMP(), 'b', 1, 0, NULL, 0);
    INSERT INTO tags (id, name) VALUES (1, 'Work'), (2, 'work'), (3, 'home'), (4, 'WORK '), (5, 'unused');
    INSERT INTO todo_tags VALUES (1, 1), (1, 2), (2, 2), (2, 3), (2, 4);
    INSERT INTO recurringCopied VALUES (1, UTC_TIMESTAMP()), (99, UTC_TIMESTAMP());`;

test.describe('update-013.sql and update-014.sql', () => {
    test.before(() => createDb(DB_FRESH, sqlFile('sql', 'install.sql')));
    test.after(() => sql(`DROP DATABASE IF EXISTS ${DB_OLD}; DROP DATABASE IF EXISTS ${DB_FRESH}`));

    for (const withListFk of [false, true]) {
        test(`repairs the data and leads to the schema of a new installation (foreign key of update-009: ${withListFk})`, () => {
            createDb(DB_OLD, sqlFile('tests', 'fixtures', 'install-v12.sql') +
                (withListFk ? 'ALTER TABLE todo ADD FOREIGN KEY todo_list_list_id (list_id) REFERENCES list (id) ' +
                    'ON DELETE CASCADE ON UPDATE CASCADE;' : '') + OLD_DATA);
            sql(`USE ${DB_OLD}; ${sqlFile('sql', 'update-013.sql')}`);
            sql(`USE ${DB_OLD}; ${sqlFile('sql', 'update-014.sql')}`);
            // duplicates merged into the tag with the lowest id, their entries moved, orphans removed:
            assert.deepEqual(sqlRows(`SELECT id, name FROM ${DB_OLD}.tags ORDER BY id`), [['1', 'Work'], ['3', 'home'], ['5', 'unused']]);
            assert.deepEqual(sqlRows(`SELECT todo_id, tag_id FROM ${DB_OLD}.todo_tags ORDER BY 1, 2`), [['1', '1'], ['2', '1'], ['2', '3']]);
            assert.deepEqual(sqlRows(`SELECT todo_id FROM ${DB_OLD}.recurringCopied`), [['1']]);
            assert.equal(sql(`SELECT COUNT(*) FROM ${DB_OLD}.todo`).trim(), '2');
            assert.equal(sql(`SELECT value FROM ${DB_OLD}.settings WHERE \`key\`='db.version'`).trim(), '14');
            assert.equal(schemaOf(DB_OLD), schemaOf(DB_FRESH));
        });
    }

    test('stops without changing the entries if one belongs to a list which does not exist', () => {
        createDb(DB_OLD, sqlFile('tests', 'fixtures', 'install-v12.sql') + OLD_DATA +
            "INSERT INTO todo (id, creationDate, description, list_id) VALUES (3, UTC_TIMESTAMP(), 'orphan', 77);");
        assert.match(sqlError(`USE ${DB_OLD}; ${sqlFile('sql', 'update-013.sql')}`), /foreign key constraint fails/i);
        assert.equal(sql(`SELECT COUNT(*) FROM ${DB_OLD}.todo`).trim(), '3');
        assert.equal(sql(`SELECT value FROM ${DB_OLD}.settings WHERE \`key\`='db.version'`).trim(), '12');
    });

    test('update-014.sql merges tags which only the new collation considers equal, and keeps emoji', () => {
        createDb(DB_OLD, sqlFile('tests', 'fixtures', 'install-v13.sql') + `
            INSERT INTO todo (id, creationDate, description, list_id) VALUES (1, UTC_TIMESTAMP(), 'äö', 0);
            INSERT INTO tags (id, name) VALUES (1, 'straße'), (2, 'STRASSE'), (3, 'Work'), (4, 'work2');
            INSERT INTO todo_tags VALUES (1, 1), (1, 2), (1, 3), (1, 4);`);
        sql(`USE ${DB_OLD}; ${sqlFile('sql', 'update-014.sql')}`);
        assert.deepEqual(sqlRows(`SELECT id, name FROM ${DB_OLD}.tags ORDER BY id`), [['1', 'straße'], ['3', 'Work'], ['4', 'work2']]);
        assert.equal(sql(`SELECT COUNT(*) FROM ${DB_OLD}.todo_tags`).trim(), '3');
        assert.equal(sql(`SELECT description FROM ${DB_OLD}.todo`).trim(), 'äö');
        sql(`USE ${DB_OLD}; INSERT INTO tags (name) VALUES ('🎂'), ('🍕')`);
        assert.equal(schemaOf(DB_OLD).includes('utf8mb3'), false);
    });
});
