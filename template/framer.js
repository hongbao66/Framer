// Framer 0.5.0-62-g2aaea25 (c) 2013 Koen Bok

window.FramerVersion = "0.5.0-62-g2aaea25";


(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return window.setImmediate;
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/src/css.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {

  exports.addStyle = function(css) {
    var styleSheet;
    styleSheet = document.createElement("style");
    styleSheet.innerHTML = css;
    return document.head.appendChild(styleSheet);
  };

  exports.addStyle(".uilayer {	display: block;	visibility: visible;	position: absolute;	top:auto; right:auto; bottom:auto; left:auto;	width:auto; height:auto;	overflow: visible;	z-index:0;	opacity:1;	box-sizing: border-box;	-webkit-box-sizing: border-box;}.uilayer.textureBacked {	-webkit-transform: matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);	-webkit-transform-origin: 50% 50% 0%;	-webkit-backface-visibility: hidden;	-webkit-transform-style: flat;}.uilayer.animated {	-webkit-transition-duration: 500ms;	-webkit-transition-timing-function: linear;	-webkit-transition-delay: 0;	-webkit-transition-property: none;}");

}).call(this);

});

require.define("/src/utils.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var _,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  _ = require("underscore");

  Function.prototype.define = function(prop, desc) {
    Object.defineProperty(this.prototype, prop, desc);
    return Object.__;
  };

  exports.keys = function(a) {
    var key, _results;
    _results = [];
    for (key in a) {
      _results.push(key);
    }
    return _results;
  };

  exports.extend = function() {
    var a, args, key, obj, value, _i, _len, _ref;
    args = Array.prototype.slice.call(arguments);
    a = args[0];
    _ref = args.slice(1);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      obj = _ref[_i];
      for (key in obj) {
        value = obj[key];
        a[key] = value;
      }
    }
    return a;
  };

  exports.update = function(target, source) {
    var keys;
    keys = exports.keys(target);
    exports.extend(target, exports.filter(source, function(k) {
      return __indexOf.call(keys, k) >= 0;
    }));
    return a;
  };

  exports.copy = function(source) {
    return exports.extend({}, source);
  };

  exports.filter = function(source, iterator) {
    var b, key, value;
    b = {};
    for (key in source) {
      value = source[key];
      if (iterator(key, value)) {
        b[key] = value;
      }
    }
    return b;
  };

  exports.union = function() {
    return Array.prototype.concat.apply(Array.prototype, arguments);
  };

  exports.remove = function(a, e) {
    var t;
    if ((t = a.indexOf(e)) > -1) {
      a.splice(t, 1)[0];
    }
    return a;
  };

  exports.toggle = function() {
    var args, curr;
    if (_.isArray(arguments[0])) {
      args = arguments[0];
    } else {
      args = Array.prototype.slice.call(arguments);
    }
    curr = -1;
    return function() {
      curr++;
      if (curr >= args.length) {
        curr = 0;
      }
      return args[curr];
    };
  };

  exports.randomColor = function(alpha) {
    var c;
    if (alpha == null) {
      alpha = 1.0;
    }
    c = function() {
      return parseInt(Math.random() * 255);
    };
    return "rgba(" + (c()) + ", " + (c()) + ", " + (c()) + ", " + alpha + ")";
  };

  exports.delay = function(time, f) {
    var timer;
    timer = setTimeout(f, time);
    return timer;
  };

  exports.interval = function(time, f) {
    var timer, _ref;
    timer = setInterval(f, time);
    if ((_ref = window._delayIntervals) == null) {
      window._delayIntervals = [];
    }
    window._delayIntervals.push(timer);
    return timer;
  };

  exports.debounce = function(fn, threshold, immediate) {
    var timeout;
    timeout = null;
    return function() {
      var args, delayed, obj;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      obj = this;
      delayed = function() {
        if (!immediate) {
          fn.apply(obj, args);
        }
        return timeout = null;
      };
      if (timeout) {
        clearTimeout(timeout);
      } else if (immediate) {
        fn.apply(obj, args);
      }
      return timeout = setTimeout(delayed, threshold || 100);
    };
  };

  exports.throttle = function(fn, delay) {
    var timer;
    if (delay === 0) {
      return fn;
    }
    timer = false;
    return function() {
      if (timer) {
        return;
      }
      timer = true;
      if (delay !== -1) {
        setTimeout((function() {
          return timer = false;
        }), delay);
      }
      return fn.apply(null, arguments);
    };
  };

  exports.convertPoint = function(point, view1, view2) {
    var superViews1, superViews2, traverse, view, _i, _j, _len, _len1;
    point = exports.extend({}, point);
    traverse = function(view) {
      var currentView, superViews;
      currentView = view;
      superViews = [];
      while (currentView && currentView.superView) {
        superViews.push(currentView.superView);
        currentView = currentView.superView;
      }
      return superViews;
    };
    superViews1 = traverse(view1);
    superViews2 = traverse(view2);
    if (view2) {
      superViews2.push(view2);
    }
    for (_i = 0, _len = superViews1.length; _i < _len; _i++) {
      view = superViews1[_i];
      point.x += view.x;
      point.y += view.y;
      if (view.scrollFrame) {
        point.x -= view.scrollFrame.x;
        point.y -= view.scrollFrame.y;
      }
    }
    for (_j = 0, _len1 = superViews2.length; _j < _len1; _j++) {
      view = superViews2[_j];
      point.x -= view.x;
      point.y -= view.y;
      if (view.scrollFrame) {
        point.x += view.scrollFrame.x;
        point.y += view.scrollFrame.y;
      }
    }
    return point;
  };

  exports.max = function(obj) {
    var max, n, _i, _len;
    for (_i = 0, _len = obj.length; _i < _len; _i++) {
      n = obj[_i];
      if (!max || n > max) {
        max = n;
      }
    }
    return max;
  };

  exports.min = function(obj) {
    var min, n, _i, _len;
    for (_i = 0, _len = obj.length; _i < _len; _i++) {
      n = obj[_i];
      if (!min || n < min) {
        min = n;
      }
    }
    return min;
  };

  exports.sum = function(a) {
    if (a.length > 0) {
      return a.reduce(function(x, y) {
        return x + y;
      });
    } else {
      return 0;
    }
  };

  exports.pointInRect = function(point, rect) {
    return alert("Not implemented, you lazy man");
  };

  exports.uuid = function() {
    var chars, digit, output, r, random, _i;
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    output = new Array(36);
    random = 0;
    for (digit = _i = 1; _i <= 32; digit = ++_i) {
      if (random <= 0x02) {
        random = 0x2000000 + (Math.random() * 0x1000000) | 0;
      }
      r = random & 0xf;
      random = random >> 4;
      output[digit] = chars[digit === 19 ? (r & 0x3) | 0x8 : r];
    }
    return output.join('');
  };

  exports.isWebKit = function() {
    return window.WebKitCSSMatrix !== null;
  };

  exports.isTouch = function() {
    return window.ontouchstart === null;
  };

  exports.isMobile = function() {
    return /iphone|ipod|android|ie|blackberry|fennec/.test(navigator.userAgent.toLowerCase());
  };

}).call(this);

});

require.define("/node_modules/underscore/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"underscore.js"}
});

require.define("/node_modules/underscore/underscore.js",function(require,module,exports,__dirname,__filename,process,global){//     Underscore.js 1.4.2
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.4.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return arguments.length > 2 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // with specific `key:value` pairs.
  _.where = function(obj, attrs) {
    if (_.isEmpty(attrs)) return [];
    return _.filter(obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (obj.length === +obj.length) return slice.call(obj);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) {
          result = func.apply(context, args);
        }
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        throttling = true;
        result = func.apply(context, args);
      }
      whenDone();
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + (0 | Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });
      source +=
        escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
        interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
        evaluate ? "';\n" + evaluate + "\n__p+='" : '';
      index = offset + match.length;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

});

require.define("/src/debug.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var utils;

  utils = require("./utils");

  exports.debug = function() {
    console.log("Framer.debug");
    if (window._togglingDebug === true) {
      return;
    }
    window._togglingDebug = true;
    View.Views.map(function(view, i) {
      var color, node;
      if (view._debug) {
        view._element.removeChild(view._debug.node);
        view.style = view._debug.style;
        return delete view._debug;
      } else {
        color = "rgba(50,150,200,.35)";
        node = document.createElement("div");
        node.innerHTML = "" + (view.name || view.id);
        if (view.superView) {
          node.innerHTML += " <span style='opacity:.5'>					in " + (view.superView.name || view.superView.id) + "				</span>";
        }
        node.style.position = "absolute";
        node.style.padding = "3px";
        view._debug = {
          style: utils.extend({}, view.style),
          node: node
        };
        view._element.appendChild(node);
        return view.style = {
          color: "white",
          margin: "-1px",
          font: "10px/1em Monaco",
          backgroundColor: "" + color,
          border: "1px solid " + color,
          backgroundImage: null
        };
      }
    });
    return window._togglingDebug = false;
  };

  window.document.onkeydown = function(event) {
    if (event.keyCode === 27) {
      return exports.debug();
    }
  };

}).call(this);

});

require.define("/src/tools/init.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {

  exports.tools = {};

  exports.tools.facebook = (require("./facebook")).facebook;

}).call(this);

});

require.define("/src/tools/facebook.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var FacebookAccessTokenKey, FacebookBaseURL, facebook;

  facebook = {};

  FacebookAccessTokenKey = "token";

  FacebookBaseURL = "https://graph.facebook.com/me";

  facebook.query = function(query, callback) {
    var _ref;
    facebook._token = localStorage.getItem(FacebookAccessTokenKey);
    if ((_ref = facebook._token) === (void 0) || _ref === "") {
      facebook._tokenDialog();
      return;
    }
    return facebook._loadJQuery(function() {
      var data;
      data = {
        fields: query,
        method: "GET",
        format: "json",
        access_token: facebook._token
      };
      return $.ajax({
        url: FacebookBaseURL,
        data: data,
        dataType: "json",
        success: callback,
        error: function(error) {
          var _ref1;
          console.log("error", error);
          if ((_ref1 = error.status) === 0 || _ref1 === 400) {
            return facebook._tokenDialog();
          }
        }
      });
    });
  };

  facebook.logout = function() {
    localStorage.setItem(FacebookAccessTokenKey, "");
    return document.location.reload();
  };

  facebook._loadJQuery = function(callback) {
    var script;
    if (typeof $ === "undefined") {
      script = document.createElement("script");
      script.src = "http://cdnjs.cloudflare.com/ajax/libs/zepto/1.0/zepto.min.js";
      script.type = "text/javascript";
      document.getElementsByTagName("head")[0].appendChild(script);
      return script.onload = callback;
    } else {
      return callback();
    }
  };

  facebook._tokenDialog = function() {
    var view;
    view = new View({
      width: 500,
      height: 120,
      midX: window.innerWidth / 2,
      midY: window.innerHeight / 2
    });
    view.style = {
      padding: "20px",
      backgroundColor: "#e5e5e5",
      webkitBoxShadow: "0px 2px 10px 0px rgba(0,0,0,.2)",
      border: "1px solid rgba(0,0,0,.1)",
      borderRadius: "4px"
    };
    view.html = "		<input type='text' id='tokenDialog'			placeholder='Paste Facebook Access Token' 			style='font:16px/1em Menlo;width:440px;padding:10px 10px 5px 5px' 			onpaste='tools.facebook._tokenDialogUpdate(this)'			onkeyup='tools.facebook._tokenDialogUpdate(this)'		>		<div style='			text-align:center;			font-size:18px;			font-weight:			bold;			padding-top:20px		'>			<a href='https://developers.facebook.com/tools/explorer' target='new'>				Find access token here			</a>		</div	";
    return utils.delay(0, function() {
      var tokenInput;
      tokenInput = window.document.getElementById("tokenDialog");
      return tokenInput.focus();
    });
  };

  facebook._tokenDialogUpdate = function(event) {
    if (event.value.length > 50) {
      localStorage.setItem(FacebookAccessTokenKey, event.value);
      return document.location.reload();
    }
  };

  exports.facebook = facebook;

}).call(this);

});

require.define("/src/views/view.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Animation, EventClass, EventEmitter, EventTypes, Frame, Matrix, View, utils, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  utils = require("../utils");

  _ = require("underscore");

  Frame = require("../primitives/frame").Frame;

  Matrix = require("../primitives/matrix").Matrix;

  EventTypes = require("../primitives/events").EventTypes;

  EventClass = require("../primitives/events").EventClass;

  EventEmitter = require("../eventemitter").EventEmitter;

  Animation = require("../animation").Animation;

  exports.ViewList = [];

  View = (function(_super) {

    __extends(View, _super);

    function View(args) {
      this.__insertElement = __bind(this.__insertElement, this);

      this.animate = __bind(this.animate, this);
      if (args == null) {
        args = {};
      }
      View.Views.push(this);
      this.id = View.Views.length;
      this._element = document.createElement("div");
      this._element.id = this.id;
      this.addClass("uilayer");
      this.clip = args.clip || View.Properties.clip;
      this._subViews = [];
      this._currentAnimations = [];
      this.properties = args;
      if (!args.superView) {
        this._insertElement();
      }
      this._postCreate();
    }

    View.prototype._postCreate = function() {};

    View.define("name", {
      get: function() {
        return this._name || this.id;
      },
      set: function(value) {
        this._name = value;
        return this._element.setAttribute("name", this._name);
      }
    });

    View.define("properties", {
      get: function() {
        var key, p, value, _ref;
        p = {};
        _ref = View.Properties;
        for (key in _ref) {
          value = _ref[key];
          p[key] = this[key];
        }
        return p;
      },
      set: function(args) {
        var key, value, _ref, _ref1, _ref2, _ref3, _results;
        _ref = View.Properties;
        for (key in _ref) {
          value = _ref[key];
          if ((_ref1 = args[key]) !== null && _ref1 !== (void 0)) {
            this[key] = args[key];
          }
        }
        _ref2 = Frame.CalculatedProperties;
        _results = [];
        for (key in _ref2) {
          value = _ref2[key];
          if ((_ref3 = args[key]) !== null && _ref3 !== (void 0)) {
            _results.push(this[key] = args[key]);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    });

    View.define("frame", {
      get: function() {
        return new Frame({
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height
        });
      },
      set: function(value) {
        var p, _i, _len, _ref, _results;
        if (!value) {
          return;
        }
        _ref = ["x", "y", "width", "height"];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          p = _ref[_i];
          _results.push(this[p] = value[p]);
        }
        return _results;
      }
    });

    View.prototype.convertPoint = function(point) {
      return utils.convertPoint(point, null, this);
    };

    View.prototype.screenFrame = function() {
      return utils.convertPoint(this.frame, this, null);
    };

    View.prototype.contentFrame = function() {
      var frame;
      frame = {
        x: utils.min(_.pluck(this.subViews, "minX")),
        y: utils.min(_.pluck(this.subViews, "minY"))
      };
      frame.width = utils.max(_.pluck(this.subViews, "maxX")) - frame.x;
      frame.height = utils.max(_.pluck(this.subViews, "maxY")) - frame.y;
      return frame;
    };

    View.define("width", {
      get: function() {
        return parseFloat(this.style.width);
      },
      set: function(value) {
        this.animateStop();
        this.style.width = "" + value + "px";
        this.emit("change:width");
        return this.emit("change:frame");
      }
    });

    View.define("height", {
      get: function() {
        return parseFloat(this.style.height);
      },
      set: function(value) {
        this.animateStop();
        this.style.height = "" + value + "px";
        this.emit("change:height");
        return this.emit("change:frame");
      }
    });

    View.define("x", {
      get: function() {
        return this._matrix.x;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.x = value;
        this._matrix = this._matrix;
        this.emit("change:x");
        return this.emit("change:frame");
      }
    });

    View.define("y", {
      get: function() {
        return this._matrix.y;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.y = value;
        this._matrix = this._matrix;
        this.emit("change:y");
        return this.emit("change:frame");
      }
    });

    View.define("z", {
      get: function() {
        return this._matrix.z;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.z = value;
        this._matrix = this._matrix;
        this.emit("change:z");
        return this.emit("change:frame");
      }
    });

    View.define("scale", {
      get: function() {
        return this._matrix.scale;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.scale = value;
        this._matrix = this._matrix;
        return this.emit("change:scale");
      }
    });

    View.define("scaleX", {
      get: function() {
        return this._matrix.scaleX;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.scaleX = value;
        this._matrix = this._matrix;
        this.emit("change:scaleX");
        return this.emit("change:scale");
      }
    });

    View.define("scaleY", {
      get: function() {
        return this._matrix.scaleY;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.scaleY = value;
        this._matrix = this._matrix;
        this.emit("change:scaleY");
        return this.emit("change:scale");
      }
    });

    View.define("scaleZ", {
      get: function() {
        return this._matrix.scaleZ;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.scaleZ = value;
        this._matrix = this._matrix;
        this.emit("change:scaleZ");
        return this.emit("change:scale");
      }
    });

    View.define("rotate", {
      get: function() {
        return this._matrix.rotate;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.rotate = value;
        this._matrix = this._matrix;
        return this.emit("change:rotate");
      }
    });

    View.define("rotateX", {
      get: function() {
        return this._matrix.rotateX;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.rotateX = value;
        this._matrix = this._matrix;
        this.emit("change:rotateX");
        return this.emit("change:rotate");
      }
    });

    View.define("rotateY", {
      get: function() {
        return this._matrix.rotateY;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.rotateY = value;
        this._matrix = this._matrix;
        this.emit("change:rotateX");
        return this.emit("change:rotate");
      }
    });

    View.define("rotateZ", {
      get: function() {
        return this._matrix.rotateZ;
      },
      set: function(value) {
        this.animateStop();
        this._matrix.rotateZ = value;
        this._matrix = this._matrix;
        this.emit("change:rotateZ");
        return this.emit("change:rotate");
      }
    });

    View.define("_matrix", {
      get: function() {
        if (!this.__matrix) {
          this.__matrix = new Matrix(new WebKitCSSMatrix(this._element.style.webkitTransform));
        }
        return this.__matrix;
      },
      set: function(matrix) {
        if (!matrix) {
          this.__matrix = null;
          this.style.webkitTransform = null;
          return;
        }
        if (matrix instanceof WebKitCSSMatrix) {
          matrix = new Matrix(matrix);
        }
        if (!matrix instanceof Matrix) {
          throw Error("View._matrix.set should be Matrix not " + (typeof matrix));
        }
        this.__matrix = matrix;
        return this.style.webkitTransform = this.__matrix.matrix().cssValues();
      }
    });

    View.prototype._computedMatrix = function() {
      return new WebKitCSSMatrix(this.computedStyle.webkitTransform);
    };

    View.define("opacity", {
      get: function() {
        return parseFloat(this.style.opacity || 1);
      },
      set: function(value) {
        this.animateStop();
        this.style.opacity = value;
        return this.emit("change:opacity");
      }
    });

    View.define("clip", {
      get: function() {
        return this._clip;
      },
      set: function(value) {
        this._clip = value;
        if (value === true) {
          this.style.overflow = "hidden";
        }
        if (value === false) {
          this.style.overflow = "visible";
        }
        return this.emit("change:clip");
      }
    });

    View.define("visible", {
      get: function() {
        return this._visible || true;
      },
      set: function(value) {
        this._visible = value;
        if (value === true) {
          this.style.display = "block";
        }
        if (value === false) {
          this.style.display = "none";
        }
        return this.emit("change:visible");
      }
    });

    View.define("superView", {
      get: function() {
        return this._superView || null;
      },
      set: function(value) {
        if (value === this._superView) {
          return;
        }
        document.removeEventListener("DOMContentLoaded", this.__insertElement);
        if (this._superView) {
          this._superView._element.removeChild(this._element);
          this._superView._subViews = _.without(this._superView._subViews, this);
          this._superView.emit("change:subViews");
        }
        if (value) {
          value._element.appendChild(this._element);
          value._subViews.push(this);
          value.emit("change:subViews");
        } else {
          this.__insertElement();
        }
        this._superView = value;
        return this.emit("change:superView");
      }
    });

    View.define("subViews", {
      get: function() {
        return _.compact(this._subViews);
      }
    });

    View.prototype.addSubView = function(view) {
      return view.superView = this;
    };

    View.prototype.removeSubView = function(view) {
      if (__indexOf.call(this.subViews, view) < 0) {
        return;
      }
      return view.superView = null;
    };

    View.define("index", {
      get: function() {
        return this.style['z-index'] || 0;
      },
      set: function(value) {
        this.style['z-index'] = value;
        return this.emit("change:index");
      }
    });

    View.prototype.placeBefore = function(view) {
      return this.index = view.index + 1;
    };

    View.prototype.placeBehind = function(view) {
      return this.index = view.index - 1;
    };

    View.prototype.switchPlaces = function(view) {
      var indexA, indexB;
      indexA = this.index;
      indexB = view.index;
      view.index = indexA;
      return this.index = indexB;
    };

    View.prototype.animate = function(args, callback) {
      var animation;
      args.view = this;
      animation = new Animation(args);
      animation.start(callback);
      return animation;
    };

    View.prototype.animateStop = function() {
      return this._currentAnimations.map(function(animation) {
        return animation.stop();
      });
    };

    View.define("html", {
      get: function() {
        return this._element.innerHTML;
      },
      set: function(value) {
        this._element.innerHTML = value;
        return this.emit("change:html");
      }
    });

    View.define("style", {
      get: function() {
        return this._element.style;
      },
      set: function(value) {
        utils.extend(this._element.style, value);
        return this.emit("change:style");
      }
    });

    View.define("computedStyle", {
      get: function() {
        return document.defaultView.getComputedStyle(this._element);
      },
      set: function(value) {
        throw Error("computedStyle is readonly");
      }
    });

    View.define("class", {
      get: function() {
        return this._element.className;
      },
      set: function(value) {
        this._element.className = value;
        return this.emit("change:class");
      }
    });

    View.define("classes", {
      get: function() {
        var classes;
        classes = this["class"].split(" ");
        classes = _(classes).filter(function(item) {
          return item !== "" && item !== null;
        });
        classes = _(classes).unique();
        return classes;
      },
      set: function(value) {
        return this["class"] = value.join(" ");
      }
    });

    View.prototype.addClass = function(className) {
      var classes;
      classes = this.classes;
      classes.push(className);
      return this.classes = classes;
    };

    View.prototype.removeClass = function(className) {
      return this.classes = _.filter(this.classes, function(item) {
        return item !== className;
      });
    };

    View.prototype._insertElement = function() {
      if (document.readyState === "complete" || document.readySate === "loaded") {
        return this.__insertElement();
      } else {
        return document.addEventListener("DOMContentLoaded", this.__insertElement);
      }
    };

    View.prototype.__insertElement = function() {
      return document.body.appendChild(this._element);
    };

    View.prototype.addListener = function(event, listener) {
      View.__super__.addListener.apply(this, arguments);
      return this._element.addEventListener(event, listener);
    };

    View.prototype.removeListener = function(event, listener) {
      View.__super__.removeListener.apply(this, arguments);
      return this._element.removeEventListener(event, listener);
    };

    View.prototype.on = View.prototype.addListener;

    View.prototype.off = View.prototype.removeListener;

    return View;

  })(Frame);

  View.Properties = utils.extend(Frame.Properties, {
    frame: null,
    clip: true,
    opacity: 1.0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    rotate: 0,
    scale: 1.0,
    scaleX: 1.0,
    scaleY: 1.0,
    scaleZ: 1.0,
    style: null,
    html: null,
    "class": "",
    superView: null,
    visible: true,
    index: 0
  });

  View.Views = [];

  exports.View = View;

}).call(this);

});

require.define("/src/primitives/frame.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var EventEmitter, Frame, utils,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require("../utils");

  EventEmitter = require("../eventemitter").EventEmitter;

  Frame = (function(_super) {

    __extends(Frame, _super);

    function Frame(args) {
      this.properties = args;
    }

    Frame.define("properties", {
      get: function() {
        var key, p, value, _ref;
        p = {};
        _ref = Frame.Properties;
        for (key in _ref) {
          value = _ref[key];
          p[key] = this[key] || Frame.Properties[key];
        }
        return p;
      },
      set: function(args) {
        var key, value, _ref, _ref1, _ref2, _ref3, _results;
        _ref = Frame.Properties;
        for (key in _ref) {
          value = _ref[key];
          if ((_ref1 = args[key]) !== null && _ref1 !== (void 0)) {
            this[key] = args[key];
          }
        }
        _ref2 = Frame.CalculatedProperties;
        _results = [];
        for (key in _ref2) {
          value = _ref2[key];
          if ((_ref3 = args[key]) !== null && _ref3 !== (void 0)) {
            _results.push(this[key] = args[key]);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    });

    Frame.define("minX", {
      get: function() {
        return this.x;
      },
      set: function(value) {
        return this.x = value;
      }
    });

    Frame.define("midX", {
      get: function() {
        return this.x + (this.width / 2.0);
      },
      set: function(value) {
        if (this.width === 0) {
          throw Error("Width is zero");
        }
        return this.x = value - (this.width / 2.0);
      }
    });

    Frame.define("maxX", {
      get: function() {
        return this.x + this.width;
      },
      set: function(value) {
        if (this.width === 0) {
          throw Error("Width is zero");
        }
        return this.x = value - this.width;
      }
    });

    Frame.define("minY", {
      get: function() {
        return this.y;
      },
      set: function(value) {
        return this.y = value;
      }
    });

    Frame.define("midY", {
      get: function() {
        return this.y + (this.height / 2.0);
      },
      set: function(value) {
        if (this.height === 0) {
          throw Error("Width is zero");
        }
        return this.y = value - (this.height / 2.0);
      }
    });

    Frame.define("maxY", {
      get: function() {
        return this.y + this.height;
      },
      set: function(value) {
        if (this.height === 0) {
          throw Error("Width is zero");
        }
        return this.y = value - this.height;
      }
    });

    Frame.prototype.merge = function(r2) {
      var frame, r1;
      r1 = this;
      frame = {
        x: Math.min(r1.x, r2.x),
        y: Math.min(r1.y, r2.y),
        width: Math.max(r1.width, r2.width),
        height: Math.max(r1.height, r2.height)
      };
      return new Frame(frame);
    };

    return Frame;

  })(EventEmitter);

  Frame.Properties = {
    x: 0,
    y: 0,
    z: 0,
    width: 0,
    height: 0
  };

  Frame.CalculatedProperties = {
    minX: null,
    midX: null,
    maxX: null,
    minY: null,
    midY: null,
    maxY: null
  };

  exports.Frame = Frame;

}).call(this);

});

require.define("/src/eventemitter.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var __slice = [].slice;

  exports.EventEmitter = (function() {

    function EventEmitter() {
      this.events = {};
    }

    EventEmitter.prototype.emit = function() {
      var args, event, listener, _i, _len, _ref, _ref1, _results;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!((_ref = this.events) != null ? _ref[event] : void 0)) {
        return;
      }
      _ref1 = this.events[event];
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        listener = _ref1[_i];
        _results.push(listener.apply(null, args));
      }
      return _results;
    };

    EventEmitter.prototype.addListener = function(event, listener) {
      var _base, _ref, _ref1;
      if ((_ref = this.events) == null) {
        this.events = {};
      }
      if ((_ref1 = (_base = this.events)[event]) == null) {
        _base[event] = [];
      }
      return this.events[event].push(listener);
    };

    EventEmitter.prototype.removeListener = function(event, listener) {
      var l;
      if (!this.events) {
        return;
      }
      if (!this.events[event]) {
        return;
      }
      return this.events[event] = (function() {
        var _i, _len, _ref, _results;
        _ref = this.events[event];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          l = _ref[_i];
          if (l !== listener) {
            _results.push(l);
          }
        }
        return _results;
      }).call(this);
    };

    EventEmitter.prototype.once = function(event, listener) {
      var fn,
        _this = this;
      fn = function() {
        _this.removeListener(event, fn);
        return listener.apply(null, arguments);
      };
      return this.on(event, fn);
    };

    EventEmitter.prototype.removeAllListeners = function(event) {
      var listener, _i, _len, _ref, _results;
      if (!this.events) {
        return;
      }
      if (!this.events[event]) {
        return;
      }
      _ref = this.events[event];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        listener = _ref[_i];
        _results.push(this.removeListener(event, listener));
      }
      return _results;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

    return EventEmitter;

  })();

}).call(this);

});

require.define("/src/primitives/matrix.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Matrix, RoundValue, _;

  _ = require("underscore");

  RoundValue = 1000;

  WebKitCSSMatrix.prototype.cssValues = function() {
    var r, values;
    r = function(v) {
      return Math.round(v * RoundValue) / RoundValue;
    };
    return values = "matrix3d(" + (r(this.m11)) + ", " + (r(this.m12)) + ", " + (r(this.m13)) + ", " + (r(this.m14)) + "," + (r(this.m21)) + ", " + (r(this.m22)) + ", " + (r(this.m23)) + ", " + (r(this.m24)) + "," + (r(this.m31)) + ", " + (r(this.m32)) + ", " + (r(this.m33)) + ", " + (r(this.m34)) + "," + (r(this.m41)) + ", " + (r(this.m42)) + ", " + (r(this.m43)) + ", " + (r(this.m44)) + ")";
  };

  Matrix = (function() {

    function Matrix(matrix) {
      if (matrix instanceof WebKitCSSMatrix) {
        this.from(matrix);
      }
    }

    Matrix.define("x", {
      get: function() {
        return this._x || 0;
      },
      set: function(value) {
        return this._x = value;
      }
    });

    Matrix.define("y", {
      get: function() {
        return this._y || 0;
      },
      set: function(value) {
        return this._y = value;
      }
    });

    Matrix.define("z", {
      get: function() {
        return this._z || 0;
      },
      set: function(value) {
        return this._z = value;
      }
    });

    Matrix.define("scaleX", {
      get: function() {
        return this._scaleX || 1;
      },
      set: function(value) {
        return this._scaleX = value;
      }
    });

    Matrix.define("scaleY", {
      get: function() {
        return this._scaleY || 1;
      },
      set: function(value) {
        return this._scaleY = value;
      }
    });

    Matrix.define("scaleZ", {
      get: function() {
        return this._scaleZ || 1;
      },
      set: function(value) {
        return this._scaleZ = value;
      }
    });

    Matrix.define("scale", {
      get: function() {
        return (this._scaleX + this._scaleY) / 2.0;
      },
      set: function(value) {
        return this._scaleX = this._scaleY = value;
      }
    });

    Matrix.define("rotateX", {
      get: function() {
        return this._rotateX || 0;
      },
      set: function(value) {
        return this._rotateX = value;
      }
    });

    Matrix.define("rotateY", {
      get: function() {
        return this._rotateY || 0;
      },
      set: function(value) {
        return this._rotateY = value;
      }
    });

    Matrix.define("rotateZ", {
      get: function() {
        return this._rotateZ || 0;
      },
      set: function(value) {
        return this._rotateZ = value;
      }
    });

    Matrix.define("rotate", {
      get: function() {
        return this.rotateZ;
      },
      set: function(value) {
        return this.rotateZ = value;
      }
    });

    Matrix.prototype.decompose = function(m) {
      var result;
      result = {};
      result.translation = {
        x: m.m41,
        y: m.m42,
        z: m.m43
      };
      result.scale = {
        x: Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12 + m.m13 * m.m13),
        y: Math.sqrt(m.m21 * m.m21 + m.m22 * m.m22 + m.m23 * m.m23),
        z: Math.sqrt(m.m31 * m.m31 + m.m32 * m.m32 + m.m33 * m.m33)
      };
      result.rotation = {
        x: -Math.atan2(m.m32 / result.scale.z, m.m33 / result.scale.z),
        y: Math.asin(m.m31 / result.scale.z),
        z: -Math.atan2(m.m21 / result.scale.y, m.m11 / result.scale.x)
      };
      return result;
    };

    Matrix.prototype.from = function(matrix) {
      var v;
      v = this.decompose(matrix);
      this.x = v.translation.x;
      this.y = v.translation.y;
      this.scaleX = v.scale.x;
      this.scaleY = v.scale.y;
      this.scaleZ = v.scale.z;
      this.rotateX = v.rotation.x / Math.PI * 180;
      this.rotateY = v.rotation.y / Math.PI * 180;
      return this.rotateZ = v.rotation.z / Math.PI * 180;
    };

    Matrix.prototype.matrix = function() {
      var m;
      m = new WebKitCSSMatrix();
      m = m.translate(this._x, this._y, this._z);
      m = m.rotate(this._rotateX, 0, 0);
      m = m.rotate(0, this._rotateY, 0);
      m = m.rotate(0, 0, this._rotateZ);
      m = m.scale(this.scaleX, this.scaleY, this.scaleZ);
      return m;
    };

    Matrix.prototype.set = function(view) {
      return view._matrix = this;
    };

    return Matrix;

  })();

  exports.Matrix = Matrix;

}).call(this);

});

require.define("/src/primitives/events.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Class, Types;

  Class = {
    UIEvent: "UIEvent",
    FocusEvent: "FocusEvent",
    MouseEvent: "MouseEvent",
    TouchEvent: "TouchEvent",
    WheelEvent: "WheelEvent",
    TextEvent: "TextEvent",
    KeyboardEvent: "KeyboardEvent",
    CompositionEvent: "CompositionEvent",
    MutationEvent: "MutationEvent",
    MutationNameEvent: "MutationNameEvent",
    CustomEvent: "CustomEvent",
    TransitionEvent: "TransitionEvent"
  };

  Types = {
    DOMActivate: Class.UIEvent,
    load: Class.UIEvent,
    unload: Class.UIEvent,
    abort: Class.UIEvent,
    error: Class.UIEvent,
    select: Class.UIEvent,
    resize: Class.UIEvent,
    scroll: Class.UIEvent,
    blur: Class.FocusEvent,
    DOMFocusIn: Class.FocusEvent,
    DOMFocusOut: Class.FocusEvent,
    focus: Class.FocusEvent,
    focusin: Class.FocusEvent,
    focusout: Class.FocusEvent,
    click: Class.MouseEvent,
    dblclick: Class.MouseEvent,
    mousedown: Class.MouseEvent,
    mouseenter: Class.MouseEvent,
    mouseleave: Class.MouseEvent,
    mousemove: Class.MouseEvent,
    mouseover: Class.MouseEvent,
    mouseout: Class.MouseEvent,
    mouseup: Class.MouseEvent,
    touchstart: Class.TouchEvent,
    touchmove: Class.TouchEvent,
    touchend: Class.TouchEvent,
    touchcancel: Class.TouchEvent,
    wheel: Class.WheelEvent,
    textinput: Class.TextEvent,
    keydown: Class.KeyboardEvent,
    keypress: Class.KeyboardEvent,
    keyup: Class.KeyboardEvent,
    compositionstart: Class.CompositionEvent,
    compositionupdate: Class.CompositionEvent,
    compositionend: Class.CompositionEvent,
    DOMAttrModified: Class.MutationEvent,
    DOMCharacterDataModified: Class.MutationEvent,
    DOMNodeInserted: Class.MutationEvent,
    DOMNodeInsertedIntoDocument: Class.MutationEvent,
    DOMNodeRemoved: Class.MutationEvent,
    DOMNodeRemovedFromDocument: Class.MutationEvent,
    DOMSubtreeModified: Class.MutationEvent,
    DOMAttributeNameChanged: Class.MutationNameEvent,
    DOMElementNameChanged: Class.MutationNameEvent,
    transitionend: Class.TransitionEvent
  };

  exports.EventClass = Class;

  exports.EventTypes = Types;

}).call(this);

});

require.define("/src/animation.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Animation, AnimationCounter, AnimationList, EventEmitter, Matrix, bezier, css, parseCurve, spring, utils, _,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require("underscore");

  utils = require("./utils");

  css = require("./css");

  EventEmitter = require("./eventemitter").EventEmitter;

  Matrix = require("./primitives/matrix").Matrix;

  spring = require("./curves/spring");

  bezier = require("./curves/bezier");

  AnimationCounter = 0;

  AnimationList = [];

  parseCurve = function(a, prefix) {
    a = a.replace(prefix, "");
    a = a.replace(/\s+/g, "");
    a = a.replace("(", "");
    a = a.replace(")", "");
    a = a.split(",");
    return a.map(function(i) {
      return parseFloat(i);
    });
  };

  Animation = (function(_super) {

    __extends(Animation, _super);

    Animation.prototype.AnimationProperties = ["view", "properties", "curve", "time", "origin", "tolerance", "precision", "modifiers", "debug", "profile"];

    Animation.prototype.AnimatableCSSProperties = {
      opacity: "",
      width: "px",
      height: "px"
    };

    Animation.prototype.AnimatableMatrixProperties = ["x", "y", "z", "scaleX", "scaleY", "scaleZ", "rotateX", "rotateY", "rotateZ"];

    function Animation(args) {
      this._cleanup = __bind(this._cleanup, this);

      this._finalize = __bind(this._finalize, this);

      this.stop = __bind(this.stop, this);

      this.reverse = __bind(this.reverse, this);

      this.start = __bind(this.start, this);

      var p, _i, _len, _ref, _ref1, _ref2, _ref3;
      _ref = this.AnimationProperties;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        this[p] = args[p];
      }
      if ((_ref1 = this.time) == null) {
        this.time = 1000;
      }
      if ((_ref2 = this.curve) == null) {
        this.curve = "linear";
      }
      if ((_ref3 = this.precision) == null) {
        this.precision = 30;
      }
      this.count = 0;
      AnimationCounter += 1;
      this.animationId = AnimationCounter;
    }

    Animation.prototype.start = function(callback) {
      var endTime, k, propertiesA, propertiesB, startTime, v, _i, _len, _ref, _ref1;
      AnimationList.push(this);
      startTime = new Date().getTime();
      this.count++;
      this.animationName = "framer-animation-" + this.animationId + "-" + this.count;
      if (this.debug) {
        console.log("Animation.start " + this.animationName);
      }
      if (this.profile) {
        console.profile(this.animationName);
      }
      this.view.animateStop();
      this.view._currentAnimations.push(this);
      this.curveValues = this._parseCurve(this.curve);
      this.totalTime = this.curveValues.length / this.precision;
      propertiesA = this.view.properties;
      propertiesB = this.properties;
      if (propertiesB.scale) {
        propertiesB.scaleX = propertiesB.scale;
        propertiesB.scaleY = propertiesB.scale;
      }
      if (propertiesB.rotate) {
        propertiesB.rotateZ = propertiesB.rotate;
      }
      this.propertiesA = {};
      this.propertiesB = {};
      _ref = this.AnimatableMatrixProperties;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        this.propertiesA[k] = propertiesA[k];
        if (propertiesB.hasOwnProperty(k)) {
          this.propertiesB[k] = propertiesB[k];
        } else {
          this.propertiesB[k] = propertiesA[k];
        }
      }
      _ref1 = this.AnimatableCSSProperties;
      for (k in _ref1) {
        v = _ref1[k];
        if (propertiesB.hasOwnProperty(k)) {
          this.propertiesA[k] = propertiesA[k];
          this.propertiesB[k] = propertiesB[k];
        }
      }
      if (this.debug) {
        for (k in this.propertiesA) {
          if (this.propertiesA[k] !== this.propertiesB[k]) {
            console.log(" ." + k + " " + this.propertiesA[k] + " -> " + this.propertiesB[k]);
          }
        }
      }
      this.keyFrameAnimationCSS = this._css();
      this.view.once("webkitAnimationEnd", this._finalize);
      css.addStyle("			" + this.keyFrameAnimationCSS + "					." + this.animationName + " {				-webkit-animation-duration: " + this.totalTime + "s;				-webkit-animation-name: " + this.animationName + ";				-webkit-animation-timing-function: linear;				-webkit-animation-fill-mode: both;			}");
      this.view.addClass(this.animationName);
      if (this.debug) {
        endTime = new Date().getTime() - startTime;
        console.log("Animation.setupTime = " + endTime + "ms");
      }
      if (this.profile) {
        return console.profileEnd(this.animationName);
      }
    };

    Animation.prototype.reverse = function() {
      var k, options, p, v, _i, _len, _ref, _ref1;
      options = {};
      _ref = this.AnimationProperties;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        options[p] = this[p];
      }
      options.properties = {};
      _ref1 = this.properties;
      for (k in _ref1) {
        v = _ref1[k];
        options.properties[k] = this.view[k];
      }
      return new Animation(options);
    };

    Animation.prototype.stop = function() {
      if (this.debug) {
        console.log("Animation.stop " + this.animationName);
      }
      this._canceled = true;
      return this._cleanup(false);
    };

    Animation.prototype._finalize = function() {
      if (this._canceled === true) {
        return;
      }
      if (this.debug) {
        console.log("Animation.end " + this.animationName);
      }
      this._cleanup(true);
      return typeof callback === "function" ? callback() : void 0;
    };

    Animation.prototype._cleanup = function(completed) {
      var computedStyles, endMatrix, endStyles, k, v, _ref, _ref1;
      this.view._currentAnimations = _.without(this.view._currentAnimations, this);
      if (completed) {
        endMatrix = utils.extend(new Matrix(), this.propertiesB);
        endStyles = {};
        _ref = this.AnimatableCSSProperties;
        for (k in _ref) {
          v = _ref[k];
          endStyles[k] = this.propertiesB[k] + v;
        }
      } else {
        endMatrix = new Matrix(this.view._computedMatrix());
        endStyles = {};
        computedStyles = this.view.computedStyle;
        _ref1 = this.AnimatableCSSProperties;
        for (k in _ref1) {
          v = _ref1[k];
          endStyles[k] = computedStyles[k];
        }
      }
      this.view.removeClass(this.animationName);
      this.view._matrix = endMatrix;
      this.view.style = endStyles;
      return this.emit("end");
    };

    Animation.prototype._css = function() {
      var cssString, deltas, m, position, propertyName, springValue, stepDelta, stepIncrement, unit, value, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
      stepIncrement = 0;
      stepDelta = 100 / (this.curveValues.length - 1);
      cssString = [];
      cssString.push("@-webkit-keyframes " + this.animationName + " {\n");
      deltas = this._deltas();
      m = new Matrix();
      _ref = this.curveValues;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        springValue = _ref[_i];
        position = stepIncrement * stepDelta;
        cssString.push("\t" + position + "%\t{ -webkit-transform: ");
        _ref1 = this.AnimatableMatrixProperties;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          propertyName = _ref1[_j];
          value = springValue * deltas[propertyName] + this.propertiesA[propertyName];
          if (((_ref2 = this.modifiers) != null ? _ref2[propertyName] : void 0) != null) {
            value = this.modifiers[propertyName](value);
          }
          m[propertyName] = value;
        }
        cssString.push(m.matrix().cssValues() + "; ");
        _ref3 = this.AnimatableCSSProperties;
        for (propertyName in _ref3) {
          unit = _ref3[propertyName];
          if (!this.propertiesA.hasOwnProperty(propertyName)) {
            continue;
          }
          value = springValue * deltas[propertyName] + this.propertiesA[propertyName];
          cssString.push("" + propertyName + ":" + value + unit + "; ");
        }
        cssString.push("}\n");
        stepIncrement++;
      }
      cssString.push("}\n");
      return cssString.join("");
    };

    Animation.prototype._deltas = function() {
      var deltas, k;
      deltas = {};
      for (k in this.propertiesA) {
        deltas[k] = (this.propertiesB[k] - this.propertiesA[k]) / 100.0;
      }
      return deltas;
    };

    Animation.prototype._parseCurve = function(curve) {
      var v;
      if (curve == null) {
        curve = "";
      }
      curve = curve.toLowerCase();
      if (curve === "linear") {
        return bezier.defaults.Linear(this.precision, this.time);
      } else if (curve === "ease") {
        return bezier.defaults.Ease(this.precision, this.time);
      } else if (curve === "ease-in") {
        return bezier.defaults.EaseIn(this.precision, this.time);
      } else if (curve === "ease-out") {
        return bezier.defaults.EaseOut(this.precision, this.time);
      } else if (curve === "ease-in-out") {
        return bezier.defaults.EaseInOut(this.precision, this.time);
      } else if (curve.slice(0, +("cubic-bezier".length - 1) + 1 || 9e9) === "cubic-bezier") {
        v = parseCurve(curve, "cubic-bezier");
        return bezier.BezierCurve(v[0], v[1], v[2], v[3], this.precision, this.time);
      } else if (curve.slice(0, +("spring".length - 1) + 1 || 9e9) === "spring") {
        v = parseCurve(curve, "spring");
        return spring.SpringCurve(v[0], v[1], v[2], this.precision);
      } else {
        console.log("Animation.parseCurve: could not parse curve '" + curve + "'");
        return bezier.defaults.Linear(this.precision, this.time);
      }
    };

    Animation.prototype.graphView = function(animation, x, y, h, time) {
      var background, color, dot, graph, i, player, value, values, width, _i, _len;
      color = "rgba(50,150,200,.35)";
      values = animation.curveValues;
      width = 300;
      graph = new View({
        y: y,
        x: x,
        width: 100,
        height: h
      });
      graph.clip = false;
      background = new View({
        y: 0 - h,
        height: h * 2 + 3,
        superView: graph
      });
      background.style.backgroundColor = "rgba(255,255,255,.85)";
      for (i = _i = 0, _len = values.length; _i < _len; i = ++_i) {
        value = values[i];
        dot = new View({
          width: 3,
          height: 3,
          x: i * widthFactor,
          y: (100 - value) * (h / 100),
          superView: graph
        });
        dot.style.borderRadius = "5px";
        dot.style.backgroundColor = color;
      }
      graph.width = dot.x;
      background.width = dot.x;
      if (time) {
        player = new View({
          x: 0,
          y: -h,
          width: 2,
          height: h * 2,
          superView: graph
        });
        player.style.backgroundColor = color;
        player.animate({
          properties: {
            x: graph.width
          },
          time: time
        });
      }
      return graph;
    };

    return Animation;

  })(EventEmitter);

  exports.Animation = Animation;

}).call(this);

});

require.define("/src/curves/spring.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Spring, SpringCurve, defaults, springAccelerationForState, springEvaluateState, springEvaluateStateWithDerivative, springIntegrateState,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  defaults = {
    tension: 80,
    friction: 8,
    velocity: 0,
    speed: 1 / 60.0,
    tolerance: .1
  };

  springAccelerationForState = function(state) {
    return -state.tension * state.x - state.friction * state.v;
  };

  springEvaluateState = function(initialState) {
    var output;
    output = {};
    output.dx = initialState.v;
    output.dv = springAccelerationForState(initialState);
    return output;
  };

  springEvaluateStateWithDerivative = function(initialState, dt, derivative) {
    var output, state;
    state = {};
    state.x = initialState.x + derivative.dx * dt;
    state.v = initialState.v + derivative.dv * dt;
    state.tension = initialState.tension;
    state.friction = initialState.friction;
    output = {};
    output.dx = state.v;
    output.dv = springAccelerationForState(state);
    return output;
  };

  springIntegrateState = function(state, speed) {
    var a, b, c, d, dvdt, dxdt;
    a = springEvaluateState(state);
    b = springEvaluateStateWithDerivative(state, speed * 0.5, a);
    c = springEvaluateStateWithDerivative(state, speed * 0.5, b);
    d = springEvaluateStateWithDerivative(state, speed, c);
    dxdt = 1.0 / 6.0 * (a.dx + 2.0 * (b.dx + c.dx) + d.dx);
    dvdt = 1.0 / 6.0 * (a.dv + 2.0 * (b.dv + c.dv) + d.dv);
    state.x = state.x + dxdt * speed;
    state.v = state.v + dvdt * speed;
    return state;
  };

  Spring = (function() {

    function Spring(args) {
      this.next = __bind(this.next, this);

      this.reset = __bind(this.reset, this);
      args = args || {};
      this.velocity = args.velocity || defaults.velocity;
      this.tension = args.tension || defaults.tension;
      this.friction = args.friction || defaults.friction;
      this.speed = args.speed || defaults.speed;
      this.tolerance = args.tolerance || defaults.tolerance;
      this.reset();
    }

    Spring.prototype.reset = function() {
      this.startValue = 0;
      this.currentValue = this.startValue;
      this.endValue = 100;
      return this.moving = true;
    };

    Spring.prototype.next = function() {
      var finalVelocity, net1DVelocity, netFloat, netValueIsLow, netVelocityIsLow, stateAfter, stateBefore, stopSpring, targetValue;
      targetValue = this.currentValue;
      stateBefore = {};
      stateAfter = {};
      stateBefore.x = targetValue - this.endValue;
      stateBefore.v = this.velocity;
      stateBefore.tension = this.tension;
      stateBefore.friction = this.friction;
      stateAfter = springIntegrateState(stateBefore, this.speed);
      this.currentValue = this.endValue + stateAfter.x;
      finalVelocity = stateAfter.v;
      netFloat = stateAfter.x;
      net1DVelocity = stateAfter.v;
      netValueIsLow = Math.abs(netFloat) < this.tolerance;
      netVelocityIsLow = Math.abs(net1DVelocity) < this.tolerance;
      stopSpring = netValueIsLow && netVelocityIsLow;
      this.moving = !stopSpring;
      if (stopSpring) {
        finalVelocity = 0;
        this.currentValue = this.endValue;
      }
      this.velocity = finalVelocity;
      return this.currentValue;
    };

    Spring.prototype.all = function() {
      var count, _results;
      this.reset();
      count = 0;
      _results = [];
      while (this.moving) {
        if (count > 3000) {
          throw Error("Spring: too many values");
        }
        count++;
        _results.push(this.next());
      }
      return _results;
    };

    Spring.prototype.time = function() {
      return this.all().length * this.speed;
    };

    return Spring;

  })();

  SpringCurve = function(tension, friction, velocity, fps) {
    var spring;
    spring = new Spring({
      tension: tension,
      friction: friction,
      velocity: velocity,
      speed: 1 / fps
    });
    return spring.all();
  };

  exports.SpringCurve = SpringCurve;

}).call(this);

});

require.define("/src/curves/bezier.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var BezierCurve, UnitBezier, defaults;

  UnitBezier = (function() {

    UnitBezier.prototype.epsilon = 1e-6;

    function UnitBezier(p1x, p1y, p2x, p2y) {
      this.cx = 3.0 * p1x;
      this.bx = 3.0 * (p2x - p1x) - this.cx;
      this.ax = 1.0 - this.cx - this.bx;
      this.cy = 3.0 * p1y;
      this.by = 3.0 * (p2y - p1y) - this.cy;
      this.ay = 1.0 - this.cy - this.by;
    }

    UnitBezier.prototype.sampleCurveX = function(t) {
      return ((this.ax * t + this.bx) * t + this.cx) * t;
    };

    UnitBezier.prototype.sampleCurveY = function(t) {
      return ((this.ay * t + this.by) * t + this.cy) * t;
    };

    UnitBezier.prototype.sampleCurveDerivativeX = function(t) {
      return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
    };

    UnitBezier.prototype.solveCurveX = function(x) {
      var d2, i, t0, t1, t2, x2;
      t2 = x;
      i = 0;
      while (i < 8) {
        x2 = this.sampleCurveX(t2) - x;
        if (Math.abs(x2) < this.epsilon) {
          return t2;
        }
        d2 = this.sampleCurveDerivativeX(t2);
        if (Math.abs(d2) < this.epsilon) {
          break;
        }
        t2 = t2 - x2 / d2;
        i++;
      }
      t0 = 0.0;
      t1 = 1.0;
      t2 = x;
      if (t2 < t0) {
        return t0;
      }
      if (t2 > t1) {
        return t1;
      }
      while (t0 < t1) {
        x2 = this.sampleCurveX(t2);
        if (Math.abs(x2 - x) < this.epsilon) {
          return t2;
        }
        if (x > x2) {
          t0 = t2;
        } else {
          t1 = t2;
        }
        t2 = (t1 - t0) * .5 + t0;
      }
      return t2;
    };

    UnitBezier.prototype.solve = function(x) {
      return this.sampleCurveY(this.solveCurveX(x));
    };

    return UnitBezier;

  })();

  BezierCurve = function(a, b, c, d, time, fps) {
    var curve, step, steps, values, _i;
    curve = new UnitBezier(a, b, c, d);
    values = [];
    steps = ((time / 1000) * fps) - 1;
    if (steps > 3000) {
      throw Error("Bezier: too many values");
    }
    for (step = _i = 0; 0 <= steps ? _i <= steps : _i >= steps; step = 0 <= steps ? ++_i : --_i) {
      values.push(curve.solve(step / steps) * 100);
    }
    return values;
  };

  defaults = {};

  defaults.Linear = function(time, fps) {
    return BezierCurve(0, 0, 1, 1, time, fps);
  };

  defaults.Ease = function(time, fps) {
    return BezierCurve(.25, .1, .25, 1, time, fps);
  };

  defaults.EaseIn = function(time, fps) {
    return BezierCurve(.42, 0, 1, 1, time, fps);
  };

  defaults.EaseOut = function(time, fps) {
    return BezierCurve(0, 0, .58, 1, time, fps);
  };

  defaults.EaseInOut = function(time, fps) {
    return BezierCurve(.42, 0, .58, 1, time, fps);
  };

  exports.defaults = defaults;

  exports.BezierCurve = BezierCurve;

}).call(this);

});

require.define("/src/views/scrollview.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Frame, View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Frame = require("../primitives/frame").Frame;

  View = require("./view").View;

  exports.ScrollView = (function(_super) {

    __extends(ScrollView, _super);

    function ScrollView() {
      ScrollView.__super__.constructor.apply(this, arguments);
      this.style["overflow"] = "scroll";
      this.style["-webkit-overflow-scrolling"] = "touch";
      this.style["overflow-x"] = "scroll";
      this.style["overflow-y"] = "scroll";
    }

    ScrollView.define("scrollVertical", {
      get: function() {
        return this.style["overflow-y"] !== "hidden";
      },
      set: function(value) {
        return this.style["overflow-y"] = value ? "scroll" : "hidden";
      }
    });

    ScrollView.define("scrollHorizontal", {
      get: function() {
        return this.style["overflow-x"] !== "hidden";
      },
      set: function(value) {
        return this.style["overflow-x"] = value ? "scroll" : "hidden";
      }
    });

    ScrollView.prototype.scrollToTop = function() {
      return this._element.scrollTop = 0;
    };

    ScrollView.prototype.scrollToBottom = function() {
      var _this = this;
      return setTimeout(function() {
        return _this.scrollPoint = _this._element.scrollHeight - _this.frame.height;
      }, 0);
    };

    ScrollView.define("scrollPoint", {
      get: function() {
        return this._element.scrollTop;
      },
      set: function(value) {
        return this._element.scrollTop = value;
      }
    });

    ScrollView.define("scrollFrame", {
      get: function() {
        return new Frame({
          x: this._element.scrollLeft,
          y: this._element.scrollTop,
          width: this.width,
          height: this.height
        });
      },
      set: function(frame) {
        this._element.scrollLeft = frame.x;
        return this._element.scrollTop = frame.y;
      }
    });

    return ScrollView;

  })(View);

}).call(this);

});

require.define("/src/views/imageview.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  View = require("./view").View;

  exports.ImageView = (function(_super) {

    __extends(ImageView, _super);

    function ImageView(args) {
      ImageView.__super__.constructor.apply(this, arguments);
      this.style["background-repeat"] = "no-repeat";
      this.style["background-size"] = "cover";
      this.image = args.image;
    }

    ImageView.define("html", {
      get: function() {
        return this._element.innerHTML;
      },
      set: function(value) {
        return this._element.innerHTML = value;
      }
    });

    ImageView.define("image", {
      get: function() {
        return this._image;
      },
      set: function(value) {
        var loader,
          _this = this;
        if (this._image === value) {
          return this.emit("load", loader);
        }
        this._image = value;
        loader = new Image();
        loader.name = this.image;
        loader.src = this.image;
        loader.onload = function() {
          _this.style["background-image"] = "url('" + _this.image + "')";
          return _this.emit("load", loader);
        };
        return loader.onerror = function() {
          return _this.emit("error", loader);
        };
      }
    });

    return ImageView;

  })(View);

}).call(this);

});

require.define("/src/init.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Animation, Frame, Global, ImageView, Matrix, ScrollView, View, ViewList, css, debug, k, tools, utils, v;

  css = require("./css");

  utils = require("./utils");

  debug = require("./debug");

  tools = require("./tools/init").tools;

  View = require("./views/view").View;

  ViewList = require("./views/view").ViewList;

  ScrollView = require("./views/scrollview").ScrollView;

  ImageView = require("./views/imageview").ImageView;

  Animation = require("./animation").Animation;

  Frame = require("./primitives/frame").Frame;

  Matrix = require("./primitives/matrix").Matrix;

  Global = {};

  Global.View = View;

  Global.ScrollView = ScrollView;

  Global.ImageView = ImageView;

  Global.Animation = Animation;

  Global.Frame = Frame;

  Global.Matrix = Matrix;

  Global.utils = utils;

  Global.tools = tools;

  Global.ViewList = ViewList;

  Global.debug = debug.debug;

  Global.css = css;

  if (window) {
    window.Framer = Global;
    window._ = require("underscore");
    for (k in Global) {
      v = Global[k];
      window[k] = v;
    }
  }

  window._ = require("underscore");

  if (!utils.isWebKit()) {
    alert("Sorry, only WebKit browsers are currently supported. \See https://github.com/koenbok/Framer/issues/2 for more info.");
  }

}).call(this);

});
require("/src/init.coffee");
})();
