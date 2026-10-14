import SkeletonBaseComponent from '../../utils/skeleton-base-component';

/** `@count` card skeletons in a `@columns`-up grid (4 by default, 2 under 1280px, 1 on phones). */
export default class SkeletonCardsGridComponent extends SkeletonBaseComponent {
    get items() {
        return this.range(this.args.count, 8);
    }

    get columns() {
        const columns = parseInt(this.args.columns, 10);
        return Number.isFinite(columns) && columns >= 1 && columns <= 6 ? columns : 4;
    }
}
