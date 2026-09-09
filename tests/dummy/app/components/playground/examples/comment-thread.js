import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { COMMENTS, ORDERS } from 'dummy/playground/fixtures';

/**
 * Comments live in local state. Publishing appends locally and reports to the event log; nothing
 * is persisted anywhere.
 */
export default class PlaygroundExampleCommentThreadComponent extends Component {
    @tracked comments = [...COMMENTS];

    subject = ORDERS[0];

    @action publish(content) {
        this.comments = [...this.comments, { id: `local-${this.comments.length + 1}`, content, created_at: '2026-03-16T15:00:00Z', author: { name: 'You' }, replies: [] }];

        this.args.onEvent?.('onPublishComment', content);
    }
}
