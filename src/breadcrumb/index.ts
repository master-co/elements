import { Element } from '@master/element';
import { ClickableElement } from '../shared/clickable';
import css from './breadcrumb.scss';

const NAME = 'breadcrumb';


@Element('m-' + NAME)
export class BreadcrumbElement extends ClickableElement {
    static override css = css;

    override slotTemplateTokens = [
        'slot', { name: 'head' },
        'slot', { part: 'body' }
    ];
}
