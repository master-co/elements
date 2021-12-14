import { Element, Attr } from '@master/element';
import { Template } from '@master/template';
import { MasterControlElement } from '../../shared/control';
import { handleSlotEmpty } from '../../utils/handle-slot-empty';

import css from './textarea.scss';

const NAME = 'textarea';

@Element('m-' + NAME)
export class MasterTextareaElement extends MasterControlElement {
    static override css = css;
    lightTemplate = new Template(() => [
        'textarea', {
            $attr: {
                role: 'accessor',
                name: this.name,
                placeholder: this.placeholder,
                disabled: this.disabled,
                required: this.required,
                readonly: this.readOnly,
                maxlength: this.maxlength,
                minlength: this.minlength,
                rows: this.rows,
            },
            $created: (element: HTMLInputElement) => {
                // prevent deeply clone issue
                this.querySelector('input[role=accessor]')?.remove();
                this.accessor = element;
                this.validity = element.validity;
            }
        }
    ]);

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
        'slot',
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
        }
    ]);

    savedTabIndex: number;

    @Attr({ observe: false, render: false })
    empty: boolean;

    @Attr({ observe: false, render: false })
    role: string = 'textbox';

    @Attr()
    keepValidity: boolean;

    @Attr({
        onUpdate(input: MasterTextareaElement, value) {
            const tabIndex = input.tabIndex;

            if (value) {
                input.savedTabIndex = tabIndex;
                input.tabIndex = -1;
            }
            if (!value && input.savedTabIndex !== undefined) {
                input.tabIndex = input.savedTabIndex;
                input.savedTabIndex = undefined;
            }
        }
    })
    readOnly: boolean;

    @Attr()
    placeholder: string;

    @Attr()
    label: string;

    @Attr({ render: false })
    expanded: boolean;

    @Attr({
        reflect: false,
        render: false,
        onUpdate(textarea: MasterTextareaElement, value: any) {
            textarea.empty = value === null || value === undefined || value === '';
            textarea.accessor.value = value ?? null;
            textarea.validate();
        },
    })
    value: any;

    @Attr({ onRender: (textarea: MasterTextareaElement) => textarea.validate() })
    maxlength: number;

    @Attr({ onRender: (textarea: MasterTextareaElement) => textarea.validate() })
    minlength: number;

    @Attr()
    rows: number = 1;

    override onConnected() {
        this.validate();

        this
            .on('click', (event: any) => {
                if (event.target === this.accessor) return;
                this.accessor.focus();
            }, {
                id: [NAME],
                passive: true
            });

        this.accessor.on('input', (event: any) => {
            this.value = event.target.value;
            if (!this.dirty) {
                this.dirty = true;
            }
        }, { id: [NAME], passive: true })
            .on('focusout', () => {
                this.touched = true;
            }, { id: [NAME], passive: true, once: true });
    }
}
