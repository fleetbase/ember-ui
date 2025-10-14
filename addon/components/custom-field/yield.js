import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { debug } from '@ember/debug';
import { next } from '@ember/runloop';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { underscore } from '@ember/string';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isThenable from '@fleetbase/ember-core/utils/is-thenable';

export default class CustomFieldYieldComponent extends Component {
    @service store;
    @service customFieldsRegistry;
    @service currentUser;
    @tracked extension = this.args.extension ?? 'fleet-ops';
    @tracked customFields = null;

    get modelName() {
        // prefer explicit modelType arg; else infer from subject
        const base = this.args.modelType ?? getModelName(this.args.subject);
        return underscore(base);
    }

    get modelType() {
        // follow fleetbase & ember conventions: "<ext>:<type>"
        return this.extension ? `${this.extension}:${this.modelName}` : this.modelName;
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
        // const subject = yield this.resolveSubject();
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

    @action toggleGroupEdit(group) {
        group.isEditing = !group.isEditing;
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

    async resolveSubject() {
        let subject = this.args.subject;
        if (isThenable(subject)) {
            subject = await subject;
        }

        return subject;
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
