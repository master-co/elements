import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './list.scss';

const NAME = 'list';


@Element('m-' + NAME)
export class MasterListElement extends MasterElement {
    static override css = css;
    template = new Template(() => [
        'slot'
    ]);

    override render() {
        this.template.render(this.shadowRoot);
    }
}
