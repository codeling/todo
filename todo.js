// holds all items of the todo list
var itemList;

var currentlyModified = null;

function Todo(id, todo, due, priority, effort,
        completed, notes, project,
        version, recurrenceMode, completionDate) {
    this.id        = parseInt(id);
    this.todo      = todo;
    this.due       = due;
    this.priority  = parseInt(priority);
    this.priority  = isNaN(this.priority) ? 0 : this.priority;
    this.effort    = parseInt(effort);
    this.completed = parseInt(completed);
    this.notes     = notes;
    this.project   = project;
    this.version   = parseInt(version);
    this.recurrenceMode = parseInt(recurrenceMode);
	this.completionDate = completionDate;
}


function copyTodo(item)
{
    return new Todo(
        item.id, item.todo, item.due, item.priority, item.effort,
        item.completed, item.notes, item.project,
        item.version, item.recurrenceMode, item.completionDate
    );
}


function ItemSort(item1, item2) {
    var less =
	    (item1.completed < item2.completed) ||
        (
		    item1.completed == item2.completed &&
		    (
		        item1.completed == 0 &&
				(
                    item1.priority > item2.priority ||
                    (
						item1.priority == item2.priority &&
                        ((item1.project!=null)?item1.project+item1.todo:item1.todo) <
                        ((item2.project!=null)?item2.project+item2.todo:item2.todo)
					)
				)
		    ) || (
		        item1.completionDate > item2.completionDate ||
				(
				    item1.completionDate == item2.completionDate &&
					item1.priority > item2.priority
				)
		    ) 
        );
    // log('item1: c='+item1.completed+', p='+item1.priority+'; item2: c='+item2.completed+', p='+item2.priority+'; less: '+less);
    if (less) {
        return -1;
    } else if (item1.completed == item2.completed &&
               item1.priority == item2.priority &&
               item1.todo == item2.todo &&
               item1.project == item2.project &&
			   (item1.completed == 0 || item1.completionDate == item2.completionDate) ) {
        return 0;
    } else {
        return 1;
    }
}


function findItem(id) {
    for (var i=0; i<itemList.length; ++i) {
        if (itemList[i].id == id) {
            return i;
        }
    }
    return -1;
}


function deleteLocally(idx) {
    currentlyModified = copyTodo(itemList[idx]);
    itemList.splice(idx, 1);
    renderTable();
    updateProgress();
//    TODO: just delete the one element from the list... 
//    PROBLEM: we also have to update oddrow then!
//    $('#todo'+id).remove();
}


function undeleteLocally() {
    if (currentlyModified == null) {
        alert('Can\'t undelete item!');
    }
    addLocally(currentlyModified);
}


function modifyLocally(item) {
    var index = findItem(item.id);
    if (index == -1)
    {
        alert('Fehler: Eintrag nicht gefunden!');
        return;
    }
    itemList[index].todo     = item.todo;
    itemList[index].priority = item.priority;
    itemList[index].effort   = item.effort;
    itemList[index].due      = item.due;
    itemList[index].notes    = item.notes;
    itemList[index].project  = item.project;
    itemList[index].version  = item.version;
    itemList[index].recurrenceMode = item.recurrenceMode;
    itemList.sort(ItemSort);
    renderTable();
}


function addLocally(newItem) {
    var insertIdx = 0;
    while(insertIdx < itemList.length && 
	    ItemSort(newItem, itemList[insertIdx]) > 0) {
        ++insertIdx;
    }
    itemList.splice(insertIdx, 0, newItem);
    renderTable();
    updateProgress();
}


function toggleLocally(item) {
    var index = findItem(item.id);
    if (index == -1) {
        alert('Fehler: Eintrag nicht gefunden!');
        return;
    }
    itemList[index].completed = item.completed;
    itemList[index].version = item.version;
	itemList[index].completionDate = item.completionDate;
    itemList.sort(ItemSort);
    renderTable();
    updateProgress();
}


function sendDelete(id) {
    log('Lösche Eintrag...');
    var idx = findItem(id);
    if (idx == -1) {
        alert('Kann den zu löschenden Eintrag nicht finden!');
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.version = itemList[idx].version;
    deleteLocally(idx);
    $.ajax( {
        type: 'POST',
        url: 'delete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log('Fehler beim Löschen: '+returnValue);
                alert('Fehler beim Löschen: '+returnValue);
                undeleteLocally();
            } else {
                log('Erfolgreich gelöscht.');
            }
            currentlyModified = null;
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert('Übertragungsfehler beim Löschen!');
        }
   });
}


function deleteItem(id) {
    if (!confirm('Eintrag wirklich löschen?')) {
        return;
    }
    sendDelete(id);
}


function toggleCompleted(id) {
    var index = findItem(id);
    if (index == -1) {
        alert('Eintrag nicht gefunden!');
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.completed = itemList[index].completed == 0 ? 1 : 0;
    stuff.version   = itemList[index].version;
	stuff.completionDate = stuff.completed == 1 ? formatDate(new Date()) : null;
    currentlyModified = copyTodo(itemList[index]);
    $.ajax({
        type: 'POST',
        url: 'complete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log('Fehler beim Updaten: '+returnValue);
                alert('Fehler beim Updaten: '+returnValue);
                // reset checkbox:
                var checked = $('#completed'+currentlyModified.id).attr('checked');
                if (checked=='checked') {
                    $('#completed'+currentlyModified.id).removeAttr('checked');
                } else {
                    $('#completed'+currentlyModified.id).attr('checked', 'checked');
                }
            } else {
                currentlyModified.completed = stuff.completed;
				currentlyModified.completionDate = stuff.completionDate;
                currentlyModified.version   = stuff.version + 1;
                toggleLocally(currentlyModified);
                log('Erfolgreich geändert!');
            }
            currentlyModified = null;
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert('Übertragungsfehler beim ändern!');
        }
    });
}


function html_entity_decode(str) {
    var conversionElement = document.createElement('textarea');
    conversionElement.innerHTML = str;
    var returnValue = conversionElement.value;
    // destroy created element?
    return returnValue;
}
    

function modifyItem(id) {
    log('Öffne Dialog zum Verändern des Eintrags...');
    var index = findItem(id);
    if (index == -1) {
        alert('Konnte ToDo mit ID='+id+' nicht finden!');
        return;
    }
    var item = itemList[index];
    // set values:
    $('#modify_id').val(item.id);
    $('#modify_todo').val(html_entity_decode(item.todo));
    $('#modify_due').val(formatDate(parseDate(item.due)));
    $('#modify_priority').val(item.priority);
    $('#modify_effort').val(item.effort);
    $('#modify_notes').val(html_entity_decode(item.notes));
    $('#modify_project').val(html_entity_decode(item.project));
    $('#modify_recurrenceMode option[value="'+item.recurrenceMode+'"]').attr('selected',true);
    // set up store function:
    // show dialog:
    $('#modify_dialog').dialog( {
        modal: true,
        minHeight: 180,
        minWidth: 600,
        title: 'ToDo Eintrag verändern',
        close: function(ev,ui) {
            log('Dialog geschlossen');
        }
    });
}


function fillStr(str, fillchar, count) {
    var fillStr = '';
    for (var i=0; i < (count - str.toString().length); ++i) {
        fillStr += fillchar;
    }
    return fillStr + str;
}


function parseDate(dateStr) {
    if (dateStr == null || dateStr == '') {
        return null;
    }
    var parts = dateStr.split(' ');
    if (parts.length < 1 || parts.length > 2) {
        return null;
    }
    var datePart = parts[0].split("-");
    var timePart = new Array(0, 0, 0);
    if (parts.length > 1) {
         timePart = parts[1].split(":");
    }
    return new Date(datePart[0], datePart[1]-1, datePart[2], timePart[0], timePart[1], timePart[2], 0);
}
 

function formatDate(date) {
    if (date == null){
        return '';
    }
    if (isNaN(date.getFullYear())) {
        return 'invalid';
    }
    return ''+
        date.getFullYear()               +'-'+
        fillStr(date.getMonth()+1, '0', 2) +'-'+
        fillStr(date.getDate() , '0', 2);
}


function setListener(id) {
    $('#completed'+id).click(function() {
        toggleCompleted(id);
    });
    $('#modify'+id).click(function() {
        modifyItem(id);
    });
    $('#delete'+id).click(function() {
        deleteItem(id);
    });
}


function renderItem(idx) {
    var it = itemList[idx];
    var hasNote = it.notes != null && it.notes != '';
    var hasProj = it.project != null && it.project != '';
    var isRecurring = it.recurrenceMode != 0;
    var today   = new Date();
    var dueDate = parseDate(it.due);
	var complDate = parseDate(it.completionDate);
    var dueString = (it.completed == 0) ? formatDate(dueDate): formatDate(complDate);
    $('#todoTable').append('<div class="line'+
            ((idx%2!=0)?' line_odd':'')+
            ((it.completed==1)?' todo_completed':'')+
            '" id="todo'+it.id+'">'+
        '<span class="todo">'+
            '<span class="todo_lineNr">'+(idx+1)+'</span>. '+
            (hasProj ? '<span class="todo_project">'+it.project+': </span>':'')+
            it.todo+
            (hasNote ? '<img src="images/note.png" />':'')+
            (isRecurring ? '<img src="images/recurring.png" />':'')+    
        '</span>'+
        '<span class="due">'+ dueString+
                ((it.completed==0 && dueDate != null && (today - dueDate) > 0) ?
                ' <img src="images/exclamation.png" height="16px" />':'')+
                '</span>'+
        '<span class="priority">'+it.priority+'</span>'+
        '<span class="effort">'+it.effort+'</span>'+
        '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
            ((it.completed==1)?'checked="true" ':'')+'/></span>'+
        '<span class="modify"><input type="image" value="Bearbeiten" id="modify'+it.id+'" src="images/pencil.png" /></span>'+
        '<span class="delete"><input type="image" value="Löschen" id="delete'+it.id+'" src="images/Delete.png" /></span>'+
    '</div>');
    if (it.id != -1) {
        setListener(it.id);
    }
}

function renderTable() {
    $('#todoTable').empty();
    for (var i=0; i<itemList.length; i++) {
        renderItem(i);
    }
}

function updateProgress() {
    var open = 0;
    var done = 0;
    for (var i=0; i<itemList.length; i++) {
        if (itemList[i].completed == 0) {
            open++;
        } else {
            done++;
        }
    }
    var count = done+open;
    $('#progress_todo').css('width', (75*open/count)+'%');
    $('#progress_done').css('width', (75*done/count)+'%');
    $('#progress_status').html('Erledigt: '+Math.round(100*done/count)+'% Offen: '+open);
}


function toggleWorking(show) {
    $('#working').css('display', show? 'block':'none');
}


function reload() {
    log("Lade ToDo-Liste neu...");
    var jsontext = $.ajax({
        url: 'query.php',
        async: false
    }).responseText;
    try {
        itemList = JSON.parse(jsontext);
    } catch (e) {
        alert('Server lieferte ungültige Daten "'+jsontext+'"; Fehlermeldung des JSON-Parsers: '+e);
    }
    for (var i=0; i<itemList.length; ++i) {
        // make "proper" Todo items out of the loaded values:
        itemList[i].id        = parseInt(itemList[i].id);
        itemList[i].priority  = parseInt(itemList[i].priority);
        itemList[i].effort    = parseInt(itemList[i].effort);
        itemList[i].completed = parseInt(itemList[i].completed);
        itemList[i].version   = parseInt(itemList[i].version);
        itemList[i].recurrenceMode = parseInt(itemList[i].recurrenceMode);
    }
    itemList.sort(ItemSort);
    renderTable();
    updateProgress();
    log("Laden beendet!");
}


function enter() {
    log('Lege neuen Eintrag an...');
    if ($('#enter_todo').val().length == 0) {
        alert('Todo darf nicht leer sein!');
        return;
    }
    if (findItem(-1) != -1) {
        alert('Anderer Einfüge-Vorgang ist noch am Laufen; bitte warte dessen Beendigung ab, bevor du einen weiteren Eintrag hinzufügst!');
        return;
    }
    var todo = $('#enter_todo').val();
    var colon = todo.lastIndexOf(":");
    var project = '';
    if (colon != -1) {
        project = todo.substr(0, colon);
        if (todo.charAt(colon+1) == ' ') { colon++; }
        todo = todo.substr(colon+1);
    }
    var stuff = new Todo(-1, todo, $('#enter_due').val(),
            $('#enter_priority').val(), $('#enter_effort').val(),
            0, '', project, 1, 0, null);
    addLocally(stuff);
    $.ajax( {
        type: 'POST',
        url: 'enter.php',
        data: stuff,
        success: function(returnValue) {
            if (isNaN(returnValue)) {
                log('Fehler beim Einfügen: '+returnValue);
                alert('Fehler beim Einfügen: '+returnValue);
                // remove the item from local list; the  data of it
                // will still remain in the edit fields anyway!
                deleteLocally(findItem(-1));
            } else {
                log('Einfügen erfolgreich!');
                $('#enter_todo').val('');
                $('#enter_due').val('');
                $('#enter_priority').val('');
                $('#enter_effort').val('1');
                var index = findItem(-1);
                var id = parseInt(returnValue);
                itemList[index].id = id;
                $('#todo-1').attr('id', 'todo'+id);
                $('#completed-1').attr('id', 'completed'+id);
                $('#modify-1').attr('id', 'modify'+id);
                $('#delete-1').attr('id', 'delete'+id);
                setListener(id);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert('Übertragungsfehler beim Einfügen!');
        }
    });
}


function refresh() {
    toggleWorking(true);
    reload();
    toggleWorking(false);
// TODO: change listener, or if that proves impossible,
// refresh every 5-10 minues (or check with server if anything to refresh!!!
//    setTimeout('refresh()', 30000);
}

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
            $('#modify_recurrenceMode').val());
        currentlyModified = stuff;
        log('Speichere Veränderungen...');
        $.ajax({
            type: 'POST',
            url: 'update.php',
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
    refresh();
});

