PATH = require('path');
FS   = require('fs');

exports.Dependencies = function(builder, entry, exclude) {
  this.builder = builder;
  this.log = builder.log;
  this.entry = builder.resolvePath(entry);
  this.exclude = (exclude || []).map(function(excl) {
    return builder.resolvePath(excl);
  });
  this.tree = {};
};

exports.Dependencies.prototype = {

  build : function() {
    this.addDepOfFile(this.entry);
    return this.getDepOrder();
  },
  
  isExcluded : function(path) {
    return this.exclude
          .map(function(exclusion) {
            return this.builder.matchPath(path, exclusion);
          })
          .reduce(function(prev, cur) {
            return prev || cur;
          }, false);
  },

  extractDep : function(code) {
    var dep = [];
    var builder = this.builder;
    code.split('\n').forEach(function(line) {
      extracted = /\s*(\/\/|\*)+\s*Dep\s*:\s*(\S*)\s*.*/g.exec(line);
      if(extracted) {
        dep.push(builder.resolvePath(extracted[2]));
      }
    });
    return dep;
  },

  addDepOfFile : function(resolved_path) {
    //has already been analysed ?
    if(typeof this.tree[resolved_path] !== 'undefined') return;

    filepath = (PATH.extname(resolved_path) === "") ? resolved_path + ".js" : resolved_path;
    var code;
    try {
      code = FS.readFileSync(filepath, 'utf-8');
    } catch(e) {
      this.log('read FAIL : ' + PATH.basename(filepath) + ' not found.');
      return;
    }
    var self = this;
    var dep = this.extractDep(code)
                  .filter(function(dep) {
                      return !self.isExcluded(dep);
                  });
    this.tree[resolved_path] = dep;

    dep.forEach(function(dep) {
      self.addDepOfFile(dep);
    });
  },

  getDepOrder : function() {
    var stack = [];
    var tree = this.tree;

    var addToStack = function(path) {
      if(stack.indexOf(path) == -1)
        stack.unshift(path);

      var dep = tree[path];
      for (var i in dep) {
        var index = stack.indexOf(dep[i]);
        if (index == -1) {
          addToStack(dep[i]);
        } else {
          stack.splice(index,1);
          addToStack.addFile(dep[i]);
        }
      }
    };
    addToStack(this.entry);
    return stack;
  }
};