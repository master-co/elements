import { Element, } from '@master/element';
import { Template } from '@master/template';

import css from './viewer.scss';
import { ModalElement } from '../modal';
import { $ } from '@master/dom';
import { ImgElement } from '../img';

const NAME = 'viewer';
const $window = $(window);
const $document = $(document);
const VIEWER: ViewerElement = $('m-viewer', {});

@Element('m-' + NAME)
export class ViewerElement extends ModalElement {
    static override css = css;

    _triggerEvent = '';
    _placement = 'origin';
    _hideTrigger = true;
    _hidden = true;
    _removeOnClosed = true;
    _overlay = 'close';
    _closeOnScroll = true;

    override lightTemplate =new Template(() => [
        'm-img', {
            src: this.lastTriggerFactors.trigger['src'],
            srcset: this.lastTriggerFactors.trigger['srcset'],
            $created: (element) => this.img = element
        }
    ]);

    img: ImgElement;

    override canOpen = async () => {
        await this.updateSize();
        return true;
    }

    async updateSize() {
        const viewportAspectRatio = window.innerWidth / window.innerHeight;
        await this.img.loaded;
        const aspectRatio = this.img.master.width / this.img.master.height;
        if (viewportAspectRatio > aspectRatio) {
            this.img.height = '100vh';
            this.img.width = 'auto';
        } else {
            this.img.height = 'auto';
            this.img.width = '100vw';
        }
    }

    handleOnOpened() {
        $window.on('resize', () => {
            this.updateSize();
        }, { id: [NAME, this], passive: true });
        this.on('click', () => {
            this.close();
        }, { id: [NAME], passive: true });
    }

    handleOnClosed() {
        $window.off({ id: [NAME, this] });
        this.off({ id: [NAME] });
    }
}

$(document).on('click', '[toggle-viewer]', function (event) {
    // clone for performance
    const viewer = VIEWER.cloneNode(true) as ViewerElement;
    viewer.lastTriggerFactors = { event, trigger: this };
    document.body.appendChild(viewer);
    viewer.open(viewer.lastTriggerFactors);
}, { id: [NAME], passive: true });
