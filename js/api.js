// The requests which modify data, and what a failed request is.
import { log } from './log.js';

// jQuery sends this for all requests of the page (dataType and the like are set per request)
export function setupAjax() {
    $.ajaxSetup({
        cache: false,
        // required by the server for all modifying requests:
        headers: { 'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content') }
    });
}

// the parsed JSON of a response body, null if it is not JSON
function parseJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

// What a failed request is: { message: text } if the server answered with an error status and
// {"error": text} (all endpoints do that), else { transport: true }
// (no answer, aborted, or an answer which is not from an endpoint, e.g. the 403 of the web server).
function failureOf(jqXHR) {
    var json = parseJson(jqXHR.responseText);
    if (jqXHR.status >= 400 && json !== null && typeof json.error === 'string') {
        return { message: json.error };
    }
    return { transport: true };
}

// Sends a request which modifies data. The promise is resolved with the answer of the server
// (parsed JSON, {"ok": true, ...}) if the request succeeded, and rejected with { transport: true }
// if the request itself failed or the answer is not the expected JSON, or with { message: text }
// if the server answered with an error. This is the one place which decides what a success is:
// a 2xx status and JSON with "ok".
export function postAction(url, data) {
    return new Promise(function(resolve, reject) {
        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            dataType: 'text'
        }).then(function(answer) {
            var json = parseJson(answer);
            if (json !== null && json.ok === true) {
                resolve(json);
            } else {
                reject({ transport: true });
            }
        }, function(jqXHR) {
            reject(failureOf(jqXHR));
        });
    });
}

// reports a failed postAction(): the message of the server is logged and shown behind
// the text of the language key prefixKey, a failed transmission is only shown
export function reportFailure(prefixKey, failure) {
    if (failure.transport) {
        alert($T('TRANSMISSION_ERROR'));
        return;
    }
    log($T(prefixKey)+failure.message);
    alert($T(prefixKey)+failure.message);
}

// a failed GET request for data (an error status is no .done())
export function reportLoadFailure(jqXHR) {
    reportFailure('ERROR_WHILE_LOADING', failureOf(jqXHR));
}
