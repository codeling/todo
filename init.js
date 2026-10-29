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

$(document).ready(function() {

    $.ajaxSetup({
        cache: false,
        // required by the server for all modifying requests:
        headers: { 'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content') }
    });

    // no inline event handlers, they are blocked by the Content-Security-Policy
    $('#inputform, #modifyform').on('submit', function(e) {
        e.preventDefault();
    });
    $('#enter_save').on('click', enter);
    $('#emptyTrash').on('click', function(e) {
        e.preventDefault();
        emptyTrash();
    });
    $('#showLog').on('click', function(e) {
        e.preventDefault();
        toggleLog();
    });

    $("#smallLog").on('click', function() {
        updateLog('#log_dialog', logItems.length);
        $('#log_dialog').append('<br />',
            $('<a href="#"></a>').text($T('LOG_ONOFF')).on('click', function(e) {
                e.preventDefault();
                toggleLog();
            }));
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

    shiftDueWithStart('#modify_start', '#modify_due', false);
    shiftDueWithStart('#enter_start', '#enter_due', true);
    $('#enter_due').on('input change', updateEnterDueLabel);
    $('#enter_due').on('click', function() {
        // the date input is invisible on narrow screens: open the picker on any tap
        if (window.matchMedia(narrowScreenQuery).matches && this.showPicker) {
            try { this.showPicker(); } catch (e) {}
        }
    });

    $('#filter .tagify__input').on('focus', function() {
        filterTagify.settings.whitelist = tagList.map( (x) => x.name );
    });

    $('#refresh').on('click', refresh);

    reloadTagList();

    refresh();
});
