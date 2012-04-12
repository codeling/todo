<?php

    include "todo-core.php";
    include("db.php");

    function printPeriodicStat($periodName, $maxHeight, $valCount,
        $checkedDate='completionDate', $groupName=null)
    {
        global $db;
        if ($groupName == null) {
            $groupName = $periodName;
        }
        $ChartWidth = 800;
        $sql = "SELECT YEAR($checkedDate), $groupName($checkedDate), COUNT(*) ".
            "FROM `todo` ".
            "WHERE $checkedDate > (NOW() - INTERVAL $valCount $periodName) ".
            "GROUP BY YEAR($checkedDate), $groupName($checkedDate) ".
            "ORDER BY YEAR($checkedDate), $groupName($checkedDate)";
        $qResult = dbQueryOrDie($db, $sql);
        $item = array();
        $bar_row = '';
        $value_row = '';
        $maxVal = 0;
        $minVal = 999999;
        while ($stuff = $qResult->fetch_array())
        {
            $item[] = $stuff;
            if ((int)$stuff[2] > $maxVal) {
                $maxVal = $stuff[2];
            }
            if ((int)$stuff[2] < $minVal) {
                $minVal = $stuff[2];
            }
        }
        if (count($item) > $valCount) {
            $item = array_splice($item, count($item)-$valCount, $valCount);
        }
        if (count($item) < $valCount) {
            $valCount = count($item);
        }
        $val_scale = (float)$maxHeight/$maxVal;
        $width = (($ChartWidth-($valCount*4)) / ($valCount));
        foreach($item as $stuff)
        {
            $height = (int)( $val_scale * $stuff[2] );
            $bar_row .= '<td class="statbar_row"><div class="statbar" '.
                'style="width: '. $width .'px;'.
                'height:'. $height.'px;" >'.$stuff[2].'</div></td>';
            $value_row .= '<td><div class="statvalue" style="width: '.$width.'px;">'.$stuff[1].'</div></td>';
        }
        $bar_row   .= '<td>Maximum: '.$maxVal.'</td>';
        $value_row .= '<td>Minimum: '.$minVal.'</td>';
    ?>
      <table>
        <tr>
          <td>Finished Todos</td>
          <?php echo($bar_row); ?>
        </tr>
        <tr>
          <td><?php echo($periodName);?></td>
          <?php echo($value_row); ?>
        </tr>
      </table>
    <?php
    }
?><!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title><?php echo TodoConstants::AppName; ?> - Statistics</title>
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
      <div class="linkblock"><a href="index.php"><?php echo(TodoLang::_("BACK_TO_TODO"));?></a></div>
      <h1><?php echo(TodoLang::_("STATISTICS")); ?></h1>
      <h2><?php echo(TodoLang::_("STATS_PERIODIC_COMPLETION")); ?></h2>

      <h3><?php echo(TodoLang::_("STATS_DAILY")); ?></h3>
      <?php printPeriodicStat('DAY', 100, 30, 'completionDate', 'DATE'); ?>

      <h3><?php echo(TodoLang::_("STATS_WEEKLY")); ?></h3>
      <?php printPeriodicStat('WEEK', 100, 52); ?>

      <h3><?php echo(TodoLang::_("STATS_MONTHLY")); ?></h3>
      <?php printPeriodicStat('MONTH', 100, 24); ?>

      <h3><?php echo(TodoLang::_("STATS_YEARLY")); ?></h3>
      <?php printPeriodicStat('YEAR', 100, 5); ?>
	  
      <h2><?php echo(TodoLang::_("STATS_PERIODIC_CREATION")); ?></h2>

      <h3><?php echo(TodoLang::_("STATS_DAILY")); ?></h3>
      <?php printPeriodicStat('DAY', 100, 30, 'creationDate', 'DATE'); ?>

      <h3><?php echo(TodoLang::_("STATS_WEEKLY")); ?></h3>
      <?php printPeriodicStat('WEEK', 100, 52, 'creationDate'); ?>

      <h3><?php echo(TodoLang::_("STATS_MONTHLY")); ?></h3>
      <?php printPeriodicStat('MONTH', 100, 24, 'creationDate'); ?>

      <h3><?php echo(TodoLang::_("STATS_YEARLY")); ?></h3>
      <?php printPeriodicStat('YEAR', 100, 5, 'creationDate'); ?>

      <h2><?php echo(TodoLang::_("STATS_DUE")); ?></h2>
      
</body>
</html>
<?php
     $db->close();
