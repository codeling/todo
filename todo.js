// holds all items of the todo list
var data;
// holds all items which were deleted, so that we
// can restore them in case delete on server fails
// var deleted;

// communication with server (AJAX):
function sendDelete(id)
{
    var stuff = new Object('todo');
    stuff.id = id;
    $.ajax({
        type: 'POST',
        url: 'delete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1)
            {
                alert('Fehler beim Löschen: '+returnValue);
                // TODO: handle that case (undelete locally as well...?`)
            }
            // TODO: instead of full-reload, just delete the one row!
            reload();
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
    var stuff = new Object('todo');
    stuff.id = id;
    stuff.completed = completed;
    $.ajax({
        type: 'POST',
        url: 'complete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1)
            {
                alert('Fehler beim Updaten: '+returnValue);
                // TODO: handle that case (toggle back locally as well...?`)
            }
            // TODO: instead of full-reload, just toggle the one row!
            reload();
        }
    });
}

function addItem(lineNr, id, todo, due, priority, completed)
{
    $('#todoTable').append('<div class="line'+((lineNr%2!=0)?' line_odd':'')+'">'+
        '<span class="todo'+((completed==1)?' todo_completed':'')+'">'+(lineNr+1)+'. '+todo+'</span>'+
        '<span class="due">'+((due == null)?'-':due)+'</span>'+
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
        alert('Editing of item '+id+': Not implemented yet!');
    });
    $('#delete'+id).click(function() {
        deleteItem(id);
    });
}

function updateTable(data)
{
//    $("#todoTable").append('<div class="line"><span class="todo">Todo</span><span class="due">Fällig</span><span class="delete"></span></div>');
    for (var i=0; i<data.length; i++)
    {
        addItem(i, data[i].id, data[i].todo, data[i].due, data[i].priority, data[i].completed);
    }
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
    var jsontext = $.ajax({
        url: 'query.php',
        async: false
    }).responseText;
    $('#todoTable').empty();
    data = JSON.parse(jsontext);
    updateTable(data);
    setTimeout('hideWorking()', 1000);
}

function enter()
{
    showWorking();
    var stuff = new Object('todo');
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
                alert('Fehler beim Einfügen: '+returnValue);
            }
            else if (returnValue == -1)
            {
                alert('Bitte alle Felder ausfüllen!');
            }
            else
            {
                // TODO: data.length not valid always!!!
                addItem(data.length, parseInt(returnValue), stuff.todo, stuff.due, stuff.priority, 0);
                $('#todo').val('');
                $('#due').val('');
                $('#priority').val('');
            }
            // TODO: insert at correct position!
            // reload();
        },
        error: function(jqXHR, textStatus, errorThrown)
        {
            alert("textStatus: "+textStatus + "; errorThrown: "+errorThrown);
        }
    });
}

function refresh()
{
    showWorking();
    reload();
// TODO: make changes locally, never refresh
//    setTimeout('refresh()', 30000);
}

function stopSubmit()
{
    return false;
}

