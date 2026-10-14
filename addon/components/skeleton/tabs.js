import SkeletonBaseComponent from '../../utils/skeleton-base-component';

const TAB_WIDTHS = ['2.5rem', '4rem', '3.25rem', '4.5rem', '3rem', '3.75rem'];

/**
 * An underlined tab strip, for pages whose tabs sit between the header and the content:
 * `@count` tabs, each with a count pill when `@counts` is set.
 */
export default class SkeletonTabsComponent extends SkeletonBaseComponent {
    get tabs() {
        return this.range(this.args.count, 4).map((index) => ({ index, width: TAB_WIDTHS[index % TAB_WIDTHS.length] }));
    }
}
