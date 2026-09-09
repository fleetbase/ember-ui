import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';

export default class IsDarkModeHelper extends Helper {
    compute() {
        const owner = getOwner(this);
        /* istanbul ignore next -- a container-created helper always has an owner, and the theme
           service always resolves, so neither guard's else can be reached. */
        if (owner) {
            const theme = owner.lookup('service:theme');
            if (theme) {
                return theme.activeTheme === 'dark';
            }
        }

        /* istanbul ignore next -- unreachable for the same reason: the owner and the theme
           service are always present. */
        return false;
    }
}
