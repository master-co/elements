import { Element } from '@master/element';
import { MasterClickableElement } from '../../shared/clickable';
import css from './item.scss';

const NAME = 'item';

@Element('m-' + NAME)
export class MasterItemElement extends MasterClickableElement {
    static override css = css;

    override slotTemplateTokens = [
        'slot', { name: 'start' },
        'div', { part: 'lower' }, [
            'slot', { part: 'body' },
            'slot', { name: 'end' },
            'slot', { name: 'img' }
        ]
    ];

    body: HTMLSlotElement;

}
