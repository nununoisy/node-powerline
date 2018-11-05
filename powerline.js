// powerline.js
// successor to powerline_bash
"use strict";

/* args:
   node powerline.js [STATUS]
   node powerline.js -b [COLS]
   node powerline.js -r [SHELL]
   STATUS: exit status of previous command ($?)
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
    console.log("Couldn't read configuration file due to " + err.name + " - " + err.message);
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
            left.push("c{important}");
        }
        left.push(contents);
        if (terminate) {
            left.push("c{terminator}");
        }
        if (sterminate) {
            left.push("c{softterminator}");
        }
    } else if (align === "right") {
        if (color) {
            right.push("c{bg" + color + "}");
        }
        if (tcolor) {
            right.push("c{fg" + tcolor + "}");
        }
        if (important) {
            right.push("c{important}");
        }
        right.push(contents);
        if (terminate) {
            right.push("c{terminator}");
        }
        if (sterminate) {
            right.push("c{softterminator}");
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
        process.stdout.write("\u001B[48;5;" + cbg + "m\u001B[38;5;" + cfg + "m");
    }
};

const clearColors = () => { process.stdout.write("\u001B[0m"); };

var colorRegex = /^c{(b|f)g[0-9]{1,3}}$/;

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
                    process.stdout.write("\u001B[38;5;" + cfg + "m");
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
    } else {
        var cols = process.argv[3];
    }
};

const stripNewlines = obj => {
    return obj.toString().replace(/\r?\n|\r/g, "");
};

/* addSegment("ubuntu", "left", "208", "15", true, false);
addSegment("$", "left", "0", "15", true, true);
console.log(left); */

const defaultSegments = {
    exitcode: align => {
        var err = parseInt(process.argv[2],10);
        if (isNaN(err)) {
            throw new Error("No exitcode passed");
        }
        if (err === 0) {
            addSegment(config.unicodechars.check, align, config.colors.bg.check, config.colors.fg.check, true, false, false);
        } else {
            addSegment(config.unicodechars.err + " " + err + ": " + config.segments.segconfig.exitcode.codes.default[err], align, config.colors.bg.err, config.colors.fg.err, true, false, true);
        }
    },
    user: align => {
        var uname = readTerminalProcess("whoami", [], "");
        addSegment(stripNewlines(uname.stdout), align, config.colors.bg.user, config.colors.fg.user, true, false, true);
    },
    dirname: (align, length) => {
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
                addSegment(fname, align, config.colors.bg.dir, config.colors.fg.dir, termtype, !termtype, true);
            }
        });
    },
    promptchar: align => {
        var uid = parseInt(stripNewlines(readTerminalProcess("id", ["-u"], "").stdout),10);
        addSegment((uid === 0 ? "#" : "$"), align, config.colors.bg.user, config.colors.fg.user, true, false, true);
    },
    datetime: align => {
        var date = stripNewlines(readTerminalProcess("date", ["+"+config.segments.segconfig.datefmt], "").stdout);
        var time = stripNewlines(readTerminalProcess("date", ["+"+config.segments.segconfig.timefmt], "").stdout);
        addSegment(date, align, config.colors.bg.dir, config.colors.fg.dir, false, true, false);
        addSegment(time, align, config.colors.bg.dir, config.colors.fg.dir, true, false, false);
    },
    git: {
        branch: align => {
            var branchName = stripNewlines(readTerminalProcess("git", ["rev-parse", "--abbrev-ref", "HEAD"], "").stdout);
            addSegment(config.unicodechars.gitbranch + " " + branchName, align, config.colors.bg.git, config.colors.fg.git, true, false, false);
        },
        commits: align => {
            var branchName = stripNewlines(readTerminalProcess("git", ["rev-parse", "--abbrev-ref", "HEAD"], "").stdout);
            var rawCommits = stripNewlines(readTerminalProcess("git", ["rev-list", "--left-right", "--count", "origin/" + branchName + "..." + branchName], "").stdout);
            var commitArray = rawCommits.split("\t");
            var ahead = parseInt(commitArray[1],10);
            var behind = parseInt(commitArray[0],10);
            if (ahead === 0 && behind === 0) {
                addSegment(config.unicodechars.arrows.up + config.unicodechars.arrows.down + config.unicodechars.check, align, config.colors.bg.git, config.colors.fg.git, true, false, false);
            } else {
                var cmt = "";
                if (ahead !== 0) {
                    cmt += config.unicodechars.arrows.up + " " + ahead;
                }
                if (behind !== 0) {
                    cmt += config.unicodechars.arrows.down + " " + behind;
                }
                addSegment(cmt, align, config.colors.bg.git, config.colors.fg.git, true, false, false);
            }
        },
        tags: align => {
            var termcmd = readTerminalProcess("git", ["describe", "--tags"], "");
            if (termcmd.stderr.toString() === "") {
                var tag = stripNewlines(termcmd.stdout);
                addSegment(tag, align, config.colors.bg.git, config.colors.fg.git, true, false, false);
            }
        },
        conflicts: align => {
            //TODO add number of conflicts
            if (stripNewlines(readTerminalProcess("git", ["ls-files", "--unmerged"], "").stdout) !== "") {
                var final = config.unicodechars.err;
            } else {
                var final = config.unicodechars.check;
            }
            addSegment(final, align, config.colors.bg.git, config.colors.fg.git, true, false, false);
        },
        tracking: align => {
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
                addSegment(trck, align, config.colors.bg.git, config.colors.fg.git, true, false, false);
            }
        }
    }
};

defaultSegments.exitcode("left");
defaultSegments.user("left");
defaultSegments.dirname("left", config.segments.segconfig.dirlength);
defaultSegments.git.branch("left");
defaultSegments.git.tags("left");
defaultSegments.git.conflicts("left");
defaultSegments.git.tracking("left");
defaultSegments.git.commits("left");
//defaultSegments.datetime("left");
defaultSegments.promptchar("left");


drawSegments(left, [], false);