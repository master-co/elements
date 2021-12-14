import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './card-heading-3.scss';

@Element('m-' + 'card-h3')
export class CardH3Element extends MasterElement {
    static override css = css;
    template = new Template(() => [
        'slot'
    ]);
    override render() {
        this.template.render(this.shadowRoot);
    }
}
