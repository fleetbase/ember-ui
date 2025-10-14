import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import isEmptyObject from '@fleetbase/ember-core/utils/is-empty-object';

export default class MetadataViewerComponent extends Component {
    @tracked displayRaw = false;

    get emptyMetadata() {
        return isEmptyObject(this.args.metadata);
    }

    @action viewRaw() {
        this.displayRaw = !this.displayRaw;
    }
}
