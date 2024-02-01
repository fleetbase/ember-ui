import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency-decorators';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

export default class CommentThreadComponent extends Component {
    @service store;
    @service notifications;
    @tracked subject;
    @tracked comments = [];
    @tracked input = '';

    constructor(owner, { subject, subjectType }) {
        super(...arguments);

        this.subject = subject;
        this.comments = subject.comments;
        this.subjectType = subjectType ? subjectType : getModelName(subject);
    }

    @task *publishComment() {
        if (this.isCommentInvalid(this.input)) {
            return;
        }

        let comment = this.store.createRecord('comment', {
            content: this.input,
            subject_uuid: this.subject.id,
            subject_type: this.subjectType,
        });

        yield comment.save();
        yield this.reloadComments.perform();

        this.input = '';
    }

    @task *reloadComments() {
        this.comments = yield this.store.query('comment', { subject_uuid: this.subject.id, sort: '-created_at' });
    }

    isCommentInvalid(comment) {
        if (!comment) {
            this.notification.warning(this.intl.t('fleet-ops.operations.orders.index.view.comment-input-empty-notification'));
            return true;
        }

        // make sure comment is atleast 12 characters
        if (typeof comment === 'string' && comment.length < 2) {
            this.notification.warning(this.intl.t('fleet-ops.operations.orders.index.view.comment-min-length-notification'));
            return true;
        }

        return false;
    }
}
