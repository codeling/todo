<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Simple To Do List</title>
    <script type="text/javascript" src="http://code.jquery.com/jquery-1.5.min.js"></script>
    <script type="text/javascript" src="todo.js"></script>
    <link rel="stylesheet" type="text/css" href="todo.css" />
 </head>
  <body onload="refresh()">
    <div id="working">Arbeite...</div>
    <h1>To Do</h1>
    <form method="POST" onsubmit="return false;">
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
  </body>
</html>

