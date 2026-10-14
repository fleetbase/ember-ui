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

    /** The column holding an avatar and a name: the first by default, `@identityColumn` as an index, none when false. */
    get identityIndex() {
        const { identityColumn } = this.args;

        if (identityColumn === false) {
            return -1;
        }

        const index = parseInt(identityColumn, 10);
        return Number.isFinite(index) && index >= 0 ? index : 0;
    }

    get columns() {
        return this.range(this.args.columns, 5).map((index) => ({
            index,
            isIdentity: index === this.identityIndex,
            width: CELL_WIDTHS[index % CELL_WIDTHS.length],
            headerWidth: HEADER_WIDTHS[index % HEADER_WIDTHS.length],
        }));
    }

    get rows() {
        return this.range(this.args.rows, 8);
    }
}
