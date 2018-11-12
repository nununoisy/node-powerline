#!/bin/bash
# powerline setup
# source me in a bashrc

_POWERLINE_DIR="/home/noah/node-powerline"

_draw_immersebar() {
    ((TLINES--))
    tput sc                                                     #save cursor position
    tput cup "$TLINES" 0                                        #move to (lines),0
    node ${_POWERLINE_DIR}/powerline-min.js -b "$(tput cols)"   #print immersebar
    tput rc                                                     #restore cursor position
    ((TLINES++))
}

_immersebar_setup() {
    # you need an actually OK terminal for this, K?
    export TLINES="$(tput lines)"
    ((TLINES--))
    ((TLINES--))
    tput sc                                     #save cursor position
    tput csr 0 "$TLINES"                        #set scroll region to exclude last line
    tput rc                                     #restore cursor position
    ((TLINES++))
    ((TLINES++))
    _draw_immersebar "$TLINES"
}

_update_prompts() {
    SAVE="$?"
    set +m
    eval $(node ${_POWERLINE_DIR}/powerline-min.js $SAVE MULTI &)
    _draw_immersebar
    wait
    set -m
    return $SAVE
}

trap '_immersebar_setup' WINCH # bash recieves SIGWINCH when terminal is resized

_immersebar_setup

export PROMPT_COMMAND="_update_prompts; $PROMPT_COMMAND"
