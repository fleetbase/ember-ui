import { computePosition, offset, flip, shift } from '@floating-ui/dom';
import { isArray } from '@ember/array';
import { createElement } from './dom';

export class Tooltip {
    mountEl;
    tooltipEl;
    options;
    cleanupFns = [];

    constructor(mountEl, options = {}) {
        this.mountEl = mountEl;
        this.options = options;
        this.#setup();
    }

    #setup() {
        const { text, classNames = [], placement = 'top', offset: offsetValue = 5 } = this.options;

        const classes = isArray(classNames) ? classNames : String(classNames).split(' ');

        this.tooltipEl = createElement('div', {
            classNames: ['ui-input-info', 'text-xs', ...classes],
            text,
            attrs: {
                role: 'tooltip',
            },
            styles: {
                position: 'absolute',
                width: 'max-content',
                zIndex: 777,
                opacity: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.15s ease',
            },
            mount: document.body,
        });

        const show = async () => {
            const { x, y } = await computePosition(this.mountEl, this.tooltipEl, {
                placement,
                middleware: [offset(offsetValue), flip(), shift({ padding: 8 })],
            });

            Object.assign(this.tooltipEl.style, {
                left: `${x}px`,
                top: `${y}px`,
                opacity: 1,
            });
        };

        const hide = () => {
            this.tooltipEl.style.opacity = 0;
        };

        this.mountEl.addEventListener('mouseenter', show);
        this.mountEl.addEventListener('mouseleave', hide);
        this.mountEl.addEventListener('focus', show);
        this.mountEl.addEventListener('blur', hide);

        // cleanup tracking
        this.cleanupFns.push(() => {
            this.mountEl.removeEventListener('mouseenter', show);
            this.mountEl.removeEventListener('mouseleave', hide);
            this.mountEl.removeEventListener('focus', show);
            this.mountEl.removeEventListener('blur', hide);
            this.tooltipEl.remove();
        });
    }

    destroy() {
        this.cleanupFns.forEach((fn) => fn());
        this.cleanupFns = [];
    }
}

export default {
    createTooltip() {
        return new Tooltip(...arguments);
    },
};
