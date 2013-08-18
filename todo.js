// holds all items of the todo list
var itemList;

var currentlyModified = null;

function Todo(id, todo, due, priority, effort,
        completed, notes, tags, deleted,
        version, recurrenceMode, completionDate, creationDate) {
    this.id        = parseInt(id);
    this.todo      = todo;
    this.due       = due;
    this.priority  = parseInt(priority);
    this.priority  = isNaN(this.priority) ? 0 : this.priority;
    this.effort    = parseInt(effort);
    this.completed = parseInt(completed);
    this.notes     = notes;
    this.tags      = tags;
    this.deleted   = deleted;
    this.version   = parseInt(version);
    this.recurrenceMode = parseInt(recurrenceMode);
    this.completionDate = completionDate;
    this.creationDate = creationDate;
}

function copyTodo(item)
{
    return new Todo(
        item.id, item.todo, item.due, item.priority, item.effort,
        item.completed, item.notes, item.tags, item.deleted,
        item.version, item.recurrenceMode, item.completionDate,
        item.creationDate
    );
}


function printItem(item)
{
    alert(JSON.stringify(item).replace(/,/g,"\n").replace(/[{}\"]/g, ""));
}


function ItemSort(item1, item2) {
    var less =
        (item1.deleted < item2.deleted) ||
    (
          (item1.completed < item2.completed) ||
          (
            item1.completed == item2.completed &&
            (
              (
                item1.completed == 0 &&
                (
                  item1.priority > item2.priority ||
                  (
                    item1.priority == item2.priority &&
                    ((item1.tags!=null)?item1.tags+item1.todo:item1.todo) <
                    ((item2.tags!=null)?item2.tags+item2.todo:item2.todo)
                  )
                )
              ) || (
                item1.completed == 1 &&
                (
                  item1.completionDate > item2.completionDate ||
                  (
                    item1.completionDate == item2.completionDate &&
                    item1.priority > item2.priority
                  )
                )
              ) 
            )
      )
        );
    // log('item1: c='+item1.completed+', p='+item1.priority+'; item2: c='+item2.completed+', p='+item2.priority+'; less: '+less);
    if (less) {
        return -1;
    } else if (item1.completed == item2.completed &&
               item1.priority == item2.priority &&
               item1.todo == item2.todo &&
               item1.tags == item2.tags &&
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


function trashLocally(idx) {
    itemList[idx].deleted = 1;
    renderTable();
    updateProgress();
}


function deleteLocally(idx) {
    itemList.splice(idx, 1);
    renderTable();
    updateProgress();
}


function restoreLocally(idx) {
    itemList[idx].deleted = 0;
    renderTable();
    updateProgress();
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
    itemList[index].tags     = item.tags;
    itemList[index].version  = item.version;
    itemList[index].recurrenceMode = item.recurrenceMode;
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
    toggledItem = itemList[index];
    toggledItem.completed = item.completed;
    toggledItem.version = item.version;
    toggledItem.completionDate = item.completionDate;
    //itemList.sort(ItemSort);
    // restore order for the one item only:
    itemList.splice(index, 1);
    var insertIdx = 0;
    while(insertIdx < itemList.length && 
        ItemSort(toggledItem, itemList[insertIdx]) > 0) {
        insertIdx++;
    }
    itemList.splice(insertIdx, 0, toggledItem);

    renderTable();
    updateProgress();
}


function emptyTrashLocally() {
    deleteStart = itemList.length-1;
    itemsToDelete = 0;
    while (deleteStart>=0 && itemList[deleteStart].deleted == 1) {
        ++itemsToDelete;
        --deleteStart;
    }
    if (itemsToDelete > 0) {
        itemList.splice(deleteStart+1, itemsToDelete);
        renderTable();
    }
}


function emptyTrash() {
    if (!confirm('Den Mülleimer wirklich leeren?')) {
        return;
    }
    $.ajax( {
        type: 'GET',
        url: 'queries/empty-trash.php',
        success: function(returnValue) {
            if (returnValue != 1) {
                log('Fehler beim Leeren: '+returnValue);
                alert('Fehler beim Leeren: '+returnValue);
            } else {
                log('Erfolgreich geleert.');
		emptyTrashLocally();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert('Übertragungsfehler beim Leeren!');
        }
   });

}


function trashItem(id) {
    log('Lösche Eintrag...');
    var idx = findItem(id);
    if (idx == -1) {
        alert('Kann den zu löschenden Eintrag nicht finden!');
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.version = itemList[idx].version;
    stuff.trash   = 1;
    trashLocally(idx);
    $.ajax( {
        type: 'POST',
        url: 'queries/trash.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log('Fehler beim Löschen: '+returnValue);
                alert('Fehler beim Löschen: '+returnValue);
                restoreLocally(idx);
            } else {
                log('Erfolgreich gelöscht.');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert('Übertragungsfehler beim Löschen!');
        }
   });
}


function restoreItem(id) {
    log('Stelle Eintrag wieder her...');
    var idx = findItem(id);
    if (idx == -1) {
        alert('Kann den wiederherzustellenden Eintrag nicht finden!');
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.version = itemList[idx].version;
    stuff.trash   = 0;
    restoreLocally(idx);
    $.ajax( {
        type: 'POST',
        url: 'queries/trash.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log('Fehler beim Wiederherstellen: '+returnValue);
                alert('Fehler beim Widerherstellen: '+returnValue);
                trashLocally(idx);
            } else {
                log('Erfolgreich wiederhergestellt.');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert('Übertragungsfehler beim Wiederherstellen!');
        }
   });
}


function sendReactivate(id) {
    log('Reaktiviere...');
    var idobj = new Object();
    idobj.id = id;
    $.ajax( {
        type: 'POST',
        url: 'queries/reactivate-one.php',
        data: idobj,
        success: function(returnValue) {
            log('Resultat: '+returnValue);
            refresh();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert('Fehler!');
        }
    });
}


function reactivate(id) {
    var index = findItem(id);
    if (itemList[index].completed == 0) {
        return;
    }
    if (!confirm('Eintrag wirklich wiederbeleben?')) {
        return;
    }
    sendReactivate(id);
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
    stuff.completionDate = stuff.completed == 1 ? formatDate(getUTCDate(), true) : null;
    currentlyModified = copyTodo(itemList[index]);
    $.ajax({
        type: 'POST',
        url: 'queries/complete.php',
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

    $("#modify_tag_edit").tagit("removeAll");
    var tags = (item.tags == null) ? new Array() : item.tags.split(",");
    for (var i=0; i<tags.length; i++)
    {
        $("#modify_tag_edit").tagit("createTag", tags[i]);
    }

    $('#modify_recurrenceMode option[value="'+item.recurrenceMode+'"]').attr('selected',true);
    // set up store function:
    // show dialog:
    $('#modify_dialog').dialog( {
        modal: true,
        minHeight: 180,
        minWidth: 600,
        title: 'ToDo Eintrag verändern',
        close: function(ev,ui) {
            log('Bearbeiten-Dialog geschlossen');
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
    return new Date(Date.UTC(datePart[0], datePart[1]-1, datePart[2], timePart[0], timePart[1], timePart[2], 0));
}
 

function formatDate(date, includeTime) {
    if (date == null){
        return '';
    }
    if (isNaN(date.getFullYear())) {
        return 'invalid';
    }
    result = ''+
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


function setListener(id) {
    $('#completed'+id).click(function() {
        toggleCompleted(id);
    });
    $('#modify'+id).click(function() {
        modifyItem(id);
    });
    $('#trash'+id).click(function() {
        trashItem(id);
    });
    $('#restore'+id).click(function() {
        restoreItem(id);
    });
    $('#reactivate'+id).click(function() {
        reactivate(id);
    });
}


function getRecurrenceString(recurrenceMode)
{
    return $('#modify_recurrenceMode option[value="'+recurrenceMode+'"]').text();
}


function renderItem(it, line) {
    var hasNote = it.notes != null && it.notes != '';
    var hasTags = it.tags != null && it.tags != '';
    var isRecurring = it.recurrenceMode != 0;
    var today   = new Date();
    var dueDate = parseDate(it.due);
    var complDate = parseDate(it.completionDate);
    var createDate = parseDate(it.creationDate);
    var dueString = (it.completed == 0) ? formatDate(dueDate): formatDate(complDate);
    var repetition = getRecurrenceString(it.recurrenceMode);
    var line = '<div class="line'+
            ((line%2!=0)?' line_odd':'')+
            ((it.completed==1)?' todo_completed':'')+
        ((it.deleted==1)?' todo_deleted':'')+
            '" id="todo'+it.id+'">'+
        '<span class="todo" title="Angelegt: '+formatDate(createDate, true)+
            '; Wiederholung: '+repetition+
        ((it.completed != 0)? '; Erledigt: '+formatDate(complDate, true):'')+
            '">'+
            '<span class="todo_lineNr">'+(line+1)+'</span>. '+
            it.todo+
            (hasNote ? '<img src="images/note.png" />':'')+
            (isRecurring ? '<img src="images/recurring.png" id="reactivate'+it.id+'" />':'');
    if (hasTags) {
        line += ' <ul id="todo_tags_'+it.id+'" class="todo_item_tags">';
    tags = it.tags.split(",");
    for (var i=0; i<tags.length; i++) {
        line += '<li>'+tags[i]+'</li>';
    }
        line += '</ul>';
    }
    line += '</span>'+
        '<span class="due">'+ dueString+
                ((it.completed==0 && dueDate != null && (today - dueDate) > 0) ?
                ' <img src="images/exclamation.png" height="16px" />':'')+
                '</span>'+
        '<span class="priority">'+it.priority+'</span>'+
        '<span class="effort">'+it.effort+'</span>'+
        '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
            ((it.completed==1)?'checked="true" ':'')+'/></span>'+
        '<span class="modify"><input type="image" value="Bearbeiten" id="modify'+it.id+'" src="images/pencil.png" /></span>';
    if (it.deleted == 0) {
        line += '<span class="trash"><input type="image" value="Löschen" id="trash'+it.id+'" src="images/trash_red.png" /></span>';
    } else {
        line += '<span class="restore"><input type="image" value="Wiederherstellen" id="restore'+it.id+'" src="images/undelete.png" /></span>';
    }
    line += '</div>';
    $('#todoTable').append(line);
    $('#todo_tags_'+it.id).tagit({readOnly: true});
    $('#todo'+it.id).dblclick(function() {
        printItem(it);
    });
    if (it.id != -1) {
        setListener(it.id);
    }
}

function renderTable() {
    $('#todoTable').empty();
    var filtered = filterList();
    for (var i=0; i<filtered.length; i++) {
        renderItem(filtered[i], i);
    }
}

function arrayContainsAny(needle, haystack) {
    for (var i=0; i<needle.length; i++) {
        if (haystack.indexOf(needle[i]) != -1) {
            return true;
        }
    }
    return false;
}

function filterList() {
    if ($('#filter_tags').val() == '') {
        result = itemList.slice(0);
    } else {
        filterTags = $('#filter_tags').val().split(",");
        var result = new Array();
        for (var i=0; i<itemList.length; i++) {
            if (itemList[i].tags == null) {
                continue;
            }
        }
        var itemTags = itemList[i].tags.split(",");
        if (arrayContainsAny(filterTags, itemTags)) {
            result.push(itemList[i]);
        }
    }
    result.sort(ItemSort);
    return result;
}

function updateProgress() {
    var open = 0;
    var done = 0;
    for (var i=0; i<itemList.length; i++) {
        if (itemList[i].deleted == 1) {
	    continue;
	}
        if (itemList[i].completed == 0) {
            open++;
        } else {
            done++;
        }
    }
    var count = done+open;
    var progressWidth = 99.5; // in percent
    $('#progress_todo').css('width', ((progressWidth*open/count))+'%');
    $('#progress_done').css('width', ((progressWidth*done/count))+'%');
    $('#progress_todo').attr('title', 'Offen: '+open);
    $('#progress_done').attr('title', 'Erledigt: '+Math.round(100*done/count) + ' % ('+done+') seit letztem Monat' );
}


function toggleWorking(show) {
    $('#working').css('display', show? 'block':'none');
}


function reload() {
    log("Lade ToDo-Liste neu...");
    var jsontext = $.ajax({
        url: 'queries/query-list.php',
        type: 'GET',
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
    renderTable();
    updateProgress();
    log("Laden beendet!");
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
    var tags = '';
    if (colon != -1) {
        tags = todo.substr(0, colon);
        if (todo.charAt(colon+1) == ' ') { colon++; }
        todo = todo.substr(colon+1);
    }
    var stuff = new Todo(-1, todo, $('#enter_due').val(),
            $('#enter_priority').val(), $('#enter_effort').val(),
            0, '', tags, 0, 1, 0, null, formatDate(getUTCDate(), true));
    addLocally(stuff);
    $.ajax( {
        type: 'POST',
        url: 'queries/enter.php',
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
