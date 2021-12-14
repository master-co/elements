import { MasterElement, Attr, Event, EventEmitter } from '@master/element';

import { $, ListenerOptions } from '@master/dom';

const $body = $(document.body);

export class TargetElement extends MasterElement {

    @Attr({
        parse(target: TargetElement, value) {
            return (value && typeof value === 'string')
                ? document.querySelector(value)
                : value;
        },
        reflect: false
    })
    container: HTMLElement = document.body;

    @Attr()
    override hidden: boolean = false;

    @Attr({ reflect: false })
    duration: number = 500;

    @Attr({ reflect: false })
    durationOnClose: number;

    @Attr({ reflect: false })
    delay: number;

    @Attr({ reflect: false })
    fade: boolean;

    @Attr({ reflect: false })
    removeOnClosed: boolean;

    @Attr({ reflect: false })
    easing = 'cubic-bezier(.25,.8,.25,1)';

    @Attr({
        reflect: false,
        onUpdate(target: TargetElement, value: any, oldValue: any) {
            const name = target.constructor['elementName'];
            if (oldValue) {
                $body.off({ id: [target, name] });
            }

            if (value) {
                const toggleAttrKey = 'toggle-' + name;
                const typeSets = value.split(',');
                const typesOnOpen = typeSets[0]?.trim()?.split(' ');
                const typesOnClose = typeSets[1]?.trim()?.split(' ');
                const preventTrigger = target['preventTrigger'];
                const handle = function (event: Event) {
                    const trigger = this;
                    if (this.disabled) {
                        return;

                    }
                    const targetSelector = trigger.getAttribute(toggleAttrKey);

                    if (!target.matches(targetSelector)) {
                        return;
                    }

                    const eventType = event.type;
                    let hidden: boolean = target.hidden;
                    const lastTriggerFactors = target.lastTriggerFactors;
                    const interactionFactors = { trigger, event };

                    if (preventTrigger?.call(target, { interactionFactors, lastTriggerFactors, hidden })) {
                        return;
                    }

                    target.lastTriggerFactors = interactionFactors;

                    if (
                        /** 執行開啟：是否吻合執行開啟的條件與事件 */
                        hidden && typesOnOpen.indexOf(eventType) !== -1 ||
                        /** 執行關閉：是否吻合執行關閉的條件與事件 */
                        !hidden && typesOnClose?.indexOf(eventType) !== -1
                    ) {
                        if (
                            'checked' in trigger &&
                            (eventType === 'input' || eventType === 'change')
                        ) {
                            hidden = !!trigger.checked;
                            if (hidden) {
                                lastTriggerFactors.trigger = trigger;
                            }
                        }
                        target.currentEvent = event;
                        target.toggle(hidden, { trigger, event });
                    } else {
                        return;
                    }
                };
                const typeSet = new Set<string>(typeSets.join(' ').split(' '));
                for (const eachTypeSet of typeSet) {
                    const options: ListenerOptions = {
                        passive: true,
                        id: [target, name]
                    };
                    if (eachTypeSet.includes('contextmenu')) {
                        options.passive = false;
                        $body
                            .on(eachTypeSet, '[' + toggleAttrKey + ']', function (event) {
                                event.preventDefault();
                                handle.call(this, event);
                            }, options);
                    } else {
                        $body
                            .on(eachTypeSet, '[' + toggleAttrKey + ']', handle, options);
                    }
                }
                // open

            }
        }
    })
    triggerEvent: string = 'click';

    lastTriggerFactors: InteractionFactors;

    @Attr({ reflect: false, render: false })
    override emit: boolean = false;

    @Event()
    openEmitter: EventEmitter;

    @Event()
    closeEmitter: EventEmitter;

    @Event()
    openedEmitter: EventEmitter;

    @Event()
    closedEmitter: EventEmitter;

    changing: Promise<void>;
    currentEvent: Event;
    protected animations: Animation[] = [];
    closingDelay;
    openingDelay;

    canClose: () => Promise<boolean> | boolean = undefined;
    canOpen: () => Promise<boolean> | boolean = undefined;
    canAnimate: () => Promise<boolean> | boolean = undefined;

    private async prepare(interactionFactors?: InteractionFactors) {
        if (this.animations.length) {
            // console.log('-- 反轉', this.hidden ? 'CLOSE' : 'OPEN');
            for (const animation of this.animations) {
                animation.reverse();
            }
        } else if (this.duration) {
            // console.log('-- 動畫', this.hidden ? 'CLOSE' : 'OPEN');
            if (this.ready && (!this.canAnimate || this.canAnimate?.())) {
                this.toggleAttribute('changing', true);
                await this['toggling']({
                    easing: this.easing,
                    duration: this.hidden && this.durationOnClose || this.duration
                }, interactionFactors);
                this.toggleAttribute('changing', false);
                this.changing = null;
                this.animations = [];
                if (this.hidden) {
                    this.toggleAttribute('hidden', true);
                }
            }
            if (this.hidden) {
                this['handleOnClosed']?.call(this, interactionFactors);
            } else {
                this['handleOnOpened']?.call(this, interactionFactors);
            }
        }
    }

    updateTriggerState(interactionFactors: InteractionFactors) {
        if (this.triggerEvent) {
            const name = this.constructor['elementName'];
            const toggleAttrKey = 'toggle-' + name;
            document.querySelectorAll('[' + toggleAttrKey + ']')
                .forEach((eachToggle: Element) => {
                    if (this.matches(eachToggle.getAttribute(toggleAttrKey))) {
                        this.setTriggerState(eachToggle);
                    }
                });
        }
        if (interactionFactors?.trigger) {
            this.setTriggerState(interactionFactors.trigger);
        }
    }

    setTriggerState(trigger) {
        trigger.toggleAttribute('aria-expanded', !this.hidden);
        trigger.toggleAttribute('active', !this.hidden);
        const icon = trigger.querySelector('.toggled');
        if (icon) icon.toggleAttribute('active', !this.hidden);
    };

    setInteractionFactors(interactionFactors) {
        if (!interactionFactors) {
            return;
        }
        if (interactionFactors?.event && !interactionFactors?.trigger) {
            interactionFactors.trigger = interactionFactors.event.currentTarget;
        }
        this.lastTriggerFactors = interactionFactors;
    }

    async openable(): Promise<boolean> {
        if (
            !this.hidden ||
            this.canOpen && !await this.canOpen()
        ) {
            return false;
        }
        return true;
    }

    async open(interactionFactors?: InteractionFactors): Promise<this> {

        if (!await this.openable()) {
            return this;
        }

        if (!this.isConnected && !this.parentElement && this.container) {
            this.container.appendChild(this);
        }

        this.setInteractionFactors(interactionFactors);

        if (this.closingDelay) {
            this.closingDelay = clearInterval(this.closingDelay);
        }

        if (this.delay) {
            if (this.openingDelay) {
                return this;
            } else if (!this.changing) {
                await new Promise<void>((resolve) => {
                    this.openingDelay = setTimeout(() => {
                        resolve();
                        this.openingDelay = null;
                    }, this.delay);
                })
            }
        }

        this['_hidden'] = false;
        this.toggleAttribute('hidden', false);
        const handleOnOpen = this['handleOnOpen'];
        if (handleOnOpen) {
            await handleOnOpen.call(this, interactionFactors);
        }
        this.openEmitter(interactionFactors);
        this.updateTriggerState(interactionFactors);
        await (this.changing = this.prepare(interactionFactors));
        this.openedEmitter(interactionFactors);
        return this;
    }

    async closeable(): Promise<boolean> {
        if (
            this.hidden ||
            this.canClose && !await this.canClose()
        ) {
            return false;
        }
        return true;
    }

    async close(interactionFactors?: InteractionFactors): Promise<this> {
        if (!await this.closeable()) {
            return this;
        }

        this.setInteractionFactors(interactionFactors);

        if (this.openingDelay) {
            this.openingDelay = clearInterval(this.openingDelay);
        }

        if (this.delay) {
            if (this.closingDelay) {
                return this;
            } else if (!this.changing) {
                await new Promise<void>((resolve) => {
                    this.closingDelay = setTimeout(() => {
                        resolve();
                        this.closingDelay = null;
                    }, this.delay);
                })
            }
        }

        this['_hidden'] = true;
        const handleOnClose = this['handleOnClose'];
        if (handleOnClose) {
            await handleOnClose.call(this);
        }
        this.closeEmitter(interactionFactors);
        if (this.lastTriggerFactors?.trigger) {
            this.setTriggerState(this.lastTriggerFactors.trigger);
        }
        this.updateTriggerState(interactionFactors);
        await (this.changing = this.prepare(interactionFactors));
        this.currentEvent = null;
        if (this.removeOnClosed) {
            this.remove();
        }
        this.closedEmitter(interactionFactors);
        return this;
    }

    async toggle(hidden?: boolean, interactionFactors?: InteractionFactors): Promise<this> {
        hidden = typeof hidden === 'boolean' ? hidden : this.hidden;
        return await (hidden ? this.open(interactionFactors) : this.close(interactionFactors));
    }

    override onDisconnected() {
        $body.off({ id: [this, this.constructor['elementName']] });
        this.lastTriggerFactors = null;
    }

}

export interface InteractionFactors {
    trigger?: any;
    event?: Event;
    follow?: string
}