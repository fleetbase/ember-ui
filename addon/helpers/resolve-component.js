import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';
import { ensureSafeComponent } from '@embroider/util';

export default class ResolveComponentHelper extends Helper {
    compute([value]) {
        const owner = getOwner(this);

        // If it's a string name, pass through — resolver will handle it.
        if (typeof value === 'string') {
            return value;
        }

        // If it's a component class or a pre-wrapped safe definition,
        // ensure it's safe for this template's owner and return it.
        if (value && (typeof value === 'function' || typeof value === 'object')) {
            return ensureSafeComponent(value, owner);
        }

        // Anything else is not renderable
        return null;
    }
}
