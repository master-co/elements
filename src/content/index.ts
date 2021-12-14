import { Element, MasterElement, Attr, Event, EventEmitter, Watch } from '@master/element';
import { Template } from '@master/template';
import { $ } from '@master/dom';
import { MasterTargetElement } from '../../shared/target';
import css from './content.scss';
import isNum from '../../utils/is-num';
import debounce from '../../utils/debounce';

const NAME = 'content';
const PX = 'px';
const $window = $(window);
const $body = $(document.body);

const
    SCROLL_KEY = 'scroll',
    OFFSET_KEY = 'offset',
    WIDTH_KEY = 'Width',
    HEIGHT_KEY = 'Height',
    CLIENT_KEY = 'client',
    LEFT_KEY = 'Left',
    TOP_KEY = 'Top',
    SIZE_KEY = { X: 'width', Y: 'height' },
    SCROLL_SIZE_KEY = { X: SCROLL_KEY + WIDTH_KEY, Y: SCROLL_KEY + HEIGHT_KEY },
    POSITION_KEY = { X: 'x', Y: 'y' },
    SCROLL_POSITION_KEY = { X: SCROLL_KEY + LEFT_KEY, Y: SCROLL_KEY + TOP_KEY },
    OFFSET_POSITION_KEY = { X: OFFSET_KEY + LEFT_KEY, Y: OFFSET_KEY + TOP_KEY },
    CLIENT_SIZE_KEY = { X: CLIENT_KEY + WIDTH_KEY, Y: CLIENT_KEY + HEIGHT_KEY },
    OFFSET_SIZE_KEY = { X: OFFSET_KEY + WIDTH_KEY, Y: OFFSET_KEY + HEIGHT_KEY };


@Element('m-' + NAME)
export class MasterContentElement extends MasterTargetElement {
    static override css = css;

    #time: any = {};
    #bar: any = {};
    #scrollEndTimeout: any;
    #animationFrame: any;
    #enabled: boolean;
    #thumb: any = {};
    #lastMorePosition: number = 0;
    masterOffsetRect: { width: number, height: number };
    contentRect: DOMRect;
    template = new Template(() => [
        'div', {
            part: 'master',
            $created: (element: MasterElement) => this.master = element
        }, [
            'slot', {
                part: 'content',
                $created: (element: HTMLSlotElement) => this.content = element
            }
        ],
        'slot', {
            name: 'part'
        },
        'svg', {
            part: 'scrollbar-x',
            hidden: !this.scrolling,
            $if: this.scrollX,
            $created: (element: MasterElement) => this.#bar.X = element
        }, [
            'm-thumb', {
                $created: (element: MasterElement) => this.#thumb.X = element
            }
        ],
        'svg', {
            part: 'scrollbar-y',
            hidden: !this.scrolling,
            $if: this.scrollY,
            $created: (element: MasterElement) => this.#bar.Y = element
        }, [
            'm-thumb', {
                $created: (element: MasterElement) => this.#thumb.Y = element
            }
        ]
    ]);

    master: MasterElement;
    content: HTMLSlotElement;
    scrolling = false;

    get maxX(): number {
        this.checkRect();
        const scrollableSize = this.master[SCROLL_SIZE_KEY['X']],
            masterSize = this.masterOffsetRect[SIZE_KEY['X']];
        return scrollableSize - masterSize < 0 ? 0 : (scrollableSize - masterSize);
    };

    get maxY(): number {
        this.checkRect();
        const scrollableSize = this.master[SCROLL_SIZE_KEY['Y']],
            masterSize = this.masterOffsetRect[SIZE_KEY['Y']];
        return scrollableSize - masterSize < 0 ? 0 : (scrollableSize - masterSize);
    };

    x = 0;
    y = 0;

    @Event()
    moreEmitter: EventEmitter;

    @Event()
    scrollEmitter: EventEmitter;

    @Event()
    scrollStartEmitter: EventEmitter;

    @Event()
    scrollEndEmitter: EventEmitter;

    @Attr({ reflect: false, render: false })
    override duration: number = 300;

    @Attr({ reflect: false, render: false })
    override emit: boolean = false;

    @Attr()
    active: boolean;

    @Attr({ reflect: false })
    guide: boolean;

    @Attr({ reflect: false })
    guideSize: number = 48;

    @Attr({ reflect: false, render: false })
    page = 0;

    @Attr({
        onUpdate(content) {
            (content.scrollX || content.scrollY) ? content.enable() : content.disable();
        }
    })
    scrollY: boolean;

    @Attr({
        onUpdate(content) {
            (content.scrollX || content.scrollY) ? content.enable() : content.disable();
        }
    })
    scrollX: boolean;

    @Attr()
    overscroll: boolean;

    @Attr({ observe: false, render: false })
    reachX: number;

    @Attr({ observe: false, render: false })
    reachY: number;

    @Attr()
    name: string;

    @Attr()
    collapseX: boolean = false;

    @Attr()
    collapseY: boolean = false;

    #resizeObserver;

    override render() {
        this.template.render(this.shadowRoot);
        this.renderScroll();
    }

    enable() {
        if (this.#enabled) return;
        this.#enabled = true;
        this.scrolling = false;
        this.master
            .on('scroll', (event: any) => {
                if (!this.scrollable) return;
                if (!this.scrolling) {
                    this.scrolling = true;
                    this.template.render(this.shadowRoot);
                    this.scrollStartEmitter();
                }
                this.renderScroll();
                this.scrollEmitter();
                if (this.#scrollEndTimeout) {
                    this.#scrollEndTimeout = clearTimeout(this.#scrollEndTimeout);
                }
                this.#scrollEndTimeout = setTimeout(() => {
                    if (this.#animationFrame) {
                        this.#animationFrame = window.cancelAnimationFrame(this.#animationFrame);
                    }
                    this.scrolling = false;
                    this.#time.X = this.#time.Y = 0;
                    this.template.render(this.shadowRoot);
                    this.scrollEndEmitter();
                }, 100);
            }, {
                id: [NAME],
                passive: true
            })

        this.#resizeObserver = new window.ResizeObserver((entries: ResizeObserverEntry[]) => {
            entries.forEach((entry) => {
                switch (entry.target) {
                    case this.master:
                        this.masterOffsetRect = {
                            width: this.master[OFFSET_SIZE_KEY['X']],
                            height: this.master[OFFSET_SIZE_KEY['Y']]
                        }
                        break;
                }
            });
            this.renderScroll();
        });
        this.#resizeObserver.observe(this.master);
        this.#resizeObserver.observe(this.content);

        $window.on('resize', () => this.renderScroll(), {
            id: [this, 'scroll']
        })
    }

    disable() {
        if (!this.#enabled) return;
        this.#enabled = false;
        this.master.off({ id: ['scroll'] });
        $window.off({ id: [this, 'scroll'] });
        this.#resizeObserver.unobserve(this.master);
        this.#resizeObserver.unobserve(this.content);
    }

    get scrollable(): boolean {
        return !!(this.scrollX && this.maxX || this.scrollY && this.maxY);
    }

    scrollToPoint(
        { x, y, element, duration }: { x?: number, y?: number, element?: HTMLElement, duration?: number },
        complete?: any
    ) {
        if (!this.scrollable) return;
        const to = { X: x, Y: y };

        if (element) {
            const
                calc = (dir: string) => {
                    to[dir] = element[OFFSET_POSITION_KEY[dir]];
                    this.checkRect();
                    const
                        elementSize = element[CLIENT_SIZE_KEY[dir]],
                        offsetSize = this.masterOffsetRect[SIZE_KEY[dir]],
                        centerOffset = (offsetSize - elementSize) / 2;
                    if (to[dir] < centerOffset) {
                        to[dir] = 0;
                    } else if (
                        to[dir] >= this['max' + dir] + centerOffset
                    ) {
                        to[dir] = this['max' + dir];
                    } else {
                        to[dir] -= centerOffset;
                    }
                };
            if (this.scrollX) calc('X');
            if (this.scrollY) calc('Y');
        } else {
            const
                calc = (dir: string) => {
                    if (to[dir] > this['max' + dir]) {
                        to[dir] = this['max' + dir];
                    } else if (to[dir] < 0) {
                        to[dir] = 0;
                    }
                    const current = this[POSITION_KEY[dir]] = this.master[SCROLL_POSITION_KEY[dir]];
                    if (to[dir] === current) return to[dir] = null;
                };
            if (this.scrollX) calc('X');
            if (this.scrollY) calc('Y');
        }

        if (this.scrolling) {
            if (this.#animationFrame) {
                this.#animationFrame = window.cancelAnimationFrame(this.#animationFrame);
            }
            this.#time.X = this.#time.Y = 0;
        }

        if (duration === 0) {
            if (this.scrollX && isNum(to.X)) this.x = this.master.scrollLeft = to.X;
            if (this.scrollY && isNum(to.Y)) this.y = this.master.scrollTop = to.Y;
        } else {
            duration = duration || this.duration;
            const scroll = (dir: string, currentValue: number, toValue: number) => {
                this.#time[dir] += 20;
                const newValue =
                    (function (t, b, c, d) {
                        t = (t /= d) * .5;
                        return Math.round(b + c * t);
                    })(this.#time[dir], currentValue, toValue - currentValue, duration);
                if (currentValue !== Math.round(toValue)) {
                    this.scrolling = true;
                    this[POSITION_KEY[dir]] = this.master[SCROLL_POSITION_KEY[dir]] = newValue;
                    this.#animationFrame = window.requestAnimationFrame(() => scroll(dir, newValue, toValue));
                } else {
                    this.scrolling = false;
                    if (complete) complete();
                }
            };
            if (this.scrollX && isNum(to.X)) scroll('X', this.x = this.master[SCROLL_POSITION_KEY.X], to.X);
            if (this.scrollY && isNum(to.Y)) scroll('Y', this.y = this.master[SCROLL_POSITION_KEY.Y], to.Y);
        }
    }

    private checkRect() {
        if (!this.masterOffsetRect) {
            this.masterOffsetRect = {
                width: this.master.offsetWidth,
                height: this.master.offsetHeight
            };
        }
    }

    renderScroll() {
        const render = (dir: string) => {
            if (!this['scroll' + dir]) {
                return;
            }

            this.checkRect();

            const
                scrollable = this.scrollable,
                scrollableSize = this.master[SCROLL_SIZE_KEY[dir]],
                // tslint:disable-next-line: radix
                masterOffsetSize = this.masterOffsetRect[SIZE_KEY[dir]],
                scrollPosition = this[POSITION_KEY[dir]] = this.master[SCROLL_POSITION_KEY[dir]],
                maxPosition = this['max' + dir],
                reach = scrollPosition <= 0 ? -1 : scrollPosition >= maxPosition ? 1 : 0;

            if (this.guide) {
                const
                    guideSize = this.guideSize,
                    startGuide = (scrollPosition < guideSize) ? scrollPosition : guideSize,
                    endGuide = (scrollPosition > maxPosition - guideSize) ?
                        (masterOffsetSize + scrollPosition - maxPosition) :
                        (masterOffsetSize - guideSize),
                    maskImage =
                        scrollable ?
                            `linear-gradient(to ${dir === 'X' ? 'right' : 'bottom'},rgba(0,0,0,0) 0px,rgba(0,0,0,1) ${startGuide}px,rgba(0,0,0,1) ${endGuide}px,rgba(0,0,0,0) ${masterOffsetSize}px)` :
                            '';
                // tslint:disable-next-line: deprecation
                this.master.style.webkitMaskImage = this.master.style['maskImage'] = maskImage;
            }

            if (!scrollable) {
                this.scrollTop = 0;
                this.scrollLeft = 0;
                this.#lastMorePosition = 0;
            }

            let morePosition = maxPosition * 2 / 3;

            if (this.#lastMorePosition > 0) {
                morePosition = this.#lastMorePosition + (maxPosition - this.#lastMorePosition) / 2;
            }

            if (
                maxPosition === 0 ||
                scrollPosition >= morePosition && morePosition > this.#lastMorePosition ||
                scrollableSize === masterOffsetSize
            ) {
                this.#lastMorePosition = morePosition;
                this.page++;
                this.moreEmitter();
            }

            if (this['reach' + dir] !== reach) this['reach' + dir] = reach;

            const thumb = this.#thumb[dir];

            if (thumb) {
                const bar = this.#bar[dir];
                const
                    barPosition = scrollPosition < 0 ? 0 : (scrollPosition > maxPosition ? maxPosition : scrollPosition);
                const
                    barStyles = $window.getComputedStyle(bar),
                    // tslint:disable-next-line: radix
                    padding = parseInt(barStyles['padding']),
                    // tslint:disable-next-line: radix
                    barSize = parseInt(barStyles[SIZE_KEY[dir]]) - padding * 2,
                    thumbSize = barSize / (maxPosition + barSize) * barSize;
                thumb.style.transform =
                    'translate' + dir + '(' + barPosition / (maxPosition + barSize) * barSize + 'px)';
                thumb.style[SIZE_KEY[dir]] = thumbSize + 'px';
            }
        };
        render('X');
        render('Y');
    }

    reset() {
        this.#lastMorePosition = 0;
        this.page = 0;
        this.scrollToPoint({ y: 0, duration: 0 });
    }

    // stop current animation
    stop() {
        if (this.#animationFrame) {
            this.#animationFrame = window.cancelAnimationFrame(this.#animationFrame)
        }
        this.scrolling = false;
        this.#time.X = this.#time.Y = 0;
        this.render();
    }

    protected handleOnOpened() {
        this.renderScroll();
    }

    protected toggling(
        options: KeyframeEffectOptions
    ) {

        const keyframes = [];
        const startKeyframe: any = {};
        const endKeyframe: any = {};

        if (this.collapseY || this.collapseX && this.collapseY) {
            startKeyframe.height = 0 + PX;
            endKeyframe.height = this.offsetHeight + PX;
        }

        if (this.collapseX || this.collapseX && this.collapseY) {
            startKeyframe.width = 0 + PX;
            endKeyframe.width = this.offsetWidth + PX;
        }

        if (this.fade) {
            startKeyframe.opacity = 0;
            endKeyframe.opacity = 1;
        }

        if (this.hidden) {
            keyframes.push(endKeyframe, startKeyframe);
        } else {
            keyframes.push(startKeyframe, endKeyframe);
        }

        const animation = this.animate(keyframes, options);
        this.animations.push(animation);
        return new Promise((finish) => {
            animation.onfinish = finish;
        });
    }

    override onDisconnected() {
        $body.off({ id: [this, NAME] });
        this.disable();
        this.masterOffsetRect = null;
    }

}
