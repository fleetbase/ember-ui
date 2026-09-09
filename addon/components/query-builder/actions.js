import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class QueryBuilderActionsComponent extends Component {
    @action onExecute() {
        if (typeof this.args.onExecute === 'function') {
            this.args.onExecute(this.args.queryObject);
        }
    }

    @action onSave() {
        if (typeof this.args.onSave === 'function') {
            this.args.onSave(this.args.queryObject);
        }
    }

    @action onClear() {
        if (typeof this.args.onClear === 'function') {
            this.args.onClear(this.args.queryObject);
        }
    }
}
