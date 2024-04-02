import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class ChatContainerComponent extends Component {
    @tracked chatChannels = []
}
