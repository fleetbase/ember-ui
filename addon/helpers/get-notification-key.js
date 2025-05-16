import { helper } from '@ember/component/helper';
import createNotificationKey from '@fleetbase/ember-core/utils/create-notification-key';

export default helper(function getNotificationKey([definition, name]) {
    return createNotificationKey(definition, name);
});
