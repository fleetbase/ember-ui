import { helper } from '@ember/component/helper';
import { relationValue } from '../utils/resource-registry';

/**
 * `{{resource-relation record "driver"}}` — the loaded related record, never
 * a promise proxy, so `{{#if}}` and pills can rely on it.
 */
export default helper(function resourceRelation([record, name]) {
    return relationValue(record, name);
});
