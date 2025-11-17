import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * AvailabilityEditor Component
 *
 * Allows users to set and manage availability windows for resources.
 *
 * @example
 * <AvailabilityEditor
 *   @subjectType="driver"
 *   @subjectUuid={{@driver.id}}
 *   @onSave={{this.handleAvailabilitySave}}
 * />
 */
export default class AvailabilityEditorComponent extends Component {
    @service scheduling;
    @service notifications;

    @tracked startAt = null;
    @tracked endAt = null;
    @tracked isAvailable = true;
    @tracked preferenceLevel = 3;
    @tracked reason = '';
    @tracked notes = '';
    @tracked rrule = '';

    /**
     * Save availability
     */
    @action
    async saveAvailability() {
        try {
            const data = {
                subject_type: this.args.subjectType,
                subject_uuid: this.args.subjectUuid,
                start_at: this.startAt,
                end_at: this.endAt,
                is_available: this.isAvailable,
                preference_level: this.preferenceLevel,
                reason: this.reason,
                notes: this.notes,
                rrule: this.rrule,
            };

            const availability = await this.scheduling.setAvailability.perform(data);

            if (this.args.onSave) {
                this.args.onSave(availability);
            }

            this.resetForm();
        } catch (error) {
            console.error('Failed to save availability:', error);
        }
    }

    /**
     * Reset form
     */
    @action
    resetForm() {
        this.startAt = null;
        this.endAt = null;
        this.isAvailable = true;
        this.preferenceLevel = 3;
        this.reason = '';
        this.notes = '';
        this.rrule = '';
    }

    /**
     * Update field
     */
    @action
    updateField(field, value) {
        this[field] = value;
    }
}
