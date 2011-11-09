<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Simple To Do List</title>
    <!-- JQuery & JQuery UI -->
    <link href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css" rel="stylesheet" type="text/css"/>
  <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.5/jquery.js"></script>
  <script src="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js"></script>
  
    <script type="text/javascript" src="todo.js"></script>
    <link rel="stylesheet" type="text/css" href="todo.css" />
 </head>
  <body>
    <div id="status">&nbsp;</div>
    <div id="log">Starte Log</div>
    <div id="working">Arbeite...</div>
    <h1>To Do</h1>
    <form method="POST" onsubmit="return false;" id="inputform">
      <div class="line line_header">
        <span class="todo">Todo <input type="image" src="refresh.png" name="refresh" value="refresh" onclick="refresh()" />
</span><span class="due"> Fällig</span><span class="priority">Priorität</span>
      </div>
      <div class="line line_input">
        <span class="todo"><input type="text" id="todo" name="todo" size="50" maxlength="255" /></span><span class="due"><input type="text" id="due" name="due" size="16" maxlength="20" /></span><span class="priority"><input type="text" id="priority" name="priority" size="3" maxlength="4" /></span><span><input type="image" src="Add.png" name="save" value="Speichern" onclick="enter()" /></span>
      </div>
    </form>
    <div id="todoTable">
    </div>
    <div id="modify_dialog" style="display:none;">
      <form method="POST" onsubmit="return false;" id="inputform">
        <input type="hidden" id="modify_id" name="modify_id" />
        <div class="modify_line">
          <span class="modify_desc">Todo: </span>
          <input type="text" id="modify_todo" name="modify_todo" size="50" maxlength="255" />
        </div><div class="modify_line">
          <span class="modify_desc">Fällig: </span>
          <input type="text" id="modify_due" name="modify_due" size="16" maxlength="20" />
        </div><div class="modify_line">
          <span class="modify_desc">Priorität</span>
          <input type="text" id="modify_priority" name="modify_priority" size="3" maxlength="4" />
        </div>
        <input type="image" src="Modify.png" name="modify_save" id="modify_save" value="Speichern" />
      </form>
    </div>
    <div id="log_dialog" style="display:none">
    </div>
  </body>
</html>

