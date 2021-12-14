import { Attr, Element, Watch } from '@master/element';
import { OptionElement } from '../option';
import { Template } from '@master/template';

import css from './select-popup.scss';
import { $ } from '@master/dom';

import { ContentElement } from '../content';
import { SelectElement } from '.';
import { ItemElement } from '../item';
import { PopupElement } from '../popup';
import { InteractionFactors } from '../shared/target';
import { getCleanTextContents } from '../utils/get-clean-text-contents';

const NAME = 'select-popup';

@Element('m-' + NAME)
export class SelectPopupElement extends PopupElement {

    static override css = css;

    @Attr({
        observe: false,
        render: false
    })
    searching: boolean

    @Attr({
        observe: false
    })
    busy: boolean;

    override  _duration = 300;
    _triggerEvent = null;
    items: ItemElement[] = [];
    override content: ContentElement;
    select: SelectElement;

    override contentTokens: any = () => [
        'div', {
            $if: this.busy,
            part: 'querying',
        }, [
            'm-icon', {
                name: 'spinner'
            }
        ],
        'div', {
            $if: !this.busy && this.q && this.#foundCount === 0 && !this.select.addable,
            part: 'search-info',
            textContent: 'Not Found'
        },
        'm-item', {
            class: this.select.popupItemSize,
            type: 'button',
            $if: !this.busy && this.q && !this.#totallyMatchQ && this.select.addable,
            $on: {
                click: () => {
                    this.select.addEmitter({
                        value: this.q
                    });
                }
            }
        }, [
            'm-icon', {
                style: 'color: var(--f-fade)',
                name: 'add',
                slot: 'start'
            },
            document.createTextNode(this.q)
        ]
    ];

    override lightTemplate = new Template(() => this.select.options
        .map((option: OptionElement) => [
            'm-item', {
                class: this.select.popupItemSize,
                type: 'button',
                empty: option.empty,
                'data-q': option.q,
                selected: option.selected,
                disabled: option.disabled,
                $if: !this.busy,
                $id: option,
                innerHTML: option.innerHTML,
                $created: (item: ItemElement) => {
                    this.items.push(item);
                },
                $removed: (item: ItemElement) => {
                    this.items.splice(this.items.indexOf(item), 1);
                }
            },
            // /**
            //  * 透過單一解析防止元素重新 render 並閃爍
            //  */
            // Array.from(option.childNodes)
            //     .map((node) => {
            //         if (node instanceof Text) {
            //             return node.cloneNode();
            //         } else if (node instanceof HTMLElement) {
            //             return [
            //                 node.tagName, {
            //                     ...$(node).attr(),
            //                     innerHTML: node.innerHTML
            //                 }
            //             ]
            //         }
            //     })
            //     .flat(),
            [
                'm-check', {
                    slot: 'end',
                    name: '!option' + this.select.uid,
                    class: 'sm',
                    style: 'margin-left: 1rem',
                    type: this.select.multiple ? 'checkbox' : 'radio',
                    checked: option.selected,
                    disabled: option.disabled,
                    $on: {
                        change: (event) => {
                            option.selected = event.target.parentElement.checked;
                            if (this.select.multiple) {
                                if (this.select.output?.isContentEditable) {
                                    this.select.output.focus();
                                    if (this.q) {
                                        this.search('');
                                    }
                                }
                            } else {
                                this.close();
                            }
                            if (!this.select.dirty) {
                                this.select.dirty = true;
                            }
                            this.select.composeValue();
                            this.select.changeEmitter(this.select.value);
                        },
                        click: (event) => {
                            if (!this.select.multiple && event.target.parentElement.checked) {
                                this.close();
                            }
                        }
                    }
                }
            ]
        ])
        .flat()
    );

    #foundCount: number = 0;
    #totallyMatchQ = false;
    q: string;

    async search(q: string) {
        this.q = q;
        this.#foundCount = 0;
        this.#totallyMatchQ = false;
        this.searching = !!q;
        if (q) {
            if (this.hidden) {
                await this.select.openPopup();
            }
            this.items.forEach((eachItem: ItemElement) => {
                const optionQ =
                    eachItem.dataset.q
                        ? eachItem.dataset.q
                        : getCleanTextContents(eachItem.childNodes)
                const found = optionQ.indexOf(q) !== -1;
                if (found) this.#foundCount++;
                if (optionQ === q) {
                    this.#totallyMatchQ = true;
                }
                eachItem
                    .toggleAttribute('found', found);
            });
            this.select.outputText(q);
        } else {
            if (!this.hidden && !this.items.length) {
                this.close();
            }
        }
        this.render();
    }

    onSlotChange() {
        this.lightTemplate.render(this);
    }

    scrollToFirstSelectedItem() {
        if (this.busy) {
            return;
        }
        const firstSelectedIndex = this.select.options.findIndex((eachOption) => eachOption.selected);
        setTimeout(() => {
            this.content.renderScroll();
            if (this.content.scrollable && firstSelectedIndex !== -1) {
                this.content.scrollToPoint({
                    element: this.items[firstSelectedIndex],
                    duration: 0
                })
            }
        })
    }

    override async handleOnOpen(interactionFactors?: InteractionFactors) {
        await super.handleOnOpen(interactionFactors);
        if (this.select.querying) {
            this.busy = true;
            await this.select.querying;
            this.busy = false;
        }
        if (!this.hidden) {
            this.scrollToFirstSelectedItem();
            this.select.openEmitter();
        }
    }

    override handleOnOpened() {
        if (!this.hidden) {
            this.select.openedEmitter();
        }
    }

    override handleOnClose({ trigger, event }: InteractionFactors = {}) {
        super.handleOnClose({ trigger, event });
        if (this.select.multiple) {
            this.select.outputText('');
        } else {
            this.select.outputText();
        }
        this.select.focused = false;
        this.select.touched = true;
        if (this.isConnected) {
            if (this.changing) {
                this.select.render();
            }
            this.select.closeEmitter();
        }
    }

    override handleOnClosed() {
        super.handleOnClosed();
        this.#foundCount = 0;
        this.q = '';
        this.searching = false;
        this.select.popup = null;
        if (this.isConnected) {
            this.select.closedEmitter();
        }
    }
}
