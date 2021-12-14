import { Element, MasterElement, Attr, attrEnabled } from '@master/element';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { ContentElement } from '../content';
import { HeaderElement } from '../header';
import { TargetElement, InteractionFactors } from '../shared/target';
import { Template } from '@master/template';

import css from './modal.scss';

const NAME = 'modal';
const PX = 'px';


@Element('m-' + NAME)
export class ModalElement extends TargetElement {
    static override css = css;

    master: any;
    wrap: any;
    header: HeaderElement;
    // footer: FooterElement;
    origin: any;

    @Attr()
    placement: string;

    @Attr({ reflect: false })
    pushing: string;

    @Attr({ reflect: false })
    closeOnScroll: boolean;

    @Attr({
        onUpdate(modal: ModalElement, value, oldValue) {
            if (
                value && oldValue ||
                !value && oldValue
            ) {
                modal.closeElement.off({ id: [NAME] });
            }
            if (value) {
                modal.closeElement
                    .on('click', async () => modal.close(), { passive: true, id: [NAME] });
            }
        }
    })
    closeButton: string;

    @Attr({ reflect: false })
    hideTrigger: boolean;

    // 'static', 'close', 'none'
    @Attr({
        onUpdate(modal: ModalElement, value: string, oldValue: string) {
            if (oldValue === 'close' || oldValue === 'none') {
                modal.overlayElement.off({ id: [NAME] });
            }
            if (value === 'close') {
                modal.overlayElement
                    .on('click', () => {
                        modal.close();
                    }, { passive: true, id: [NAME] });
            }
        }
    })
    overlay: string = 'static';

    overlayElement: MasterElement;
    closeElement: MasterElement;
    template = new Template(() => [,
        'm-overlay', {
            part: 'overlay',
            $if: attrEnabled(this.overlay),
            $created: (element: MasterElement) => this.overlayElement = element
        },
        'div', {
            part: 'master',
            $created: (element: MasterElement) => this.master = element
        }, [
            'slot', {
                $created: (element: HTMLElement) => this.wrap = element
            },
            'm-button', {
                part: 'close',
                class: 'round xs',
                $if: this.closeButton,
                $created: (element: MasterElement) => this.closeElement = element,
            }, [
                'm-icon', { name: this.closeButton, direction: 'left' }
            ]
        ]
    ]);

    lightTemplate: Template;

    override render() {
        this.template.render(this.shadowRoot);
        this.lightTemplate?.render(this);
    }

    override onDisconnected() {
        this.template.destroy();
    }

    protected toggling(
        options: KeyframeEffectOptions,
        { trigger, event }: InteractionFactors = {}
    ) {
        let keyframes: any;
        let content: ContentElement;
        let pushing;

        const currentTrigger = this.lastTriggerFactors?.trigger;

        if (this.placement === 'origin' && currentTrigger) {
            if (!this.hidden && this.hideTrigger) {
                currentTrigger.toggleClass('invisible', true);
            }

            content = Array.from(this.children)
                .filter((eachElement) => eachElement.matches('m-content'))[0] as ContentElement;

            if (content) {
                content.disable();
                content.scrollToPoint({ x: 0, y: 0 }, this.duration);
            }

            const
                triggerRect = currentTrigger.getBoundingClientRect(),
                rootRect = this.master.getBoundingClientRect();

            const scale = triggerRect.width / rootRect.width;
            const x =
                triggerRect.left - rootRect.left
                + (triggerRect.width - rootRect.width) / 2;
            const y =
                triggerRect.top - rootRect.top
                + (triggerRect.height - rootRect.height) / 2;

            keyframes = [
                {
                    transform: `translate(${x + PX}, ${y + PX}) scale(${scale})`,
                    height: triggerRect.height / scale + PX,
                    opacity: this.fade ? 0 : 1
                },
                {
                    transform: 'translate(0,0) scale(1)',
                    height: rootRect.height + PX,
                    opacity: 1
                }
            ];
        } else {
            if (!this.placement || this.placement === 'origin') {
                keyframes = [
                    { opacity: 0 },
                    { opacity: 1 }
                ];
            } else if (this.placement === 'center') {
                keyframes = [
                    {
                        transform: `scale(${this.hidden ? .9 : 1.1})`,
                        opacity: 0
                    },
                    {
                        transform: 'scale(1)',
                        opacity: 1
                    }
                ];
            } else {
                let pushingKeyframes;
                let dir;
                let offset;
                let pushingOffset;
                switch (this.placement) {
                    case 'right':
                        dir = 'X';
                        offset = '100%';
                        if (this.pushing)
                            pushingOffset = -this.master.offsetWidth / 3;
                        break;
                    case 'left':
                        dir = 'X';
                        offset = '-100%';
                        if (this.pushing)
                            pushingOffset = this.master.offsetWidth / 3;
                        break;
                    case 'bottom':
                        dir = 'Y';
                        offset = '100%';
                        if (this.pushing)
                            pushingOffset = -this.master.offsetHeight / 3;
                        break;
                    case 'top':
                        dir = 'Y';
                        offset = '-100%';
                        if (this.pushing)
                            pushingOffset = this.master.offsetHeight / 3;
                        break;
                }

                if (this.pushing) {
                    pushingKeyframes = [
                        { transform: 'translate' + dir + '(0)' },
                        { transform: 'translate' + dir + '(' + pushingOffset + PX + ')' }
                    ];

                    if (this.hidden)
                        pushingKeyframes.reverse();

                    pushing = document.querySelector(this.pushing);
                    if (pushing) {
                        this.animations.push(
                            pushing.animate(pushingKeyframes, {
                                ...options,
                                fill: 'both'
                            })
                        );
                    }
                }

                keyframes = [
                    { transform: 'translate' + dir + '(' + offset + ')' },
                    { transform: 'translate' + dir + '(0)' }
                ];
            }

        }

        const overlayKeyframes = [
            { opacity: 0 },
            { opacity: 1 }
        ];

        if (this.hidden) {
            keyframes.reverse();
            overlayKeyframes.reverse();
        }

        if (attrEnabled(this.overlay)) {
            this.animations.push(
                this.overlayElement.animate(overlayKeyframes, options)
            );
        }

        const animation = this.master.animate(keyframes, options);
        this.animations.push(animation);
        return new Promise<void>((finish) => {
            animation.onfinish = () => {
                const hidden = this.hidden;
                if (hidden && currentTrigger && this.hideTrigger) {
                    currentTrigger.toggleClass('invisible', false);
                }
                if (content) {
                    if (hidden) {
                        enableBodyScroll(content.master);
                    } else {
                        disableBodyScroll(content.master);
                        content.enable();
                    }
                }
                finish();
            };
        });
    }
}
