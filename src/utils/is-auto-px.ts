
//
//                         /----------\
//                        |            |    /-------\
//                        |  / top  \  |   |         |
//         /--- border ---+-| right  |-+---+- width -+---\
//        |                 | bottom |                    |
//        |                  \ left /                     |
//        |                                               |
//        |                              /----------\     |
//        |          /-------------\    |            |    |- END
//        |         |               |   |  / top  \  |    |
//        |         |  / margin  \  |   | | right  | |    |
//        |---------+-|           |-+---+-| bottom |-+----|
//        |            \ padding /         \ left /       |
// BEGIN -|                                               |
//        |                /---------\                    |
//        |               |           |                   |
//        |               |  / min \  |    / width  \     |
//         \--------------+-|       |-+---|          |---/
//                           \ max /       \ height /

const
    DASH = '-',
    BORDER = 'border',
    TOP = 'top',
    BOTTOM = 'bottom',
    RIGHT = 'right',
    LEFT = 'left',
    WIDTH = 'width',
    MARGIN = 'margin',
    PADDING = 'padding',
    MIN = 'min',
    MAX = 'max',
    HEIGHT = 'height',
    autoPxProps = [
        BORDER + DASH + TOP + DASH + WIDTH,
        BORDER + DASH + RIGHT + DASH + WIDTH,
        BORDER + DASH + BOTTOM + DASH + WIDTH,
        BORDER + DASH + LEFT + DASH + WIDTH,
        MARGIN,
        PADDING,
        MARGIN + DASH + TOP,
        MARGIN + DASH + RIGHT,
        MARGIN + DASH + BOTTOM,
        MARGIN + DASH + LEFT,
        PADDING + DASH + TOP,
        PADDING + DASH + RIGHT,
        PADDING + DASH + BOTTOM,
        PADDING + DASH + LEFT,
        MIN + DASH + WIDTH,
        MIN + DASH + HEIGHT,
        MAX + DASH + WIDTH,
        MAX + DASH + HEIGHT,
        TOP,
        BOTTOM,
        LEFT,
        RIGHT,
        WIDTH,
        HEIGHT
    ]

export default function isAutoPx(propKey: string) {
    return autoPxProps.indexOf(propKey) !== -1;
}
