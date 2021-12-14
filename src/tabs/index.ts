import { Attr, Element, MasterElement } from '@master/element';
import { Template } from '@master/template';
import css from './tabs.scss';
import { ButtonElement } from '../button';
import { ContentElement } from '../content';
import debounce from '../utils/debounce';

const TAB_BUTTON_SELECTOR = 'm-button[slot=navbar]';
const NAME = 'tabs';

@Element('m-' + NAME)
export class TabsElement extends MasterElement {
    static override css = css;
    cue: MasterElement;
    navbar: ContentElement;
    navbarSlot: HTMLSlotElement;
    template = new Template(() => [
        'm-content', {
            part: 'navbar',
            guide: true,
            'scroll-x': true,
            $created: (element) => this.navbar = element
        }, [
            'slot', {
                name: 'navbar',
                style: 'display: inherit',
                $created: (element) => {
                    const tabs = this;
                    this.navbarSlot = element;
                    this.#resizeObserver.observe(this.navbarSlot);
                    element.on('click', TAB_BUTTON_SELECTOR, function (event) {
                        const button: ButtonElement = this;
                        tabs.activate(button.name);
                    }, { passive: true });
                },
                $on: {
                    slotchange: () => {
                        this.buttons = Array.from(this.children)
                            .filter((child) => child.matches(TAB_BUTTON_SELECTOR)) as ButtonElement[]
                        this.activate(this.value);
                    }
                }
            },
            'svg', {
                $if: this.value,
                part: 'cue',
                $created: (element) => {
                    this.cue = element;
                    this.paintCue();
                }
            }
        ],
        'slot', {
            $on: {
                slotchange: () => {
                    this.contents = Array.from(this.children)
                        .filter((child) => child.tagName === 'M-CONTENT') as ContentElement[];
                    this.update();
                }
            }
        }
    ]);

    #resizeObserver = new window.ResizeObserver(debounce(() => {
        this.paintCue();
    }));

    activate(name: string) {
        if (this.value === name) {
            return;
        }
        this.value = name;
        this.update();
    }

    private update() {
        let activeButton: ButtonElement;

        this.buttons
            .forEach((eachButton: ButtonElement) => {
                eachButton.active = eachButton.name === this.value;
                if (eachButton.active) {
                    activeButton = eachButton;
                }
            });

        this.contents
            .forEach((eachContent: ContentElement) => {
                eachContent.active = eachContent.name === this.value;
            });

        setTimeout(() => {
            this.navbar.scrollToPoint({
                element: activeButton,
                duration: this.#activatedAfterConnected ? null : 0
            });
            this.paintCue(activeButton);
            if (this.isConnected) {
                this.#activatedAfterConnected = true;
            }
        });
    }

    activateByElement<T extends Element | HTMLElement>(element: T) {
        const content = this.contents.find((content) => content.contains(element));
        if (content) {
            this.activate(content.name);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element?.['focus']();
        }
    }

    paintCue(activeButton = this.activeButton) {
        if (activeButton?.master) {
            const computedStyle = window.getComputedStyle(activeButton.master);
            const paddingLeft = parseFloat(computedStyle.paddingLeft);
            let width = parseFloat(computedStyle.width);
            width -= paddingLeft + parseFloat(computedStyle.paddingRight);
            this.cue
                ?.toggleClass('animatable', !!this.cue.offsetWidth && this.cue.isConnected && this.#activatedAfterConnected)
                ?.css({
                    width,
                    transform: `translateX(${activeButton.master.offsetLeft + paddingLeft}px)`
                })
        }
    }

    get activeButton() {
        return this.buttons.find((eachButton: ButtonElement) => eachButton.name === this.value)
    }

    buttons: ButtonElement[] = [];
    contents: ContentElement[] = [];

    @Attr({
        onUpdate(tabs: TabsElement) {
            tabs.update();
        }
    })
    value: string;

    #activatedAfterConnected = false;

    override onDisconnected() {
        this.#resizeObserver.unobserve(this.navbarSlot);
        this.cue
            ?.rmClass('animatable')
            ?.removeAttribute('style');
        this.#activatedAfterConnected = false;
    }

    override render() {
        this.template.render(this.shadowRoot);
    }
}
