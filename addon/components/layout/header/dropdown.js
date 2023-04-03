import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class LayoutHeaderDropdownComponent extends Component {
    @action onAction(dd, action, ...params) {
        if (typeof dd?.actions?.close === 'function') {
            dd.actions.close();
        }

        if (typeof this.args.onAction === 'function') {
            this.args.onAction(action, ...params);
        }

        if (typeof this.args[action] === 'function') {
            this.args[action](...params);
        }
    }
}
