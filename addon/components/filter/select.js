import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency';

export default class FilterSelectComponent extends Component {
    @service fetch;
    @tracked value;
    @tracked optionLabel;
    @tracked optionValue;
    @tracked placeholder;
    @tracked options = [];

    constructor(owner, { value, options = [], fetchUri, fetchParams = {} }) {
        super(...arguments);
        this.value = value;
        this.options = isArray(options) ? options : [];
        this.optionLabel = this.args.optionLabel ?? this.args.filterOptionLabel;
        this.optionValue = this.args.optionValue ?? this.args.filterOptionValue;
        this.placeholder = this.args.placeholder ?? this.args.filterPlaceholder;
        this.fetchOptions.perform(fetchUri, fetchParams);
    }

    @action onChange(selection) {
        const { onChange, filter } = this.args;

        this.value = selection;

        if (typeof onChange === 'function') {
            onChange(filter, selection);
        }
    }

    @task *fetchOptions(uri, params = {}) {
        if (!uri) return;

        const { fetchParams } = this.args;
        const queryParams = Object.assign(params, fetchParams ?? {});

        try {
            const options = yield this.fetch.get(uri, queryParams);
            this.options = options;
        } catch (err) {
            debug('Error loading options: ' + err.message);
        }
    }
}
