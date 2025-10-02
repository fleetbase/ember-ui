import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, setProperties } from '@ember/object';
import { isArray } from '@ember/array';
import { next } from '@ember/runloop';
import { task } from 'ember-concurrency';
import isObject from '@fleetbase/ember-core/utils/is-object';

export default class CustomFieldsManagerComponent extends Component {
    @service store;
    @service currentUser;
    @service notifications;
    @service modalsManager;
    @service customFieldsRegistry;
    @service intl;
    @tracked subjects = [];

    get gridSizeOptions() {
        return [1, 2, 3];
    }

    get tabs() {
        const subjects = this.subjects ?? [];
        return subjects.map((s) => ({
            id: s.model,
            ...s,
        }));
    }

    constructor(owner, { subjects = [] }) {
        super(...arguments);
        this.subjects = subjects ?? [];
        next(() => {
            if (!this.subjects) return;
            this.loadCustomFields.perform(this.subjects[0]);
        });
    }

    @task *setGridSize(group, size) {
        if (!isObject(group.meta)) {
            group.set('meta', {});
        }
        group.meta.grid_size = size;

        try {
            yield group.save();
        } catch (err) {
            this.notifications.serverError(err);
        }
    }

    @task *loadCustomFields(subject) {
        try {
            const groups = yield this.store.query('category', { for: `${subject.model}_custom_field_group` });
            const customFields = yield this.store.query('custom-field', { for: subject.type });
            this.#updateSubject(subject, (s) => {
                const grouped = groups.map((group) => {
                    const fields = customFields.filter((cf) => cf.category_uuid === group.id);
                    group.set?.('customFields', fields) ?? (group.customFields = fields);
                    return group;
                });

                return { ...s, groups: grouped };
            });
        } catch (err) {
            this.notifications.serverError(err);
        }
    }

    @action createGroup(subject) {
        const customFieldGroup = this.store.createRecord('category', {
            owner_uuid: this.currentUser.companyId,
            owner_type: 'company',
            for: `${subject.model}_custom_field_group`,
        });

        this.modalsManager.show('modals/new-custom-field-group', {
            title: this.intl.t('fleet-ops.component.modals.new-custom-field-group.modal-title'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            customFieldGroup,
            confirm: async (modal) => {
                if (!customFieldGroup.name) return;

                modal.startLoading();

                try {
                    await customFieldGroup.save();
                    this.#appendGroupToSubject(subject, customFieldGroup);
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    @action createCustomField(subject, group) {
        const customField = this.store.createRecord('custom-field', {
            label: 'Untitled Field',
            category_uuid: group.id,
            subject_uuid: this.currentUser.companyId,
            subject_type: 'company',
            for: subject.type,
            required: 0,
            options: [],
        });

        this.#addCustomFieldToGroup(subject, customField, group);
        this.customFieldsRegistry.panel.edit(customField);
    }

    @action deleteGroup(group) {
        this.modalsManager.confirm({
            title: 'Delete this custom field?',
            body: 'Once this custom field is deleted it will not be recoverable and you will lose all configurations.',
            acceptButtonText: 'Delete',
            acceptButtonType: 'danger',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await group.destroyRecord();
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    @action editCustomField(customField) {
        this.customFieldsRegistry.panel.edit(customField);
    }

    @action deleteCustomField(customField) {
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-prompt.modal-title'),
            body: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-prompt.delete-body-message'),
            acceptButtonText: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-prompt.confirm-delete'),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await customField.destroyRecord();
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    #addCustomFieldToGroup(subject, customField, group) {
        this.#updateGroupOnSubject(subject, group.id, (g) => {
            const current = isArray(g.customFields) ? g.customFields : [];
            const next = [...current, customField];

            // Update the model instance
            if (g.set) {
                g.set('customFields', next);
            } else {
                g.customFields = next;
            }
        });
    }

    #updateGroupOnSubject(subject, groupId, patch) {
        return this.#updateSubject(subject, (s) => {
            const groups = s.groups ?? [];
            const idx = groups.findIndex((g) => g?.id === groupId || g?._temp_id === groupId);
            if (idx === -1) return s;

            const target = groups[idx];

            // Apply the patch to the real model instance
            if (typeof patch === 'function') {
                patch(target);
            } else if (patch && isObject(patch)) {
                // Object.assign(target, patch);
                setProperties(target, patch);
            }

            // Return a NEW groups array (same instances), so Glimmer re-renders
            const nextGroups = [...groups];
            return { ...s, groups: nextGroups };
        });
    }

    #appendGroupToSubject(subject, group) {
        return this.#updateSubject(subject, (s) => ({
            ...s,
            groups: [...(s.groups ?? []), group],
        }));
    }

    #updateSubject(subject, updater) {
        if (!subject) return;

        // Try to locate by object identity first; fallback to stable keys
        const idKey = 'id' in subject ? 'id' : 'model' in subject ? 'model' : null;
        const idx = this.subjects.findIndex((s) => {
            if (s === subject) return true;
            return idKey ? s?.[idKey] === subject?.[idKey] : false;
        });

        if (idx === -1) return;

        // Build the updated subject with a *new* object reference
        const current = this.subjects[idx];
        const updated = updater(current);

        // Safety: if updater returned nothing, keep current
        const next = updated ?? current;

        // Replace the element with a new array reference to trigger tracking
        this.subjects = [...this.subjects.slice(0, idx), next, ...this.subjects.slice(idx + 1)];

        return next;
    }
}
