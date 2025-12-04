import ClickToCopyComponent from './click-to-copy';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';

export default class ClickToRevealComponent extends ClickToCopyComponent {
    @tracked isVisible = false;
    @tracked isLoading = false;
    @tracked timeout = 600;
    @tracked clickToCopy = false;
    @tracked wrapperClass = this.args.wrapperClass ?? '';

    /**
     * Setup the component
     *
     * @param {EngineInstance} owner
     * @param {...Arguments} { column, clickToCopy,  }
     * @memberof ClickToRevealComponent
     */
    constructor(owner, { column, clickToCopy }) {
        super(...arguments);

        this.clickToCopy = clickToCopy ?? false;

        if (column && column.cellComponentArgs) {
            this.clickToCopy = column.cellComponentArgs.clickToCopy ?? false;
        }

        if (column && column.cellComponentArgs) {
            this.wrapperClass = column.cellComponentArgs.wrapperClass ?? '';
        }
    }

    /**
     * The loading state of the reveal process
     *
     * @var {Boolean}
     */
    @computed('clickToCopy', 'isVisible') get canClickToCopy() {
        return this.clickToCopy && this.isVisible;
    }

    /**
     * Reveals the hidden text
     *
     * @void
     */
    @action reveal() {
        this.isLoading = true;

        later(
            this,
            () => {
                this.isLoading = false;
                this.isVisible = true;
            },
            600
        );
    }

    /**
     * Copies the hidden text
     *
     * @param {String} value
     * @void
     */
    @action copy(value) {
        if (!this.canClickToCopy) {
            return;
        }

        return this.copyToClipboard(value);
    }
}
