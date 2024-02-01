import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';

export default class CommentThreadCommentComponent extends Component {
    @service store;
    @tracked input = '';
    @tracked replying = false;
    @tracked editing = false;

    constructor(owner, { comment }) {
        super(...arguments);
        
        this.comment = comment;
    }

    @action reply() {
        this.replying = true;
    }

    @action cancelReply() {
        this.replying = false;
    }

    @action edit() {
        this.editing = true;
    }

    @action cancelEdit() {
        this.editing = false;
    }

    @action delete() {
        this.comment.destroyRecord();
    }

    @task *updateComment() {
        yield this.comment.save();
        this.editing = false;
    }

    @task *publishReply() {
        let comment = this.store.createRecord('comment', {
            content: this.input,
            parent_comment_uuid: this.comment.id,
            subject_uuid: this.comment.subject_uuid,
            subject_type: this.comment.subject_type,
        });

        yield comment.save();
        yield this.reloadReplies.perform();

        this.replying = false;
        this.input = '';
    }

    @task *reloadReplies() {
        this.comment = yield this.comment.reload();
    }
}
