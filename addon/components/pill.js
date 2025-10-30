import Component from '@glimmer/component';
import { action, get } from '@ember/object';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

export default class PillComponent extends Component {
    /* eslint-disable ember/no-get */
    get resourceName() {
        const record = this.args.resource;
        if (!record) return 'resource';

        return (
            get(record, this.args.namePath ?? 'name') ??
            get(record, 'display_name') ??
            get(record, 'displayName') ??
            get(record, 'tracking') ??
            get(record, 'public_id') ??
            getModelName(record)
        );
    }

    @action handleClick() {
        console.log('handleClick called!', ...arguments);
        if (typeof this.args.onClick === 'function') {
            if (this.args.resource) {
                this.args.onClick(this.args.resource, ...arguments);
            } else {
                this.args.onClick(...arguments);
            }
        }
    }
}
