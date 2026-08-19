import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { isArray } from '@ember/array';
import { get, action } from '@ember/object';
import { later, cancel } from '@ember/runloop';
import { registerDestructor } from '@ember/destroyable';

const isPoint = (point) => {
    return point && typeof point === 'object' && isArray(point.coordinates);
};

export default class TableCellPointComponent extends Component {
    @tracked display = '';
    /* istanbul ignore next -- @tracked initializer: the value is assigned before it is ever
       read, so this lazy initializer is never invoked. */
    @tracked isClickable = false;

    constructor(owner, { row, column }) {
        super(...arguments);
        this.isClickable = typeof column === 'object' && column !== null && (typeof column.onClick === 'function' || typeof column.action === 'function');
        this.displayPointFromRow(row, column);

        // The deferred lookup below must not outlive the component: a table that
        // re-renders within the delay would otherwise write to a destroyed
        // component.
        registerDestructor(this, () => cancel(this.displayTimer));
    }

    displayPointFromRow(row, column) {
        this.displayTimer = later(
            this,
            () => {
                // This runs outside the render pass, so an unguarded read here
                // throws asynchronously and cannot be caught by the caller.
                const pointColumn = column?.valuePath;

                if (pointColumn) {
                    const point = get(row, pointColumn);

                    if (isPoint(point)) {
                        this.display = `${point.coordinates[1]} ${point.coordinates[0]}`;
                    }
                }
            },
            50
        );
    }

    @action onClick() {
        const column = this.args.column;

        if (column) {
            const { onClick, action } = column;

            if (typeof onClick === 'function') {
                onClick(this.args.row, ...arguments);
            }

            if (typeof action === 'function') {
                action(this.args.row);
            }
        }
    }
}
