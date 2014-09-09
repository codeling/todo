// source: http://stackoverflow.com/questions/1199352/smart-way-to-shorten-long-strings-with-javascript
String.prototype.trunc =
     function(n,useWordBoundary){
         var toLong = this.length>n,
             s_ = toLong ? this.substr(0,n-1) : this;
         s_ = useWordBoundary && toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
         return  toLong ? s_ + '&hellip;' : s_;
      };

/*
$(document).on("pagebeforeshow", '#modifyPage', function(e, data) {
    alert(JSON.stringify(data).replace(/,/g,"\n").replace(/[{}\"]/g, ""));
    return true;
});
*/

function showDetails(itemid)
{
    $.mobile.changePage('#modifyPage', { transition: "slide" });
    fillModifyForm(itemid);
    $('#modify_recurrenceMode').selectmenu("refresh", true);
}

function newTodo()
{
    $.mobile.changePage('#modifyPage', { transition: "slide" });
    fillModifyForm(-1);
    $('#modify_recurrenceMode').selectmenu("refresh", true);
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
            '" id="todo'+it.id+'">';

    line += '<span class="todo" title="'+$T('CREATED')+': '+formatDate(createDate, true)+
            '; '+$T('RECURRENCE')+': '+repetition+
        ((it.completed != 0)? '; '+$T('DONE')+': '+formatDate(complDate, true):'')+
            '">'+
            it.todo.trunc(30, false)+
            (hasNote ? '<img src="images/note.png" />':'')+
            (isRecurring ? '<img src="images/recurring.png" id="reactivate'+it.id+'" />':'')+
        ((it.completed==0 && dueDate != null && (today - dueDate) > 0) ?
                ' <img src="images/exclamation.png" height="16px" />':'');

    if (hasTags) {
        line += ' <ul id="todo_tags_'+it.id+'" class="todo_item_tags">';
        tags = it.tags.split(",");
        for (var i=0; i<tags.length; i++) {
            line += '<li>'+tags[i]+'</li>';
        }
        line += '</ul>';
    }
    line += '</div>';
    $('#todoTable').append(line);
    $('#todo_tags_'+it.id).tagit({readOnly: true});
    $('#todo'+it.id).dblclick(function() {
        printItem(it);
    });
    $('#todo'+it.id).click(function() {
        showDetails(it.id);
    });
    if (it.id != -1) {
        setListener(it.id);
    }
}

function toggleButtons(deleted) {
    $('#toggleBtn').closest('.ui-btn').show();
    if (deleted) {
        $('#restoreBtn').closest('.ui-btn').show();
        $('#deleteBtn').closest('.ui-btn').hide();
    } else {
        $('#restoreBtn').closest('.ui-btn').hide();
        $('#deleteBtn').closest('.ui-btn').show();
    }
}

$(document).ready(function() {
    $('#newBtn').click(function() {
        emptyModifyForm();
        $.mobile.changePage('#modifyPage', { transition: "slide" });
    });
    $('#refreshBtn').click(function() {
        refresh();
    });
    $('#emptyTrashBtn').click(function() {
        emptyTrash();
    });
    // Fix bug resulting from combination of tag-it and jquery-mobile:
    $('#modifyPage').on('pageshow', function(event) {
        $('ul#modify_tag_edit li li').unwrap();
        $('ul#modify_tag_edit div input').unwrap().wrap('<li />');
        var id = parseInt($('#modify_id').val());
        var index = findItem(id);
        if (id == -1 || index == -1) {
            $('#restoreBtn').closest('.ui-btn').hide();
            $('#deleteBtn').closest('.ui-btn').hide();
            $('#toggleBtn').closest('.ui-btn').hide();
        } else {
            toggleButtons(itemList[index].deleted == 1);
        }
    });
    $('#restoreBtn').click(function() {
        var id = parseInt($('#modify_id').val());
        restoreItem(id);
        $.mobile.changePage('#listPage', { transition: "slide" });
    });
    $('#toggleBtn').click(function() {
        var id = parseInt($('#modify_id').val());
        var index = findItem(id);
        toggleCompleted(id);
        $.mobile.changePage('#listPage', { transition: "slide" });
    });
    $('#deleteBtn').click(function() {
        var id = parseInt($('#modify_id').val());
        trashItem(id);
        $.mobile.changePage('#listPage', { transition: "slide" });
    });
    $('#cancelBtn').click(function() {
        var id = parseInt($('#modify_id').val());
        var index = findItem(id);
        $.mobile.changePage('#listPage', { transition: "slide" });
    });
    $('#saveBtn').click(function() {
        var id = parseInt($('#modify_id').val());
        if (id == -1)
        {
            var stuff = new Todo(-1,
                $('#modify_todo').val(),
                $('#modify_due').val(),
                $('#modify_priority').val(),
                $('#modify_effort').val(),
                0,  // currently not taken into account on server, and not modifiable at server
                $('#modify_notes').val().trim(),
                $('#modify_tags').val(),
                0,  // deleted items cannot be modified
                1,  // version
                $('#modify_recurrenceMode').val(),
                null,
                formatDate(getUTCDate(), true)
            );
            addItem(stuff);
        } else {
            storeItem();
        }
        $.mobile.changePage('#listPage', { transition: "slide" });
    });
});

function fillTagList(choices)
{
}
