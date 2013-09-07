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

    $('#modify_save').click(function() {
        // store...
        var id = parseInt($('#modify_id').val());
        var idx = findItem(id);
        if (idx == -1) {
            alert($T('ENTRY_NOT_FOUND'));
            return;
        }
        var stuff = new Todo(id,
            $('#modify_todo').val(),
            $('#modify_due').val(),
            $('#modify_priority').val(),
            $('#modify_effort').val(),
            0,  // currently not taken into account on server, and not modifiable at server
            $('#modify_notes').val().trim(),
            $('#modify_tags').val(),
	    0,  // deleted items cannot be modified
            itemList[idx].version,
            $('#modify_recurrenceMode').val(),
            itemList[idx].completionDate,
            itemList[idx].creationDate);
        currentlyModified = stuff;
        log($T('SAVING_MODIFICATIONS'));
        $.ajax({
            type: 'POST',
            url: 'queries/update.php',
            data: stuff,
            success: function(returnValue) {
                if (isNaN(returnValue)) {
                    log($T('ERROR_WHILE_MODIFYING')+returnValue);
                    alert($T('ERROR_WHILE_MODIFYING')+returnValue);
                // just keep dialog open...then changed values aren't lost
                } else {
                    // if everything went fine, close dialog:
                    log($T('SAVING_SUCCESSFUL'));
                    $('#modify_dialog').dialog('close');
                    // only set locally now, else it could be confusing
                    currentlyModified.version = currentlyModified.version+1;
                    modifyLocally(currentlyModified);
                    currentlyModified = null;
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert($T('TRANSMISSION_ERROR_WHILE_MODIFYING'));
            }
        });
    });

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

    $('#filter_tag_edit').tagit({
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
        singleFieldNode: $('#filter_tags'),
	afterTagAdded: function(event, ui) {
	    renderTable();
	},
	afterTagRemoved: function(event, ui) {
	    renderTable();
	}
    });

    refresh();
});
