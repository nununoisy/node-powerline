# node-powerline

Powerline in Node.js.

## But why?

Because I wanted to.

## Installation

For now this only runs on Bash.

First, grab Node.js. You can use your distro's repository or get it some other way. node-powerline was built on and requires at least Node 10, but works on Node 12.

Clone the repo into some folder on your computer, then grab the npm packages.
A good choice is your home folder.

```bash
cd ~
git clone https://github.com/nununoisy/node-powerline
cd node-powerline
npm i
```

Now you need to source `init.sh`. This can be done everytime you run Bash by adding this line somewhere in your `.bashrc`:

```bash
. ~/node-powerline/init.sh
```

(Replace the path with wherever you cloned the repo)

Now restart your terminal or run `. ~/node-powerline/init.sh` to begin using node-powerline!

## Configuration

The config is located in `powerline-cfg.json`. node-powerline expects this to be in the same directory as `powerline-min.js`. 

Colors should be ANSI color codes. Your terminal should support ANSI 256 color codes (like `\e[38;5;12m]`). A 16-color mode (`\e[44;1m]`) is available but will not auto-convert 256-color codes.

### Segments

node-powerline assembles **segments** - the content between the arrows. Each segment has content, text and background colors, and terminator overrides. Functions are called from reference in the config file.

### Make a segment

Addons can be added to a folder called addons in the directory containing `powerline-min.js`. They should export a function that takes one argument. The function should add an `Object` to the argument containing the functions to create segments.

## Build from source

Grab uglifyjs:

```bash
npm i -g uglifyjs
```

Then just:

```bash
make
```