import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';

import css from './header.scss';

const NAME = 'header';


@Element('m-' + NAME)
export class MasterHeaderElement extends MasterElement {
    static override css = css;

    template: Template = new Template(() => [
        'slot', { name: 'above' },
        'div', { part: 'master' }, [
            'slot', { name: 'start' },
            'slot', { part: 'body' },
            'slot', { name: 'end' },
        ],
        'slot', { name: 'below' },
    ]);

    override render() {
        this.template.render(this.shadowRoot);
    }
}
