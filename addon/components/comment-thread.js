import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

/**
 * Component to handle a thread of comments.
 */
export default class CommentThreadComponent extends Component {
    /**
     * Service to handle data store operations.
     * @service
     */
    @service store;

    /**
     * Service for handling notifications.
     * @service
     */
    @service notifications;

    /**
     * Service for internationalization.
     * @service
     */
    @service intl;

    /**
     * The subject related to the comments.
     * @tracked
     */
    @tracked subject;

    /**
     * Array of comments related to the subject.
     * @tracked
     */
    @tracked comments = [];

    /**
     * The text input for publishing a new comment.
     * @tracked
     */
    @tracked input = '';

    /**
     * Context object containing utility functions.
     */
    context = {
        isCommentInvalid: this.isCommentInvalid.bind(this),
        reloadComments: () => {
            return this.reloadComments.perform();
        },
        publishReply: (comment, input) => {
            return this.publishReply.perform(comment, input);
        },
        updateComment: (comment) => {
            return this.updateComment.perform(comment);
        },
        deleteComment: (comment) => {
            return this.deleteComment.perform(comment);
        },
    };

    /**
     * Constructor for the comment thread component.
     * @param owner - The owner of the component.
     * @param subject - The subject of the comment thread.
     * @param subjectType - The type of the subject.
     */
    constructor(owner, { subject, subjectType }) {
        super(...arguments);

        this.subject = subject;
        this.comments = getWithDefault(this.args, 'comments', getWithDefault(subject, 'comments', []));
        this.subjectType = subjectType ? subjectType : getModelName(subject);
    }

    get visibleComments() {
        return this.args.comments ?? this.comments;
    }

    get subjectUuid() {
        return this.subject?.uuid;
    }

    get subjectPublicId() {
        return this.subject?.public_id ?? this.subject?.id ?? this.subject?.uuid;
    }

    /**
     * Asynchronous task to publish a new comment.
     * @task
     */
    @task *publishComment() {
        if (this.isCommentInvalid(this.input)) {
            return;
        }

        if (typeof this.args.onPublishComment === 'function') {
            yield this.args.onPublishComment(this.input, this.subject);
        } else {
            let comment = this.store.createRecord('comment', {
                content: this.input,
                subject_id: this.subjectPublicId,
                subject_type: this.subjectType,
            });

            yield comment.save();
        }

        yield this.reloadComments.perform();

        this.input = '';
    }

    /**
     * Asynchronous task to reload the comments related to the subject.
     * @task
     */
    @task *reloadComments() {
        if (typeof this.args.onReloadComments === 'function') {
            this.comments = yield this.args.onReloadComments(this.subject);
        } else {
            const query = {
                withoutParent: 1,
                sort: '-created_at',
            };

            if (this.subjectUuid) {
                query.subject_uuid = this.subjectUuid;
            } else {
                query.subject = this.subjectPublicId;
            }

            if (this.subjectType) {
                query.subject_type = this.subjectType;
            }

            this.comments = yield this.store.query('comment', query);
        }
    }

    @task *publishReply(comment, input) {
        if (typeof this.args.onPublishReply === 'function') {
            yield this.args.onPublishReply(comment, input, this.subject);
            yield this.reloadComments.perform();
            return;
        }

        let reply = this.store.createRecord('comment', {
            content: input,
            parent_comment_uuid: comment.uuid ?? comment.public_id ?? comment.id,
        });

        yield reply.save();
        yield this.reloadComments.perform();
    }

    @task *updateComment(comment) {
        if (typeof this.args.onUpdateComment === 'function') {
            yield this.args.onUpdateComment(comment, this.subject);
            yield this.reloadComments.perform();
            return;
        }

        yield comment.save();
    }

    @task *deleteComment(comment) {
        if (typeof this.args.onDeleteComment === 'function') {
            yield this.args.onDeleteComment(comment, this.subject);
            yield this.reloadComments.perform();
            return;
        }

        yield comment.destroyRecord();
    }

    /**
     * Checks if a comment is invalid.
     * @param {string} comment - The comment to validate.
     * @returns {boolean} True if the comment is invalid, false otherwise.
     */
    isCommentInvalid(comment) {
        if (!comment) {
            this.notifications.warning(this.intl.t('component.comment-thread.comment-input-empty-notification'));
            return true;
        }

        // make sure comment is at least 2 characters
        if (typeof comment === 'string' && comment.length <= 1) {
            this.notifications.warning(this.intl.t('component.comment-thread.comment-min-length-notification'));
            return true;
        }

        return false;
    }
}
