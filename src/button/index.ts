import { Element } from '@master/element';
import { MasterClickableElement } from '../../shared/clickable';
import css from './button.scss';

const NAME = 'button';

@Element('m-' + NAME)
export class MasterButtonElement extends MasterClickableElement {

    static override css = css;

    _type: string = 'button';

    override slotTemplateTokens = [
        'slot', { name: 'start' },
        'slot',
        'slot', { name: 'end' }
    ]
}
