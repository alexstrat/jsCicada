PATH         = require('path');
FS           = require('fs');
Dependencies = require('./dependencies.js').Dependencies;

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

  this.buildConf = buildConf;

  this.cicadaCount = 0;
};

exports.builder.prototype = {

  log: function(log) {
    log = log.split('\n');
    for(var i in log) {
      console.log(this.getCicadaSlice()+log[i]);
    }
  },

  build: function(targets) {
    this.log('jsCicada builds..');
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

      this.log('## Target : '+target);
      var files = (new Dependencies(this, entry, exclude)).build();

      this.log('Files in order : '+files.map(function(dep){return PATH.basename(dep);}).join(', ')+'.');

      var code = [];
      for(var i in files) {
        var path = (PATH.extname(files[i]) === "") ? files[i] + ".js" : files[i];
        var content = FS.readFileSync(path, 'utf-8');
        code.push((mini) ? this.mignify(content) : content);
      }

      this.log('Writing in '+ PATH.basename(build));
      FS.writeFileSync(build, code.join('\n'));
    } catch(e) {
      this.log('Something wrong :'+e);
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

  getCicadaSlice : function() {
    var slice = (this.cicadaCount < this.asciiCicada.length) ? this.asciiCicada[this.cicadaCount] : "";
    this.cicadaCount ++;
    return slice;
  },

  asciiCicada:
   ['  ,_  _  _,  ',
    '    \\o-o/    ',
    '   ,(.-.),   ',
    ' _/ |) (| \\_ ',
    '   /\\=-=/\\   ',
    '  ,| \\=/ |,  ',
    '_/ \\  |  / \\_',
    '    \\_!_/    ' ]
};

