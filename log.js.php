<?php include("todo-core.php"); ?>
var logItems = new Array('<?php echo(TodoLang::_("STARTING_LOG"));?>');
var logLines = 3; /* const, but IE doesn't support that keyword */
var logVisible = true;

function updateLog(element, maxCount) {
    var logOutput = '';
    var start = Math.max(0, logItems.length-maxCount);
    var end   = Math.min(start+maxCount, logItems.length);
    for (var i=start; i<end; ++i) {
        logOutput += '' + i + ': ' + logItems[i];
        if (i<end-1) {
            logOutput += '<br />';
        }
    }
    $(element).html(logOutput);
}


function toggleLog() {
    $('#smallLog').css('display', (logVisible)? 'none': 'block');
    $('#logLink').css('display', (logVisible)? 'block': 'none');
    logVisible = !logVisible;
}


function log(logStr) {
    logItems.push(logStr);
    updateLog('#smallLog', logLines);
    $('#smallLog').css('display', 'block');
}

