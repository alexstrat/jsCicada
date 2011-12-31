### Disclaimer

A Node.js build tool to gather/order/filter/mignify all your JS files and their dependencies. Greatly inspired from Apache Ant.

We used this tool in [KadOH] :

- to _gather_ : [KadOH] is composed of many small JS files spread among different directories that should be gather in a single file.
- to _order_ : [KadOH] has a dependency tree : each file depends on other ones that should be included and placed before in the build, and so on.
- to _filter_ : we have different build dependending on the configuration (should run in Node.js or in browser, should use this transport type or an other..) : some files should be excluded from the build in some case.
- to _mignify_ : smaller is often better : [UglifyJS].

**Q :** In browser environement, this could be seen as an alternative to AMD loaders ? 

Yes and no, the 2 approachs could and should live together. AMD  is used to load modules and submodules that best fit the needs of the client browser avoiding the load of useless code. Nethertheless, some modules or submodules depends on other ones independently from the client browser configuration. If you have these useful dependencies gathered in one single file, you will probably spare multiple tiring asynchronous loads.

If you are asking this question, you should probably have a look to [ender].

### Installation

I'm on [npm] girls !

```bash
$ npm install jsCicada
```

### See it in action

You can find an example of use in the `[sandbox](https://github.com/alexstrat/jsCicada/tree/master/sandbox)` directory : execute the `tes-script.js`..

```bash
$ cd sandbox/
$ node test-script.js
```

..and see what happened according to the `build.json`. 

But you should also have a look at [KadOH].

### Use

#### Add `build.json`...

Include a valid `build.json` file in the root directory of your project to configure your builds.

Example :

```json
{ 
  "basedir"     : ".",            // base directory
  "directories" : {					 // directory name shortcuts
    "src"     : "src",
    "dist"    : "dist",
    "jquery"  : "src/ext/jquery"
  },

  "targets" : {						 // different build configurations are called "targets"
    "normal" : {						 // "normal" is the name of a target
      "entry"   : "[src]/node",	 // entry point of your build : where to start finding dependencies
      "build"   : "[dist]/project.js", //where you want to place the build file
      "exclude" : [
      "[src]/notThat" 					//simply exclude it from the build
      ]
    },
    "normal-mini" : {
      "depends" : "normal",				//that means the build "normal-mini" have the same configuration as "normal" plus the ones that you specify/override
      "mignify" : true,					//do you want me to mignify your build ?
      "build"   : "[dist]/project.min.js"
    },
    "no-jquery" : {
      "depends" : "normal",			
      "exclude" : [
        "[jquery]/*"						//you don't want all the jquery stuff..
      ],
      "build"   : "[dist]/project-nojquery.js"
    }
  }
}
```
#### ... add dependencies...

In any of your JS file indicate in the header (or anywhere else) to _jsCicada_ which files you want to see included before this one in the build :

Example :

```js
/* 
 * Dep : [src]/other/usefull.js
 * Dep : [jquery]/jquery.js
 */

// your awsome code goes here :
var big = "bang";
```

**Note :** you can ommit the extension (`.js`) that will be added afterwards.

**2nd note:** is it usefull to specify that when you add the same file as dependency several times (in different files), it will be included only once and at the right position ?

#### ...and build !

```js
builder = require('jsCicada').builder;

var b = new builder(); //look for build.json in the working directory
//or
var b = new builder('path/to/build.json');
//or
var b = new builder({my_build_configuration : 'goes here'});

b.buildAll();
//or
b.build('target_name');
//or
b.build(['target_name', 'target_bis_name']);
```

That's it.

### Credits

Authors : 

- Alexandre Lachèze ([alexstrat])
- Pierre Guilleminot ([jinroh])

Dependencies :

- [UglifyJS] : used to mignify.
- [minimatch] : used simply to test the filenames match.

### Future

- documentation
- build configuration : keywords based conditions for inclusion/exculsion of files
- avoid useless mignify : try to find '.min.js' before.
- add a binary

[KadOH]:https://github.com/jinroh/kadoh
[jinroh]:https//github.com/jinroh
[alexstrat]:https://github.com/alexstrat
[UglifyJS]:https://github.com/mishoo/UglifyJS
[minimatch]:http://github.com/isaacs/minimatch
[npm]:http://npmjs.org
[ender]:http://ender.no.de/