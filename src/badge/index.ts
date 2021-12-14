import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './badge.scss';

const NAME = 'badge';

@Element('m-' + NAME)
export class MasterBadgeElement extends MasterElement {
    static override css = css;
    template = new Template(() => [
        'slot'
    ]);
    override render() {
        this.template.render(this.shadowRoot);
    }
}
