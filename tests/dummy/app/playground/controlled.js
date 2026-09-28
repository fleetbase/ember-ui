import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Base for input example adapters.
 *
 * Input components are controlled: they render a value and report changes, and the consumer owns
 * the state in between. The adapter plays that consumer.
 *
 * `writableValue` is a tracked field rather than a getter on purpose. Several inputs (DatePicker
 * among them) write back through the property they are handed, and a getter raises
 * "Cannot set property … which has only a getter" — an uncaught error that aborts the whole run,
 * not just the page. A settable field absorbs the write.
 *
 * Because it is a field rather than a getter, it does not follow the control on its own; adapters
 * pair it with `{{did-update this.onControlChanged @values}}` so editing the control still drives
 * the component. Assigning it only ever happens from an action or that hook, never from a getter —
 * assigning tracked state during render is what Ember rejects as a backtracking re-render.
 *
 * Selections that are objects or arrays use `selected` instead: an object cannot round-trip
 * through a scalar text or select control.
 */
export default class ControlledExample extends Component {
    /** Which control seeds and receives the value. Override where the argument is not `value`. */
    valueKey = 'value';

    /** The value handed to the component. Settable, so a two-way binding cannot throw. */
    @tracked writableValue;

    /** Object- or array-valued selections. */
    @tracked selected = null;

    /** The last value taken from the control, used to spot control edits. Not tracked. */
    lastFromControl;

    constructor() {
        super(...arguments);

        this.writableValue = this.args.values?.[this.valueKey];
        this.lastFromControl = this.writableValue;
    }

    /** Editing the control drives the component; the component's own edits are left alone. */
    @action onControlChanged() {
        const fromControl = this.args.values?.[this.valueKey];

        if (fromControl !== this.lastFromControl) {
            this.lastFromControl = fromControl;
            this.writableValue = fromControl;
        }
    }

    /** A scalar change: keep it, push it into the control, and report it. */
    @action update(next, ...rest) {
        const scalar = next && typeof next === 'object' && 'target' in next ? next.target.value : next;

        this.writableValue = scalar;
        this.lastFromControl = scalar;

        this.args.setControl?.(this.valueKey, scalar);
        this.args.onEvent?.('onChange', next, ...rest);
    }

    /** An object-valued selection: hold it locally, and report it. */
    @action select(next, ...rest) {
        this.selected = next;

        this.args.onEvent?.('onChange', next, ...rest);
    }

    /** Report a callback without treating its argument as the new value. */
    @action report(name, ...args) {
        this.args.onEvent?.(name, ...args);
    }
}
