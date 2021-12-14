import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';

import css from './footer.scss';

const NAME = 'footer';

@Element('m-' + NAME)
export class FooterElement extends MasterElement {
    static override css = css;

    template: Template = new Template(() => [
        'div', { part: 'master' }, [
            'slot', { name: 'start' },
            'slot', { part: 'body' },
            'slot', { name: 'end' }
        ]
    ]);

    override render() {
        this.template.render(this.shadowRoot);
    }
}
