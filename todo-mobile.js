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

    if (it.deleted == 0) {
        line += '<div class="actions">'+
            '<input type="checkbox" class="completed" id="completed'+it.id+'" '+
                ((it.completed==1)?'checked="true" ':'')+'/>'+
            '<input type="image" value="'+
                $T('DELETE')+'" id="trash'+it.id+
                '" src="images/trash_red.png" />'+
        '</div>';
    } else {
        line += '<div class="actions"><input type="image" value="'+
               $T('RESTORE')+'" id="restore'+it.id+
               '" src="images/undelete.png" /></div>';
    }

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
    $('#todo'+it.id).on("taphold", function() {
        showDetails(it.id);
    });
    if (it.id != -1) {
        setListener(it.id);
    }
}

$(document).ready(function() {
    $('#newBtn').click(function() {
        $.mobile.changePage('#newPage', { transition: "slide" });
    });
    $('#refreshBtn').click(function() {
        refresh();
    });
    $('#emptyTrashBtn').click(function() {
        emptyTrash();
    });
   /*
emptyTrashBtn
statistikBtn
newBtn
*/
});
