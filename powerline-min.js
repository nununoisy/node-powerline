const Module=require("module"),fs=require("fs"),exists=fs.existsSync;var _require=Module.prototype.require;const SAVE_FILENAME=__dirname+"/cache.dat";var nameCache=exists(SAVE_FILENAME)?JSON.parse(fs.readFileSync(SAVE_FILENAME,"utf-8")):{};Module.prototype.require=function(e){var r,t=nameCache[this.filename];return t||(t={},nameCache[this.filename]=t),t[e]?r=t[e]:(r=Module._resolveFilename(e,this),t[e]=r),_require.call(this,r)};const async=require("async");try{var config=JSON.parse(fs.readFileSync(__dirname+"/powerline-cfg.json"))}catch(e){throw new Error("Couldn't read configuration file due to "+e.name+" - "+e.message)}const out=e=>{process.stdout.write(e)};var bgc=config.colors.bg,fgc=config.colors.fg;const readTerminalProcess=(e,r,t)=>{const{spawnSync:s}=require("child_process");return s(e,r,{input:t})};var left=[],right=[];const addSegment=(e,r,t,s,n,o,a)=>{if(!e||""===e)throw new SyntaxError("Contents must not be empty");if("left"===r)t.toString()&&left.push("c{bg"+t+"}"),s.toString()&&left.push("c{fg"+s+"}"),left.push(e),n&&left.push("c{t}"),o&&left.push("c{st}");else{if("right"!==r)throw new SyntaxError("align must be 'left' or 'right'");o&&right.push("c{st}"),n&&right.push("c{t}"),t&&right.push("c{bg"+t+"}"),s&&right.push("c{fg"+s+"}"),right.push(e)}},parseColor=e=>{if(-1===e.indexOf("c{"))throw new SyntaxError("No command found");return e.replace(/c{(b|f)g/g,"").replace(/}/g,"")},writeColors=(e,r,t)=>{if(!config.colors256)throw new Error("Not supported yet");!1===t&&out("\\["),out("[48;5;"+e+"m[38;5;"+r+"m"),!1===t&&out("\\]")},clearColors=()=>{out("[0m")};var colorRegex=/^c{(b|f)g[0-9]{1,3}}$/,seglength=0;const trackLength=e=>{let r=e.replace(/(\\\[|\\\])/g,"");seglength+=r.length,out(r)},drawSegments=(e,r,t)=>{if(!t&&0!==r.length)throw new SyntaxError("Right-aligned segments not allowed in prompt");var s,n,o,a;if(o=bgc.termdefault,a=fgc.termdefault,t){var c=process.argv[3];for(seglength=0,clearColors(),s=0;s<e.length;s++)"c{t}"==(n=e[s])?(trackLength(" "),a=o,s+1===e.length?(writeColors(bgc.immersebar,a,!0),trackLength(config.unicodechars.arrows.solidright)):a===(o=parseColor(e[s+1]))?trackLength(config.unicodechars.arrows.right):(writeColors(o,a,!0),trackLength(config.unicodechars.arrows.solidright))):"c{st}"===n?trackLength(" "+config.unicodechars.arrows.right):colorRegex.test(n)?(-1===n.indexOf("bg")?a=parseColor(n):o=parseColor(n),writeColors(o,a),trackLength(-1!==n.indexOf("bg")?" ":"")):"c{important}"===n||trackLength(n);let t=0;for(s=0;s<r.length;s++)"c{t}"===(n=r[s])||"c{st}"===n?t+=2:-1!==n.indexOf("c{bg")?t++:-1===n.indexOf("c{fg")&&"c{important}"!==n&&(t+=n.length);for(writeColors(bgc.immersebar,a,!0),s=1;s<c-seglength-t;s++)out(" ");for(s=0;s<r.length;s++)if("c{t}"==(n=r[s]))a=o,0===s?(a=parseColor(r[1]),o=bgc.immersebar,writeColors(o,a,!0),out(config.unicodechars.arrows.solidleft)):a===(o=parseColor(r[s+1]))?out(" "+config.unicodechars.arrows.left):(writeColors(o,a,!0),out(" "+config.unicodechars.arrows.solidleft));else if("c{st}"===n)out(" "+config.unicodechars.arrows.left);else if(colorRegex.test(n))-1===n.indexOf("bg")?a=parseColor(n):o=parseColor(n),writeColors(o,a,!0),out(-1!==n.indexOf("bg")?" ":"");else if("c{important}"===n);else{if(!n)throw new Error("Error at index "+s);out(n)}out(" "),clearColors()}else{for(clearColors(),s=0;s<e.length;s++)"c{t}"==(n=e[s])?(out(" "),a=o,s+1===e.length?(clearColors(),out("\\[[38;5;"+a+"m\\]"),out(config.unicodechars.arrows.solidright)):a===(o=parseColor(e[s+1]))?out(config.unicodechars.arrows.right):(writeColors(o,a,!1),out(config.unicodechars.arrows.solidright))):"c{st}"===n?out(" "+config.unicodechars.arrows.right):colorRegex.test(n)?(-1===n.indexOf("bg")?a=parseColor(n):o=parseColor(n),writeColors(o,a,!1),out(-1!==n.indexOf("bg")?" ":"")):"c{important}"===n||out(n);clearColors(),out(" ")}},stripNewlines=e=>e.toString().replace(/\r?\n|\r/g,"");var paren=/.*\(.*\).*/g,defaultSegments={exitcode:e=>{var r="left";e.a&&(r=e.a);var t="err";e.c&&(t=e.c);var s="check";e.c2&&(s=e.c2);var n=parseInt(process.argv[2],10);if(isNaN(n))throw new Error("No exitcode passed");0===n?addSegment(config.unicodechars.check,r,bgc[s],fgc[s],!0,!1):addSegment(config.unicodechars.err+" "+n+(n!=config.segments.segconfig.exitcode.codes.default[n]?": "+config.segments.segconfig.exitcode.codes.default[n]:""),r,bgc[t],fgc[t],!0,!1)},user:e=>{var r="left";e.a&&(r=e.a);var t="user";e.c&&(t=e.c);var s=readTerminalProcess("whoami",[],"");addSegment(stripNewlines(s.stdout),r,bgc[t],fgc[t],!0,!1)},dir:e=>{var r="left";e.a&&(r=e.a);var t="dir";e.c&&(t=e.c);var s=config.segments.segconfig.dirlength,n=stripNewlines(readTerminalProcess("pwd",[],"").stdout);const o=require("os").homedir();(n=n.replace(o,"~")).length>s&&(n=config.unicodechars.dotdotdot+n.slice(-(s-1))),n.split("/").forEach((e,s,n)=>{if(""!==e){var o=s+1===n.length;addSegment(e,r,bgc[t],fgc[t],o,!o)}})},promptcharacter:e=>{var r="left";e.a&&(r=e.a);var t="user";e.c&&(t=e.c);var s=parseInt(stripNewlines(readTerminalProcess("id",["-u"],"").stdout),10);addSegment(0===s?"#":"$",r,bgc[t],fgc[t],!0,!1)},datetime:e=>{var r="left";e.a&&(r=e.a);var t="dir";e.c&&(t=e.c);var s=stripNewlines(readTerminalProcess("date",["+"+config.segments.segconfig.datefmt],"").stdout),n=stripNewlines(readTerminalProcess("date",["+"+config.segments.segconfig.timefmt],"").stdout);addSegment(s,r,bgc[t],fgc[t],!1,!0),addSegment(n,r,bgc[t],fgc[t],!0,!1)},gitCompile:e=>{var r="left";e.a&&(r=e.a);e.c&&(r=e.c);let t=[];config.segments.segconfig.gitsegments.forEach(e=>{if(paren.test(e))throw new Error("Cannot add arguments to individual gitsegments. Fix gitsegment "+e);t.push(new Function("c","global."+e+"('"+r+"','git');"))}),async.parallel(t)},battery:e=>{var r="left";e.a&&(r=e.a);e.c&&(r=e.c);var t,s,n=config.segments.segconfig.battery.customfile?config.segments.segconfig.battery.customfile:"/sys/class/power_supply/BAT"+config.segments.segconfig.battery.batno+"/uevent";fs.readFileSync(n).toString().split("\n").forEach(e=>{-1!==e.indexOf("POWER_SUPPLY_CAPACITY=")&&(t=e.replace("POWER_SUPPLY_CAPACITY=","")),-1!==e.indexOf("POWER_SUPPLY_STATUS=")&&(s=e.replace("POWER_SUPPLY_STATUS=",""))});let o=parseFloat(t,10)/10;if(!(o=(o=o<=10?o:10)>0?o:.1)||!s)throw new Error("Invalid battery file");var a=Math.round(8*o)/8,c=Math.floor(a);c===a?(10!==c&&c++,a=0):a-=c;var i=9-c;i=i>=0?i:0;var g="";let l;for(l=0;l<c;l++)g+=config.unicodechars.battery.fractionblocks[0];for(0!==a&&(g+=config.unicodechars.battery.fractionblocks[8-8*a]),l=0;l<i;l++)g+=" ";let f="Charging"===s?config.unicodechars.battery.bolt+" ":"";addSegment(f+(10*o).toString()+"%",r,bgc.dir,fgc.dir,!0,!1);let d=config.segments.segconfig.battery.indicator.normal,u=config.segments.segconfig.battery.indicator.low,m=t>config.segments.segconfig.battery.indicator.lowthreshold?d:u;addSegment(g,r,bgc.dir,bgc[m],!0,!1)},git:{getBranchName:()=>stripNewlines(readTerminalProcess("git",["rev-parse","--abbrev-ref","HEAD"],"").stdout),branch:(e,r)=>{var t=defaultSegments.git.getBranchName();addSegment(config.unicodechars.gitbranch+" "+t,e,bgc[r],fgc[r],!0,!1)},commits:(e,r)=>{var t=stripNewlines(readTerminalProcess("git",["rev-parse","--abbrev-ref","HEAD"],"").stdout),s=stripNewlines(readTerminalProcess("git",["rev-list","--left-right","--count","origin/"+t+"..."+t],"").stdout).split("\t"),n=parseInt(s[1],10),o=parseInt(s[0],10);if(0===n&&0===o)addSegment(config.unicodechars.arrows.up+config.unicodechars.arrows.down+config.unicodechars.check,e,bgc[r],fgc[r],!0,!1);else{var a="";0!==n&&(a+=config.unicodechars.arrows.up+" "+n),0!==o&&(a+=config.unicodechars.arrows.down+" "+o),addSegment(a,e,bgc[r],fgc[r],!0,!1)}},tag:(e,r)=>{var t=readTerminalProcess("git",["describe","--tags"],"");if(""===t.stderr.toString()){var s=stripNewlines(t.stdout);addSegment(s,e,bgc[r],fgc[r],!0,!1)}},conflicts:(e,r)=>{if(""!==stripNewlines(readTerminalProcess("git",["ls-files","--unmerged"],"").stdout))var t=config.unicodechars.err;else t=config.unicodechars.check;addSegment(t,e,bgc[r],fgc[r],!0,!1)},tracking:(e,r)=>{var t=readTerminalProcess("git",["diff","--numstat"]).stdout.toString(),s=readTerminalProcess("git",["diff","--cached","--numstat"]).stdout.toString(),n=t.split(/\r\n|\r|\n/).length-1,o=s.split(/\r\n|\r|\n/).length-1,a="";0===n&&0===o||(0!==n&&(a+="U "+n),0!==o&&(a+=(0!==n?" ":"")+"C "+o),addSegment(a,e,bgc[r],fgc[r],!0,!1))},stash:(e,r)=>{var t=readTerminalProcess("git",["stash","list"],"").stdout.toString().split(/\r\n|\r|\n/).length-1;0!==t&&addSegment(config.unicodechars.flag+" "+t,e,bgc[r],fgc[r],!0,!1)}},literal:(e,r)=>{var t="left";e.a&&(t=e.a);var s="dir";e.c&&(s=e.c);e.c2&&(s=e.c2),addSegment(r,t,bgc[s],fgc[s],!0,!1)}};global.defaultSegments=defaultSegments;const loadAddons=()=>{config.addons.forEach(e=>{require(__dirname+"/addons/"+e)})};config.addons.length>0&&config.addons.forEach(e=>{require(__dirname+"/addons/"+e)});var ps1=[],ps2=[],ps0=[],immersebar=[];const parseSegmentDefs=()=>{ps1=config.segments.ps1,ps2=config.segments.ps2,config.segments.ps0enabled&&(ps0=config.segments.ps0),immersebar=config.segments.immersebar};var segFuncs=[];const runSegmentNameFunction=e=>{segFuncs.push(new Function("c","global."+e+(-1!==e.indexOf("(")?";":"({});")))},chooseSegments=()=>{var e=process.argv[3];switch(parseSegmentDefs(),e){case"PS0":ps0.length>0&&config.segments.ps0enabled?(ps0.forEach(runSegmentNameFunction),async.parallel(segFuncs),drawSegments(left,[],!1)):out(process.env.PS0||"");break;case"PS1":ps1.length>0?(ps1.forEach(runSegmentNameFunction),async.parallel(segFuncs),drawSegments(left,[],!1)):out(process.env.PS1||"");break;case"PS2":ps2.length>0?(ps2.forEach(runSegmentNameFunction),async.parallel(segFuncs),drawSegments(left,[],!1)):out(process.env.PS2||"");break;case"MULTI":ps0.length>0&&config.segments.ps0enabled&&(ps0.forEach(runSegmentNameFunction),async.parallel(segFuncs),out('PS0="'),drawSegments(left,[],!1),out('"; '),segFuncs=[],left=[]),ps1.length>0&&(ps1.forEach(runSegmentNameFunction),async.parallel(segFuncs),out('PS1="'),drawSegments(left,[],!1),out('"; '),segFuncs=[],left=[]),ps2.length>0&&(ps2.forEach(runSegmentNameFunction),async.parallel(segFuncs),out('PS2="'),drawSegments(left,[],!1),out('"; '),segFuncs=[],left=[]);break;default:throw new Error("Invalid or blank segment mode")}process.exit(process.argv[2])},immerseDraw=()=>{parseSegmentDefs(),immersebar.forEach(runSegmentNameFunction),async.parallel(segFuncs),drawSegments(left,right,!0)};"-b"===process.argv[2]?(parseSegmentDefs(),immersebar.forEach(runSegmentNameFunction),async.parallel(segFuncs),drawSegments(left,right,!0)):chooseSegments();