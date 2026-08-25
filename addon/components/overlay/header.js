import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';

export default class OverlayHeaderComponent extends Component {
    @tracked overlayPanelHeaderRef;

    /**
     * How many characters of the title survive truncation. Defaults to 15, which is the threshold
     * the component has always encoded.
     */
    @computed('args.titleEllipsisLength') get ellipsisLength() {
        const { titleEllipsisLength } = this.args;

        return typeof titleEllipsisLength === 'number' ? titleEllipsisLength : 15;
    }

    /**
     * Whether the title is long enough to be worth truncating. Only consulted when the consumer
     * opts in with @titleEllipsis — a minimized overlay truncates regardless, which is the
     * behaviour this component shipped with.
     */
    @computed('args.title', 'ellipsisLength') get useEllipsis() {
        const { title } = this.args;

        return title?.length > this.ellipsisLength;
    }

    /**
     * The truncated title the template renders. True when the overlay is minimized (unchanged), or
     * when the consumer passes @titleEllipsis and the title exceeds the threshold.
     */
    @computed('args.{overlay.isMinimized,titleEllipsis}', 'useEllipsis') get isTitleTruncated() {
        return this.args.overlay?.isMinimized || (Boolean(this.args.titleEllipsis) && this.useEllipsis);
    }

    @computed('args.title', 'ellipsisLength') get titleWithEllipsis() {
        const { title } = this.args;

        return `${title?.substring(0, this.ellipsisLength)}...`;
    }

    @action setupComponent(element) {
        this.overlayPanelHeaderRef = element;
    }

    @action cancel() {
        const { onPressCancel } = this.args;

        const closeOverlay = (callback) => {
            this.overlayPanelHeaderRef?.closest('.next-content-overlay')?.classList.remove('is-open');

            later(
                this,
                () => {
                    if (typeof callback === 'function') {
                        callback();
                    }
                },
                600
            );
        };

        if (typeof onPressCancel === 'function') {
            onPressCancel({ closeOverlay });
        }
    }
}
