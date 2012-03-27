var windowLoaded = false;
$(window).load(function() {
  windowLoaded = true;
});

angular.widget('ace:editor', function(templateElement) {
  var compiler = this;
  var initAceWidget = function(instanceElement, currentScope) {
    var id = instanceElement.attr('id');
    var mode = instanceElement.attr('mode');
    var theme = instanceElement.attr('theme');
    var bindExp = instanceElement.attr('bindExp');
    var childNode = document.createElement('div');
    childNode.id = id + '-editor';
    instanceElement.append(childNode);
    var editor = ace.edit(childNode.id);
    var mode = require('ace/mode/' + mode).Mode;
    editor.getSession().setMode(new mode());
    editor.renderer.setShowGutter(false);
    editor.renderer.setHScrollBarAlwaysVisible(false);
    if (theme) {
      editor.setTheme('ace/theme/' + theme);
    }
    if (currentScope[bindExp]) {
      editor.getSession().setValue(currentScope[bindExp]);
    }
    // We use these variables to prevent an infinite loop of gets triggering sets.
    var setOnStack = false;
    var getOnStack = false;
    currentScope.$watch(bindExp, function(value) {
      if (!getOnStack) {
        setOnStack = true;
        editor.getSession().setValue(value);
        setOnStack = false;
      }
    });

    editor.getSession().on('change', function() {
      if (!setOnStack) {
        getOnStack = true;
        currentScope[bindExp] = editor.getSession().getValue();
        currentScope.$eval();
        getOnStack = false;
      }
    });
  };
  return function(instanceElement) {
    var currentScope = this;
    if (windowLoaded) {
      initAceWidget(instanceElement, currentScope);
    } else {
      $(window).load(function() {
        initAceWidget(instanceElement, currentScope);
      });
    }
  };
});