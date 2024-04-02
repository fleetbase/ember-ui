import Component from '@glimmer/component';

export class ChatWindowComponent extends Component {
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