import { Element } from '@master/element';
import { MasterClickableElement } from '../../shared/clickable';
import css from './breadcrumb.scss';

const NAME = 'breadcrumb';


@Element('m-' + NAME)
export class BreadcrumbElement extends MasterClickableElement {
    static override css = css;

    override slotTemplateTokens = [
        'slot', { name: 'head' },
        'slot', { part: 'body' }
    ];
}
