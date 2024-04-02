import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ChatContainerComponent extends Component {
    @tracked chatChannels = [{
        title: "test",
        public_id: "test",
        chats: [
            {
                owner: "Doljko",
                message: "Hello"
            }
        ]
    }];
    @tracked isVisible = false;

    @action openChatbox () {
        this.isVisible = true
    }
}
