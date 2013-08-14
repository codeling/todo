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
        $.datepicker.regional['de'] = {clearText: 'löschen', clearStatus: 'aktuelles Datum löschen',
                closeText: 'schließen', closeStatus: 'ohne Änderungen schließen',
                prevText: '<zurück', prevStatus: 'letzten Monat zeigen',
                nextText: 'Vor>', nextStatus: 'nächsten Monat zeigen',
                currentText: 'heute', currentStatus: '',
                monthNames: ['Januar','Februar','März','April','Mai','Juni',
                'Juli','August','September','Oktober','November','Dezember'],
                monthNamesShort: ['Jan','Feb','Mär','Apr','Mai','Jun',
                'Jul','Aug','Sep','Okt','Nov','Dez'],
                monthStatus: 'anderen Monat anzeigen', yearStatus: 'anderes Jahr anzeigen',
                weekHeader: 'Wo', weekStatus: 'Woche des Monats',
                dayNames: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
                dayNamesShort: ['So','Mo','Di','Mi','Do','Fr','Sa'],
                dayNamesMin: ['So','Mo','Di','Mi','Do','Fr','Sa'],
                dayStatus: 'Setze DD als ersten Wochentag', dateStatus: 'Wähle D, M d',
                dateFormat: 'dd.mm.yy', firstDay: 1,
                initStatus: 'Wähle ein Datum', isRTL: false};
        $.datepicker.setDefaults($.datepicker.regional['de']);
    });

    createDatePicker("#enter_due");
    createDatePicker("#modify_due");

    $('#modify_save').click(function() {
        // store...
        var id = parseInt($('#modify_id').val());
        var idx = findItem(id);
        if (idx == -1) {
            alert('Eintrag nicht gefunden!');
            return;
        }
        var stuff = new Todo(id,
            $('#modify_todo').val(),
            $('#modify_due').val(),
            $('#modify_priority').val(),
            $('#modify_effort').val(),
            0,  // currently not taken into account on server, and not modifiable at server
            $('#modify_notes').val().trim(),
            $('#modify_project').val(),
            itemList[idx].version,
            $('#modify_recurrenceMode').val(),
            itemList[idx].completionDate,
            itemList[idx].creationDate);
        currentlyModified = stuff;
        log('Speichere Veränderungen...');
        $.ajax({
            type: 'POST',
            url: 'queries/update.php',
            data: stuff,
            success: function(returnValue) {
                if (isNaN(returnValue)) {
                    log('Fehler beim Updaten: '+returnValue);
                    alert('Fehler beim Updaten: '+returnValue);
                // just keep dialog open...then changed values aren't lost
                } else {
                    // if everything went fine, close dialog:
                    log('Speichern erfolgreichen, schließe Dialog');
                    $('#modify_dialog').dialog('close');
                    // only set locally now, else it could be confusing
                    currentlyModified.version = currentlyModified.version+1;
                    modifyLocally(currentlyModified);
                    currentlyModified = null;
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert('Übertragungsfehler beim Bearbeiten!');
            }
        });
    });

    $("#smallLog").click(function() {
        updateLog('#log_dialog', logItems.length);
        $('#log_dialog').html($('#log_dialog').html()+
                '<br /><a href="javascript:toggleLog()">Loganzeige ein/ausblenden</a>');
        $('#log_dialog').dialog({
            modal: true,
            minHeight: 150,
            minWidth: 600,
            title: 'Log'
        });
    });

    $('#modify_tags').tagit({
        autocomplete: { source: function( search, showChoices) {
        var that = this;
            console.log("TagSource called for term="+search.term);
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
        singleFieldNode: $('#modify_project')
    });

    refresh();
});
