<?php
// The data of the charts of statistics.php: how many entries of the current user have their
// completion date or creation date in each day, week, month or year. This file only reads the
// database; the page draws the charts after all of them were computed (a database error then
// still answers 500, see statistics.php).
// Dates are UTC: the connection of the application has the time zone +00:00.

// the number of buckets of the charts: the last days, ISO 8601 weeks and months up to the current
// one; the yearly chart has the years which have entries, but at most the most recent ones
const STATISTICS_DAYS = 30;
const STATISTICS_WEEKS = 26;
const STATISTICS_MONTHS = 24;
const STATISTICS_YEARS = 14;
// the bucket of a date as SQL, per unit: {col} is the date column (fixed names, see statisticsChart(),
// never input). The result is the key of the bucket which statisticsPeriods() generates for the
// same period; weeks and their years are ISO 8601 (the week of a date belongs to the year which has
// its Thursday, so the last days of December can be in week 1 and the first days of January in week 52 or 53)
const STATISTICS_BUCKET_SQL = array(
    'day' => "DATE({col})",
    'week' => "DATE_FORMAT({col}, '%x-W%v')",
    'month' => "DATE_FORMAT({col}, '%Y-%m')",
    'year' => "YEAR({col})",
);

// the current date in UTC as the database sees it (the date which UTC_DATE() has in SQL, so the
// charts do not depend on the clock or the time zone of PHP)
function statisticsToday($db)
{
    $date = dbQuery($db, "SELECT UTC_DATE()")->fetch_row()[0];
    return new DateTimeImmutable($date." 00:00:00", new DateTimeZone('UTC'));
}

// the buckets of a periodic chart (day, week or month) up to the period of $today, oldest first,
// as array(key, label), and the start of the oldest one for the range of the query
function statisticsPeriods($unit, $today)
{
    $buckets = array();
    if ($unit === 'day') {
        $start = $today->sub(new DateInterval('P'.(STATISTICS_DAYS - 1).'D'));
        for ($d = $start; $d <= $today; $d = $d->add(new DateInterval('P1D'))) {
            $buckets[] = array($d->format('Y-m-d'), $d->format('Y-m-d'));
        }
    } elseif ($unit === 'week') {
        // weeks start on Monday; the label is the number of the week, as WEEK(date, 3) of the database
        $monday = $today->sub(new DateInterval('P'.((int)$today->format('N') - 1).'D'));
        $start = $monday->sub(new DateInterval('P'.(7 * (STATISTICS_WEEKS - 1)).'D'));
        for ($d = $start; $d <= $monday; $d = $d->add(new DateInterval('P7D'))) {
            $buckets[] = array($d->format('o-\WW'), (string)(int)$d->format('W'));
        }
    } elseif ($unit === 'month') {
        // from the first of a month the other months are exact (no 31st which a shorter month does not have)
        $first = $today->modify('first day of this month');
        $start = $first->modify('-'.(STATISTICS_MONTHS - 1).' month');
        for ($d = $start; $d <= $first; $d = $d->modify('first day of next month')) {
            $buckets[] = array($d->format('Y-m'), (string)(int)$d->format('n'));
        }
    } else {
        throw new InvalidArgumentException("invalid period: $unit");
    }
    return array('buckets' => $buckets, 'from' => $start->format('Y-m-d H:i:s'));
}

// The data of one chart: 'buckets' (oldest first) with 'key' (unambiguous: 2026-10-29, 2026-W44,
// 2026-10, 2026), 'label' (what the chart shows below the bar: the date, the number of the week, the
// number of the month, the year) and 'count', and the 'max', 'min' and 'avg' of the counts.
// $unit is day, week, month or year, $dateColumn the date which is counted: completionDate or creationDate.
function statisticsChart($db, $today, $unit, $dateColumn)
{
    // column names and functions cannot be parameters of a prepared statement, they become part of
    // the SQL: only these
    if (!in_array($dateColumn, array('completionDate', 'creationDate'), true) ||
        !isset(STATISTICS_BUCKET_SQL[$unit])) {
        throw new InvalidArgumentException("invalid statistic: $unit, $dateColumn");
    }
    $periods = ($unit === 'year') ? null : statisticsPeriods($unit, $today);
    // one query per chart: the entries of the lists of the current user per bucket
    // a range of the index of the date column (todo_completionDate, todo_creationDate): no function
    // around the column, and the index is forced, as MySQL otherwise reads all entries of the lists
    // through list_id when its statistics of the table are old (e.g. after many entries were added)
    $sql = "SELECT ".str_replace('{col}', "t.".$dateColumn, STATISTICS_BUCKET_SQL[$unit])." AS bucket, COUNT(*) ".
        "FROM todo t ".(($periods !== null) ? "FORCE INDEX (todo_".$dateColumn.") " : "")."WHERE ";
    $params = array();
    if ($periods !== null) {
        $sql .= "t.".$dateColumn." >= ? AND ";
        $params[] = $periods['from'];
    }
    $sql .= "t.deleted = 0 AND t.list_id IN (SELECT id FROM list WHERE user_id = ?) GROUP BY bucket";
    $params[] = (int)todoUserId();

    $counts = array();
    $unfinished = 0;
    $result = dbExec($db, $sql, $params)->get_result();
    while ($row = $result->fetch_row()) {
        if ($row[0] === null) {
            $unfinished = (int)$row[1];
        } else {
            $counts[(string)$row[0]] = (int)$row[1];
        }
    }

    $buckets = array();
    if ($periods === null) {
        // only the years which have entries, the entries without date first (they have no year)
        ksort($counts);
        $years = array_slice(array_keys($counts), -STATISTICS_YEARS);
        if ($unfinished > 0) {
            $buckets[] = array('key' => 'none', 'label' => TodoLang::_("STAT_NOT_FINISHED"), 'count' => $unfinished);
        }
        foreach ($years as $year) {
            $buckets[] = array('key' => (string)$year, 'label' => (string)$year, 'count' => $counts[$year]);
        }
    } else {
        // all periods, also the ones without entries
        foreach ($periods['buckets'] as $bucket) {
            $buckets[] = array('key' => $bucket[0], 'label' => $bucket[1],
                'count' => isset($counts[$bucket[0]]) ? $counts[$bucket[0]] : 0);
        }
    }

    $values = array_column($buckets, 'count');
    return array(
        'buckets' => $buckets,
        'max' => count($values) > 0 ? max($values) : 0,
        'min' => count($values) > 0 ? min($values) : 0,
        'avg' => count($values) > 0 ? array_sum($values) / count($values) : 0.0,
    );
}
