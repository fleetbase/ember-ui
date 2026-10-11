import SkeletonBaseComponent from '../../utils/skeleton-base-component';

// Cell widths cycle through these so the rows read as data, not as a grid of equal bars.
const CELL_WIDTHS = ['70%', '45%', '60%', '35%', '55%', '40%'];
const HEADER_WIDTHS = ['50%', '35%', '45%', '30%', '40%', '35%'];

/**
 * A table of `@rows` × `@columns` placeholder cells. The first column is drawn as an
 * identity (avatar + name) unless `@identityColumn={{false}}`; `@checkbox={{true}}`
 * adds the selection column; `@header={{false}}` drops the heading row.
 */
export default class SkeletonTableComponent extends SkeletonBaseComponent {
    get showHeader() {
        return this.args.header !== false;
    }

    get hasIdentityColumn() {
        return this.args.identityColumn !== false;
    }

    get columns() {
        return this.range(this.args.columns, 5).map((index) => ({
            index,
            isIdentity: this.hasIdentityColumn && index === 0,
            width: CELL_WIDTHS[index % CELL_WIDTHS.length],
            headerWidth: HEADER_WIDTHS[index % HEADER_WIDTHS.length],
        }));
    }

    get rows() {
        return this.range(this.args.rows, 8);
    }
}
