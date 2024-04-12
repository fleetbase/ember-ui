import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class ChatWindowMessageComponent extends Component {
    @tracked chatMessage;
    constructor(owner, { record }) {
        super(...arguments);
        this.chatMessage = record;
    }
}
