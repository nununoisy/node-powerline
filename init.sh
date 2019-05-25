#!/bin/bash
# powerline setup
# source me in a bashrc

_POWERLINE_DIR="/home/noah/node-powerline"

_draw_immersebar() {
    ((TLINES--))
    tput sc                                                     #save cursor position
    tput cup "$TLINES" 0                                        #move to (lines),0
    node ${_POWERLINE_DIR}/powerline-min.js -b "$(tput cols)" "$(tput colors)"   #print immersebar
    tput rc                                                     #restore cursor position
    ((TLINES++))
}

_immersebar_setup() {
    export TLINES="$(tput lines)"
    ((TLINES--))
    ((TLINES--))
    tput sc                                     #save cursor position
    tput csr 0 "$TLINES"                        #set scroll region to exclude last line
    tput rc                                     #restore cursor position
    ((TLINES++))
    ((TLINES++))
    _draw_immersebar
}

_update_prompts() {
    SAVE="$?"
    set +m
    eval $(node ${_POWERLINE_DIR}/powerline-min.js $SAVE MULTI $(tput colors) &)
    _clear_immersebar
    wait
    set -m
    return $SAVE
}

_clear_immersebar() {
    ((TLINES--))
    tput sc
    tput cup "$TLINES" 0
    for i in $(seq 1 $(tput cols)); do
        printf ' '
    done
    tput rc
    ((TLINES++))
    _immersebar_setup
}

export TLINES="$(tput lines)"

trap '_clear_immersebar' WINCH # bash recieves SIGWINCH when terminal is resized

export PROMPT_COMMAND="_update_prompts; $PROMPT_COMMAND"
