import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';

import css from './dialog-foot.scss';

const NAME = 'dialog-foot';

@Element('m-' + NAME)
export class DialogFootElement extends MasterElement {
    static override css = css;
    template: Template = new Template(() => [
        'slot'
    ]);
    override render() {
        this.template.render(this.shadowRoot);
    }
}
