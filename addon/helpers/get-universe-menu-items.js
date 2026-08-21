import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';

export default class GetUniverseMenuItemsHelper extends Helper {
    compute(params) {
        const [registryName] = params;
        const owner = getOwner(this);
        /* istanbul ignore next -- a container-created helper always has an owner, and the
           universe service always resolves, so neither guard's else can be reached. */
        if (owner) {
            const universe = owner.lookup('service:universe');
            if (universe) {
                return universe.getMenuItemsFromRegistry(registryName);
            }
        }

        /* istanbul ignore next -- unreachable for the same reason: the owner and the universe
           service are always present. */
        return [];
    }
}
