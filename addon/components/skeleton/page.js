import SkeletonBaseComponent from '../../utils/skeleton-base-component';

export const SKELETON_PAGE_VIEWS = ['table', 'cards', 'form', 'dashboard', 'panel'];

// Tab labels differ in length; cycling widths keeps a strip from reading as a ruler.
const TAB_WIDTHS = ['2.5rem', '3.5rem', '3rem', '4rem', '3.25rem', '2.75rem'];

/**
 * A whole page while its route model loads, for `loading.hbs` templates. Draws the
 * section header and then the body for `@view`: a table card (default), a cards grid,
 * a form, a dashboard (KPI tiles over a table) or a details panel; a block replaces the
 * body. The region is announced to assistive tech once, as busy, with `@label`.
 *
 * The table card follows the page it stands in for: `@tabs` status tabs in its toolbar
 * (0 for none), `@toolbar={{false}}` when the table has no toolbar, `@checkbox={{false}}`
 * when rows are not selectable, `@footer={{false}}` without pagination, and
 * `@identityColumn` as the index of the column that holds an avatar and name.
 */
export default class SkeletonPageComponent extends SkeletonBaseComponent {
    get view() {
        const { view } = this.args;
        return SKELETON_PAGE_VIEWS.includes(view) ? view : 'table';
    }

    get showToolbar() {
        return this.args.toolbar !== false;
    }

    get tabs() {
        return this.range(this.args.tabs, 4).map((index) => ({ index, width: TAB_WIDTHS[index % TAB_WIDTHS.length] }));
    }

    get showCheckbox() {
        return this.args.checkbox !== false;
    }

    get showFooter() {
        return this.args.footer !== false;
    }
}
