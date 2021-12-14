import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './card-heading-2.scss';

@Element('m-' + 'card-h2')
export class MasterCardH2Element extends MasterElement {
    static override css = css;
   template = new Template(() => [
        'slot'
    ]);
    override render() {
        this.template.render(this.shadowRoot);
    }
}
