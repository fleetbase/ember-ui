import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FiltersPickerButtonComponent extends Component {
    /* istanbul ignore next -- @tracked initializer: the value is assigned before it is ever
       read, so this lazy initializer is never invoked. */
    @tracked buttonComponentArgs = {};

    constructor(owner, { buttonComponentArgs = {} }) {
        super(...arguments);
        this.buttonComponentArgs = buttonComponentArgs;
    }

    @action handleComponentArgsUpdate(el, [buttonComponentArgs = {}]) {
        this.buttonComponentArgs = buttonComponentArgs;
    }
}
