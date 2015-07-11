<?php include "todo-core.php"; ?>
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title><?php echo(TodoConstants::AppName); ?></title>
    <!-- JQuery & JQuery UI -->
    <script type="text/javascript" src="jquery/jquery-1.11.1.min.js"></script>
    <script type="text/javascript" src="jquery/jquery-ui-1.11.0.custom.min.js"></script>
    <script type="text/javascript" src="log.js.php"></script>
    <script type="text/javascript" src="todo-common.js"></script>
    <script type="text/javascript" src="todo-desktop.js"></script>
    <script type="text/javascript" src="init.js"></script>
    <script type="text/javascript" src="js/tag-it.min.js" type="text/javascript" charset="utf-8"></script>
    <script type="text/javascript" src="lang-js.php"></script>
    <link rel="stylesheet" type="text/css" href="todo.css" />
    <link rel="stylesheet" type="text/css" href="jquery/jquery-ui-1.11.0.custom.min.css"/>
    <link rel="stylesheet" type="text/css" href="css/jquery.tagit.css">
    <link rel="stylesheet" type="text/css" href="css/tagit.ui-zendesk.css">
  </head>
  <body>
    <div id="todo_content">
      <div id="smallLog"><?php echo(TodoLang::_("STARTING_LOG"));?></div>
      <div id="logLink"><a href="javascript:toggleLog()"><?php echo(TodoLang::_("SHOW_LOG"));?></a></div>
      <div id="working"><?php echo(TodoLang::_("WORKING"));?></div>
      <div id="filter">
          <input type="hidden" id="filter_tags" name="filter_tags" />
          <ul id="filter_tag_edit" class="tagit ui-widget ui-widget-content ui-corner-all tagit-choice-editable"></ul>
      </div>
      <div id="emptytrashlink"><a href="javascript:emptyTrash()"><?php echo(TodoLang::_("EMPTY_TRASH"));?></a></div>
      <div id="statistiklink"><a href="statistik.php"><?php echo(TodoLang::_("SHOW_STATISTICS"));?></a></div>
      <div id="mobilelink"><a href="m.index.php"><?php echo(TodoLang::_("GOTO_MOBILE_VERSION"));?></a></div>
      <h1><?php echo(TodoConstants::AppTitle); ?></h1>
      <div id="progress"><span id="progress_done">&nbsp;</span><span id="progress_todo">&nbsp;</span></div>
      <form method="POST" onsubmit="return false;" id="inputform">
        <input type="hidden" name="user_id" id="user_id" value="<?php echo $curUserID; ?>" />
        <div class="line line_header">
          <span class="todo"><?php echo(TodoLang::_("TODO"));?> <input type="image" src="images/refresh.png" name="refresh" value="refresh" onclick="refresh()" /></span>
          <span class="due"><?php echo(TodoLang::_("DUE"));?></span>
          <span class="priority"><?php echo(TodoLang::_("PRIORITY"));?></span>
          <span class="effort"><?php echo(TodoLang::_("EFFORT"));?></span>
        </div>
        <div class="line line_input">
          <span class="todo"><input type="text" id="enter_todo" name="enter_todo" size="60" maxlength="255" /></span>
          <span class="due"><input type="text" id="enter_due" name="enter_due" size="10" maxlength="20" /></span>
          <span class="priority"><input type="text" id="enter_priority" name="enter_priority" size="3" maxlength="4" /></span>
          <span class="effort"><input type="text" id="enter_effort" name="enter_effort" size="3" maxlength="4" value="1" /></span>
          <span class="actions"><input type="image" src="images/Add.png" name="save" value="<?php echo(TodoLang::_("SAVE"));?>" onclick="enter()" /></span>
        </div>
      </form>
      <div id="sidebar">
          <div id="lists">
              <ul></ul>
          </div>
          <div id="taglist">
              <ul></ul>
          </div>
      </div>
      <div id="todoTable">
      </div>
      <div id="loadMoreBox">
          <a href="#" id="loadMoreLink" /><?php echo(TodoLang::_("LOAD_MORE"));?></a>
      </div>
      <div id="modify_dialog" style="display:none;">
        <form method="POST" onsubmit="return false;" id="inputform">
          <input type="hidden" id="modify_id" name="modify_id" />
          <div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TODO"));?>: </span>
            <input type="text" id="modify_todo" name="modify_todo" size="50" maxlength="255" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("DUE"));?>: </span>
            <input type="text" id="modify_due" name="modify_due" size="10" maxlength="20" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("PRIORITY"));?>:</span>
            <input type="text" id="modify_priority" name="modify_priority" size="3" maxlength="4" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("EFFORT"));?>:</span>
            <input type="text" id="modify_effort" name="modify_effort" size="3" maxlength="4" /><?php echo(TodoLang::_("EFFORT_REMARK"));?>
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
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("NOTES"));?>:</span>
            <textarea type="text" id="modify_notes" name="modify_notes" rows="10" cols="50"></textarea>
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TAGS"));?>:</span>
            <input type="hidden" id="modify_tags" name="modify_tags" />
            <ul id="modify_tag_edit" class="tagit ui-widget ui-widget-content ui-corner-all tagit-choice-editable"></ul>
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("LIST"));?>:</span>
            <select id="modify_list">
            </select>
          </div>

          <input type="image" src="images/pencil.png" name="modify_save" id="modify_save" value="<?php echo(TodoLang::_("SAVE"));?>" />
        </form>
      </div>
      <div id="log_dialog" style="display:none"></div>
      <div id="tag_dialog" style="display:none">
        <form>
          <div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TAG_NAME"));?>: </span>
            <input type="hidden" id="tag_id" name="tag_id" />
            <input type="text" id="tag_name" name="tag_name" size="20" maxlength="255" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TAG_COUNT"));?>: </span>
            <input type="text" id="tag_count" name="tag_count" size="10" readonly="true" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("MERGE_TO"));?>: </span>
            <input type="hidden" id="merge_tag" name="merge_tag" />
            <ul id="merge_tag_edit" class="tagit ui-widget ui-widget-content ui-corner-all tagit-choice-editable"></ul>
            <input type="image" src="images/merge.png" name="tag_merge" id="tag_merge" value="<?php echo(TodoLang::_("MERGE"));?>" />
          </div>
          <input type="image" src="images/Delete.png" name="tag_delete" id="tag_delete" value="<?php echo(TodoLang::_("DELETE"));?>" />
          <input type="image" src="images/pencil.png" name="tag_save" id="tag_save" value="<?php echo(TodoLang::_("SAVE"));?>" />
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
