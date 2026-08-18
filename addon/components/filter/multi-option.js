import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, get } from '@ember/object';
import { debug } from '@ember/debug';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency';

export default class FilterMultiOptionComponent extends Component {
    @service fetch;
    @tracked value = [];
    @tracked options = [];

    constructor(owner, { value, options, fetchUri, fetchParams = {} }) {
        super(...arguments);
        this.value = this.parseValue(value);
        this.options = isArray(options) ? options : [];
        this.fetchOptions.perform(fetchUri, fetchParams);
    }

    @action onChange(selection) {
        const { onChange, filter, optionValue } = this.args;

        if (isArray(selection)) {
            this.value = selection.map((selected) => {
                if (typeof selected === 'string') {
                    return selected;
                }

                return optionValue ? get(selected, optionValue) : selected;
            });
        } else {
            this.value = [optionValue ? get(selection, optionValue) : selection];
        }

        if (typeof onChange === 'function') {
            onChange(filter, this.value);
        }
    }

    // power-select expects `@search` to RETURN the matches (or a promise of them). The previous
    // version called `this.fetchOptions(...)` — a Task object, not a function, so the remote path
    // threw — and on the local path assigned `this.options`, which both raised a backtracking
    // assertion (it runs inside a modifier update) and permanently discarded every non-matching
    // option, so clearing the query could not bring them back.
    @action search(query) {
        const { optionLabel, fetchUri, fetchParams = {} } = this.args;

        if (typeof fetchUri === 'string') {
            return this.fetchOptions.perform(fetchUri, { query, ...fetchParams });
        }

        return this.options.filter((option) => {
            const optionText = get(option, optionLabel ?? 'name') ?? option;

            if (typeof optionText === 'string') {
                return optionText.toLowerCase().includes(query.toLowerCase());
            }

            return false;
        });
    }

    @task *fetchOptions(uri, params = {}) {
        if (!uri) return;

        const { fetchParams } = this.args;
        const queryParams = Object.assign(params, fetchParams ?? {});

        try {
            const options = yield this.fetch.get(uri, queryParams);
            this.options = options;

            // Returned as well as stored: `search` hands this task's promise straight to
            // power-select, which uses the resolved value as the result list.
            return options;
        } catch (err) {
            debug('Error loading options: ' + err.message);
        }

        return [];
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
