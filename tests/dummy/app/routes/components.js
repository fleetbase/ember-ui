import Route from '@ember/routing/route';
import REGISTRY from 'dummy/playground/registry';

export default class ComponentsRoute extends Route {
    model() {
        return REGISTRY;
    }
}
