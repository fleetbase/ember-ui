import Component from '@glimmer/component';
import { computed, action } from '@ember/object';
import { isBlank } from '@ember/utils';

export default class DropdownButtonComponent extends Component {
    /**
     * Default button type
     *
     * @var {String}
     */
    @computed('args.type') get type() {
        return this.args.type ?? 'default';
    }

    /**
     * Default button size
     *
     * @var {String}
     */
    @computed('args.size') get buttonSize() {
        return this.args.size ?? 'md';
    }

    /**
     * Additional arguments for a passed buttonComponent
     *
     * @readonly
     * @memberof DropdownButtonComponent
     */
    @computed('args.buttonComponentArgs') get buttonComponentArgs() {
        const { buttonComponentArgs } = this.args;

        return isBlank(buttonComponentArgs) || typeof buttonComponentArgs !== 'object' ? {} : buttonComponentArgs;
    }

    /**
     * Trigger callback when dropdown button node is inserted to dom.
     *
     * @memberof DropdownButtonComponent
     */
    @action onInsert() {
        if (typeof this.args.onInsert === 'function') {
            this.args.onInsert(...arguments);
        }
    }
}
