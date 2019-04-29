function createDatePicker(tagid) {
    $(tagid).datepicker( {
        showOn: 'both',
        buttonImageOnly: true,
        buttonImage: 'images/calendar.png',
        dateFormat: 'yy-mm-dd',
        showAnim: ''
    });
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

var tagList;

$(document).ready(function() {

    $.ajaxSetup({cache: false });

    jQuery(function($){
        $.datepicker.regional['de'] = {clearText: $T('DELETE'), clearStatus: $T('DELETE_CUR_DATE'),
                closeText: $T('CLOSE'), closeStatus: $T('CLOSE_WITHOUT_CHANGE'),
                prevText: $T('BACK'), prevStatus: $T('SHOW_LAST_MONTH'),
                nextText: $T('FORWARD'), nextStatus: $T('SHOW_NEXT_MONTH'),
                currentText: $T('TODAY'), currentStatus: '',
                monthNames: [$T('JANUARY'), $T('FEBRUARY'), $T('MARCH'), $T('APRIL'),
                    $T('MAY'), $T('JUNE'), $T('JULY'), $T('AUGUST'),
                    $T('SEPTEMBER'), $T('OCTOBER'), $T('NOVEMBER'),
                    $T('DECEMBER')],
                monthNamesShort: [$T('JAN'), $T('FEB'), $T('MAR'), $T('APR'),
                    $T('MAY'), $T('JUN'), $T('JUL'), $T('AUG'), $T('SEP'),
                    $T('OCT'), $T('NOV'), $T('DEC')],
                monthStatus: $T('SHOW_OTHER_MONTH'), yearStatus: $T('SHOW_OTHER_YEAR'),
                weekHeader: $T('WEEK_SHORT'), weekStatus: $T('WEEK_OF_MONTH'),
                dayNames: [$T('SUNDAY'), $T('MONDAY'), $T('TUESDAY'), $T('WEDNESDAY'),
                    $T('THURSDAY'), $T('FRIDAY'), $T('SATURDAY')],
                dayNamesShort: [$T('SU'), $T('MO'), $T('TU'), $T('WE'), $T('TH'),
                    $T('FR'), $T('SA')],
                dayNamesMin: [$T('SU'), $T('MO'), $T('TU'), $T('WE'), $T('TH'),
                    $T('FR'), $T('SA')],
                dayStatus: $T('CHOOSE_AS_FIRST_WEEKDAY'), dateStatus: $T('CHOOSE_D_M_d'),
                dateFormat: 'dd.mm.yy', firstDay: 1,
                initStatus: $T('CHOOSE_A_DATE'), isRTL: false};
        $.datepicker.setDefaults($.datepicker.regional['de']);
    });

    createDatePicker("#enter_due");
    createDatePicker("#modify_due");

    createDatePicker("#enter_start");
    createDatePicker("#modify_start");

    $("#smallLog").on('click', function() {
        updateLog('#log_dialog', logItems.length);
        $('#log_dialog').html($('#log_dialog').html()+
                '<br /><a href="javascript:toggleLog()">'+$T('LOG_ONOFF')+'</a>');
        $('#log_dialog').dialog({
            modal: true,
            minHeight: 150,
            minWidth: 600,
            title: 'Log'
        });
    });

    $('#loadMoreCompleted').on('click', function() {
        reloadData.age += 10;
        reload();
    });
    $('#loadLessCompleted').on('click', function() {
        reloadData.age -= 10;
        if (reloadData.age < 0)
        {
            reloadData.age = 0;
        }
        reload();
    });
    $('#loadIncomplete').on('click', function() {
        reloadData.incomplete = !reloadData.incomplete;
        $('#loadIncomplete').text(reloadData.incomplete?$T('LOAD_INCOMPLETE_HIDE'):$T('LOAD_INCOMPLETE'));
        reload();
    });

    $('#modify_tag_edit').tagit({
        autocomplete: { source: function( search, showChoices) {
            onlyTags = new Array();
            for (var i=0; i<tagList.length; ++i)
            {
                if (tagList[i].name.toLowerCase().indexOf(search.term.toLowerCase()) != -1)
                {
                    onlyTags.push(tagList[i].name);
                }
            }
            showChoices(this._subtractArray(onlyTags, this.assignedTags()));
        }, delay: 2, minLength: 2},
        singleField: true,
        singleFieldNode: $('#modify_tags')
    });

    $('#modify_start').on('change', function() {
        var oldVal = parseDate($('#modify_start').data('oldVal'));
        var newVal = parseDate($('#modify_start').val());
        var dayDiff = dateDiffInDays(oldVal, newVal);
        var curDue  = parseDate($('#modify_due').val())
        var newDueDate = addDays(curDue, dayDiff);
        $('#modify_due').val(formatDate(newDueDate));
        $('#modify_start').data('oldVal', $('#modify_start').val());
    });

    $('#enter_start').on('change', function() {
        var oldVal = parseDate($('#enter_start').data('oldVal'));
        if (oldVal != null)
        {
            var newVal = parseDate($('#enter_start').val());
            var dayDiff = dateDiffInDays(oldVal, newVal);
            var newDueDate = new Date();
            if ($('#enter_due').val() != null)
            {
                newDueDate.setDate(parseDate($('#enter_due').val()).getDate()+dayDiff);
                $('#enter_due').val(formatDate(newDueDate));
            }
        }
          $('#enter_start').data('oldVal', $('#enter_start').val());
    });

    reloadTagList();

    refresh();
});
