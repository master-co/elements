import { Element } from '@master/element';
import { MasterClickableElement } from '../../shared/clickable';
import css from './chip.scss';

const NAME = 'chip';


@Element('m-' + NAME)
export class MasterChipElement extends MasterClickableElement {
    static override css = css;

    override slotTemplateTokens = [
        'slot', { name: 'start' },
        'slot',
        'slot', { name: 'end' }
    ]
}
