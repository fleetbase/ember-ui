import Component from '@glimmer/component';

export const SKELETON_PAGE_VIEWS = ['table', 'cards', 'form', 'dashboard', 'panel'];

/**
 * A whole page while its route model loads, for `loading.hbs` templates. Draws the
 * section header and then the body for `@view`: a table card (default), a cards grid,
 * a form, a dashboard (KPI tiles over a table) or a details panel; a block replaces the
 * body. The region is announced to assistive tech once, as busy, with `@label`.
 */
export default class SkeletonPageComponent extends Component {
    get view() {
        const { view } = this.args;
        return SKELETON_PAGE_VIEWS.includes(view) ? view : 'table';
    }
}
