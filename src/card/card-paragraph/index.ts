import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './card-paragraph.scss';

@Element('m-' + 'card-p')
export class MasterCardParagraphElement extends MasterElement {
    static override css = css;
   template = new Template(() => [
        'slot'
    ]);
    override render() {
        this.template.render(this.shadowRoot);
    }
}