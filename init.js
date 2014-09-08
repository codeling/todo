function createDatePicker(tagid) {
    $(tagid).datepicker( {
        showOn: 'both',
        buttonImageOnly: true,
        buttonImage: 'images/calendar.png',
        dateFormat: 'yy-mm-dd',
        showAnim: ''
    });
}

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

    $("#smallLog").click(function() {
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

    $('#loadMoreLink').click(function() {
        reloadData.age += 30;
        reload();
    });

    $('#modify_tag_edit').tagit({
        autocomplete: { source: function( search, showChoices) {
            var that = this;
            $.ajax({
                url: "queries/query-tags.php",
                data: {q: search.term},
                dataType: "json",
                success: function (choices) {
                    showChoices(that._subtractArray(choices, that.assignedTags()));
                }
            });
        }, delay: 2, minLength: 2},
        singleField: true,
        singleFieldNode: $('#modify_tags')
    });

    refresh();
});
