import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';

export default class ComponentResolvableHelper extends Helper {
    compute([value]) {
        if (!value) return false;
        if (typeof value === 'string') {
            const owner = getOwner(this);
            const key = `component:${value}`;
            return Boolean(owner.factoryFor?.(key));
        }

        // If it’s a class/safe definition, it’s renderable
        if (typeof value === 'function' || typeof value === 'object') {
            return true;
        }
        return false;
    }
}
