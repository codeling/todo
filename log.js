// needs lang-js.php (for $T) loaded before it, and escapeHtml() of todo.js when logging
var logItems = [$T('STARTING_LOG')];
// number of lines of the small log in the sidebar
var logLines = 3;
var logVisible = true;

function updateLog(element, maxCount) {
    var logOutput = '';
    var start = Math.max(0, logItems.length-maxCount);
    var end   = Math.min(start+maxCount, logItems.length);
    for (var i=start; i<end; ++i) {
        logOutput += '' + i + ': ' + escapeHtml(logItems[i]);
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

