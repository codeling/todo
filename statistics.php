<?php

    require_once("todo-core.php");
    require_once("queries/db.php");
    require_once("queries/statistics-data.php");

    // size of the charts in pixels: the bars are 100 high at most and have 800 together, in front of
    // them is a column for the headings of the two rows
    const STAT_BARS_WIDTH = 800;
    const STAT_BAR_HEIGHT = 100;
    const STAT_MIN_BAR_HEIGHT = 12;
    const STAT_HEADER_WIDTH = 104;
    // the gap between two bars, the height of a line of text, the width of a character of a label
    const STAT_BAR_GAP = 4;
    const STAT_LINE_HEIGHT = 16;
    const STAT_CHAR_WIDTH = 7;

    // a number for an attribute of the SVG: without locale and trailing zeros
    function statNumber($value)
    {
        return rtrim(rtrim(sprintf('%.2F', $value), '0'), '.');
    }

    function statEscape($text)
    {
        return htmlspecialchars((string)$text);
    }

    // draws a chart (the result of statisticsChart()) as SVG, with its attributes and no styles (the
    // colors are in todo.css): a bar for every bucket with the count in it, the labels below the
    // bars and the headings of the two rows on the left; maximum, average and minimum are next to it.
    // $id names the chart for the tests and scripts, $title is for assistive technology.
    function printStatisticsChart($chart, $id, $title, $labelHeading)
    {
        $buckets = $chart['buckets'];
        $slot = STAT_BARS_WIDTH / max(count($buckets), 1);
        $barWidth = $slot - STAT_BAR_GAP;
        // labels which are wider than the space for a bar are turned to read upwards
        $longest = 0;
        foreach ($buckets as $bucket) {
            $longest = max($longest, strlen($bucket['label']));
        }
        $turned = $longest * STAT_CHAR_WIDTH > $slot;
        $labelsTop = STAT_BAR_HEIGHT + STAT_BAR_GAP;
        $height = $labelsTop + ($turned ? $longest * STAT_CHAR_WIDTH + STAT_BAR_GAP : STAT_LINE_HEIGHT);
        $width = STAT_HEADER_WIDTH + STAT_BARS_WIDTH;

        $svg = '<text class="stat_row_header" x="0" y="'.statNumber(STAT_BAR_HEIGHT / 2 + 4).'">'.
            statEscape(TodoLang::_("STAT_FINISHED")).'</text>'."\n            ".
            '<text class="stat_row_header" x="0" y="'.statNumber($labelsTop + 12).'">'.statEscape($labelHeading).'</text>';
        foreach ($buckets as $i => $bucket) {
            $svg .= "\n            ";
            $left = STAT_HEADER_WIDTH + $i * $slot;
            $center = $left + $slot / 2;
            // the highest bar is STAT_BAR_HEIGHT high, no bar lower than the smallest one; the bar
            // of an empty bucket is that high too, but not drawn
            $barHeight = ($chart['max'] == 0) ? STAT_MIN_BAR_HEIGHT :
                max(intdiv(STAT_BAR_HEIGHT * $bucket['count'], $chart['max']), STAT_MIN_BAR_HEIGHT);
            $top = STAT_BAR_HEIGHT - $barHeight;
            $empty = ($bucket['count'] == 0);
            $svg .= '<rect class="statbar'.($empty ? ' emptystatbar' : '').'" data-key="'.statEscape($bucket['key']).
                '" data-count="'.$bucket['count'].'" x="'.statNumber($left + STAT_BAR_GAP / 2).'" y="'.statNumber($top).
                '" width="'.statNumber($barWidth).'" height="'.$barHeight.'">'.
                '<title>'.statEscape($bucket['key'].': '.$bucket['count']).'</title></rect>'.
                '<text class="statcount'.($empty ? ' emptystatcount' : '').'" x="'.statNumber($center).
                '" y="'.statNumber($top + 11).'">'.$bucket['count'].'</text>';
            if ($turned) {
                // rotated around the end of the text: it hangs below the bar (4 pixels: half of the height of a line)
                $x = statNumber($center + 4);
                $svg .= '<text class="statlabel turned" transform="rotate(-90 '.$x.' '.$labelsTop.')" x="'.$x.
                    '" y="'.$labelsTop.'">'.statEscape($bucket['label']).'</text>';
            } else {
                $svg .= '<text class="statlabel" x="'.statNumber($center).'" y="'.statNumber($labelsTop + 12).'">'.
                    statEscape($bucket['label']).'</text>';
            }
        }
        $width = statNumber($width);
        $height = statNumber($height);
?>
      <div class="stat_chart" data-chart="<?php echo(statEscape($id)); ?>">
        <div class="stat_scroll">
          <svg class="stat_svg" role="group" aria-label="<?php echo(statEscape($title)); ?>" width="<?php echo($width); ?>" height="<?php echo($height); ?>" viewBox="0 0 <?php echo($width.' '.$height); ?>">
            <?php echo($svg); ?>

          </svg>
        </div>
        <div class="stat_characteristics" data-max="<?php echo($chart['max']); ?>" data-avg="<?php echo(sprintf("%.2f", $chart['avg'])); ?>" data-min="<?php echo($chart['min']); ?>">
          <?php echo(statEscape(TodoLang::_("MAXIMUM"))); ?>: <?php echo($chart['max']); ?><br/>
          <?php echo(statEscape(TodoLang::_("AVERAGE"))); ?>: <?php echo(sprintf("%.2f", $chart['avg'])); ?><br/>
          <?php echo(statEscape(TodoLang::_("MINIMUM"))); ?>: <?php echo($chart['min']); ?>
        </div>
      </div>
<?php
    }

    // all data before the first output: the status of a response can not be changed once the page started,
    // so a database error in one of the queries (failRequest(): 500 and a plain text) works whether the
    // server buffers the output or not
    $db = todoDb();
    $today = statisticsToday($db);
    $dates = array('completion' => 'completionDate', 'creation' => 'creationDate');
    // per period: the keys of the headings (the chart and the labels row)
    $periods = array(
        'day' => array('STATS_DAILY', 'STAT_DAY'),
        'week' => array('STATS_WEEKLY', 'STAT_WEEK'),
        'month' => array('STATS_MONTHLY', 'STAT_MONTH'),
        'year' => array('STATS_YEARLY', 'STAT_YEAR'),
    );
    $charts = array();
    foreach ($dates as $dateName => $dateColumn) {
        foreach ($periods as $unit => $headings) {
            $charts[$dateName][$unit] = statisticsChart($db, $today, $unit, $dateColumn);
        }
    }
?><!DOCTYPE html>
<html lang="<?php echo htmlspecialchars(todoConfig('language')); ?>">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo statEscape(TodoConstants::AppName); ?> - <?php echo statEscape(TodoLang::_("STATISTICS")); ?></title>
    <link rel="stylesheet" type="text/css" href="<?php echo(assetUrl("todo.css")); ?>" />
    <link rel="icon" href="todo.svg" type="image/svg+xml">
  </head>
  <body>
    <div id="todo_content">
      <div class="linkblock"><a href="index.php"><?php echo(statEscape(TodoLang::_("TO_TODO")));?></a></div>
      <h1><?php echo(statEscape(TodoLang::_("STATISTICS"))); ?></h1>
      <div id="main_content">
<?php
    foreach ($dates as $dateName => $dateColumn)
    {
        $dateHeading = TodoLang::_("STATS_PERIODIC_".strtoupper($dateName));
?>
        <h2><?php echo(statEscape($dateHeading)); ?></h2>
<?php
        foreach ($periods as $unit => $headings)
        {
?>

        <h3><?php echo(statEscape(TodoLang::_($headings[0]))); ?></h3>
<?php
            printStatisticsChart($charts[$dateName][$unit], $dateName.'-'.$unit,
                $dateHeading.': '.TodoLang::_($headings[0]), TodoLang::_($headings[1]));
        }
    }
?>
<!-- to implement...  <h2><?php echo(TodoLang::_("STATS_DUE")); ?></h2> -->
      </div>
    </div>
  </body>
</html>
