<?php
    include "todo-core.php";
    include("db.php");
	function printPeriodicStat($periodName, $maxHeight, $valCount) {
	    global $db;
		$ChartWidth = 480;
        $sql = "SELECT YEAR(completionDate), ".$periodName."(completionDate), COUNT(*) ".
            "FROM `todo` ".
            "WHERE completionDate > (NOW() - INTERVAL ".$valCount." ".$periodName.") ".
            "GROUP BY YEAR(completionDate), ".$periodName."(completionDate) ".
            "ORDER BY YEAR(completionDate), ".$periodName."(completionDate)";
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
				'height:'. $height.'px;" >&nbsp;</div></td>';
    		$value_row .= '<td><div class="statvalue">'.$stuff[1].'</div></td>';
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
      <h2><?php echo(TodoLang::_("STATS_PERIODIC")); ?></h2>
      <h3><?php echo(TodoLang::_("STATS_WEEKLY")); ?></h3>
	  <?php printPeriodicStat('WEEK', 48, 10); ?>

      <h3><?php echo(TodoLang::_("STATS_MONTHLY")); ?></h3>
	  <?php printPeriodicStat('MONTH', 48, 12); ?>

      <h3><?php echo(TodoLang::_("STATS_YEARLY")); ?></h3>
	  <?php printPeriodicStat('YEAR', 48, 3); ?>

      <h2><?php echo(TodoLang::_("STATS_DUE")); ?></h2>
      
</body>
</html>
<?php
     $db->close();
