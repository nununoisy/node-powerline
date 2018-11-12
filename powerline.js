// powerline.js
// successor to powerline_bash

/* args:
   node powerline.js [STATUS] [PROMPT]
   node powerline.js -b [COLS]
   STATUS: exit status of previous command ($?)
   PROMPT: what to generate (PS[0,2])
   -b : start immersebar daemon
      [COLS]: terminal width
*/

// read config file
const Module = require('module');
const fs = require('fs');
const exists = fs.existsSync;
var _require = Module.prototype.require;
const SAVE_FILENAME = __dirname + "/cache.dat"
var nameCache = exists(SAVE_FILENAME) ? JSON.parse(fs.readFileSync(SAVE_FILENAME, 'utf-8')) : {};
Module.prototype.require = function cachePathsRequire(name) {
  var pathToLoad;
  var currentModuleCache = nameCache[this.filename];
  if (!currentModuleCache) {
    currentModuleCache = {};
    nameCache[this.filename] = currentModuleCache;
  }
  if (currentModuleCache[name]) {
    pathToLoad = currentModuleCache[name];
  } else {
    pathToLoad = Module._resolveFilename(name, this);
    currentModuleCache[name] = pathToLoad;
  }
  return _require.call(this, pathToLoad);
};

const async = require('async');

try {
    var config = JSON.parse(fs.readFileSync(__dirname + "/powerline-cfg.json"));
} catch (err) {
    throw new Error("Couldn't read configuration file due to " + err.name + " - " + err.message);
}

// optimizations
const out = s => {
    process.stdout.write(s);
};

var bgc = config.colors.bg;
var fgc = config.colors.fg;

// define some helpful functions
// summon subprocesses

const readTerminalProcess = (image, args, stdin) => {
    const { spawnSync } = require('child_process');
    return spawnSync(image, args, {input: stdin});
};

// segment drawing functions

var left = [];
var right = [];

// these arrays are filled with things like this:
// "xyz" - literal 'xyz'
// "c{xyz}" - format command 'xyz'
//      bgNNN - background color NNN
//      fgNNN - foreground color NNN
// right is drawn in reverse order

const addSegment = (contents, align, color, tcolor, terminate, sterminate, important) => {
    if (!contents || contents === "") throw new SyntaxError("Contents must not be empty");
    if (align === "left") {
        if (color.toString()) {
            left.push("c{bg" + color + "}");
        }
        if (tcolor.toString()) {
            left.push("c{fg" + tcolor + "}");
        }
        /*if (important) {
            //left.push("c{important}");
            // not yet
        }*/
        left.push(contents);
        if (terminate) {
            left.push("c{t}");
        }
        if (sterminate) {
            left.push("c{st}");
        }
    } else if (align === "right") {
        if (sterminate) {
            right.push("c{st}");
        }
        if (terminate) {
            right.push("c{t}");
        }
        if (color) {
            right.push("c{bg" + color + "}");
        }
        if (tcolor) {
            right.push("c{fg" + tcolor + "}");
        }
        /*if (important) {
            //right.push("c{important}");
            // not yet
        }*/
        right.push(contents);
    } else {
        throw new SyntaxError("align must be 'left' or 'right'");
    }
};

const parseColor = color => {
    if (color.indexOf("c{") === -1) throw new SyntaxError("No command found");
    return color.replace(/c{(b|f)g/g, "").replace(/}/g, "");
};

const writeColors = (cbg, cfg, surround) => {
    if (!config.colors256) {
        // 16 color conversion magic here
        throw new Error("Not supported yet");
    } else {
        if (surround === false) out("\\[");
        out("\u001B[48;5;" + cbg + "m\u001B[38;5;" + cfg + "m");
        if (surround === false) out("\\]");
    }
};

const clearColors = () => { out("\u001B[0m"); };

var colorRegex = /^c{(b|f)g[0-9]{1,3}}$/;

var seglength = 0;

const trackLength = printstring => {
    let parsedprintstring = printstring.replace(/(\\\[|\\\])/g, '');
    seglength += parsedprintstring.length;
    out(parsedprintstring);
}

const drawSegments = (left, right, immerse) => {
    if (!immerse && right.length !== 0) throw new SyntaxError("Right-aligned segments not allowed in prompt");
    var i,c,cbg,cfg;
    cbg = bgc.termdefault;
    cfg = fgc.termdefault;
    if (!immerse) {
        clearColors();
        for (i=0; i<left.length; i++) {
            c = left[i];
            if (c == "c{t}") {
                out(" ");
                cfg = cbg;
                if (i + 1 === left.length) {
                    clearColors();
                    out("\\[\u001B[38;5;" + cfg + "m\\]");
                    out(config.unicodechars.arrows.solidright);
                } else {
                    cbg = parseColor(left[i+1]);
                    if (cfg === cbg) {
                        out(config.unicodechars.arrows.right);
                    } else {
                        writeColors(cbg, cfg, false);
                        out(config.unicodechars.arrows.solidright);
                    }
                }
            } else if (c === "c{st}") {
                out(" " + config.unicodechars.arrows.right);
            } else if (colorRegex.test(c)) {
                if (c.indexOf("bg") === -1) { //fg
                    cfg = parseColor(c);
                } else { //bg
                    cbg = parseColor(c);
                }
                writeColors(cbg, cfg, false);
                out((c.indexOf("bg") !== -1 ? " " : ""));
            } else if (c === "c{important}") {
                // magic here
            } else {
                out(c);
            }
        }
        clearColors();
        out(" ");
    } else {
        var cols = process.argv[3];
        seglength = 0;
        clearColors();
        for (i=0; i<left.length; i++) {
            c = left[i];
            if (c == "c{t}") {
                trackLength(" ");
                cfg = cbg;
                if (i + 1 === left.length) {
                    writeColors(bgc.immersebar, cfg, true);
                    trackLength(config.unicodechars.arrows.solidright);
                } else {
                    cbg = parseColor(left[i+1]);
                    if (cfg === cbg) {
                        trackLength(config.unicodechars.arrows.right);
                    } else {
                        writeColors(cbg, cfg, true);
                        trackLength(config.unicodechars.arrows.solidright);
                    }
                }
            } else if (c === "c{st}") {
                trackLength(" " + config.unicodechars.arrows.right);
            } else if (colorRegex.test(c)) {
                if (c.indexOf("bg") === -1) { //fg
                    cfg = parseColor(c);
                } else { //bg
                    cbg = parseColor(c);
                }
                writeColors(cbg, cfg);
                trackLength((c.indexOf("bg") !== -1 ? " " : ""));
            } else if (c === "c{important}") {
                // magic here
            } else {
                trackLength(c);
            }
        }
        let rightLength = 0;
        for (i=0; i<right.length; i++) {
            c = right[i];
            if (c === "c{t}" || c === "c{st}") {
                rightLength += 2;
            } else if (c.indexOf("c{bg") !== -1) {
                rightLength++;
            } else if (c.indexOf("c{fg") === -1 && c !== "c{important}") {
                rightLength += c.length;
            }
        }
        writeColors(bgc.immersebar, cfg, true);
        for (i=1; i<(cols - seglength - rightLength); i++) {
            out(" ");
        }
        for (i=0; i<right.length; i++) {
            c = right[i];
            if (c == "c{t}") {
                cfg = cbg;
                if (i === 0) {
                    cfg = parseColor(right[1]);
                    cbg = bgc.immersebar;
                    writeColors(cbg, cfg, true);
                    out(config.unicodechars.arrows.solidleft);
                } else {
                    cbg = parseColor(right[i+1]);
                    if (cfg === cbg) {
                        out(" " + config.unicodechars.arrows.left);
                    } else {
                        writeColors(cbg, cfg, true);
                        out(" " + config.unicodechars.arrows.solidleft);
                    }
                }
            } else if (c === "c{st}") {
                out(" " + config.unicodechars.arrows.left);
            } else if (colorRegex.test(c)) {
                if (c.indexOf("bg") === -1) { //fg
                    cfg = parseColor(c);
                } else { //bg
                    cbg = parseColor(c);
                }
                writeColors(cbg, cfg, true);
                out((c.indexOf("bg") !== -1 ? " " : ""));
            } else if (c === "c{important}") {
                // magic here
            } else {
                if (!c) {
                    throw new Error("Error at index " + i);
                }
                out(c);
            }
        }
        out(' ');
        clearColors();
    }
};

const stripNewlines = obj => {
    return obj.toString().replace(/\r?\n|\r/g, "");
};

var paren = /.*\(.*\).*/g;

/* addSegment("ubuntu", "left", "208", "15", true, false);
addSegment("$", "left", "0", "15", true, true);
console.log(left); */

var defaultSegments = {
    exitcode: options => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'err';
        if (!!options.c) color = options.c;
        var color2 = 'check';
        if (!!options.c2) color2 = options.c2;
        var err = parseInt(process.argv[2],10);
        if (isNaN(err)) {
            throw new Error("No exitcode passed");
        }
        if (err === 0) {
            addSegment(config.unicodechars.check, align, bgc[color2], fgc[color2], true, false, false);
        } else {
            addSegment(config.unicodechars.err + " " + err + (err != config.segments.segconfig.exitcode.codes.default[err] ? ": " + config.segments.segconfig.exitcode.codes.default[err] : ''), align, bgc[color], fgc[color], true, false, true);
        }
    },
    user: options => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'user';
        if (!!options.c) color = options.c;
        var uname = readTerminalProcess("whoami", [], "");
        addSegment(stripNewlines(uname.stdout), align, bgc[color], fgc[color], true, false, true);
    },
    dir: options => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'dir';
        if (!!options.c) color = options.c;
        var length = config.segments.segconfig.dirlength;
        var currentdir = stripNewlines(readTerminalProcess("pwd",[],"").stdout);
        const homedir = require('os').homedir();
        currentdir = currentdir.replace(homedir, "~");
        if (currentdir.length > length) {
            currentdir = config.unicodechars.dotdotdot + currentdir.slice(-(length - 1));
        }
        currentdir.split("/").forEach((fname, i, a) => {
            if (fname !== "") {
                var termtype = (i + 1 === a.length);
                addSegment(fname, align, bgc[color], fgc[color], termtype, !termtype, true);
            }
        });
    },
    promptcharacter: options => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'user';
        if (!!options.c) color = options.c;
        var uid = parseInt(stripNewlines(readTerminalProcess("id", ["-u"], "").stdout),10);
        addSegment((uid === 0 ? "#" : "$"), align, bgc[color], fgc[color], true, false, true);
    },
    datetime: options => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'dir';
        if (!!options.c) color = options.c;
        var date = stripNewlines(readTerminalProcess("date", ["+"+config.segments.segconfig.datefmt], "").stdout);
        var time = stripNewlines(readTerminalProcess("date", ["+"+config.segments.segconfig.timefmt], "").stdout);
        addSegment(date, align, bgc[color], fgc[color], false, true, false);
        addSegment(time, align, bgc[color], fgc[color], true, false, false);
    },
    gitCompile: options => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'git';
        if (!!options.c) align = options.c;
        let gitSegs = [];
	if (defaultSegments.git.getBranchName() === "") return;
        config.segments.segconfig.gitsegments.forEach(gitsegment => {
            if (paren.test(gitsegment)) {
                throw new Error("Cannot add arguments to individual gitsegments. Fix gitsegment " + gitsegment);
            }
            gitSegs.push(new Function('c',"global." + gitsegment + "('" + align + "','" + color + "');"));
        });
        async.parallel(gitSegs);
    },
    battery: options => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'dir';
        if (!!options.c) align = options.c;
        var batfile = (!!config.segments.segconfig.battery.customfile ? config.segments.segconfig.battery.customfile : "/sys/class/power_supply/BAT" + config.segments.segconfig.battery.batno + "/uevent");
        var capacityRaw, status;
        fs.readFileSync(batfile).toString().split("\n").forEach(e => {
            if (e.indexOf("POWER_SUPPLY_CAPACITY=") !== -1) {
                capacityRaw = e.replace("POWER_SUPPLY_CAPACITY=", "");
            }
            if (e.indexOf("POWER_SUPPLY_STATUS=") !== -1) {
                status = e.replace("POWER_SUPPLY_STATUS=", "");
            }
        });
        let capacity = (parseFloat(capacityRaw,10) / 10);
        capacity = (capacity <= 10 ? capacity : 10);
        capacity = (capacity > 0 ? capacity : 0.1);
        if (!capacity || !status) {
            throw new Error("Invalid battery file");
        }
        var eighths = Math.round(capacity * 8) / 8;
        var whole = Math.floor(eighths);
        if (whole === eighths) {
            if (whole !== 10) whole++;
            eighths = 0;
        } else {
            eighths = eighths - whole;
        }
        var remaining = 9 - whole; // 10 - whole - 1 (for eighths)
        remaining = (remaining >= 0 ? remaining : 0);
        var buf = '';
        let i;
        //console.log([capacity, whole, eighths, remaining]);
        for (i=0; i<whole; i++) {
            buf += config.unicodechars.battery.fractionblocks[0];
        }
        if (eighths !== 0) {
            buf += config.unicodechars.battery.fractionblocks[8 - (eighths * 8)];
        }
        for (i=0; i<remaining; i++) {
            buf += " ";
        }
        let charge = (status === "Charging" ? config.unicodechars.battery.bolt + " " : '');
        addSegment(charge + (capacity * 10).toString() + "%", align, bgc[color], fgc[color], true, false, false);
        let fncolor = config.segments.segconfig.battery.indicator.normal;
        let flcolor = config.segments.segconfig.battery.indicator.low;
        let fcolor = (capacityRaw > config.segments.segconfig.battery.indicator.lowthreshold ? fncolor : flcolor);
        addSegment(buf, align, bgc[color], bgc[fcolor], true, false, false);
    },
    git: {
        getBranchName: () => {
            return stripNewlines(readTerminalProcess("git", ["rev-parse", "--abbrev-ref", "HEAD"], "").stdout);
        },
        branch: (align, color) => {
            var branchName = defaultSegments.git.getBranchName();
            addSegment(config.unicodechars.gitbranch + " " + branchName, align, bgc[color], fgc[color], true, false, false);
        },
        commits: (align, color) => {
            var branchName = stripNewlines(readTerminalProcess("git", ["rev-parse", "--abbrev-ref", "HEAD"], "").stdout);
            var rawCommits = stripNewlines(readTerminalProcess("git", ["rev-list", "--left-right", "--count", "origin/" + branchName + "..." + branchName], "").stdout);
            var commitArray = rawCommits.split("\t");
            var ahead = parseInt(commitArray[1],10);
            var behind = parseInt(commitArray[0],10);
            if (ahead === 0 && behind === 0) {
                addSegment(config.unicodechars.arrows.up + config.unicodechars.arrows.down + config.unicodechars.check, align, bgc[color], fgc[color], true, false, false);
            } else {
                var cmt = "";
                if (ahead !== 0) {
                    cmt += config.unicodechars.arrows.up + " " + ahead;
                }
                if (behind !== 0) {
                    cmt += config.unicodechars.arrows.down + " " + behind;
                }
                addSegment(cmt, align, bgc[color], fgc[color], true, false, false);
            }
        },
        tag: (align, color) => {
            var termcmd = readTerminalProcess("git", ["describe", "--tags"], "");
            if (termcmd.stderr.toString() === "") {
                var tag = stripNewlines(termcmd.stdout);
                addSegment(tag, align, bgc[color], fgc[color], true, false, false);
            }
        },
        conflicts: (align, color) => {
            //TODO add number of conflicts
            if (stripNewlines(readTerminalProcess("git", ["ls-files", "--unmerged"], "").stdout) !== "") {
                var final = config.unicodechars.err;
            } else {
                var final = config.unicodechars.check;
            }
            addSegment(final, align, bgc[color], fgc[color], true, false, false);
        },
        tracking: (align, color) => {
            var untrackedRaw = readTerminalProcess("git", ["diff", "--numstat"]).stdout.toString();
            var trackedRaw = readTerminalProcess("git", ["diff", "--cached", "--numstat"]).stdout.toString();
            var untracked = untrackedRaw.split(/\r\n|\r|\n/).length - 1;
            var tracked = trackedRaw.split(/\r\n|\r|\n/).length - 1;
            var trck = "";
            if (untracked !== 0 || tracked !== 0) {
                if (untracked !== 0) {
                    trck += "U " + untracked;
                }
                if (tracked !== 0) {
                    trck += (untracked !== 0 ? " " : "") + "C " + tracked;
                }
                addSegment(trck, align, bgc[color], fgc[color], true, false, false);
            }
        },
        stash: (align, color) => {
            var stashRaw = readTerminalProcess("git", ["stash", "list"], "").stdout.toString();
            var stashes = stashRaw.split(/\r\n|\r|\n/).length - 1;
            if (stashes !== 0) {
                addSegment(config.unicodechars.flag + " " + stashes, align, bgc[color], fgc[color], true, false, false);
            }
        }
    },
    literal: (options, string) => {
        var align = 'left';
        if (!!options.a) align = options.a;
        var color = 'dir';
        if (!!options.c) color = options.c;
        var color2 = 'dir';
        if (!!options.c2) color = options.c2;
        addSegment(string, align, bgc[color], fgc[color], true, false, true);
    }
};

global.defaultSegments = defaultSegments;

const loadAddons = () => {
    config.addons.forEach(addon => {
        require(__dirname + "/addons/" + addon);
    });
};

if (config.addons.length > 0) {
    loadAddons();
}

var ps1 = [];
var ps2 = [];
var ps0 = [];
var immersebar = [];

const parseSegmentDefs = () => {
    ps1 = config.segments.ps1;
    ps2 = config.segments.ps2;
    if (config.segments.ps0enabled) ps0 = config.segments.ps0;
    immersebar = config.segments.immersebar;
};

/* var global = (function () {  
    return this || (1, eval)('this');  
}()); */

var segFuncs = [];

const runSegmentNameFunction = cns => {
    // old sync code is still here
    /*if (paren.test(cns)) {
        //(1, eval)("global." + cns + ");"); // eval indirect global black magic
        segFuncs.push(new Function("global." + cns + ";"));
    } else {
        //(1, eval)("global." + cns + "({});"); // nsfw code
        segFuncs.push(new Function("global." + cns + "({});"));
    }*/
    segFuncs.push(new Function('c', "global." + cns + (cns.indexOf('(') !== -1 ? ";" : "({});")));
};

const chooseSegments = () => {
    var choice = process.argv[3];
    parseSegmentDefs();
    switch (choice) {
        case 'PS0':
            if (ps0.length > 0 && config.segments.ps0enabled) {
                ps0.forEach(runSegmentNameFunction);
                async.parallel(segFuncs);
                drawSegments(left, [], false);
            } else {
                out(process.env['PS0'] || '');
            }
            break;
        case 'PS1':
            if (ps1.length > 0) {
                ps1.forEach(runSegmentNameFunction);
                async.parallel(segFuncs);
                drawSegments(left, [], false);
            } else {
                out(process.env['PS1'] || '');
            }
            break;
        case 'PS2':
            if (ps2.length > 0) {
                ps2.forEach(runSegmentNameFunction);
                async.parallel(segFuncs);
                drawSegments(left, [], false);
            } else {
                out(process.env['PS2'] || '');
            }
            break;
	    case 'MULTI':
	        if (ps0.length > 0 && config.segments.ps0enabled) {
	            ps0.forEach(runSegmentNameFunction);
		        async.parallel(segFuncs);
		        out('PS0="');
		        drawSegments(left, [], false);
		        out('"; ');
		        segFuncs = [];
		        left = [];
	        }
	        if (ps1.length > 0) {
	            ps1.forEach(runSegmentNameFunction);
		        async.parallel(segFuncs);
		        out('PS1="');
		        drawSegments(left, [], false);
		        out('"; ');
		        segFuncs = [];
		        left = [];
            }
            if (ps2.length > 0) {
	            ps2.forEach(runSegmentNameFunction);
		        async.parallel(segFuncs);
		        out('PS2="');
		        drawSegments(left, [], false);
		        out('"; ');
		        segFuncs = [];
		        left = [];
            }
            break;
        default:
            throw new Error("Invalid or blank segment mode");
    }
    process.exit(process.argv[2]);
};

/*
defaultSegments.exitcode("left");
defaultSegments.user("left");
defaultSegments.dir("left", config.segments.segconfig.dirlength);
if (defaultSegments.git.getBranchName() !== "") {
    defaultSegments.git.branch("left");
    defaultSegments.git.tags("left");
    defaultSegments.git.conflicts("left");
    defaultSegments.git.tracking("left");
    defaultSegments.git.commits("left");
    defaultSegments.git.stash("left");
}
defaultSegments.datetime("left");
defaultSegments.promptchar("left");


drawSegments(left, [], false);
*/

const immerseDraw = () => {
    parseSegmentDefs();
    immersebar.forEach(runSegmentNameFunction);
    async.parallel(segFuncs);
    drawSegments(left,right,true);
}

if (process.argv[2] === "-b") {
    immerseDraw();
    //setInterval(immerseDraw, config.segments.immerserefresh);
} else {
    chooseSegments();
}
