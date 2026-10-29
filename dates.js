// date helpers; needed by todo.js and init.js, so loaded before them

function fillStr(str, fillchar, count) {
    return String(str).padStart(count, fillchar);
}


// parse a UTC timestamp ("yyyy-mm-dd hh:mm:ss", e.g. creation or completion date)
function parseDate(dateStr) {
    if (dateStr == null || dateStr == '') {
        return null;
    }
    var parts = dateStr.split(' ');
    if (parts.length < 1 || parts.length > 2) {
        return null;
    }
    var datePart = parts[0].split('-');
    var timePart = new Array(0, 0, 0);
    if (parts.length > 1) {
         timePart = parts[1].split(':');
    }
    return new Date(Date.UTC(datePart[0], datePart[1]-1, datePart[2], timePart[0], timePart[1], timePart[2], 0));
}

// parse a calendar day ("yyyy-mm-dd", optionally followed by a time which is
// ignored; start and due date): local midnight of that day, so that it is
// shown as the same day in every time zone
function parseDay(dateStr) {
    if (dateStr == null || dateStr == '') {
        return null;
    }
    var datePart = dateStr.split(' ')[0].split('-');
    if (datePart.length != 3) {
        return null;
    }
    return new Date(datePart[0], datePart[1]-1, datePart[2]);
}


function formatDate(date, includeTime) {
    if (date == null){
        return '';
    }
    if (isNaN(date.getFullYear())) {
        return 'invalid';
    }
    var result = ''+
        date.getFullYear()               +'-'+
        fillStr(date.getMonth()+1, '0', 2) +'-'+
        fillStr(date.getDate() , '0', 2);
    if (includeTime != null && includeTime == true)
    {
        result += ' ' + fillStr(date.getHours(), '0', 2) + ':' +
                  fillStr(date.getMinutes(), '0', 2) + ':' +
                  fillStr(date.getSeconds(), '0', 2);
    }
    return result;
}

function getUTCDate() {
    var now = new Date();
    var now_utc = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
    );
    return now_utc;
}

// from https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
function dateDiffInDays(a, b) {
    var _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// from http://stackoverflow.com/a/19691491
function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
