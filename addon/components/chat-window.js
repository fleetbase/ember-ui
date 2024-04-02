import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class ChatWindowComponent extends Component {
    @service socket;
    @service chat;
    @tracked channel;
    constructor(owner, { chatChannel }) {
      super(...arguments);
      this.channel = chatChannel;
      this.listen();
    }
  
    listen() {
      this.socket.listen(`chat.${this.channel.public_id}`, (event) => {
        console.log('[chat event]', event);
      });
    }
  }