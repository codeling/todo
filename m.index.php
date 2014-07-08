<?php include "todo-core.php"; ?><!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title><?php echo(TodoConstants::AppName); ?></title>
    <!-- JQuery & JQuery UI -->
    <script type="text/javascript" src="jquery/jquery-1.10.2.min.js"></script>
    <script type="text/javascript" src="jquery/jquery-ui-1.10.3.custom.min.js"></script>
    <script type="text/javascript" src="jquery/jquery.mobile-1.3.2.min.js"></script>
    <script type="text/javascript" src="log.js.php"></script>
    <script type="text/javascript" src="todo-common.js"></script>
    <script type="text/javascript" src="todo-mobile.js"></script>
    <script type="text/javascript" src="init.js"></script>
    <script type="text/javascript" src="js/tag-it.min.js" type="text/javascript" charset="utf-8"></script>
    <script type="text/javascript" src="lang-js.php"></script>
    <link rel="stylesheet" type="text/css" href="todo-mobile.css" />
    <link rel="stylesheet" type="text/css" href="jquery/jquery-ui-1.10.3.custom.min.css"/>
    <link rel="stylesheet" href="jquery/jquery.mobile-1.3.2.min.css" />
    <link rel="stylesheet" type="text/css" href="css/jquery.tagit.css">
    <link rel="stylesheet" type="text/css" href="css/tagit.ui-zendesk.css">
  </head>
  <body>
    
    <div data-role="page">
      <div data-role="header" data-position="fixed" data-theme="b">
        <h1><?php echo(TodoConstants::AppTitle); ?></h1>
      </div>

      <div data-role="content" id="todoTable">
      </div>

      <!-- menu bar -->
      <div data-theme="a" data-role="footer" data-position="fixed">
            <div id="filter">
              <input type="hidden" id="filter_tags" name="filter_tags" />
              <ul id="filter_tag_edit" class="tagit ui-widget ui-widget-content ui-corner-all tagit-choice-editable"></ul>
            </div>
            <input type="button" id="emptytrashlink" value ="<?php echo(TodoLang::_("EMPTY_TRASH"));?>" />
            <input type="button" id="statistiklink" value="<?php echo(TodoLang::_("SHOW_STATISTICS"));?>" />
            <input type="button" id="newtodolink" value="<?php echo(TodoLang::_("NEW_TODO"));?>" />
      </div>

    </div>

   <!-- move to separate "page:" -->

      <!-- new todo form -->
   <div data-role="page" id="new_dialog">
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
   </div>

     <!-- modify dialog -->
   <div data-role="page" id="modify_dialog">
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
       </div>
       <input type="image" src="images/pencil.png" name="modify_save" id="modify_save" value="<?php echo(TodoLang::_("SAVE"));?>" />
     </form>
   </div>


  </body>
</html>