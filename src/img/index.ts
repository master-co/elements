import { Attr, Element, MasterElement, Prop } from '@master/element';
import { Template } from '@master/template';
import css from './img.scss';

const NAME = 'img';

@Element('m-' + NAME)
export class ImgElement extends MasterElement {
    static override css = css;
    template = new Template(() => [
        'img', {
            $attr: {
                part: 'master',
                src: this.src,
                srcset: this.srcset,
                alt: this.alt,
                decoding: this.decoding,
                loading: this.loading,
                sizes: this.sizes,
                crossorigin: this.crossorigin,
                ismap: this.ismap,
                referrerpolicy: this.referrerpolicy,
                usemap: this.usemap,
            },
            $created: (img: HTMLImageElement) => {
                this.master = img;
                this.loaded = new Promise((resolve) => {
                    img.onload = () => {
                        this.complete = true;
                        resolve();
                    };
                    img.onerror = () => {
                        this.errored = true;
                        resolve();
                    }
                })
            }
        },
        'm-skeleton', {
            $if: !this.complete && !this.errored && (this.src || this.srcset),
            part: 'skeleton',
            class: 'animated'
        },
        'slot', {
            $if: this.errored,
            name: 'error'
        }
    ]);

    loaded: Promise<void>;

    master: HTMLImageElement;

    @Attr({ observe: false })
    complete: boolean = false;

    @Attr({ render: false })
    fade: boolean;

    // native

    @Attr({
        onUpdate(img: ImgElement, value, oldValue) {
            if (oldValue) {
                img.complete = false;
                img.errored = false;
            }
        }
    })
    src: string;

    @Attr({
        onUpdate(img: ImgElement, value, oldValue) {
            if (oldValue) {
                img.complete = false;
                img.errored = false;
            }
        }
    })
    srcset: string;

    @Attr({
        onUpdate(img: ImgElement, value) {
            const isNaN = Number.isNaN(+value);
            if (value === undefined || value === null) {
                img.style.removeProperty('width');
            } else {
                img.style.setProperty('width', isNaN ? value : value + 'px');
            }
        },
        render: false
    })
    width: string;

    @Attr({
        onUpdate(img: ImgElement, value) {
            const isNaN = Number.isNaN(+value);
            if (value === undefined || value === null) {
                img.style.removeProperty('height');
            } else {
                img.style.setProperty('height', isNaN ? value : value + 'px');
            }
        },
        render: false
    })
    height: string;

    alt: string;

    @Attr()
    crossorigin: string;

    @Attr()
    decoding: string;

    @Attr()
    ismap: boolean;

    @Attr()
    loading: string;

    @Attr()
    referrerpolicy: string;

    @Attr()
    sizes: string;

    @Attr()
    usemap: string;

    @Attr()
    errored: boolean;

    @Attr({
        onUpdate(img: ImgElement, token) {
            if (token) {
                const splits = token.split('x');
                const w = splits[0];
                const h = splits[1];
                if (w && h) {
                    img.style.setProperty('--ratio', 1 / w * h * 100 + '%');
                    return;
                }
            }
            img.style.removeProperty('--ratio');
        }
    })
    ratio: string;

    override render() {
        this.template.render(this.shadowRoot);
    }
}