import { Element, Attr } from '@master/element';
import css from './check.scss';
import { Template } from '@master/template';
import { MasterControlElement } from '../../shared/control';

const connectedChecks = new Set();

const nameMap = {};

const NAME = 'check';


@Element('m-' + NAME)
export class MasterCheckElement extends MasterControlElement {

    static override css = css;

    lightTemplate = new Template(() => [
        'input', {
            $attr: {
                role: 'accessor',
                type: this.type,
                name: this.name,
                disabled: this.disabled,
                required: this.required,
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
        'svg', {
            part: this.interface,
            viewBox: '0 0 20 20',
            $namespace: 'http://www.w3.org/2000/svg',
            innerHTML: this.interface === 'switch'
                ? '<rect x=2 y=2 rx=8 width=16 height=16 part="button-icon"/><filter id="s" x="0" y="0" filterUnits="userSpaceOnUse"><feOffset dy="2" input="SourceAlpha"/><feGaussianBlur stdDeviation="1 1" result="b"/><feFlood flood-opacity="0.161"/><feComposite operator="in" in2="b"/><feComposite in="SourceGraphic"/></filter>'
                : '<path part="check-icon" d="M5.5 10l2 2 1 1 6 -6"/><path part="ban-icon" d="M19 19L1 1h0"/>'
        },
        'slot'
    ]);

    override accessor: any;

    @Attr({ observe: false, render: false })
    role: string;

    @Attr({
        onUpdate(check: MasterCheckElement, value, oldValue) {
            if (value) {
                let checks = nameMap[value];
                if (!checks) checks = nameMap[value] = [];
                checks.push(check);
            }
            if (oldValue) {
                let oldChecks = nameMap[oldValue] || [];
                if (!oldChecks) oldChecks = nameMap[oldValue] = [];
                oldChecks.splice(oldChecks.indexOf(check), 1);
            }
        }
    })
    override name: string;

    @Attr({
        onUpdate(check: MasterCheckElement, value) {
            const parent: any = check.parentElement;
            if (parent.tagName === 'M-ITEM') {
                parent.disabled = value;
            }
        }
    })
    override disabled: boolean;

    @Attr()
    override required: boolean;

    @Attr()
    autocomplete: string;

    @Attr()
    interface: string = 'check';

    @Attr({
        onUpdate(check: MasterCheckElement, value: any, oldValue: any) {
            check.role = value;
        }
    })
    type: string = 'checkbox';

    @Attr({
        onUpdate(check: MasterCheckElement, value: any, oldValue: any) {

            check.accessor.checked = value;
            check.toggleAttribute('aria-checked', !!value);

            if (check.type === 'radio' && check.name && value) {
                nameMap[check.name]
                    .forEach((eachCheck: MasterCheckElement) => {
                        if (eachCheck !== check && eachCheck.type === 'radio') {
                            eachCheck.checked = false;
                            eachCheck.validate();
                        }
                    });
            }

            check.validate();
        }
    })
    checked: boolean = false;

    @Attr({
        reflect: false,
        render: false,
        onUpdate(check: MasterCheckElement, value: any, oldValue: any) {
            if (value === oldValue) return;
            check.accessor.value = value ?? null;
        }
    })
    value: any;

    override onConnected() {
        this.validate();

        this.accessor
            .on('input', (event: any) => {
                this.checked = event.target.checked;
            }, { id: [NAME], passive: true });

        connectedChecks.add(this);
    }

    override onDisconnected() {
        connectedChecks.delete(this);
        this.off({ id: [NAME] });
    }

}
