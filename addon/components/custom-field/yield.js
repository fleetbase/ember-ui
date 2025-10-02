import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency';
import { underscore } from '@ember/string';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

export default class CustomFieldYieldComponent extends Component {
    @service store;
    @service customFieldsRegistry;
    @service currentUser;
    @tracked extension = 'fleet-ops';
    @tracked customFields;

    constructor(owner, { subject, extension = 'fleet-ops' }) {
        super(...arguments);
        this.extension = extension;
        this.loadCustomFields.perform(subject);
    }

    @task *loadCustomFields(subject) {
        // follow fleetbase & ember conventions
        const modelName = getModelName(subject);
        const modelType = `${this.extension}:${underscore(modelName)}`;
        const company = yield this.currentUser.loadCompany();

        try {
            const customFieldsManager = yield this.customFieldsRegistry.loadSubjectCustomFields.perform(company, {
                loadOptions: {
                    groupedFor: `${modelName}_custom_field_group`,
                    fieldFor: modelType,
                },
            });
            this.customFields = customFieldsManager;
            this.args.resource.cfManager = customFieldsManager;
            if (typeof this.args.onCustomFieldsReady === 'function') {
                this.args.onCustomFieldsReady(customFieldsManager);
            }
        } catch (err) {
            debug('Error loading custom fields: ' + err.message);
        }
    }
}
