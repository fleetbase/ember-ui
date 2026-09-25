import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { debug } from '@ember/debug';
import { next } from '@ember/runloop';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { dasherize, underscore } from '@ember/string';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isThenable from '@fleetbase/ember-core/utils/is-thenable';

export default class CustomFieldYieldComponent extends Component {
    @service store;
    @service customFieldsRegistry;
    @service currentUser;
    @tracked extension = this.args.extension ?? 'fleet-ops';
    @tracked customFields = null;

    get baseModelName() {
        // prefer explicit modelType arg; else infer from subject
        return this.args.modelType ?? getModelName(this.args.subject);
    }

    // Underscored name, used for the category key: "<model_name>_custom_field_group".
    get modelName() {
        return underscore(this.baseModelName);
    }

    // Hyphenated subject type, matching how custom fields are saved: "<ext>:<model-name>".
    get modelType() {
        const type = dasherize(this.baseModelName);
        return this.extension ? `${this.extension}:${type}` : type;
    }

    get defaultLoadOptions() {
        return {
            groupedFor: `${this.modelName}_custom_field_group`,
            fieldFor: this.modelType,
        };
    }

    get mergedLoadOptions() {
        if (this.args.loadOptions === false) {
            return {};
        }
        // allow caller to override/extend defaults
        return isObject(this.args.loadOptions) ? { ...this.defaultLoadOptions, ...this.args.loadOptions } : this.defaultLoadOptions;
    }

    constructor() {
        super(...arguments);
        next(() => this.loadCustomFields.perform());
    }

    @task *loadCustomFields() {
        const owner = yield this.resolveOwner();

        try {
            const customFieldsManager = yield this.customFieldsRegistry.loadSubjectCustomFields.perform(owner, { loadOptions: this.mergedLoadOptions });
            this.customFields = customFieldsManager;
            if (this.args.resource) {
                this.args.resource.cfManager = customFieldsManager;
            }
            if (typeof this.args.onCustomFieldsReady === 'function') {
                this.args.onCustomFieldsReady(customFieldsManager);
            }
        } catch (err) {
            debug('Error loading custom fields: ' + err.message);
        }
    }

    @action cancelEditing(group) {
        group.isEditing = false;
    }

    @action groupSaveHandler(group) {
        group.isEditing = false;
        if (typeof this.args.onGroupSaved === 'function') {
            this.args.onGroupSaved(group);
        }
        if (typeof this.args.onChange === 'function') {
            this.args.onChange();
        }
    }

    async resolveOwner() {
        let owner = this.args.owner;
        if (isThenable(owner)) {
            owner = await owner;
        }
        if (!owner) {
            owner = await this.currentUser.loadCompany();
        }

        return owner;
    }
}
