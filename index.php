<?php include "todo-core.php"; ?>
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title><?php echo(TodoConstants::AppName); ?></title>
    <!-- JQuery & JQuery UI -->
    <script src="jquery/jquery-3.7.1.min.js"></script>
    <script src="jquery/jquery-ui-1.13.2.min.js"></script>
    <script src="log.js.php"></script>
    <script src="todo-common.js"></script>
    <script src="todo-desktop.js"></script>
    <script src="init.js"></script>
    <script src="tagify.js"></script>
    <script src="lang-js.php"></script>
    <link rel="stylesheet" type="text/css" href="tagify.css" />
    <link rel="stylesheet" type="text/css" href="todo.css" />
    <link rel="stylesheet" type="text/css" href="jquery/jquery-ui-1.13.2.min.css"/>
    <link rel="icon" href="/todo.svg" type="image/svg+xml">
  </head>
  <body>
    <div id="todo_content">
      <div id="mainContent">
        <div id="headerLine">
          <h1><?php echo(TodoConstants::AppTitle); ?></h1>
          <div id="working"><?php echo(TodoLang::_("WORKING"));?></div>
          <div id="filter">
            <input type="hidden" id="filter_tags" name="filter_tags" />
            <input id="filter_tag_edit" />
          </div>
          <div id="emptytrashlink"><a href="javascript:emptyTrash()"><?php echo(TodoLang::_("EMPTY_TRASH"));?></a></div>
          <div id="statistiklink"><a href="statistik.php"><?php echo(TodoLang::_("SHOW_STATISTICS"));?></a></div>
          <div id="mobilelink"><a href="m.index.php"><?php echo(TodoLang::_("GOTO_MOBILE_VERSION"));?></a></div>
        </div>
        <div id="progress"><span id="progress_done">&nbsp;</span><span id="progress_todo">&nbsp;</span></div>
        <form method="POST" onsubmit="return false;" id="inputform">
          <input type="hidden" name="user_id" id="user_id" value="<?php echo $curUserID; ?>" />
          <table id="todoTable">
            <thead>
            <tr>
              <th class="todo"><?php echo(TodoLang::_("TODO"));?> <input type="button" class="refreshButton" id="refresh" alt="refresh" /></th>
              <th class="start"><?php echo(TodoLang::_("START"));?></th>
              <th class="due"><?php echo(TodoLang::_("DUE"));?></th>
              <th class="actions" colspan="2"><?php echo(TodoLang::_("ACTIONS"));?></th>
            </tr>
            <tr class="line line_input">
              <td><input type="text" id="enter_todo" name="enter_todo" maxlength="255" /></td>
              <td class="start"><input type="text" id="enter_start" name="enter_start" maxlength="4" /></td>
              <td class="due"><input type="text" id="enter_due" name="enter_due" maxlength="20" /></td>
              <td class="actions" colspan="2"><input type="button" class="addButton" name="save" alt="<?php echo(TodoLang::_("SAVE"));?>" onclick="enter()" /></td>
            </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
        </form>
        <div id="loadMoreBox">
            <a href="#" id="loadIncomplete" /><?php echo(TodoLang::_("LOAD_INCOMPLETE"));?></a>
            <a href="#" id="loadLessCompleted" /><?php echo(TodoLang::_("LOAD_LESS_COMPLETED"));?></a>
            <a href="#" id="loadMoreCompleted" /><?php echo(TodoLang::_("LOAD_MORE_COMPLETED"));?></a>
        </div>
        <div id="modify_dialog" style="display:none;">
          <form method="POST" onsubmit="return false;" id="inputform">
            <input type="hidden" id="modify_id" name="modify_id" />
            <div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("TODO"));?>: </span>
              <input type="text" id="modify_todo" name="modify_todo" maxlength="255" />
            </div><div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("START"));?>:</span>
              <input type="text" id="modify_start" name="modify_start" maxlength="20" />
            </div><div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("DUE"));?>: </span>
              <input type="text" id="modify_due" name="modify_due" maxlength="20" />
            </div><div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("EFFORT"));?>:</span>
              <input type="text" id="modify_effort" name="modify_effort" maxlength="4" /><?php echo(TodoLang::_("EFFORT_REMARK"));?>
            </div><div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("RECURRENCE"));?>:</span>
              <select name="modify_recurrenceMode" id="modify_recurrenceMode">
                <option value="0"><?php echo(TodoLang::_("DONT_REPEAT"));?></option>
                <option value="3"><?php echo(TodoLang::_("REPEAT_EVERY_THREE_DAYS"));?></option>
                <option value="7"><?php echo(TodoLang::_("REPEAT_WEEKLY"));?></option>
                <option value="14"><?php echo(TodoLang::_("REPEAT_BIWEEKLY"));?></option>
                <option value="30"><?php echo(TodoLang::_("REPEAT_MONTHLY"));?></option>
                <option value="60"><?php echo(TodoLang::_("REPEAT_BIMONTHLY"));?></option>
                <option value="91"><?php echo(TodoLang::_("REPEAT_QUARTERLY"));?></option>
                <option value="121"><?php echo(TodoLang::_("REPEAT_THIRDOFYEARLY"));?></option>
                <option value="182"><?php echo(TodoLang::_("REPEAT_HALFYEARLY"));?></option>
                <option value="365"><?php echo(TodoLang::_("REPEAT_YEARLY"));?></option>
                <option value="730"><?php echo(TodoLang::_("REPEAT_BIYEARLY"));?></option>
                <option value="1095"><?php echo(TodoLang::_("REPEAT_THREEYEARLY"));?></option>
                <option value="1460"><?php echo(TodoLang::_("REPEAT_FOURYEARLY"));?></option>
                <option value="1805"><?php echo(TodoLang::_("REPEAT_FIVEYEARLY"));?></option>
              </select>
            </div><div class="modify_line recurrence_dependent">
              <span class="modify_desc"><?php echo(TodoLang::_("RECURRENCE_ANCHOR"));?>:</span>
              <select name="modify_recurrenceAnchor" id="modify_recurrenceAnchor">
                <option value="0"><?php echo(TodoLang::_("REPEAT_ANCHOR_COMPLETIONDATE"));?></option>
                <option value="1"><?php echo(TodoLang::_("REPEAT_ANCHOR_ENDDATE"));?></option>
              </select>
            </div><div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("NOTES"));?>:</span>
              <textarea type="text" id="modify_notes" name="modify_notes"></textarea>
            </div><div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("TAGS"));?>:</span>
              <input type="hidden" id="modify_tags" name="modify_tags" />
              <input id="modify_tag_edit" />
            </div><div class="modify_line">
              <span class="modify_desc"><?php echo(TodoLang::_("LIST"));?>:</span>
              <select id="modify_list">
              </select>
            </div>
            <input type="button" class="editButton" name="modify_save" id="modify_save" alt="<?php echo(TodoLang::_("SAVE"));?>" />
          </form>
        </div>
      </div>
      <div id="sidebar">
        <div id="smallLog"><?php echo(TodoLang::_("STARTING_LOG"));?></div>
        <div id="logLink"><a href="javascript:toggleLog()"><?php echo(TodoLang::_("SHOW_LOG"));?></a></div>
        <div id="lists">
          <ul></ul>
        </div>
        <div id="taglist">
          <input value="">
        </div>
      </div>
      <div id="log_dialog" style="display:none"></div>
      <div id="tag_dialog" style="display:none">
        <form>
          <div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TAG_NAME"));?>: </span>
            <input type="hidden" id="tag_id" name="tag_id" />
            <input type="text" id="tag_name" name="tag_name" maxlength="255" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TAG_COUNT"));?>: </span>
            <input type="text" id="tag_count" name="tag_count" readonly="true" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("MERGE_TO"));?>: </span>
            <input type="hidden" id="merge_tag" name="merge_tag" />
            <input id="merge_tag_edit" >
            <input type="button" class="mergeButton" name="tag_merge" id="tag_merge" alt="<?php echo(TodoLang::_("MERGE"));?>" />
          </div>
          <input type="button" class="deleteButton" name="tag_delete" id="tag_delete" alt="<?php echo(TodoLang::_("DELETE"));?>" />
          <input type="button" class="editButton" name="tag_save" id="tag_save" alt="<?php echo(TodoLang::_("SAVE"));?>" />
        </form>
        <div id="tag_todo_container">
          <span id="tag_todo_caption"><?php echo(TodoLang::_("TAG_TODO_LIST_CAPTION"));?></span>
          <div id="tag_todo_table">
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
