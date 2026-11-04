// needs lang-js.php (for $T) loaded before it
import { escapeHtml } from './html.js';

export const logItems = [$T('STARTING_LOG')];


// shows the last maxCount lines of the log in the element
export function updateLog(element, maxCount) {
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


export function log(logStr) {
    logItems.push(logStr);
}
