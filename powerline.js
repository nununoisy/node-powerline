// powerline.js
// successor to powerline_bash
//"use strict";

/* args:
   node powerline.js [STATUS] [PROMPT]
   node powerline.js -b [COLS]
   node powerline.js -r [SHELL]
   STATUS: exit status of previous command ($?)
   PROMPT: what to generate (PS[0,2])
   -b : start immersebar daemon
      [COLS]: terminal width
   -r : print rcfile instructions for [SHELL]
      [SHELL] is one of {bash, zsh, fish, csh}
*/

// read config file
const fs = require('fs');

try {
    var config = JSON.parse(fs.readFileSync(__dirname + "/powerline-cfg.json"));
} catch (err) {
    throw new Error("Couldn't read configuration file due to " + err.name + " - " + err.message);
}

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
//      important - draw if there is not a lot of room
// right is drawn in reverse order

const addSegment = (contents, align, color, tcolor, terminate, sterminate, important) => {
    if (!contents || contents === "") throw new SyntaxError("contents must not be empty");
    if (align === "left") {
        if (color.toString()) {
            left.push("c{bg" + color + "}");
        }
        if (tcolor.toString()) {
            left.push("c{fg" + tcolor + "}");
        }
        if (important) {
            //left.push("c{important}");
            // not yet
        }
        left.push(contents);
        if (terminate) {
            left.push("c{terminator}");
        }
        if (sterminate) {
            left.push("c{softterminator}");
        }
    } else if (align === "right") {
        if (sterminate) {
            right.push("c{softterminator}");
        }
        if (terminate) {
            right.push("c{terminator}");
        }
        if (important) {
            //right.push("c{important}");
            // not yet
        }
        right.push(contents);
        if (tcolor) {
            right.push("c{fg" + tcolor + "}");
        }
        if (color) {
            right.push("c{bg" + color + "}");
        }
    } else {
        throw new SyntaxError("align must be 'left' or 'right'");
    }
};

const parseColor = color => {
    if (color.indexOf("c{") === -1) throw new SyntaxError("No command found");
    return color.replace(/c{(b|f)g/g, "").replace(/}/g, "");
};

const writeColors = (cbg, cfg) => {
    if (!config.colors256) {
        // 16 color conversion magic here
        throw new Error("Not supported yet");
    } else {
        process.stdout.write("\\[\u001B[48;5;" + cbg + "m\u001B[38;5;" + cfg + "m\\]");
    }
};

const clearColors = () => { process.stdout.write("\u001B[0m"); };

var colorRegex = /^c{(b|f)g[0-9]{1,3}}$/;

var seglength = 0;

const trackLength = printstring => {
    let parsedprintstring = printstring.replace(/\\\[.*\\\]/g, '');
    seglength += parsedprintstring.length;
    process.stdout.write(printstring);
}

const drawSegments = (left, right, immerse) => {
    if (!immerse && right.length !== 0) throw new SyntaxError("Right-aligned segments not allowed in prompt");
    var i,c,cbg,cfg;
    cbg = config.colors.bg.termdefault;
    cfg = config.colors.fg.termdefault;
    if (!immerse) {
        clearColors();
        for (i=0; i<left.length; i++) {
            c = left[i];
            if (c == "c{terminator}") {
                process.stdout.write(" ");
                cfg = cbg;
                if (i + 1 === left.length) {
                    clearColors();
                    process.stdout.write("\\[\u001B[38;5;" + cfg + "m\\]");
                    process.stdout.write(config.unicodechars.arrows.solidright);
                } else {
                    cbg = parseColor(left[i+1]);
                    if (cfg === cbg) {
                        process.stdout.write(config.unicodechars.arrows.right);
                    } else {
                        writeColors(cbg, cfg);
                        process.stdout.write(config.unicodechars.arrows.solidright);
                    }
                }
            } else if (c === "c{softterminator}") {
                process.stdout.write(" " + config.unicodechars.arrows.right);
            } else if (colorRegex.test(c)) {
                if (c.indexOf("bg") === -1) { //fg
                    cfg = parseColor(c);
                } else { //bg
                    cbg = parseColor(c);
                }
                writeColors(cbg, cfg);
                process.stdout.write((c.indexOf("bg") !== -1 ? " " : ""));
            } else if (c === "c{important}") {
                // magic here
            } else {
                process.stdout.write(c);
            }
        }
        clearColors();
        process.stdout.write(" ");
    } else {
        var cols = process.argv[3];
        clearColors();
        for (i=0; i<left.length; i++) {
            c = left[i];
            if (c == "c{terminator}") {
                trackLength(" ");
                cfg = cbg;
                if (i + 1 === left.length) {
                    clearColors();
                    trackLength("\\[\u001B[38;5;" + cfg + "m\\]");
                    trackLength(config.unicodechars.arrows.solidright);
                } else {
                    cbg = parseColor(left[i+1]);
                    if (cfg === cbg) {
                        trackLength(config.unicodechars.arrows.right);
                    } else {
                        writeColors(cbg, cfg);
                        trackLength(config.unicodechars.arrows.solidright);
                    }
                }
            } else if (c === "c{softterminator}") {
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
        let rightbuffer = '';
        let rightLength = 0;
        let addbuf = s => {
            rightLength += s.replace(/\\\[.*\\\]/g, '').length;
            rightbuffer += s;
        };
        for (i=right.length; i<0; i--) {
            c = right[i];
            if (c == "c{terminator}") {
                addbuf(" ");
                cfg = cbg;
                if (i - 1 === right.length) {
                    clearColors();
                    addbuf("\\[\u001B[38;5;" + cfg + "m\\]");
                    addbuf(config.unicodechars.arrows.solidleft);
                } else {
                    cbg = parseColor(right[i-1]);
                    if (cfg === cbg) {
                        addbuf(config.unicodechars.arrows.right);
                    } else {
                        writeColors(cbg, cfg);
                        addbuf(config.unicodechars.arrows.solidright);
                    }
                }
            } else if (c === "c{softterminator}") {
                process.stdout.write(" " + config.unicodechars.arrows.right);
            } else if (colorRegex.test(c)) {
                if (c.indexOf("bg") === -1) { //fg
                    cfg = parseColor(c);
                } else { //bg
                    cbg = parseColor(c);
                }
                writeColors(cbg, cfg);
                process.stdout.write((c.indexOf("bg") !== -1 ? " " : ""));
            } else if (c === "c{important}") {
                // magic here
            } else {
                process.stdout.write(c);
            }
        }
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
        if (options.a) align = options.a;
        var color = 'err';
        if (options.c) color = options.c;
        var color2 = 'check';
        if (options.c2) color2 = options.c2;
        var err = parseInt(process.argv[2],10);
        if (isNaN(err)) {
            throw new Error("No exitcode passed");
        }
        if (err === 0) {
            addSegment(config.unicodechars.check, align, config.colors.bg[color2], config.colors.fg[color2], true, false, false);
        } else {
            addSegment(config.unicodechars.err + " " + err + (err != config.segments.segconfig.exitcode.codes.default[err] ? ": " + config.segments.segconfig.exitcode.codes.default[err] : ''), align, config.colors.bg[color], config.colors.fg[color], true, false, true);
        }
    },
    user: options => {
        var align = 'left';
        if (options.a) align = options.a;
        var color = 'user';
        if (options.c) color = options.c;
        var uname = readTerminalProcess("whoami", [], "");
        addSegment(stripNewlines(uname.stdout), align, config.colors.bg[color], config.colors.fg[color], true, false, true);
    },
    dir: options => {
        var align = 'left';
        if (options.a) align = options.a;
        var color = 'dir';
        if (options.c) color = options.c;
        var length = config.segments.segconfig.dirlength;
        var currentdir = stripNewlines(readTerminalProcess("pwd",[],"").stdout);
        const homedir = require('os').homedir();
        if (currentdir.indexOf(homedir) !== -1) {
            currentdir = currentdir.replace(homedir, "~");
        }
        if (currentdir.length > length) {
            currentdir = config.unicodechars.dotdotdot + currentdir.slice(-(length - 1));
        }
        currentdir.split("/").forEach((fname, i, a) => {
            if (fname !== "") {
                var termtype = (i + 1 === a.length);
                addSegment(fname, align, config.colors.bg[color], config.colors.fg[color], termtype, !termtype, true);
            }
        });
    },
    promptcharacter: options => {
        var align = 'left';
        if (options.a) align = options.a;
        var color = 'user';
        if (options.c) color = options.c;
        var uid = parseInt(stripNewlines(readTerminalProcess("id", ["-u"], "").stdout),10);
        addSegment((uid === 0 ? "#" : "$"), align, config.colors.bg[color], config.colors.fg[color], true, false, true);
    },
    datetime: options => {
        var align = 'left';
        if (options.a) align = options.a;
        var color = 'err';
        if (options.c) color = options.c;
        var date = stripNewlines(readTerminalProcess("date", ["+"+config.segments.segconfig.datefmt], "").stdout);
        var time = stripNewlines(readTerminalProcess("date", ["+"+config.segments.segconfig.timefmt], "").stdout);
        addSegment(date, align, config.colors.bg[color], config.colors.fg[color], false, true, false);
        addSegment(time, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
    },
    gitCompile: options => {
        var align = 'left';
        if (options.a) align = options.a;
        var color = 'git';
        if (options.c) align = options.c;
        config.segments.segconfig.gitsegments.forEach(gitsegment => {
            if (paren.test(gitsegment)) {
                throw new Error("Cannot add arguments to individual gitsegments. Fix gitsegment " + gitsegment);
            }
            (1,eval)(gitsegment + "(" + align + "," + color + ")");
        });
    },
    git: {
        getBranchName: () => {
            return stripNewlines(readTerminalProcess("git", ["rev-parse", "--abbrev-ref", "HEAD"], "").stdout);
        },
        branch: (align, color) => {
            var branchName = defaultSegments.git.getBranchName();
            addSegment(config.unicodechars.gitbranch + " " + branchName, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
        },
        commits: (align, color) => {
            var branchName = stripNewlines(readTerminalProcess("git", ["rev-parse", "--abbrev-ref", "HEAD"], "").stdout);
            var rawCommits = stripNewlines(readTerminalProcess("git", ["rev-list", "--left-right", "--count", "origin/" + branchName + "..." + branchName], "").stdout);
            var commitArray = rawCommits.split("\t");
            var ahead = parseInt(commitArray[1],10);
            var behind = parseInt(commitArray[0],10);
            if (ahead === 0 && behind === 0) {
                addSegment(config.unicodechars.arrows.up + config.unicodechars.arrows.down + config.unicodechars.check, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
            } else {
                var cmt = "";
                if (ahead !== 0) {
                    cmt += config.unicodechars.arrows.up + " " + ahead;
                }
                if (behind !== 0) {
                    cmt += config.unicodechars.arrows.down + " " + behind;
                }
                addSegment(cmt, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
            }
        },
        tag: (align, color) => {
            var termcmd = readTerminalProcess("git", ["describe", "--tags"], "");
            if (termcmd.stderr.toString() === "") {
                var tag = stripNewlines(termcmd.stdout);
                addSegment(tag, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
            }
        },
        conflicts: (align, color) => {
            //TODO add number of conflicts
            if (stripNewlines(readTerminalProcess("git", ["ls-files", "--unmerged"], "").stdout) !== "") {
                var final = config.unicodechars.err;
            } else {
                var final = config.unicodechars.check;
            }
            addSegment(final, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
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
                addSegment(trck, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
            }
        },
        stash: (align, color) => {
            var stashRaw = readTerminalProcess("git", ["stash", "list"], "").stdout.toString();
            var stashes = stashRaw.split(/\r\n|\r|\n/).length - 1;
            if (stashes !== 0) {
                addSegment(config.unicodechars.flag + " " + stashes, align, config.colors.bg[color], config.colors.fg[color], true, false, false);
            }
        }
    },
    literal: (options, string) => {
        var align = 'left';
        if (options.a) align = options.a;
        var color = 'dir';
        if (options.c) color = options.c;
        var color2 = 'dir';
        if (options.c2) color = options.c2;
        addSegment(string, align, config.colors.bg[color], config.colors.fg[color], true, false, true);
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

const print_bashrc = () => {
    parseSegmentDefs();
    if (ps1.length > 0) {
        process.stdout.write("_ps1_gen() { PS1=\"node " + __dirname + "/powerline.js $? 'PS1'\"; }; ");
        process.stdout.write("PROMPT_COMMAND=\"PROMPT_COMMAND; _ps1_gen\";");
    }
    if (ps2.length > 0) {
        process.stdout.write("_ps2_gen() { PS2=\"node " + __dirname + "/powerline.js $? 'PS2'\"; }; ");
        process.stdout.write("PROMPT_COMMAND=\"PROMPT_COMMAND; _ps2_gen\";");
    }
    if (ps0.length > 0) {
        process.stdout.write("_ps0_gen() { PS0=\"node " + __dirname + "/powerline.js $? 'PS0'\"; }; ");
        process.stdout.write("PROMPT_COMMAND=\"PROMPT_COMMAND; _ps0_gen\";");
    }
};

const printRC = shell => {
    if (shell === "bash") {
        print_bashrc();
    }
};

/* var global = (function () {  
    return this || (1, eval)('this');  
}()); */

const runSegmentNameFunction = cns => {
    if (paren.test(cns)) {
        (1, eval)("global." + cns + ";"); // eval indirect global black magic
    } else {
        (1, eval)("global." + cns + "({});"); // nsfw code
    }
};

const chooseSegments = () => {
    var choice = process.argv[3];
    parseSegmentDefs();
    switch (choice) {
        case 'PS0':
            ps0.forEach(runSegmentNameFunction);
            drawSegments(left, [], false);
            break;
        case 'PS1':
            ps1.forEach(runSegmentNameFunction);
            drawSegments(left, [], false);
            break;
        case 'PS2':
            ps2.forEach(runSegmentNameFunction);
            drawSegments(left, [], false);
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

if (process.argv[2] === "-b") {
    parseSegmentDefs();
    immersebar.forEach(runSegmentNameFunction);
    drawSegments(left,right,true);
} else if (process.argv[2] === '-d') {
    printRC(process.argv[3]);
} else {
    chooseSegments();
}