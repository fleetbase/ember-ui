import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ImageComponent extends Component {
    @action onError(event) {
        const { fallbackSrc } = this.args;

        if (fallbackSrc) {
            event.target.src = fallbackSrc;
        }
    }
}
