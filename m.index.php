<?php include "todo-core.php"; ?><!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title><?php echo(TodoConstants::AppName); ?></title>
    <!-- JQuery & JQuery UI -->
    <script type="text/javascript" src="jquery/jquery-3.4.0.min.js"></script>
    <script type="text/javascript" src="jquery/jquery-migrate-3.0.1.js"></script>
    <script type="text/javascript" src="jquery/jquery-ui-1.12.1.min.js"></script>
    <script type="text/javascript" src="jquery/jquery.mobile-1.4.5.min.js"></script>
    <script type="text/javascript" src="log.js.php"></script>
    <script type="text/javascript" src="todo-common.js"></script>
    <script type="text/javascript" src="todo-mobile.js"></script>
    <script type="text/javascript" src="init.js"></script>
    <script type="text/javascript" src="jquery/jquery-ui-tag-it.js" charset="utf-8"></script>
    <script type="text/javascript" src="lang-js.php"></script>
    <link rel="stylesheet" type="text/css" href="todo-mobile.css" />
    <link rel="stylesheet" type="text/css" href="jquery/jquery-ui-1.12.1.min.css"/>
    <link rel="stylesheet" href="jquery/jquery.mobile-1.4.5.min.css" />
    <link rel="stylesheet" type="text/css" href="jquery/jquery-ui-tag-it.css">
    <link rel="stylesheet" type="text/css" href="jquery/jquery-ui-tag-it.theme.css">

  </head>
  <body>
    
    <div data-role="page" id="listPage">
      <div data-role="header" data-position="fixed" data-theme="b">
        <h1><?php echo(TodoConstants::AppTitle); ?></h1>
      </div>

      <div data-role="content" id="todoTable">
      </div>

      <div id="loadMoreBox">
          <a href="#" id="loadIncomplete" /><?php echo(TodoLang::_("LOAD_INCOMPLETE"));?></a>
          <a href="#" id="loadLessCompleted" /><?php echo(TodoLang::_("LOAD_LESS_COMPLETED"));?></a>
          <a href="#" id="loadMoreCompleted" /><?php echo(TodoLang::_("LOAD_MORE_COMPLETED"));?></a>
      </div>

      <div id="listsContainer">
          Lists:
          <div id="lists">
              <ul></ul>
          </div>
      </div>

      <!-- menu bar -->
      <div data-theme="a" data-role="footer" data-position="fixed">
            <input type="button" id="emptyTrashBtn" value ="<?php echo(TodoLang::_("EMPTY_TRASH"));?>" />
            <input type="button" id="statisticsBtn" value="<?php echo(TodoLang::_("SHOW_STATISTICS"));?>" />
            <input type="button" id="newBtn" value="<?php echo(TodoLang::_("NEW_TODO"));?>" />
            <input type="button" id="refreshBtn" value="<?php echo(TodoLang::_("REFRESH"));?>" />
            <input type="button" id="showLogBtn" value="<?php echo(TodoLang::_("SHOW_LOG"));?>" />
      </div>

    </div>

     <!-- modify dialog -->
    <div data-role="page" id="modifyPage">
      <form method="POST" onsubmit="return false;" id="modifyForm">
        <input type="hidden" id="modify_id" name="modify_id" />
        <div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_todo"><?php echo(TodoLang::_("TODO"));?>: </label>
          <input type="text" id="modify_todo" name="modify_todo" maxlength="255" />
        </div><div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_start"><?php echo(TodoLang::_("START"));?>:</label>
          <input type="text" id="modify_start" name="modify_start" maxlength="4" />
        </div><div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_due"><?php echo(TodoLang::_("DUE"));?>: </label>
          <input type="text" id="modify_due" name="modify_due" maxlength="20" />
        </div><div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_effort"><?php echo(TodoLang::_("EFFORT").TodoLang::_("EFFORT_REMARK"));?>:</label>
          <input type="text" id="modify_effort" name="modify_effort" maxlength="4" />
        </div><div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_notes"><?php echo(TodoLang::_("NOTES"));?>:</label>
          <textarea type="text" id="modify_notes" name="modify_notes" rows="10" cols="50"></textarea>
        </div><div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_recurrenceMode"><?php echo(TodoLang::_("RECURRENCE"));?>:</label>
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
        </div><div class="modify_line recurrence_dependent" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_recurrenceAnchor"><?php echo(TodoLang::_("RECURRENCE_ANCHOR"));?>:</label>
          <select name="modify_recurrenceAnchor" id="modify_recurrenceAnchor">
            <option value="0"><?php echo(TodoLang::_("REPEAT_ANCHOR_COMPLETIONDATE"));?></option>
            <option value="1"><?php echo(TodoLang::_("REPEAT_ANCHOR_ENDDATE"));?></option>
          </select>
        </div><div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_tags"><?php echo(TodoLang::_("TAGS"));?>:</label>
          <input type="hidden" id="modify_tags" name="modify_tags" />
          <ul id="modify_tag_edit" class="tagit ui-widget ui-widget-content ui-corner-all tagit-choice-editable"></ul>
        </div><div class="modify_line" data-role="ui-field-contain">
          <label class="modify_desc" for="modify_list"><?php echo(TodoLang::_("LIST"));?>:</label>
          <select id="modify_list" name="modify_list"></select>
        </div>
        <div data-theme="a" data-role="footer" data-position="fixed">
          <input type="button" id="restoreBtn" value="<?php echo(TodoLang::_("RESTORE"));?>" />
          <input type="button" id="toggleBtn" value="<?php echo(TodoLang::_("TOGGLE"));?>" />
          <input type="button" id="deleteBtn" value="<?php echo(TodoLang::_("DELETE"));?>" />
          <input type="button" id="saveBtn" value="<?php echo(TodoLang::_("SAVE"));?>" />
          <input type="button" id="cancelBtn" value="<?php echo(TodoLang::_("CANCEL"));?>" />
        </div>
      </form>
    </div>

    <!-- log dialog -->
    <div data-role="page" id="logPage">
      <form method="POST" onsubmit="return false;" id="modifyForm">
        <div data-theme="b" data-role="header"><?php echo(TodoLang::_("Log"));?></div>
        <div data-theme="b" id="logtext"></div>
        <div data-theme="a" data-role="footer" data-position="fixed">
          <input type="button" id="backBtn" value="<?php echo(TodoLang::_("BACK"));?>" />
        </div>
      </form>
    </div>

  </body>
</html>
