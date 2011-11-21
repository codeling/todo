// holds all items of the todo list
var itemList;

var currentlyModified = null;
var logItems = new Array("Starte Log");
var logLines = 3; /* const, but IE doesn't support that keyword */
var logVisible = true;


function Todo(id, todo, due, priority, completed, notes) {
    this.id        = id;
    this.todo      = todo;
    this.due       = due;
    this.priority  = priority;
    this.completed = completed;
    this.notes     = notes;
}


function updateLog(element, maxCount) {
    var logOutput = '';
    var start = Math.max(0, logItems.length-maxCount);
    var end   = Math.min(start+maxCount, logItems.length);
    for (var i=start; i<end; ++i) {
        logOutput += '' + i + ': ' + logItems[i];
        if (i<end-1) {
            logOutput += '<br />';
        }
    }
    $(element).html(logOutput);
}


function toggleLog() {
    $('#smallLog').css('display', (logVisible)? 'none': 'block');
    $('#logLink').css('display', (logVisible)? 'block': 'none');
    logVisible = !logVisible;
}


function log(logStr) {
    logItems.push(logStr);
    updateLog('#smallLog', logLines);
    $('#smallLog').css('display', 'block');
}


function ItemSort(item1, item2) {
    var less = (item1.completed < item2.completed) ||
        (item1.completed == item2.completed &&
        parseInt(item1.priority) > parseInt(item2.priority)) ||
        (item1.completed == item2.completed && item1.priority == item2.priority &&
        item1.todo < item2.todo);
    // log('item1: c='+item1.completed+', p='+item1.priority+'; item2: c='+item2.completed+', p='+item2.priority+'; less: '+less);
    if (less) {
        return -1;
    } else if (item1.completed == item2.completed && item1.priority == item2.priority && item1.todo == item2.todo) {
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


function deleteLocally(id) {
    var index = findItem(id);
    if (index == -1) {
        alert('Eintrag nicht gefunden! Möglicherweise wurde er bereits gelöscht?')
        return;
    }
    currentlyModified = itemList[index];
    itemList.splice(index, 1);
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
    itemList[index].due      = item.due;
    itemList[index].notes    = item.notes;
    itemList.sort(ItemSort);
    renderTable();
}


function addLocally(newItem) {
    var insertIdx = 0;
    while(insertIdx<itemList.length && 
        itemList[insertIdx].completed == 0 &&
        itemList[insertIdx].priority > newItem.priority) {
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
    itemList[index].completed = (itemList[index].completed == 0)? 1 : 0;
    itemList.sort(ItemSort);
    renderTable();
    updateProgress();
}


function sendDelete(id) {
    log('Lösche Eintrag...');
    var stuff = new Object();
    stuff.id = id;
    deleteLocally(id);
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
            alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
        }
   });
}


function deleteItem(id) {
    if (!confirm('Eintrag wirklich löschen?')) {
        return;
    }
    showWorking();
    sendDelete(id);
}


function toggleCompleted(id) {
    showWorking();
    var index = findItem(id);
    if (index == -1) {
        alert('Eintrag nicht gefunden!');
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.completed = itemList[index].completed == 0 ? 1 : 0;
    toggleLocally(stuff);
    currentlyModified = stuff;
    $.ajax({
        type: 'POST',
        url: 'complete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log('Fehler beim Updaten: '+returnValue);
                alert('Fehler beim Updaten: '+returnValue);
                if (currentlyModified == null) {
                    alert('Kann das zu verändernde Objekt auch lokal nicht mehr finden.');
                } else {
                    toggleLocally(currentlyModified);
                }
            } else {
                log('Erfolgreich geändert!');
            }
            currentlyModified = null;
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
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
    $('#modify_due').val(formatDate(item.due));
    $('#modify_priority').val(item.priority);
    $('#modify_notes').val(html_entity_decode(item.notes));
    // set up store function:
    // show dialog:
    $('#modify_dialog').dialog( {
        modal: true,
        minHeight: 150,
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
 

function formatDate(dateStr) {
    if (dateStr == null || dateStr == '') {
        return '';
    }
    date = parseDate(dateStr);
    if (date == null || isNaN(date.getFullYear())) {
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


function renderItem(lineNr, id, todo, due, priority, completed, hasNote) {
    var dueString = formatDate(due);
    $('#todoTable').append('<div class="line'+((lineNr%2!=0)?' line_odd':'')+'" id="todo'+id+'">'+
        '<span class="todo'+((completed==1)?' todo_completed':'')+'">'+(lineNr+1)+'. '+todo+(hasNote?'<img src="images/note.png" />':'')+'</span>'+
        '<span class="due">'+dueString+'</span>'+
        '<span class="priority">'+priority+'</span>'+
        '<span class="completed"><input type="checkbox" id="completed'+id+'" '+
            ((completed==1)?'checked="true" ':'')+'/></span>'+
        '<span class="modify"><input type="image" value="Bearbeiten" id="modify'+id+'" src="images/pencil.png" /></span>'+
        '<span class="delete"><input type="image" value="Löschen" id="delete'+id+'" src="images/Delete.png" /></span>'+
    '</div>');
    if (id != -1) {
        setListener(id);
    }
}

function renderTable() {
    $('#todoTable').empty();
    for (var i=0; i<itemList.length; i++) {
        renderItem(i,
                itemList[i].id,
                itemList[i].todo,
                itemList[i].due,
                itemList[i].priority,
                itemList[i].completed,
                itemList[i].notes != null && itemList[i].notes != '');
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


function hideWorking() {
    $('#working').css('display', 'none');
}


function showWorking() {
    $('#working').css('display', 'block');
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
    itemList.sort(ItemSort);
    renderTable();
    updateProgress();
    hideWorking();
    log("Laden beendet!");
}


function enter() {
    showWorking();
    log('Lege neuen Eintrag an...');
    var stuff = new Object();
    stuff.id = -1;
    stuff.todo = $('#todo').val();
    stuff.due =  $('#due').val();
    stuff.priority = $('#priority').val();
    stuff.notes = '';
    stuff.completed = 0;
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
                deleteLocally(-1);
            } else {
                log('Einfügen erfolgreich!');
                $('#todo').val('');
                $('#due').val('');
                $('#priority').val('');
                // update id in inserted object:
                // TODO: make safe against parallel edits!
                var index = findItem(-1);
                var id = parseInt(returnValue);
                itemList[index].id = id;
                // also update id in 
                $('#todo-1').attr('id', 'todo'+id);
                $('#completed-1').attr('id', 'completed'+id);
                $('#modify-1').attr('id', 'modify'+id);
                $('#delete-1').attr('id', 'delete'+id);
                setListener(id);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
        }
    });
}


function refresh() {
    showWorking();
    reload();
// TODO: change listener, or if that proves impossible,
// refresh every 5-10 minues
//    setTimeout('refresh()', 30000);
}

$(document).ready(function() {

    $("#due").datepicker( {
        showOn: 'both',
        buttonImageOnly: true,
        buttonImage: 'images/calendar.png',
        dateFormat: 'yy-mm-dd',
        showAnim: ''
    });

    $("#modify_due").datepicker( {
        showOn: 'both',
        buttonImageOnly: true,
        buttonImage: 'images/calendar.png',
        dateFormat: 'yy-mm-dd',
        showAnim: ''
    });

    $('#modify_save').click(function() {
        // store... 
        var stuff = new Object();
        stuff.id = $('#modify_id').val();
        stuff.todo = $('#modify_todo').val();
        stuff.due  = $('#modify_due').val();
        stuff.priority = $('#modify_priority').val();
        stuff.notes = $('#modify_notes').val().trim();
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
                    modifyLocally(currentlyModified);
                    currentlyModified = null;
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
            }
        });
    });

    $("#smallLog").click(function() {
        // fill log
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

