import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class RegistryYieldComponent extends Component {
    @service universe;
    get components() {
        return this.universe.getRenderableComponentsFromRegistry(this.args.registry) ?? [];
    }
}
