import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FiltersPickerButtonComponent extends Component {
    @tracked buttonComponentArgs = {};

    constructor(owner, { buttonComponentArgs = {} }) {
        super(...arguments);
        this.buttonComponentArgs = buttonComponentArgs;
    }

    @action handleComponentArgsUpdate(el, [buttonComponentArgs = {}]) {
        this.buttonComponentArgs = buttonComponentArgs;
    }
}
