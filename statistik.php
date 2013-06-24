<?php

    include "todo-core.php";
    include("queries/db.php");

    function printPeriodicStat($periodName, $maxHeight, $valCount,
        $checkedDate='completionDate', $groupName=null)
    {
        global $db;
        if ($groupName == null) {
            $groupName = $periodName;
        }
        $ChartWidth = 800;
		$groupNameExpr = "$groupName($checkedDate".
			((strcmp($groupName, "WEEK") == 0) ? ", 3" : "")
			.")";

        $sql = "SELECT YEAR($checkedDate), $groupNameExpr, COUNT(*) ".
            "FROM `todo` ".
            "WHERE $checkedDate > (UTC_TIMESTAMP() - INTERVAL $valCount $periodName) ".
            "GROUP BY YEAR($checkedDate), $groupNameExpr ".
            "ORDER BY YEAR($checkedDate), $groupNameExpr";
        $qResult = dbQueryOrDie($db, $sql);
        $item = array();
        $bar_row = '';
        $value_row = '';
        $maxVal = 0;
        $minVal = 999999;
        $sum = 0;
        while ($stuff = $qResult->fetch_array())
        {
            $item[] = $stuff;
            $curValue = (int)$stuff[2];
            $maxVal = max($curValue, $maxVal);
            $minVal = min($curValue, $minVal);
            $sum   += $curValue;
        }
        if (count($item) < $valCount) {
            $valCount = count($item);
        }
        $avg = ((float)$sum) / $valCount;
        // if too many items retrieved, delete oldest
        if (count($item) > $valCount) {
            $item = array_splice($item, count($item)-$valCount, $valCount);
        }
        $val_scale = (float)$maxHeight/$maxVal;
        $width = (($ChartWidth-($valCount*4)) / ($valCount));
        foreach($item as $stuff)
        {
            $height = (int)( $val_scale * $stuff[2] );
            $bar_row .= '<td class="stat_row_bar"><div class="statbar" '.
                'style="width: '. $width .'px;'.
                'height:'. $height.'px;" >'.$stuff[2].'</div></td>';
            $value_row .= '<td class="stat_row_value">'.
                '<div class="statvalue" '.
                'style="width: '.$width.'px;">'.$stuff[1].'</div></td>';
        }
        $bar_row .= '<td class="stat_row_characteristics" rowspan="2">'
                 .TodoLang::_("MAXIMUM").': '.$maxVal.'<br/>'
                 .TodoLang::_("AVERAGE").': '.sprintf("%.2f", $avg).'<br/>'
                 .TodoLang::_("MINIMUM").': '.$minVal.'</td>';
    ?>
      <table>
        <tr>
          <td class="stat_row_header"><?php echo(TodoLang::_("STAT_FINISHED"));?></td>
          <?php echo($bar_row); ?>
        </tr>
        <tr>
          <td class="stat_row_header"><?php echo(TodoLang::_("STAT_".$periodName));?></td>
          <?php echo($value_row); ?>
        </tr>
      </table>
    <?php
    }
?><!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title><?php echo TodoConstants::AppName; ?> - <?php echo TodoLang::_("STATISTICS"); ?></title>

    <!-- JQuery & JQuery UI -->
<!--
    <script src="jquery/jquery-1.6.2.min.js"></script>
    <link  href="jquery/jquery-ui-1.8.16.custom.css" rel="stylesheet" type="text/css"/>
    <script src="jquery/jquery-ui-1.8.16.custom.min.js"></script>
    <script type="text/javascript" src="todo.js"></script>
-->
    <link rel="stylesheet" type="text/css" href="todo.css" />
  </head>
  <body>
    <? require("../common/navigation.php"); ?>
    <div id="todo_content">
      <div class="linkblock"><a href="index.php"><?php echo(TodoLang::_("TO_TODO"));?></a></div>
      <h1><?php echo(TodoLang::_("STATISTICS")); ?></h1>
      <div id="main_content">
<?php
    $dates = array("completion", "creation");
    foreach ($dates as $dateName)
    {
?>
        <h2><?php echo(TodoLang::_("STATS_PERIODIC_".strtoupper($dateName))); ?></h2>
  
        <h3><?php echo(TodoLang::_("STATS_DAILY")); ?></h3>
        <?php printPeriodicStat('DAY', 100, 30, $dateName.'Date', 'DATE'); ?>
  
        <h3><?php echo(TodoLang::_("STATS_WEEKLY")); ?></h3>
        <?php printPeriodicStat('WEEK', 100, 26, $dateName.'Date'); ?>
  
        <h3><?php echo(TodoLang::_("STATS_MONTHLY")); ?></h3>
        <?php printPeriodicStat('MONTH', 100, 24, $dateName.'Date'); ?>
  
        <h3><?php echo(TodoLang::_("STATS_YEARLY")); ?></h3>
        <?php printPeriodicStat('YEAR', 100, 5, $dateName.'Date'); ?>
<?php
    }
?>
<!-- to implement...  <h2><?php echo(TodoLang::_("STATS_DUE")); ?></h2> -->
      </div>
    </div>
  </body>
</html>
<?php
     $db->close();
