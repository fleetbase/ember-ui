import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { isBlank } from '@ember/utils';
import { later, cancel } from '@ember/runloop';
import { registerDestructor } from '@ember/destroyable';

export default class TableFootComponent extends Component {
    @tracked tfootVerticalOffset;
    @tracked tfootVerticalOffsetElements;
    @tracked ready;

    constructor(owner, { tfootVerticalOffset, tfootVerticalOffsetElements }) {
        super(...arguments);

        this.tfootVerticalOffsetElements = tfootVerticalOffsetElements;
        this.tfootVerticalOffset = tfootVerticalOffset;

        this.readyTimer = later(
            this,
            () => {
                if (isBlank(this.tfootVerticalOffsetElements) && isBlank(this.tfootVerticalOffset)) {
                    this.tfootVerticalOffset = this.calculateTableFooterVerticalOffset();
                }

                this.ready = true;
            },
            0
        );

        // This runs outside the render pass, so it must not outlive the
        // component — otherwise a table that re-renders immediately writes to a
        // destroyed component and throws asynchronously.
        registerDestructor(this, () => cancel(this.readyTimer));
    }

    calculateTableFooterVerticalOffset() {
        const offsetElements = ['#next-view-section-subheader', '.next-table-wrapper > table > thead'];
        const offsetContant = 4;
        let calculatedOffset = 0;

        for (let i = 0; i < offsetElements.length; i++) {
            const element = offsetElements[i];

            /* istanbul ignore next -- `offsetElements` above is a literal array of two strings, so
               an entry is never an element. */
            if (element instanceof HTMLElement) {
                calculatedOffset += element.offsetHeight;
            }

            if (typeof element === 'string') {
                const foundElement = document.querySelector(element);

                if (foundElement instanceof HTMLElement) {
                    calculatedOffset += foundElement.offsetHeight;
                }
            }
        }

        return calculatedOffset + offsetContant;
    }
}
