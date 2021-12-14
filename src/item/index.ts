import { Element } from '@master/element';
import { ClickableElement } from '../shared/clickable';
import css from './item.scss';

const NAME = 'item';

@Element('m-' + NAME)
export class ItemElement extends ClickableElement {
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
