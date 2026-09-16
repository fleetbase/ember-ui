import Component from '@glimmer/component';
import { action, get } from '@ember/object';

export default class PillComponent extends Component {
    /* eslint-disable ember/no-get */
    get isClickable() {
        return typeof this.args.onClick === 'function';
    }

    get isOnline() {
        if (this.args.online !== undefined) {
            return Boolean(this.args.online);
        }

        const record = this.args.resource;

        return record ? Boolean(get(record, this.args.onlinePath ?? 'online')) : false;
    }

    get resourceName() {
        const record = this.args.resource;
        if (!record) return null;

        return (
            get(record, this.args.namePath ?? 'name') ??
            get(record, 'display_name') ??
            get(record, 'displayName') ??
            get(record, 'tracking') ??
            get(record, 'public_id') ??
            get(record, 'constructor.modelName') ??
            null
        );
    }

    @action handleClick() {
        if (typeof this.args.onClick === 'function') {
            if (this.args.resource) {
                this.args.onClick(this.args.resource, ...arguments);
            } else {
                this.args.onClick(...arguments);
            }
        }
    }
}
