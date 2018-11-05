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
        if (currentdir === homedir) {
            currentdir = "~"
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
            
        }
    }
};

defaultSegments.exitcode("left");
defaultSegments.user("left");
defaultSegments.dirname("left", config.segments.segconfig.dirlength);
//defaultSegments.datetime("left");
defaultSegments.promptchar("left");

drawSegments(left, [], false);