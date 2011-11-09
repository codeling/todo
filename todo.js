// holds all items of the todo list
var itemList;
/*
function Todo(id, todo, due, priority, completed)
{
    this.id        = id;
    this.todo      = todo;
    this.due       = due;
    this.priority  = priority;
    this.completed = completed;
}

function TodoList()
{
    parseFromJSON(json);
    
}

var itemList = new TodoList();
*/

// holds all items which were deleted, so that we
// can restore them in case delete on server fails
// var deleted;

var logItems = new Array("Starte Log");
const logLines = 4; 

function updateLog(element, maxCount)
{
    var logOutput = '';
    var start = Math.max(0, logItems.length-maxCount);
    var end   = Math.min(start+maxCount, logItems.length);
    for (var i=start; i<end; ++i)
    {
        logOutput += '' + i + ': ' + logItems[i];
        if (i<end-1) {
            logOutput += '<br />';
        }
    }
    $(element).html(logOutput);
}

function log(logStr)
{
    logItems.push(logStr);
    updateLog('#log', logLines);
}


// communication with server (AJAX):
function sendDelete(id)
{
    log('Lösche Eintrag...');
    var stuff = new Object();
    stuff.id = id;
    $.ajax({
        type: 'POST',
        url: 'delete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1)
            {
                log('Fehler beim Löschen: '+returnValue);
                alert('Fehler beim Löschen: '+returnValue);
                // TODO: handle that case (undelete locally as well...?`)
            } else {
                log('Erfolgreich gelöscht.');
            // TODO: instead of full-reload, just delete the one row!
                reload();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
        }
   });
}

function deleteItem(id)
{
    if (!confirm('Eintrag wirklich löschen?'))
    {
        return;
    }
    showWorking();
    sendDelete(id);
}

function toggleCompleted(id, completed)
{
    showWorking();
    var stuff = new Object();
    stuff.id = id;
    stuff.completed = completed;
    $.ajax({
        type: 'POST',
        url: 'complete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1)
            {
                log('Fehler beim Updaten: '+returnValue);
                alert('Fehler beim Updaten: '+returnValue);
                // TODO: handle that case (toggle back locally as well...?`)
            } else {
                log('Erfolgreich geändert!');
                // TODO: instead of full-reload, just toggle the one row!
                reload();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
        }
    });
}

function html_entity_decode(str)
{
    var conversionElement = document.createElement('textarea');
    conversionElement.innerHTML = str;
    var returnValue = conversionElement.value;
//    conversionElement.parentNode.removeChild(conversionElement);
    return returnValue;
}
    

function modifyItem(id)
{
    log('Öffne Dialog zum Verändern des Eintrags...');
    var item = null;
    for (var i=0; i<itemList.length; ++i) {
        if (itemList[i].id == id) {
            item = itemList[i]
            break;
        }
    }
    if (item == null) {
        alert('Konnte ToDo mit ID='+id+' nicht finden!');
        return;
    }
    // set values:
    
    $('#modify_id').val(item.id);
    $('#modify_todo').val(html_entity_decode(item.todo));
    $('#modify_due').val(item.due);
    $('#modify_priority').val(item.priority);
    // set up store function:
    $('#modify_save').click(function() {
        // store... 
        var stuff = new Object();
        stuff.id = $('#modify_id').val();
        stuff.todo = $('#modify_todo').val();
        stuff.due  = $('#modify_due').val();
        stuff.priority = $('#modify_priority').val();
        log('Speichere Veränderungen...');
        $.ajax({
            type: 'POST',
            url: 'update.php',
            data: stuff,
            success: function(returnValue) {
                if (isNaN(returnValue)) {
                    log('Fehler beim Updaten: '+returnValue);
                    alert('Fehler beim Updaten: '+returnValue);
                    // TODO: handle that case (toggle back locally as well...?`)
                } else {
                    // if everything went fine, close dialog:
                    log('Speichern erfolgreichen, schließe Dialog');
                    $('#modify_dialog').dialog('close');
                
                    // TODO: instead of full-reload, just toggle the one row!
                    reload();
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
            }
        });
    });
    // show dialog:
    $('#modify_dialog').dialog({
        modal: true,
        minHeight: 150,
        minWidth: 400,
        title: 'ToDo Eintrag verändern',
        close: function(ev,ui) {
            log('Dialog geschlossen');
        }
    });
}

function fillStr(str, fillchar, count)
{
    var fillStr = '';
    for (var i=0; i < (count - str.toString().length); ++i)
    {
        fillStr += fillchar;
    }
    return fillStr + str;
}

function formatDate(date)
{
    return ''+
        date.getFullYear()               +'-'+
        fillStr(date.getMonth()+1, '0', 2) +'-'+
        fillStr(date.getDate() , '0', 2);
}

function addItem(lineNr, id, todo, due, priority, completed)
{
    var dueString = '-';
    if (due != null) {
        dueDate = new Date(due);
        if (isNaN(dueDate.getFullYear())) {
            dueString = 'invalid';
        } else {
            dueString = formatDate(dueDate);            // dueDate.toLocaleDateString(); //
        }
    }
    $('#todoTable').append('<div class="line'+((lineNr%2!=0)?' line_odd':'')+'">'+
        '<span class="todo'+((completed==1)?' todo_completed':'')+'">'+(lineNr+1)+'. '+todo+'</span>'+
        '<span class="due">'+dueString+'</span>'+
        '<span class="priority">'+priority+'</span>'+
        '<span class="completed"><input type="checkbox" id="completed'+id+'" '+
            ((completed==1)?'checked="true" ':'')+'/></span>'+
        '<span class="modify"><input type="image" value="Bearbeiten" id="modify'+id+'" src="Modify.png" /></span>'+
        '<span class="delete"><input type="image" value="Löschen" id="delete'+id+'" src="Delete.png" /></span>'+
    '</div>');
    $('#completed'+id).click(function() {
        toggleCompleted(id, (completed==0)?1:0);
    });
    $('#modify'+id).click(function() {
        modifyItem(id);
    });
    $('#delete'+id).click(function() {
        deleteItem(id);
    });
}

function updateTable()
{
    var open = 0;
//    $("#todoTable").append('<div class="line"><span class="todo">Todo</span><span class="due">Fällig</span><span class="delete"></span></div>');
    for (var i=0; i<itemList.length; i++)
    {
        addItem(i,
                itemList[i].id,
                itemList[i].todo,
                itemList[i].due,
                itemList[i].priority,
                itemList[i].completed);
        if (itemList[i].completed == 0) {
            open++;
        }
    }
    $('#status').html('Noch zu erledigen: '+open);
}

function hideWorking()
{
    $('#working').css('display', 'none');
}

function showWorking()
{
    $('#working').css('display', 'block');
}

function reload()
{
    log("Lade ToDo-Liste neu...");
    var jsontext = $.ajax({
        url: 'query.php',
        async: false
    }).responseText;
    $('#todoTable').empty();
    itemList = JSON.parse(jsontext);
    updateTable();
    hideWorking();
    log("Laden beendet!");
}

function enter()
{
    showWorking();
    log('Lege neuen Eintrag an...');
    var stuff = new Object();
    stuff.todo = $('#todo').val();
    stuff.due =  $('#due').val();
    stuff.priority = $('#priority').val();
    $.ajax({
        type: 'POST',
        url: 'enter.php',
        data: stuff,
        success: function(returnValue) {
            if (isNaN(returnValue))
            {
                log('Fehler beim Einfügen: '+returnValue);
                alert('Fehler beim Einfügen: '+returnValue);
            }
            else
            {
                log('Einfügen erfolgreich!');
                $('#todo').val('');
                $('#due').val('');
                $('#priority').val('');
                reload();
                // TODO: use local cache!
                // addItem(itemList.length, parseInt(returnValue), stuff.todo, stuff.due, stuff.priority, 0);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
        }
    });
}

function refresh()
{
    showWorking();
    reload();
// TODO: make changes locally, never refresh, change listener
//    setTimeout('refresh()', 30000);
}

$(document).ready(function(){
    $("#due").datepicker({
        showOn: 'both',
        buttonImageOnly: true,
        buttonImage: 'calendar.png',
        dateFormat: 'yy-mm-dd',
        showAnim: '' 
    });
    $("#modify_due").datepicker({
        showOn: 'both',
        buttonImageOnly: true,
        buttonImage: 'calendar.png',
        dateFormat: 'yy-mm-dd',
        showAnim: '' 
    });
    $("#log").click(function() {
        // fill log
        updateLog('#log_dialog', logItems.length);
        $('#log_dialog').dialog({
            modal: true,
            minHeight: 150,
            minWidth: 400,
            title: 'Log'
        });
    });
    refresh();
});

