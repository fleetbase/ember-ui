import ClickToCopyComponent from './click-to-copy';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';

export default class ClickToRevealComponent extends ClickToCopyComponent {
    /**
     * The visiblity state of the value
     *
     * @var {Boolean}
     */
    @tracked isVisible = false;

    /**
     * The loading state of the reveal process
     *
     * @var {Boolean}
     */
    @tracked isLoading = false;

    /**
     * The loading timing
     *
     * @var {Integer}
     */
    @tracked timeout = 600;

    /**
     * The loading state of the reveal process
     *
     * @var {Boolean}
     */
    @computed('args.clickToCopy') get clickToCopy() {
        const { clickToCopy } = this.args;

        return clickToCopy ?? false;
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
