import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class FilterMultiOptionComponent extends Component {
    @service fetch;
    @tracked value = [];
    @tracked options = [];
    @tracked isLoading = false;

    constructor() {
        super(...arguments);

        const { value, options, filter } = this.args;

        this.value = this.parseValue(value);
        this.options = options ?? [];

        if (typeof filter?.filterFetchOptions === 'string') {
            this.fetchOptions(filter?.filterFetchOptions);
        }
    }

    @action onChange(selection) {
        const { onChange, filter } = this.args;

        this.value = selection;

        if (typeof onChange === 'function') {
            onChange(filter, selection);
        }
    }

    @action fetchOptions(uri) {
        this.isLoading = true;

        this.fetch
            .get(uri)
            .then((options) => {
                this.options = options;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    parseValue(value) {
        if (isArray(value)) {
            return value;
        }

        if (typeof value === 'string' && value.includes(',')) {
            return value.split(',');
        }

        if (!value) {
            return [];
        }

        return [value];
    }
}
