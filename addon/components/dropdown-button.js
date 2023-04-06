import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { tryInvoke } from '@ember/utils';
import { classify } from '@ember/string';
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
}
