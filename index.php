<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Simple To Do List</title>
    <style type="text/css">
      body {
          font-family:Arial,sans-serif;
          background-color: #FFC;
          font-size: 12pt;
          line-height: 150%;
      }
      h1,h2 {
          background-color: #FB5;
      }
      h1 {
          font-size: 16pt;
          font-weight: 600;
      }
      h2 {
          font-size: 14pt;
          font-weight: 500;
      }
      h3 {
          font-size: 12pt;
          font-weight: 450;
      }
      .todo {
          width: 250px;
          text-align: left;
      }
      .due {
          width: 150px;
          text-align: left;
      }
      #working {
          background-color:#F00;
/*          display:none; */
          float: right;
      }
      .oddrow {
          background-color:#FF9;
      }
      .delete {
          width: 70px;
      }
    </style>

    <script type="text/javascript"
            src="http://code.jquery.com/jquery-1.5.min.js" ></script>
 
 
    <script type="text/javascript">
    function sendDelete(id)
    {
        $("#working").css("display", "block");
        var stuff = new Object("todo");
          stuff.id = id.substr(6,id.length-6);
        alert (stuff.id);
        $.ajax({
            type: 'POST',
            url: 'delete.php',
            data: stuff,
            success: function(data) {
                if (data != 1)
                {
                    alert("Fehler beim Löschen");
                }
                // TODO: instead of full-reload, just delete the one row!
                reload();
            }
        });
    }

    function addItem(id, todo, due)
    {
        $("#todoTable").append("<tr>"+
            "<td class='bringer'>"+todo+"</td>"+
            "<td class='name'>"+due+"</td>"+
            "<td class='priority'>"+priority+"</td>"+
            "<td class='delete'><input type='button' value='Löschen' id='delete"+id+"' /></td>"+
        "</tr>");
        $("#delete"+id).click(function() {
            sendDelete(this.id);
        });
    }

    function fillTable(data)
    {
        $("#todoTable").append("<tr><th class='todo'>Todo</th><th class='due'>Fällig</th><th class='delete'></th></tr>");
        for (var i=0; i<data.length; i++)
        {
            addItem(data[i].id, data[i].todo, data[i].due);
        }
    }
  
    function reload()
    {
        var jsontext = $.ajax({
            url: 'query.php',
            async: false
        }).responseText;
        $("#todoTable").empty();
        var data = JSON.parse(jsontext);
        fillTable(data);
        $("#todoTable").append("<tr><th class='todo'>Todo</th><th class='due'>Fällig</th><th class='delete'></th></tr>");
        for (var i=0; i<data.length; i++)
        {
            addItem(data[i].id, data[i].todo, data[i].due);
        }
        $("#working").css("display", "none");
    }

    function enter()
    {
        $("#working").css("display", "block");
        var stuff = new Object("todo");
        stuff.todo = $("#todo").val();
        stuff.due =  $("#due").val();
        $.ajax({
            type: 'POST',
            url: 'enter.php',
            data: stuff,
            success: function(data) {
                if (data == -1)
                {
                    alert("Bitte alle Felder ausfüllen!");
                }
                else if (data == -2)
                {
                    alert("Fehler beim Einfügen");
                }
/*              else
                {
                    addItem(data, stuff.todo, stuff.due);
*/
                    $("#todo").val("");
                    $("#due").val("");

                   // Add "manually":
                    
                }
                reload();
            }
        });
    }
    function refresh()
//    {
        $("#working").css("display", "block");
        reload();
// TODO: make changes locally, never refresh
        setTimeout('refresh()', 30000);
    }
    </script>

  </head>
  <body onload="refresh()">
    <h1>To Do</h1>
    <div id="working">Arbeite...</div>
    <div>
      <div id="todoTable">
      </div>
      <h3>Neu</h3>
      <form method="POST">
        <table>
          <tr>
            <th class="todo">Todo</th>
            <th class="due"> Fällig</th>
            <th class="priority">Priorität</th>
          </tr>
          <tr>
            <td class="todo"><input type="text" id="todo" name="todo" size="50" maxlength="255" /></td>
            <td class="due"><input type="text" id="due" name="due" size="15" maxlength="255" /></td>
            <td class="priority"><input type="text" id="priority" name="priority" size="5" maxlength="5" /></td>
            <td><input type="button" onclick="enter()" name="save" value="Speichern" /></td>
          </tr>
        </table>
      </form>
    </div>
  </body>
</html>

