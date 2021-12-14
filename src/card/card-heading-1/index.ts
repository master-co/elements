import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './card-heading-1.scss';

@Element('m-' + 'card-h1')
export class MasterCardHeading1Element extends MasterElement {
    static override css = css;
    template = new Template(() => [
        'slot'
    ]);
    override render() {
        this.template.render(this.shadowRoot);
    }
}
