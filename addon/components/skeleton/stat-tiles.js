import SkeletonBaseComponent from '../../utils/skeleton-base-component';

/** A row of `@count` KPI tiles: label, value, delta line. */
export default class SkeletonStatTilesComponent extends SkeletonBaseComponent {
    get tiles() {
        return this.range(this.args.count, 4);
    }
}
