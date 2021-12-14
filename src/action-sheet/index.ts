import { $ } from '@master/dom';
import { Element, Attr, Prop, MasterElement } from '@master/element';
import { Template } from '@master/template';
import { InteractionFactors } from '../../shared/target';
import debounce from '../../utils/debounce';
import { MasterModalElement } from '../modal';
import { MasterPopupElement } from '../popup';

import css from './action-sheet.scss';

const $window = $(window);

const NAME = 'action-sheet';

@Element('m-' + NAME)
export class MasterActionSheetElement extends MasterElement {
    static override css = css;

    @Prop()
    buttons: ActionSheetButton[] | (() => ActionSheetButton[]) = [];

    @Prop()
    popupOptions = {
        placement: 'bottom-start',
        willLock: true,
        willLockTrigger: true
    }

    @Prop()
    modalOptions = {
        placement: 'bottom',
        overlay: 'close'
    }

    @Prop()
    override title: string;

    @Attr()
    interactorName: string;

    interactor: MasterPopupElement | MasterModalElement;
    template = new Template(() => [
        'm-' + this.interactorName, {
            $created: (element) => {
                Object.assign(element, {
                    ...this[this.interactorName + 'Options'],
                    hidden: true,
                    emit: true,
                    emitterTargets: [this, element]
                });
                this.interactor = element;
            },
            $on: {
                closed: () => {
                    this.remove();
                }
            }
        }, [
            'm-header', {
                $if: !this.usePopup
            }, [
                document.createTextNode(this.title), {
                    $if: this.title
                },
                'm-button', {
                    slot: 'end',
                    class: 'close-button round filled',
                    style: '--bg-color: var(--bg-overlay)',
                    $on: {
                        click: () => this.close()
                    }
                }, [
                    'm-icon', {
                        name: 'cross'
                    }
                ]
            ],
            'm-content', {
                $if: !this.usePopup
            }, [
                'slot'
            ],
            'slot', { $if: this.usePopup }
        ]
    ])

    lightTemplate = new Template(() => [
        ...(Array.isArray(this.buttons) ? this.buttons : this.buttons())
            .filter((button) => button.hasOwnProperty('if') && button.if || !button.hasOwnProperty('if'))
            .map((button) => [
                'm-item', {
                    type: 'button',
                    class: this.usePopup ? 'xs' : 'filled indent-lined',
                    style: this.usePopup ? '--px: 1rem' : '--bg-color: var(--bg-raise)',
                    $on: {
                        click: async (event) => {
                            if (await button.handle?.(event)) {
                                this.close({ event });
                            }
                        }
                    }
                }, [
                    'span', {
                        $if: button.icon,
                        slot: 'start',
                        innerHTML: button.icon
                    },
                    // body
                    document.createTextNode(button.text),
                    // end
                    'span', {
                        $if: button.end,
                        class: 'f:12',
                        slot: 'end',
                        textContent: button.end
                    }
                ]
            ])
            .flat()
    ]);

    get usePopup() {
        return this.interactorName === 'popup';
    }

    constructor(options) {
        super();
        Object.assign(this, options);
    }

    async open(interactionFactors?: InteractionFactors): Promise<this> {

        if (!this.isConnected) {
            document.body.appendChild(this);
        }

        if (this.interactor?.openable) {
            await this.interactor.open.call(this.interactor, interactionFactors);
        } else {
            this.remove();
        }

        return this;
    }

    async close(interactionFactors?: InteractionFactors): Promise<this> {
        if (this.interactor?.closeable) {
            await this.interactor.close.call(this.interactor, interactionFactors);
        }
        return this;
    }

    override onConnected() {
        this.interactorName = window.outerWidth >= 600
            ? 'popup'
            : 'modal';
        $window.on('resize', debounce(() => {
            this.interactorName = window.outerWidth >= 600
                ? 'popup'
                : 'modal'
        }, 70), {
            id: [this, NAME]
        });
    }

    override onDisconnected() {
        $window.off({ id: [this, NAME] })
    }

    override render() {
        this.template.render(this.shadowRoot);
        this.lightTemplate.render(this);
    }
}

export interface ActionSheetButton {
    if?: boolean;
    icon?: string;
    text?: string;
    end?: string;
    handle?: (event: MouseEvent | TouchEvent) => boolean | void | Promise<boolean | void>;
}