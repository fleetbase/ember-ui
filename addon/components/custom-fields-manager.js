import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, setProperties } from '@ember/object';
import { isArray } from '@ember/array';
import { next } from '@ember/runloop';
import { underscore } from '@ember/string';
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

    /**
     * Subjects whose fields have been fetched or restored, by model name.
     *
     * Tab changes used to decide this from `subject.groups.length`, which cannot tell "not loaded
     * yet" apart from "loaded, and this subject genuinely has no field groups" — so a subject with
     * no groups was refetched every single time its tab was selected.
     */
    #loadedSubjects = new Set();

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
            if (!this.subjects || this.subjects.length === 0) return;
            // Load the first subject immediately, then re-attach anything the registry already
            // holds for the remaining tabs so navigating away and back does not refetch them.
            this.loadCustomFields.perform(this.subjects[0]);
            this.restoreFromCache();
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

    /**
     * Restore custom fields from cache for subjects that haven't been loaded yet
     * This method checks the CustomFieldsRegistry service cache and restores
     * previously loaded data to avoid losing it during navigation
     */
    async restoreFromCache() {
        if (!this.subjects || this.subjects.length <= 1) return;

        // Skip the first subject as it's loaded in constructor
        const subjectsToRestore = this.subjects.slice(1);

        let company;

        try {
            company = await this.currentUser.loadCompany();
        } catch (err) {
            console.warn('Failed to load the company, so no cached custom fields can be restored:', err);
            return;
        }

        for (const subject of subjectsToRestore) {
            try {
                const loadOptions = {
                    groupedFor: `${underscore(subject.model)}_custom_field_group`,
                    fieldFor: subject.type,
                };

                // `forSubject` builds an empty manager on a miss rather than returning nothing, so
                // whether anything was cached is decided by the groups it carries.
                const cachedManager = this.customFieldsRegistry.forSubject(company, { loadOptions });
                // `customFieldGroups`, not `groups`: the raw array holds the categories without
                // their fields attached, and the load path stores the grouped form.
                const cachedGroups = cachedManager?.customFieldGroups;

                if (isArray(cachedGroups) && cachedGroups.length > 0) {
                    this.#updateSubject(subject, (s) => {
                        return { ...s, groups: cachedGroups };
                    });
                    this.#loadedSubjects.add(subject.model);
                }
            } catch (err) {
                // Silently continue if cache restore fails for a subject
                console.warn(`Failed to restore cache for subject ${subject.model}:`, err);
            }
        }
    }

    @task *loadCustomFields(subject) {
        if (!subject) return;

        try {
            const company = yield this.currentUser.loadCompany();
            const customFieldsManager = yield this.customFieldsRegistry.loadSubjectCustomFields.perform(company, {
                loadOptions: {
                    groupedFor: `${underscore(subject.model)}_custom_field_group`,
                    fieldFor: subject.type,
                },
            });

            this.#updateSubject(subject, (s) => {
                return { ...s, groups: customFieldsManager.customFieldGroups };
            });
            this.#loadedSubjects.add(subject.model);

            return customFieldsManager;
        } catch (err) {
            console.error(`❌ Failed to load custom fields for ${subject.model}:`, err);
            this.notifications.serverError(err);
        }
    }

    @action createGroup(subject) {
        const customFieldGroup = this.store.createRecord('category', {
            owner_uuid: this.currentUser.companyId,
            owner_type: 'company',
            for: `${underscore(subject.model)}_custom_field_group`,
        });

        this.modalsManager.show('modals/custom-field-group-form', {
            title: 'New custom field group',
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

    @action deleteGroup(group, subject) {
        this.modalsManager.confirm({
            title: 'Delete this field group?',
            body: 'Once this field group is deleted it will not be recoverable and you will lose all custom fields inside.',
            acceptButtonText: 'Delete',
            acceptButtonType: 'danger',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await group.destroyRecord();
                    await this.loadCustomFields.perform(subject, true); // Force reload after deletion
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

    @action deleteCustomField(customField, subject) {
        this.modalsManager.confirm({
            title: 'Delete this custom field?',
            body: 'Once this custom field is deleted it will not be recoverable and you will lose all data assosciated.',
            acceptButtonText: 'Delete',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await customField.destroyRecord();
                    await this.loadCustomFields.perform(subject, true); // Force reload after deletion
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    @action onTabChange(subject) {
        // Ensure custom fields are loaded when switching tabs, once per subject.
        if (!subject || this.#loadedSubjects.has(subject.model)) {
            return;
        }

        this.loadCustomFields.perform(subject);
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

        // Find by model property since tab objects have extra properties
        const idx = this.subjects.findIndex((s) => s?.model === subject?.model);

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
