import { Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './overlay.scss';

const NAME = 'overlay';

@Element('m-' + NAME)
export class MasterSkeletonOverlay extends MasterElement {
    static override css = css;
    template = new Template(() => ['slot']);

    override render() {
        this.template.render(this.shadowRoot);
    }
}
