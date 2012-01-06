PATH         = require('path');
FS           = require('fs');
COLORS       = require('colors');
Dependencies = require('./dependencies.js').Dependencies;

LEVELS = {
  cicada  : 0,
  verbose : 1,
  info    : 2,
  success : 3,
  error   : 4
};

COLORS.setTheme({
  cicada  : 'rainbow',
  verbose : 'grey',
  info    : 'white',
  success : 'green',
  error   : 'red'
});

exports.builder = function(buildConf) {
  var _basedir = process.cwd();
  //no buuildconf : default path :
  if(typeof buildConf == 'undefined'){
    buildConf = _basedir +'/build.json';
  }
  //buildConf string : read JSON file :
  if(typeof buildConf == 'string'){
    _basedir = require('path').dirname(buildConf);
    buildConf = JSON.parse(require('fs').readFileSync(buildConf));
  }
  if(typeof buildConf !== 'object')
    throw new Error('Build Configuration is not valid');

  //set basedir if needed
  buildConf.basedir = buildConf.basedir || ".";
  buildConf.basedir = require('path').resolve(_basedir, buildConf.basedir);

  this.buildConf   = buildConf;
  this.loggerLevel = buildConf.logger ? LEVELS[buildConf.logger] : LEVELS.info;

  this.cicadaCount = 0;
};

exports.builder.prototype = {

  build: function(targets) {
    this.verbose('Start the build\n');
    targets = (Array.isArray(targets)) ? targets : [targets];
    var self = this;
    targets.forEach(function(target){
      self.buildOne(target);
    });
  },

  buildAll: function() {
    var all = [];
    for(var i in this.buildConf.targets) {
      all.push(i);
    }
    this.build(all);
  },

  buildOne: function(target) {
    try {
      var conf = this.getTargetConf(target);

      var entry   = conf.entry;
      var exclude = conf.exclude || [];
      var mini    = conf.mignify || false;
      var build   = this.resolvePath(conf.build);

      this.info('building ' + target.underline);
      var files = (new Dependencies(this, entry, exclude)).build();
      this.verbose('files in order : '+files.map(function(dep){return PATH.basename(dep);}).join(', ')+'.');

      var code = [];
      for(var i in files) {
        var path = (PATH.extname(files[i]) === "") ? files[i] + ".js" : files[i];
        var content = FS.readFileSync(path, 'utf-8');
        code.push((mini) ? this.mignify(content) : content);
      }

      this.verbose('writing in '+ PATH.basename(build));
      FS.writeFileSync(build, code.join('\n'));
      this.success(' ✓ done\n');
    } catch(e) {
      this.error(' ✗ ' + e + '\n');
    }
  },

  getTargetConf: function(target) {
    var conf = this.buildConf.targets[target];
    if(typeof conf == 'undefined')
      throw new Error('No target '+target+'..');
    else {
      if(typeof conf.depends == 'undefined')
        return conf;
      else {
        var depConf = this.getTargetConf(conf.depends);
        for(var i in depConf) {
          if(typeof conf[i] == 'undefined')
            conf[i] = depConf[i];
          if( Array.isArray(conf[i]) && Array.isArray(depConf[i]))
            conf[i] = depConf[i].concat(conf[i]);
        }
        delete conf.depends;
        return conf;
      }
    }
  },

  resolvePath: function(path) {
    var extracted = /.*\[(.*)\](\S*)/g.exec(path);
    if(extracted) {
      var dir = this.buildConf.directories[extracted[1]];

      if(typeof dir == 'indefined')
        throw new Error(extracted[1]+' is not a defined directory');
      
      //remove the first '/' of the suffix
      var suffix = extracted[2].split('');
      if(suffix[0] == '/')
        suffix.shift();

      path = PATH.resolve(dir, suffix.join(''));
    }

    return PATH.resolve(this.buildConf.basedir, path);
  },

  matchPath: function(path, to_match) {
    path = this.resolvePath(path);
    to_match = this.resolvePath(to_match);
    return require('minimatch')(path, to_match);
  },

  mignify : function(code) {
    var ugly = require('uglify-js');

    var ast = ugly.parser.parse(code);
        ast = ugly.uglify.ast_mangle(ast);
        ast = ugly.uglify.ast_squeeze(ast);
        return ugly.uglify.gen_code(ast);
  },

  log: function(log, level) {
    if (LEVELS[level] >= this.loggerLevel) {
      log   = log.split('\n');
      level = level || 'verbose';
      for(var i = 0, l = log.length; i < l; i++) {
        console.log(this.getCicadaSlice().cicada + log[i][level]);
      }
    }
  },

  verbose: function(log) {
    this.log.call(this, log, 'verbose');
  },

  info: function(log) {
    this.log.call(this, log, 'info');
  },

  success: function(log) {
    this.log.call(this, log, 'success');
  },

  error: function(log) {
    this.log.call(this, log, 'error');
  },

  getCicadaSlice : function() {
    if (this.cicadaCount < this.asciiCicada.length) {
      return this.asciiCicada[this.cicadaCount++];
    } else {
      return this.asciiCicada[this.asciiCicada.length - 1];
    }
  },

  asciiCicada:
   ['    ,_  _  _,    ',
    '      \\o-o/      ',
    '     ,(.-.),     ',
    '   _/ |) (| \\_   ',
    '     /\\=-=/\\     ',
    '    ,| \\=/ |,    ',
    '  _/ \\  |  / \\_  ',
    '      \\_!_/      ',
    '                 ']
};

