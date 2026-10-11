import SkeletonBaseComponent from '../../utils/skeleton-base-component';

/**
 * A details panel while its resource loads: identity strip, optional tab row, then
 * `@sections` titled sections of `@fieldsPerSection` label / value rows.
 */
export default class SkeletonPanelComponent extends SkeletonBaseComponent {
    get sections() {
        return this.range(this.args.sections, 3);
    }

    get fields() {
        return this.range(this.args.fieldsPerSection, 3);
    }

    get tabs() {
        return this.range(this.args.tabs, 0);
    }
}
