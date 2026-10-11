import SkeletonBaseComponent from '../../utils/skeleton-base-component';

/**
 * The console's section header (57px, same gutters) while the page loads: identity,
 * title and meta line on the left; a search box and `@actions` buttons on the right.
 */
export default class SkeletonPageHeaderComponent extends SkeletonBaseComponent {
    get actions() {
        return this.range(this.args.actions, 2);
    }
}
