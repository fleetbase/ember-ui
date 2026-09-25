/**
 * The custom field value record on a subject for one custom field.
 *
 * A subject may hold two records for the same field: the record created locally while editing
 * and, after the resource is saved, the persisted record the server returned. The persisted one
 * carries the server's expanded value (a file's json rather than its `file:` sentinel), so it
 * wins whenever both are present.
 *
 * @param {Object} subject an Ember Data record, or any object carrying `custom_field_values`
 * @param {Object} customField
 * @returns {Object|null}
 */
export default function findCustomFieldValue(subject, customField) {
    const values = (typeof subject?.get === 'function' ? subject.get('custom_field_values') : subject?.custom_field_values) ?? [];
    const matches = values.filter((cfv) => cfv?.custom_field_uuid === customField?.id);

    return matches.find((cfv) => !cfv.isNew) ?? matches[0] ?? null;
}
