import { Element } from '@master/element';
import { MasterClickableElement } from '../../shared/clickable';
import css from './card.scss';
import './card-heading-1';
import './card-heading-2';
import './card-heading-3';
import './card-paragraph';

const NAME = 'card';

@Element('m-' + NAME)
export class MasterCardElement extends MasterClickableElement {
    static override css = css;

    override slotTemplateTokens = () => [
        'slot', { name: 'start' },
        'slot',
        'slot', { name: 'end' },
        'slot', { name: 'overlay' }
    ]
}
