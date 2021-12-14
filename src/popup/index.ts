import { Element, Attr, MasterElement } from '@master/element';
import { createPopper, Placement } from '@popperjs/core';
import { isInteractOutside } from '../../utils/is-interact-outside';
import { Template } from '@master/template';

import css from './popup.scss';
import { MasterContentElement } from '../../layout/content';
import { $ } from '@master/dom';
import { MasterTargetElement, InteractionFactors } from '../../shared/target';
import debounce from '../../utils/debounce';

const $body = $(document.body);
const innerHTML = $(document.documentElement);
const NAME = 'popup';
const lockedPopup = new Set();

@Element('m-' + NAME)
export class MasterPopupElement extends MasterTargetElement {
    static override css = css;
    /**
     * default
     */
    _fade = true;
    _duration = 300;

    content: MasterContentElement;
    reference: any;
    popper;
    #resizeObserver;

    @Attr({ reflect: false })
    offset: number = 0;

    @Attr({ reflect: false })
    distance: number = 8;

    @Attr({ reflect: false })
    boundaryPadding: number = 10;

    @Attr({ reflect: false })
    placement: Placement = 'bottom';

    @Attr({ reflect: false })
    closeOn = 'click:outside';

    @Attr()
    withOverlay: boolean;

    @Attr()
    willLock: boolean;

    @Attr()
    willLockTrigger: boolean;

    activeChildPopups = new Set;

    master: MasterElement;

    // arrow: SVGElement;

    lightTemplate: Template;
    contentTokens: any = () => [];

    template = new Template(() => [
        'm-overlay', {
            $if: this.withOverlay,
            part: 'overlay'
        },
        'div', {
            part: 'master',
            $created: (element: HTMLDivElement) => this.master = $(element)
        }, [
            'm-content', {
                'scroll-y': true,
                guide: true,
                part: 'content',
                $created: (element: MasterContentElement) => this.content = element
            }, [
                'slot', {
                    $created: (element) => element.on('slotchange', (event) => {
                        const onSlotChange = this['onSlotChange'];
                        if (onSlotChange) {
                            onSlotChange.call(this, event);
                        }
                    })
                },
                ...this.contentTokens(),
                // 'div', {
                //     slot: 'part',
                //     part: 'arrow',
                //     $created: (element: SVGAElement) => this.arrow = element
                // }, [
                //     'svg', {
                //         part: 'arrow-icon',
                //         height: 10,
                //         viewBox: '0 0 64 20',
                //         $namespace: 'http://www.w3.org/2000/svg',
                //         innerHTML: '<g transform="matrix(1.04009,0,0,1.45139,-1.26297,-65.9145)"><path d="M1.214,59.185C1.214,59.185 12.868,59.992 21.5,51.55C29.887,43.347 33.898,43.308 42.5,51.55C51.352,60.031 62.747,59.185 62.747,59.185L1.214,59.185Z"></path></g>'
                //     }
                // ]
            ]
        ]
    ]);

    protected preventTrigger({ interactionFactors, lastTriggerFactors, hidden }) {

        if (interactionFactors.trigger !== lastTriggerFactors?.trigger) {
            if (this.popper) {
                this.popper.state.elements.reference = interactionFactors.trigger;
                this.popper.update();
            }
        }

        if (!hidden && interactionFactors.event.type === 'mouseout') {
            return !isInteractOutside(this.master, event, this.distance);
        }
    }

    private whetherToClose = (event: any, interactionFactors: InteractionFactors = {}) => {
        if (this.activeChildPopups.size) {
            return;
        }

        /**
         * 不可使用 isInteractOutside 來偵測 trigger 互動範圍，會有偵測誤差的問題存在，暫時無解
         */
        const isInteractTriggerOutside = !!interactionFactors.trigger
            && event.target !== interactionFactors.trigger
            && !interactionFactors.trigger.contains(event.target);
        const isInteractTargetOutside = isInteractOutside(this.master, event, this.distance);

        if (isInteractTriggerOutside && isInteractTargetOutside) {
            this.close();
        } else if (
            this.closingDelay && (!isInteractTriggerOutside || !isInteractTargetOutside)
        ) {
            this.closingDelay = clearInterval(this.closingDelay);
        }
    }

    updateSize(rect: DOMRect) {
        const windowHeight = window.innerHeight;
        const bottomDistance = windowHeight - (rect.y + rect.height);
        const topDistance = rect.y;
        this.master.css('maxHeight', (topDistance < bottomDistance ? bottomDistance : topDistance) - this.distance - 10);
        this.style.setProperty('--trigger-width', rect.width + 'px');
    }

    async handleOnOpen(interactionFactors: InteractionFactors = {}) {

        const { trigger, event, follow } = interactionFactors;

        const activate = (parent?: MasterPopupElement) => {
            if (!parent) {
                return;
            }
            if (parent.tagName === 'M-POPUP') {
                parent.activeChildPopups.add(this);
            } else if (parent !== $body) {
                activate(parent.parentNode as MasterPopupElement);
            }
        };

        if (trigger) {
            activate(trigger.parentNode as MasterPopupElement);
            this.updateSize(trigger.getBoundingClientRect());
        }

        if (this.willLock) {
            if (!lockedPopup.size) {
                document.body.classList.add('locked-by-popup');
            }
            lockedPopup.add(this);
            if (!this.willLockTrigger) {
                trigger?.classList.add('unlocked-by-popup');
            }
        }

        if (!this.popper) {
            let distance = this.distance;
            if (follow) {
                let x: number;
                let y: number;
                if (follow === 'cursor') {
                    if (event instanceof MouseEvent || event instanceof Touch) {
                        x = event.clientX;
                        y = event.clientY;
                        this.reference = {
                            getBoundingClientRect: () => ({
                                width: 0,
                                height: 0,
                                top: y,
                                right: x,
                                bottom: y,
                                left: x,
                            })
                        };
                    }
                    distance = 0;
                } else if (follow === 'range' && !this.reference) {
                    const selection = window.getSelection();
                    this.reference = {
                        getBoundingClientRect: () => {
                            return selection.getRangeAt(0).getClientRects().item(0);
                        }
                    }
                }
            } else {
                this.reference = trigger;
            }
            if (this.reference) {
                this.popper = createPopper(this.reference, this.master, {
                    placement: this.placement,
                    modifiers: [
                        // {
                        //     name: 'arrow',
                        //     options: {
                        //         element: this.arrow,
                        //     },
                        // },
                        {
                            name: 'offset',
                            options: {
                                offset: [this.offset, distance],
                            },
                        },
                        {
                            name: 'flip',
                            options: {
                                flipVariations: false,
                            },
                        },
                        {
                            name: 'preventOverflow',
                            options: {
                                padding: this.boundaryPadding,
                            }
                        }
                    ]
                });
            }
            innerHTML.off({ id: [this.whetherToClose] });
            if (this.closeOn) {
                if (this.closeOn.indexOf('move:outside') !== -1) {
                    innerHTML
                        .on('mousemove', (event) => {
                            this.whetherToClose(event, interactionFactors)
                        }, { passive: true, id: [this.whetherToClose] });
                }
                if (this.closeOn.indexOf('click:outside') !== -1) {
                    innerHTML
                        .on('click', (event) => {
                            if (this.contains(event.target)) {
                                return;
                            }
                            this.whetherToClose(event, interactionFactors);
                        }, { passive: true, id: [this.whetherToClose] });
                }
            }
        }
    }

    override canAnimate = () => {
        const { x, y, width, height } = this.popper?.state.rects.reference || {};
        return this.popper && (x || y || width || height);
    }

    handleOnOpened({ trigger, follow }: InteractionFactors = {}) {
        if (this.popper && !this.#resizeObserver && !follow) {
            this.#resizeObserver = new window.ResizeObserver((entries: ResizeObserverEntry[]) => {
                for (const entry of entries) {
                    if (entry.target === trigger) {
                        // determine whether element is hidden
                        if (!entry.contentRect.width && !entry.contentRect.height) {
                            this.close();
                            return;
                        }
                        this.updateSize(entry.contentRect);
                    }
                }
                this.popper?.update();
            });
            this.#resizeObserver.observe(this.content);
            trigger && this.#resizeObserver.observe(trigger);
        }
    }

    handleOnClose({ trigger, event }: InteractionFactors = {}) {
        const deactivate = (parent?: MasterPopupElement) => {
            if (!parent) {
                return;
            }
            if (parent.tagName === 'M-POPUP') {
                parent.activeChildPopups.delete(this);
            } else if (parent !== $body) {
                deactivate(parent.parentNode as MasterPopupElement);
            }
        };

        if (trigger) {
            deactivate(trigger.parentNode as MasterPopupElement);
        }

        // resolve [willLock] changed during opening
        if (lockedPopup.size) {
            lockedPopup.delete(this);
        }

        if (this.willLock) {
            if (!lockedPopup.size) {
                document.body.classList.remove('locked-by-popup');
            }
            trigger?.classList.remove('unlocked-by-popup');
        }
        this.reference = null;
        this.#resizeObserver = this.#resizeObserver?.disconnect();
        innerHTML.off({ id: [this.whetherToClose] });
    }

    handleOnClosed() {
        this.popper = this.popper?.destroy();
        this.master.css('maxHeight', '');
    }

    protected async toggling(
        options: KeyframeEffectOptions
    ) {
        let keyframes: any;

        let scale = '(1)';
        let transformOrigin = 'center';

        switch (this.popper?.state.placement.split('-')[0]) {
            case 'top':
                scale = 'Y(.9)';
                transformOrigin = 'center bottom';
                break;
            case 'bottom':
                scale = 'Y(.9)';
                transformOrigin = 'top center';
                break;
            case 'left':
                scale = 'X(.9)';
                transformOrigin = 'right center';
                break;
            case 'right':
                scale = 'X(.9)';
                transformOrigin = 'left center';
                break;
        }

        keyframes = [
            {
                transformOrigin,
                transform: 'scale' + scale,
                opacity: this.fade ? 0 : 1
            },
            {
                transformOrigin,
                transform: 'scaleY(1)',
                opacity: 1
            }
        ];

        if (this.hidden) {
            keyframes.reverse();
        }

        this.animations.push(this.content.animate(keyframes, options));

        return Promise.all(
            this.animations.map((animation) => new Promise((finish) => {
                animation.onfinish = finish
            }))
        )
    }

    override render() {
        this.template.render(this.shadowRoot);
        this.lightTemplate?.render(this);
    }

    override onDisconnected() {
        if (!this.hidden) {
            this.handleOnClose(this.lastTriggerFactors);
            this.handleOnClosed();
        }
    }
}