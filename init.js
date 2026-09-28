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

// when the start date is changed, move the due date by the same number of days
// (or, if fillEmptyDue is set and no due date is set yet, set it to the start date)
function shiftDueWithStart(startSel, dueSel, fillEmptyDue) {
    $(startSel).on('change', function() {
        var oldVal = parseDay($(startSel).data('oldVal'));
        var newVal = parseDay($(startSel).val());
        var curDue = parseDay($(dueSel).val());
        if (curDue == null) {
            if (fillEmptyDue) {
                $(dueSel).val($(startSel).val());
            }
        } else if (oldVal != null && newVal != null) {
            $(dueSel).val(formatDate(addDays(curDue, dateDiffInDays(oldVal, newVal))));
        }
        $(startSel).data('oldVal', $(startSel).val());
    });
}

var tagList;

$(document).ready(function() {

    $.ajaxSetup({cache: false });

    $("#smallLog").on('click', function() {
        updateLog('#log_dialog', logItems.length);
        $('#log_dialog').html($('#log_dialog').html()+
                '<br /><a href="javascript:toggleLog()">'+$T('LOG_ONOFF')+'</a>');
        $('#log_dialog').dialog({
            modal: true,
            minHeight: 150,
            width: dialogWidth(600),
            maxWidth: 600,
            title: 'Log'
        });
    });

    $('#loadMoreCompleted').on('click', function(e) {
        e.preventDefault();
        reloadData.age += 10;
        reload();
    });
    $('#loadLessCompleted').on('click', function(e) {
        e.preventDefault();
        reloadData.age -= 10;
        if (reloadData.age < 0)
        {
            reloadData.age = 0;
        }
        reload();
    });
    $('#loadIncomplete').on('click', function(e) {
        e.preventDefault();
        reloadData.incomplete = !reloadData.incomplete;
        $('#loadIncomplete').text(reloadData.incomplete?$T('LOAD_INCOMPLETE_HIDE'):$T('LOAD_INCOMPLETE'));
        reload();
    });

    new Tagify($('#modify_tag_edit')[0]);

    shiftDueWithStart('#modify_start', '#modify_due', false);
    shiftDueWithStart('#enter_start', '#enter_due', true);

    $('#filter .tagify__input').on('focus', function() {
        let tagStrs = tagList.map( (x) => x.name );
        $('#filter_tag_edit')[0].__tagify.settings.whitelist = tagStrs;
    });

    $('#refresh').on('click', refresh);

    reloadTagList();

    refresh();
});
