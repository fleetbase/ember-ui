import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';

export default class IsDarkModeHelper extends Helper {
    compute(params) {
        const owner = getOwner(this);
        if (owner) {
            const theme = owner.lookup('service:theme');
            if (theme) {
                return theme.activeTheme === 'dark';
            }
        }

        return false;
    }
}
