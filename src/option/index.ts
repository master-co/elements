import { Element, MasterElement, Attr } from '@master/element';
import { MasterSelectElement } from '../select';

import css from './option.scss';

const NAME = 'option';

@Element('m-' + NAME)
export class MasterOptionElement extends MasterElement {

    static override css = css;

    updating: boolean;

    @Attr({
        onUpdate(option: MasterOptionElement) {
            if (option.slot) {
                return;
            }
            const select = (option.parentElement as MasterSelectElement);
            if (select.popup && !select.popup?.hidden) {
                select.popup.render();
            }
        },
    })
    disabled: boolean;

    @Attr({
        onAssign(option: MasterOptionElement, selected, oldSelected) {
            // 防止無限循環更新
            if (option.select.updating || option.slot) {
                return;
            };

            option.select.updating = true;

            if (!option.select.multiple && selected) {
                option.select.options.forEach((eachOption) => {
                    if (option !== eachOption) {
                        eachOption.selected = false;
                    }
                });
            }

            option.select.updating = false;
        },
        reflect: false
    })
    selected: boolean;

    @Attr({
        onAssign(option: MasterOptionElement, value) {
            if (option.slot) {
                return;
            }
            // compose value when selected option value changed
            if (option.selected) {
                const select = (option.parentElement as MasterSelectElement);
                select.composeValue();
            }
            option.empty = value === null || value === undefined || value === '';
        },
        reflect: false
    })
    value: any;

    @Attr({ observe: false, render: false })
    empty: boolean = true;

    @Attr({ render: false })
    q: string;

    select: MasterSelectElement;

    override onConnected() {
        if (this.slot) {
            return;
        }
        this.select = this.parentElement as any;
        this.select.selectOptionByValue(this.select.value);
    }

    override onDisconnected() { }

}
