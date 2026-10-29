// The statistics page counts the right entries in the right buckets: day, week, month and year of the
// completion date and of the creation date. Every bar of the SVG charts has data-key and data-count
// (see statistics.php); the expected buckets are computed here, independently of the page, from the
// date of the database (UTC) and the entries in the table.
// They need a running server and database, see tests/README.md
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { BASE, sql, sqlRows, resetDb } = require('./lib');

const ROOT = path.join(__dirname, '..');
const DAY = 86400000;
const parse = (date) => new Date(date + 'T00:00:00Z');
const format = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const pad = (n) => String(n).padStart(2, '0');

// ISO 8601 week of a date: the year and the number of the week (the week belongs to the year of its Thursday)
function isoWeek(d) {
    const thursday = addDays(d, 3 - ((d.getUTCDay() + 6) % 7));
    const year = thursday.getUTCFullYear();
    return { year, week: Math.floor((thursday - Date.UTC(year, 0, 1)) / DAY / 7) + 1 };
}

// the bucket of a date (YYYY-MM-DD) in a chart of the unit: its key (as in the data-key of the bars) and its label
function bucketOf(unit, date) {
    if (unit === 'day') {
        return { key: date, label: date };
    }
    if (unit === 'week') {
        const { year, week } = isoWeek(parse(date));
        return { key: `${year}-W${pad(week)}`, label: String(week) };
    }
    if (unit === 'month') {
        return { key: date.slice(0, 7), label: String(Number(date.slice(5, 7))) };
    }
    return { key: date.slice(0, 4), label: date.slice(0, 4) };
}

// the buckets of the periodic charts, oldest first, up to the one of today: the last 30 days, 26 weeks, 24 months
function periods(unit, today) {
    const t = parse(today);
    const list = [];
    if (unit === 'day') {
        for (let i = 29; i >= 0; i--) list.push(bucketOf('day', format(addDays(t, -i))));
    } else if (unit === 'week') {
        const monday = addDays(t, -((t.getUTCDay() + 6) % 7));
        for (let i = 25; i >= 0; i--) list.push(bucketOf('week', format(addDays(monday, -7 * i))));
    } else {
        for (let i = 23; i >= 0; i--) {
            const months = t.getUTCFullYear() * 12 + t.getUTCMonth() - i;
            list.push(bucketOf('month', `${Math.floor(months / 12)}-${pad(months % 12 + 1)}-01`));
        }
    }
    return list;
}

// the charts of the page: name (completion-day, ...) => { buckets: [{ key, label, count }], max, avg, min }
function parseCharts(html) {
    const charts = {};
    for (const part of html.split('<div class="stat_chart" data-chart="').slice(1)) {
        const name = part.slice(0, part.indexOf('"'));
        const keys = [...part.matchAll(/<rect class="statbar[^"]*" data-key="([^"]*)" data-count="(\d+)"/g)];
        const labels = [...part.matchAll(/<text class="statlabel[^"]*"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
        const counts = [...part.matchAll(/<text class="statcount[^"]*"[^>]*>(\d+)<\/text>/g)].map((m) => Number(m[1]));
        const stats = part.match(/data-max="(\d+)" data-avg="([\d.]+)" data-min="(\d+)"/);
        assert.equal(labels.length, keys.length, name);
        assert.deepEqual(counts, keys.map((m) => Number(m[2])), `${name}: the number in a bar is its count`);
        charts[name] = {
            buckets: keys.map((m, i) => ({ key: m[1], label: labels[i], count: Number(m[2]) })),
            max: Number(stats[1]), avg: stats[2], min: Number(stats[3]),
        };
    }
    return charts;
}

// the page and the date of the database, read again afterwards: the result is only valid if it is the same day
async function pageToday() {
    for (let i = 0; i < 3; i++) {
        const before = sql('SELECT UTC_DATE()').trim();
        const res = await fetch(BASE + '/statistics.php');
        assert.equal(res.status, 200);
        const html = await res.text();
        if (sql('SELECT UTC_DATE()').trim() === before) {
            return { today: before, html };
        }
    }
    throw new Error('the day changed three times in a row');
}

// checks the eight charts against the entries in the table: only the entries in the lists of the user (0)
// which are not in the trash count, each in the bucket of its date
function assertCharts(charts, today) {
    assert.deepEqual(Object.keys(charts), ['completion-day', 'completion-week', 'completion-month', 'completion-year',
        'creation-day', 'creation-week', 'creation-month', 'creation-year']);
    const rows = sqlRows('SELECT DATE(creationDate), DATE(completionDate) FROM todo WHERE deleted = 0 AND list_id IN (0, 1)');
    for (const [column, name] of [[0, 'creation'], [1, 'completion']]) {
        const dates = rows.map((r) => r[column]);
        for (const unit of ['day', 'week', 'month', 'year']) {
            const perBucket = {};
            for (const date of dates.filter((d) => d !== null)) {
                const key = bucketOf(unit, date).key;
                perBucket[key] = (perBucket[key] || 0) + 1;
            }
            let expected;
            if (unit === 'year') {
                // the years which have entries, and the entries without date (not completed) first
                expected = Object.keys(perBucket).sort().map((year) => ({ key: year, label: year, count: perBucket[year] }));
                const unfinished = dates.filter((d) => d === null).length;
                if (unfinished > 0) {
                    expected.unshift({ key: 'none', label: 'not finished', count: unfinished });
                }
            } else {
                expected = periods(unit, today).map((b) => ({ ...b, count: perBucket[b.key] || 0 }));
            }
            const chart = charts[`${name}-${unit}`];
            assert.deepEqual(chart.buckets, expected, `${name}-${unit}`);
            // maximum, average and minimum of the bars which are shown (the average has two decimals, rounded as
            // PHP does, which differs from JavaScript for a value exactly between two: 0.125)
            const counts = chart.buckets.map((b) => b.count);
            assert.deepEqual([chart.max, chart.min], [Math.max(...counts), Math.min(...counts)], `${name}-${unit}`);
            assert.match(chart.avg, /^\d+\.\d\d$/, `${name}-${unit}`);
            assert.ok(Math.abs(Number(chart.avg) - counts.reduce((a, b) => a + b, 0) / counts.length) <= 0.005 + 1e-9, `${name}-${unit}: ${chart.avg}`);
        }
    }
}

test('the charts count the entries of the user in the right periods', async () => {
    resetDb();
    // completed today (the first and the last second), 8 days ago, in the previous month (its first day), two years
    // ago and never; the creation dates are others. An entry in the trash and one in the list of another user (2) are
    // not counted
    sql(`INSERT INTO todo (creationDate, description, startDate, completed, completionDate, deleted, list_id) VALUES
        (TIMESTAMP(UTC_DATE() - INTERVAL 3 DAY, '10:00:00'), 'completed today (first second)', UTC_DATE(), 1, TIMESTAMP(UTC_DATE()), 0, 0),
        (TIMESTAMP(UTC_DATE(), '00:00:01'), 'completed today (last second)', UTC_DATE(), 1, TIMESTAMP(UTC_DATE(), '23:59:59'), 0, 1),
        (TIMESTAMP(UTC_DATE() - INTERVAL 8 DAY, '08:00:00'), 'completed 8 days ago', UTC_DATE(), 1, TIMESTAMP(UTC_DATE() - INTERVAL 8 DAY, '12:00:00'), 0, 0),
        (TIMESTAMP(UTC_DATE() - INTERVAL 40 DAY, '00:00:00'), 'previous month', UTC_DATE(), 1,
            TIMESTAMP(UTC_DATE() - INTERVAL DAYOFMONTH(UTC_DATE()) - 1 DAY - INTERVAL 1 MONTH, '12:00:00'), 0, 0),
        (TIMESTAMP(UTC_DATE() - INTERVAL 2 YEAR - INTERVAL 5 DAY, '12:00:00'), 'two years ago', UTC_DATE(), 1,
            TIMESTAMP(UTC_DATE() - INTERVAL 2 YEAR, '12:00:00'), 0, 0),
        (TIMESTAMP(UTC_DATE() - INTERVAL 8 DAY, '09:00:00'), 'not completed', UTC_DATE(), 0, NULL, 0, 0),
        (TIMESTAMP(UTC_DATE()), 'in the trash', UTC_DATE(), 1, TIMESTAMP(UTC_DATE()), 1, 0),
        (TIMESTAMP(UTC_DATE()), 'of another user', UTC_DATE(), 1, TIMESTAMP(UTC_DATE()), 0, 2)`);
    const { today, html } = await pageToday();
    const charts = parseCharts(html);
    assertCharts(charts, today);

    // and the bars which these entries make, in plain numbers
    const count = (chart, key) => charts[chart].buckets.find((b) => b.key === key).count;
    const daysAgo = (n) => format(addDays(parse(today), -n));
    assert.equal(count('completion-day', today), 2, 'completed today');
    assert.equal(count('completion-day', daysAgo(8)), 1, 'completed 8 days ago');
    assert.equal(count('creation-day', daysAgo(3)), 1);
    assert.equal(count('creation-day', daysAgo(8)), 2, 'created 8 days ago');
    assert.equal(count('creation-day', today), 1);
    const year = Number(today.slice(0, 4));
    assert.equal(count('completion-year', String(year - 2)), 1, 'completed two years ago');
    assert.equal(count('completion-year', 'none'), 1, 'not completed');
    assert.equal(charts['creation-year'].buckets.some((b) => b.key === 'none'), false, 'every entry has a creation date');
    // the entry in the trash and the one of the other user are in no chart: 6 entries, each in one yearly bar
    for (const name of ['completion', 'creation']) {
        assert.equal(charts[`${name}-year`].buckets.reduce((sum, b) => sum + b.count, 0), 6, name);
    }
    resetDb();
});

test('entries at the edges of weeks, months, years and of the first and the last period are counted in the right one', async () => {
    resetDb();
    // dates (SQL) of entries completed on them and created a day earlier: new year and its eve (the weeks of such days belong
    // to the ISO year of their Thursday), the Monday of this week and the day before it, the first and the last
    // day of the daily chart and the one before, the same for the weekly and for the monthly chart (26 weeks, 24 months)
    const dates = ["MAKEDATE(YEAR(UTC_DATE()), 1)", "MAKEDATE(YEAR(UTC_DATE()), 1) - INTERVAL 1 DAY",
        "UTC_DATE() - INTERVAL WEEKDAY(UTC_DATE()) DAY", "UTC_DATE() - INTERVAL WEEKDAY(UTC_DATE()) DAY - INTERVAL 1 DAY",
        "UTC_DATE() - INTERVAL 29 DAY", "UTC_DATE() - INTERVAL 30 DAY",
        "UTC_DATE() - INTERVAL WEEKDAY(UTC_DATE()) DAY - INTERVAL 25 WEEK", "UTC_DATE() - INTERVAL WEEKDAY(UTC_DATE()) DAY - INTERVAL 25 WEEK - INTERVAL 1 DAY",
        "UTC_DATE() - INTERVAL DAYOFMONTH(UTC_DATE()) - 1 DAY - INTERVAL 23 MONTH",
        "UTC_DATE() - INTERVAL DAYOFMONTH(UTC_DATE()) DAY - INTERVAL 23 MONTH",
        "UTC_DATE() - INTERVAL DAYOFMONTH(UTC_DATE()) DAY"];
    for (const date of dates) {
        for (const time of ['00:00:00', '23:59:59']) {
            sql(`INSERT INTO todo (creationDate, description, startDate, completed, completionDate, list_id) VALUES
                (TIMESTAMP(${date} - INTERVAL 1 DAY, '${time}'), 'edge', UTC_DATE(), 1, TIMESTAMP(${date}, '${time}'), 0)`);
        }
    }
    const { today, html } = await pageToday();
    assertCharts(parseCharts(html), today);
    resetDb();
});

test('an empty database gives periods without entries and no yearly bars', async () => {
    resetDb();
    const { today, html } = await pageToday();
    const charts = parseCharts(html);
    assert.equal(Object.keys(charts).length, 8);
    for (const [name, chart] of Object.entries(charts)) {
        const unit = name.split('-')[1];
        if (unit === 'year') {
            assert.deepEqual(chart.buckets, [], name);
        } else {
            assert.deepEqual(chart.buckets.map((b) => b.key), periods(unit, today).map((b) => b.key), name);
            assert.ok(chart.buckets.every((b) => b.count === 0), name);
        }
        assert.deepEqual([chart.max, chart.avg, chart.min], [0, '0.00', 0], name);
    }
});

// PHP of the application on the command line (the functions which need no database)
function php(code) {
    return execFileSync('php', ['-d', 'display_errors=stderr', '-r', 'require "queries/statistics-data.php"; ' + code],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// dates around the turn of the year (also years with 53 ISO weeks: 2020 and 2026, and 2024 with a leap day), the
// end of months of 28 to 31 days, and every 13th day in between
function sampleDates() {
    const dates = new Set();
    for (const [from, to] of [['2020-12-01', '2021-02-05'], ['2024-02-20', '2024-03-05'], ['2024-12-20', '2025-01-10'],
        ['2025-12-20', '2026-01-10'], ['2026-12-20', '2027-01-10'], ['2027-12-25', '2028-01-08'], ['2028-12-25', '2029-01-08'],
        ['2026-02-25', '2026-03-05'], ['2026-04-28', '2026-05-03'], ['2026-07-28', '2026-08-03']]) {
        for (let d = parse(from); d <= parse(to); d = addDays(d, 1)) dates.add(format(d));
    }
    for (let d = parse('2019-06-01'); d <= parse('2030-06-30'); d = addDays(d, 13)) dates.add(format(d));
    return [...dates].sort();
}

test('the periods which the page generates are the days, ISO weeks and months up to today, also around new year', () => {
    const dates = sampleDates();
    const out = JSON.parse(php(`
        $out = array();
        foreach (${JSON.stringify(dates)} as $date) {
            foreach (array('day', 'week', 'month') as $unit) {
                $p = statisticsPeriods($unit, new DateTimeImmutable($date.' 00:00:00', new DateTimeZone('UTC')));
                $out[$date][$unit] = array('buckets' => $p['buckets'], 'from' => $p['from']);
            }
        }
        echo json_encode($out);`));
    for (const date of dates) {
        for (const unit of ['day', 'week', 'month']) {
            const buckets = out[date][unit].buckets;
            const expected = periods(unit, date);
            assert.deepEqual(buckets, expected.map((b) => [b.key, b.label]), `${unit} up to ${date}`);
            assert.equal(new Set(buckets.map((b) => b[0])).size, buckets.length, `${unit} up to ${date}: each bucket once`);
            // the range of the query starts with the first second of the oldest bucket
            const first = unit === 'month' ? buckets[0][0] + '-01' : unit === 'week'
                ? format(addDays(parse(date), -((parse(date).getUTCDay() + 6) % 7) - 7 * 25)) : buckets[0][0];
            assert.equal(out[date][unit].from, first + ' 00:00:00', `${unit} up to ${date}`);
        }
    }
});

test('the SQL of the buckets and the generated periods give the same keys, also around new year', () => {
    const dates = sampleDates();
    const sqlOf = JSON.parse(php('echo json_encode(STATISTICS_BUCKET_SQL);'));
    assert.deepEqual(Object.keys(sqlOf), ['day', 'week', 'month', 'year']);
    // the keys the database gives to noon and to the last second of the days, in one query
    const columns = [];
    for (const date of dates) {
        for (const time of ['00:00:00', '23:59:59']) {
            for (const unit of ['day', 'week', 'month', 'year']) {
                columns.push(sqlOf[unit].replace('{col}', `TIMESTAMP('${date}', '${time}')`));
            }
        }
    }
    // (a few thousand expressions in one statement are too many for the client: in chunks)
    const keys = [];
    for (let i = 0; i < columns.length; i += 400) {
        keys.push(...sqlRows('SELECT ' + columns.slice(i, i + 400).map((c, j) => `${c} AS c${j}`).join(', '))[0]);
    }
    let i = 0;
    for (const date of dates) {
        for (const time of ['00:00:00', '23:59:59']) {
            for (const unit of ['day', 'week', 'month', 'year']) {
                assert.equal(keys[i++], bucketOf(unit, date).key, `${unit} of ${date} ${time}`);
            }
        }
    }
});
