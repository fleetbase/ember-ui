import SkeletonBaseComponent from '../../utils/skeleton-base-component';

/** A form while its record loads: `@fields` label + input pairs, in `@columns` columns. */
export default class SkeletonFormComponent extends SkeletonBaseComponent {
    get fields() {
        return this.range(this.args.fields, 6);
    }

    get columns() {
        const columns = parseInt(this.args.columns, 10);
        return Number.isFinite(columns) && columns >= 1 && columns <= 3 ? columns : 1;
    }
}
