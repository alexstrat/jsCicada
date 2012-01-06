PATH = require('path');
FS   = require('fs');

exports.Dependencies = function(builder, entry, exclude) {
  this.builder = builder;
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

  log : function() {
    this.builder.log.apply(this.builder, arguments);
  },
  
  isExcluded : function(path) {
    var self = this;
    return this.exclude
          .map(function(exclusion) {
            return self.builder.matchPath(path, exclusion);
          })
          .reduce(function(prev, cur) {
            return prev || cur;
          }, false);
  },

  extractDep : function(code) {
    var dep        = [],
        builder    = this.builder,
        uid        = '_' + new Date().getTime(),
        primitives = [],
        primIndex  = 0;

    var comments = code
      // Remove strings
      .replace(/(['"])(\\\1|.)+?\1/g, function(match){
        primitives[primIndex] = match;
        return (uid + '') + primIndex++;
      })
      // Remove Regexes
      .replace(/([^\/])(\/(?!\*|\/)(\\\/|.)+?\/[gim]{0,3})/g, function(match, $1, $2){
        primitives[primIndex] = $2;
        return $1 + (uid + '') + primIndex++;
      })
      // Match comments
      .match(/\/\/.+?(?=\n|\r|$)|\/\*[\s\S]+?\*\//g);

    if (comments === null) {
      return [];
    }

    comments = comments
      .join('\n')
      // Bring back strings and regexes
      .replace(RegExp(uid + '(\\d+)', 'g'), function(match, n){
        return primitives[n];
      })
      .split('\n');

    for (var i = 0, l = comments.length; i < l; i++) {
      var comment = comments[i];
      extracted = /^[\/\*\s]*(Dep\s*:|#import)\s*(\S+)/g.exec(comment);
      if (extracted) {
        dep.push(builder.resolvePath(extracted[2]));
      }
    }
    return dep;
  },

  addDepOfFile : function(resolved_path) {
    //has already been analysed ?
    if(typeof this.tree[resolved_path] !== 'undefined') return;

    filepath = (PATH.extname(resolved_path) === "") ? resolved_path + ".js" : resolved_path;
    var code;
    try {
      code = FS.readFileSync(filepath, 'utf-8');
      var self = this;
      var dep = this.extractDep(code)
                    .filter(function(dep) {
                        return !self.isExcluded(dep);
                    });
      this.tree[resolved_path] = dep;
      
      dep.forEach(function(dep) {
        self.addDepOfFile(dep);
      });
    } catch(e) {
      this.log('read FAIL : ' + PATH.basename(filepath) + ' not found.');
      return;
    }
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
          addToStack(dep[i]);
        }
      }
    };
    addToStack(this.entry);
    return stack;
  }
};