// TODO: 待改成 push value and remove value

import { Element, Attr, Event, EventEmitter, Prop } from '@master/element';
import { $ } from '@master/dom';
import { Template } from '@master/template';

import css from './select.scss';
import './select-popup';

import { MasterControlElement } from '../../shared/control';
import { MasterOptionElement } from '../option';
import { SelectPopupElement } from './select-popup';
import { handleSlotEmpty } from '../../utils/handle-slot-empty';
import debounce from '../../utils/debounce';
import { getCleanTextContents } from '../../utils/get-clean-text-contents';

let uid = 0;

const NAME = 'select';

@Element('m-' + NAME)
export class MasterSelectElement extends MasterControlElement {
    static override css = css;
    lightTemplate = new Template(
        () => (this.multiple ? this.value || [] : [this.value])
            .map((selectedValue) => [
                'm-chip', {
                    $if: this.multiple,
                    $id: selectedValue,
                    slot: 'output',
                    class: 'sm filled'
                },
                () => {
                    const option = [
                        ...this.#options,
                        ...this.#outputOptions,
                    ]
                        .find((selectedOption) => this.isValueMatched(selectedOption.value, selectedValue));
                    if (option) {
                        const childNodes = Array.from(option.childNodes);
                        const text = getCleanTextContents(childNodes);
                        const slots = childNodes
                            .filter((node) => node instanceof HTMLElement && node.slot) as HTMLElement[];
                        return [
                            'span', { textContent: text, class: 't-line:1' },
                            /**
                             * 防止元素重新 render 並閃爍
                             */
                            ...slots
                                .map((slot) => [
                                    slot.tagName, {
                                        ...$(slot).attr(),
                                        innerHTML: slot.innerHTML
                                    }
                                ])
                        ]
                    } else {
                        return [document.createTextNode(selectedValue)]
                    }
                },
                [
                    'm-button', {
                        $if: !this.readOnly && !this.disabled,
                        class: 'close-button',
                        $on: {
                            click: (event) => {
                                event.stopPropagation();
                                if (this.output?.isContentEditable) {
                                    this.output.focus();
                                }
                                const matchedIndex = this.value
                                    .findIndex((eachValue) => this.isValueMatched(eachValue, selectedValue));
                                if (matchedIndex !== -1) {
                                    this.value.splice(matchedIndex, 1);
                                    this.value = [...this.value];
                                }
                                this.changeEmitter(this.value);
                            }
                        }
                    }, [
                        'm-icon', { name: 'cross' }
                    ]
                ]
            ]).flat(),
        () => [
            'input', {
                $attr: {
                    role: 'accessor',
                    name: this.name,
                    disabled: this.disabled,
                    required: this.required,
                    hidden: true // 不可使用 type: 'hidden' 驗證會無效
                },
                $created: (element: HTMLInputElement) => {
                    // prevent deeply clone issue
                    this.querySelector('input[role=accessor]')?.remove();
                    this.accessor = element;
                    this.validity = element.validity;
                }
            }
        ],
        () => {
            let start: HTMLElement;
            const tokens = [];
            if (!this.multiple) {
                const selectedOption = this.selectedOptions[0];
                if (selectedOption) {
                    const childNodes = Array.from(selectedOption.childNodes);
                    start = childNodes
                        .find((eachNode) => (eachNode as HTMLElement).slot === 'start') as HTMLElement;
                    if (start) {
                        tokens.push(
                            start.tagName,
                            {
                                ...$(start).attr(),
                                innerHTML: start.innerHTML
                            }
                        )
                    }
                }
            }
            return [
                ...tokens,
                'div', {
                    $if: this.multiple && (this.searchable && !this.readOnly || this.empty && this.label) || !this.multiple,
                    role: 'output',
                    slot: 'output',
                    label: this.label,
                    contenteditable: !this.readOnly && this.searchable && !this.disabled,
                    spellcheck: 'false',
                    disabled: this.disabled,
                    'aria-placeholder': this.placeholder,
                    $on: {
                        input: debounce(async (event: InputEvent) => {
                            if (this.searchable) {
                                await this.openPopup();
                                this.popup.search(this.output.textContent);
                            }
                        }, 250)
                    },
                    $created: (element, node) => {
                        this.output = element
                            .on('keydown', (event: KeyboardEvent) => {
                                if (event.key === 'Enter' && !event.isComposing) {
                                    event.preventDefault();
                                }
                            }, { id: [this] });
                    },
                    $removed: () => this.output = null
                }
            ];
        }
    )

    template = new Template(() => [
        'fieldset', [
            'legend', [
                'span', { part: 'label', textContent: this.label }
            ]
        ],
        'slot', {
            name: 'start',
            $on: { slotchange: (event) => handleSlotEmpty(event.target) },
            $created: (slot) => handleSlotEmpty(slot)
        },
        'slot', {
            $created: (slot: HTMLSlotElement) => {
                (slot as any).on('slotchange', () => {
                    const options = slot.assignedElements()
                        .filter((eachChild) => eachChild.tagName === 'M-OPTION') as MasterOptionElement[];
                    if (options.length) {
                        this.#options = options;
                        this.selectOptionByValue(this.value);
                        this.popup?.render();
                    }
                });
            }
        },
        'div', { part: 'body' }, [
            'slot', {
                name: 'output',
                $created: (slot: HTMLSlotElement) => {
                    (slot as any).on('slotchange', () => {
                        const options = slot.assignedElements()
                            .filter((eachChild) => eachChild.tagName === 'M-OPTION') as MasterOptionElement[];
                        if (options.length) {
                            this.#outputOptions = options;
                            this.render();
                        }
                    })
                }
            }
        ],
        'slot', {
            name: 'end',
            $on: { slotchange: (event) => handleSlotEmpty(event.target) },
            $created: (slot) => handleSlotEmpty(slot)
        },
        'label', { textContent: this.label },
        'm-icon', {
            $if: this.busy,
            name: 'spinner',
            part: 'spinner'
        },
        'm-icon', {
            $if: !this.readOnly,
            name: 'unfold',
            part: 'icon'
        }
    ]);

    @Event({ force: true, bubbles: true })
    addEmitter: EventEmitter;

    @Event({ force: true, bubbles: true })
    changeEmitter: EventEmitter;

    @Event()
    openEmitter: EventEmitter;

    @Event()
    closeEmitter: EventEmitter;

    @Event()
    openedEmitter: EventEmitter;

    @Event()
    closedEmitter: EventEmitter;

    @Attr({
        onUpdate(select: MasterSelectElement) {
            if (select.popup) {
                select.popup.render();
            }
        }
    })
    multiple: boolean = false;

    @Attr({ key: 'tabindex' })
    override tabIndex = 0;

    @Attr({ observe: false, render: false })
    focused: boolean;

    @Attr()
    addable: boolean;

    @Attr()
    popupItemSize: string = 'xs';

    @Prop({ render: false })
    querying: Promise<void>;

    uid: number;

    master: HTMLDivElement;
    popup: SelectPopupElement;
    output: HTMLInputElement;
    searchInfo: HTMLElement;
    updating: boolean;

    mutationObserver = new window.MutationObserver((mutations) => {
        let textChanged = false;

        mutations.forEach((eachMutationRecord) => {
            if (
                eachMutationRecord.type === 'characterData'
                && !this.output?.contains(eachMutationRecord.target)
            ) {
                textChanged = true;
            }
        })

        if (textChanged) {
            this.render();
            this.popup?.render();
        }
    });

    outputText(text?: string) {
        if (!this.output) {
            return;
        }
        if (text === undefined && !this.multiple) {
            const selectedOption = this.selectedOptions[0];
            if (selectedOption) {
                const childNodes = Array.from(selectedOption.childNodes);
                text = getCleanTextContents(childNodes);
            }
        }
        this.output.textContent = text;
    }

    #options: MasterOptionElement[] = [];
    #outputOptions: MasterOptionElement[] = [];

    set options(optionSettings) {
        this.#options = optionSettings?.map((optionSetting: any) => {
            const option = $('m-option', {
                value: optionSetting.value,
                q: optionSetting.q
            });
            option.textContent = optionSetting.text;
            if (optionSetting.start) {
                const start = $('div', { slot: 'start' });
                start.innerHTML = optionSetting.start;
                option.append(start);
            }
            if (optionSetting.end) {
                const end = $('div', { slot: 'end' });
                end.innerHTML = optionSetting.end;
                option.append(end);
            }
            option.select = this;
            return option;
        });
    }

    get options() {
        return this.#options;
    }

    get selectedOptions(): MasterOptionElement[] {
        const selectedOptions = [];
        this.#options.forEach((eachOption) => {
            if (eachOption.selected) {
                selectedOptions.push(eachOption);
            };
        });
        return selectedOptions;
    }

    selectOptionByValue(value, notRender?: boolean) {
        this.#options.forEach((eachOption) => {
            if (this.multiple) {
                if (!Array.isArray(value)) return;
                eachOption.selected = !!value.find((eachValue) =>
                    this.isValueMatched(eachValue, eachOption.value)
                )
            } else {
                if (this.isValueMatched(value, eachOption.value)) {
                    eachOption.selected = true;
                } else if (eachOption.selected) {
                    eachOption.selected = false;
                }
            }
        });
        if (this.ready && !notRender) {
            this.render();
            this.outputText();
            this.popup?.render();
        }
    }

    isValueMatched(value1, value2) {
        return this.binding
            ? value1?.[this.binding] === value2?.[this.binding]
            : value1 === value2
    }

    composeValue() {
        if (this.multiple) {
            this.value = this.selectedOptions
                .map((eachOption: MasterOptionElement) => eachOption.value);
        } else {
            this.value = this.selectedOptions[0]?.value;
        }

        this.popup?.render();
    }

    private toggleListener() {
        this.off({ passive: true, id: [NAME] });
        if (!this.readOnly || !this.disabled) {
            this.on('click', async () => {
                if (await this.openPopup() && this.output?.isContentEditable) {
                    this.output.focus();
                }
            }, { passive: true, id: [NAME] });
        }
    }

    @Attr({ observe: false, render: false })
    empty: boolean;

    @Attr({ observe: false, render: false })
    role: string = 'listbox';

    @Attr()
    binding: string;

    @Attr({
        onUpdate(select: MasterSelectElement) { select.toggleListener() }
    })
    readOnly: boolean = false;

    @Attr({
        onUpdate(select: MasterSelectElement) { select.toggleListener() }
    })
    override disabled: boolean = false;

    @Attr()
    placeholder: string;

    @Attr()
    placement = 'bottom-start';

    @Attr()
    label: string;

    @Attr({ render: false })
    expanded: boolean;

    @Attr()
    searchable: boolean;

    @Attr({
        onUpdate(select: MasterSelectElement, value: any, oldValue: any) {
            const isArray = Array.isArray(value);
            select.selectOptionByValue(value, true);
            select.empty = value === null || value === undefined || value === '' || isArray && !value.length;
            // don't assign empty array that will be valid
            select.accessor.value = select.empty ? '' : value;
            select.validate();
            /**
             * 防止 !multiple 於 popup close 時導致多餘的 render
             */
            if (select.multiple || !select.multiple && !select.popup?.changing) {
                select.render();
                select.outputText();
                select.popup?.render();
            }
        },
        reflect: false,
        render: false
    })
    value: any;

    @Attr()
    autocomplete: string;

    async openPopup() {
        if (this.disabled || this.readOnly) return;
        if (!this.popup) {
            this.popup = $('m-select-popup', {});
            Object.assign(this.popup, {
                multiple: this.multiple,
                placement: this.placement,
                hidden: true,
                willLock: true,
                minWidth: 'trigger',
                removeOnClosed: true,
                select: this
            });
        }
        if (this.#options.length || this.popup.q || this.querying) {
            this.popup.open({ trigger: this });
            return true;
        }
    }

    override onConnected() {
        this.validate();
        this.uid = uid++;
        this
            .on('focusin', () => {
                if (!this.focused) {
                    this.focused = true;
                    if (this.output?.isContentEditable) {
                        this.output.focus();
                    }
                }
            }, { passive: true, id: [NAME] })
            .on('focusout', () => {
                if (this.popup?.hidden === false) return;
                this.touched = true;
                this.focused = false;
            }, { passive: true, id: [NAME] });

        this.mutationObserver.observe(this, {
            characterData: true,
            childList: true,
            subtree: true
        })
    }

    override onDisconnected() {
        this.off({ id: [NAME] });
        this.mutationObserver.disconnect();
    }

}
