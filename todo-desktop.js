
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
        '<span class="todo" title="'+$T('CREATED')+': '+formatDate(createDate, true)+
            '; '+$T('RECURRENCE')+': '+repetition+
        ((it.completed != 0)? '; '+$T('DONE')+': '+formatDate(complDate, true):'')+
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
            ((it.completed==1)?'checked="true" ':'')+'/></span>';
    if (it.deleted == 0) {
        line += '<span class="modify"><input type="image" value="'+
               $T('EDIT')+'" id="modify'+it.id+
               '" src="images/pencil.png" /></span>'+
           '<span class="trash"><input type="image" value="'+
               $T('DELETE')+'" id="trash'+it.id+
               '" src="images/trash_red.png" /></span>';
    } else {
        line += '<span class="restore"><input type="image" value="'+
               $T('RESTORE')+'" id="restore'+it.id+
               '" src="images/undelete.png" /></span>';
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

function modifyItem(id) {
    fillModifyForm(id);
    // set up store function:
    // show dialog:
    $('#modify_dialog').dialog( {
        modal: true,
        minHeight: 180,
        minWidth: 600,
        title: $T('MODIFY_ENTRY'),
        close: function(ev,ui) {
            log($T('MODIFY_DIALOG_CLOSED'));
        }
    });
}

$(document).ready(function() {

    $('#modify_save').click(function() {
        // store...
	storeItem();
    });

}
