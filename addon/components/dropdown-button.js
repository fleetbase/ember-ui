import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class DropdownButtonComponent extends Component {
    @tracked type = 'default';
    @tracked buttonSize = 'md';
    @tracked buttonComponentArgs = {};
    @tracked _onInsertFired = false;
    @tracked _onTriggerInsertFired = false;
    @tracked _onButtonInsertFired = false;

    /**
     * Creates an instance of DropdownButtonComponent.
     * @param {ApplicationInstance} owner
     * @param {Object} { type = 'default', size = 'md', buttonComponentArgs = {}}
     * @memberof DropdownButtonComponent
     */
    constructor(owner, { type = 'default', size = 'md', buttonComponentArgs = {} }) {
        super(...arguments);

        this.type = type;
        this.buttonSize = size;
        this.buttonComponentArgs = buttonComponentArgs;
    }

    @action onRegisterAPI() {
        if (typeof this.args.registerAPI === 'function') {
            this.args.registerAPI(...arguments);
        }
    }

    @action onTriggerInsert() {
        if (typeof this.args.onTriggerInsert === 'function') {
            this.args.onTriggerInsert(...arguments);
        }

        this._onTriggerInsertFired = true;

        // Fallback for insert, when `renderInPlace=false` Trigger becomes whole node
        if (this.args.renderInPlace === true || this._onInsertFired === false) {
            this.onInsert(...arguments);
        }
    }

    @action onButtonInsert() {
        if (typeof this.args.onButtonInsert === 'function') {
            this.args.onButtonInsert(...arguments);
        }

        this._onButtonInsertFired = true;
    }

    @action onInsert() {
        if (typeof this.args.onInsert === 'function') {
            this.args.onInsert(...arguments);
        }

        this._onInsertFired = true;
    }
}
