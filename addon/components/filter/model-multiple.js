import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency';
import { resourceComponentName } from '../../utils/resource-registry';

/**
 * Table filter that selects several records of one model. The filter value
 * travels as a comma-separated list of ids so it survives the URL round trip;
 * the matching records are re-fetched on init so the chips show names rather
 * than ids after a reload.
 */
export default class FilterModelMultipleComponent extends Component {
    @service store;
    @tracked selectedModels = [];

    constructor() {
        super(...arguments);
        this.restoreSelection.perform(this.args.value);
    }

    get modelName() {
        return this.args.filter?.model;
    }

    get optionLabel() {
        return this.args.filter?.modelNamePath ?? 'name';
    }

    get optionComponent() {
        const { filter } = this.args;

        if (filter?.filterOptionComponent) {
            return filter.filterOptionComponent;
        }

        return resourceComponentName(getOwner(this), 'select-option', this.modelName);
    }

    parseIds(value) {
        if (isArray(value)) {
            return value.filter(Boolean);
        }

        if (typeof value === 'string' && value.trim()) {
            return value
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean);
        }

        return [];
    }

    @task *restoreSelection(value) {
        const ids = this.parseIds(value);

        if (!ids.length || !this.modelName) {
            this.selectedModels = [];
            return;
        }

        const records = [];

        for (const id of ids) {
            try {
                records.push(this.store.peekRecord(this.modelName, id) ?? (yield this.store.findRecord(this.modelName, id)));
            } catch {
                // An id that no longer resolves simply drops out of the chips.
            }
        }

        this.selectedModels = records.filter(Boolean);
    }

    @action onChange(selection) {
        const { onChange, onClear, filter } = this.args;
        const models = isArray(selection) ? selection : [];

        this.selectedModels = models;

        if (!models.length) {
            if (typeof onClear === 'function') {
                onClear(filter);
            }
            return;
        }

        if (typeof onChange === 'function') {
            onChange(filter, models.map((model) => model.id).join(','));
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        this.selectedModels = [];

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}
