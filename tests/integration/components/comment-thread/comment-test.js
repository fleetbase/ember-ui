import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const AVATAR_URI = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

module('Integration | Component | comment-thread/comment', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('comment', {
            id: 'comment_1',
            content: 'Hello world',
            createdAgo: '2 minutes ago',
            editable: true,
            author: { name: 'Jane Doe', avatar_url: AVATAR_URI },
            replies: [],
        });

        this.calls = [];
        this.set('contextApi', {
            isCommentInvalid: (content) => !content || content.length <= 1,
            reloadComments: () => Promise.resolve(),
            publishReply: (comment, input) => {
                this.calls.push({ method: 'publishReply', comment, input });
                return Promise.resolve();
            },
            updateComment: (comment) => {
                this.calls.push({ method: 'updateComment', comment });
                return Promise.resolve();
            },
            deleteComment: (comment) => {
                this.calls.push({ method: 'deleteComment', comment });
                return Promise.resolve();
            },
        });
    });

    test('it renders the comment author, content, and nested replies', async function (assert) {
        this.comment.replies = [
            {
                id: 'comment_2',
                content: 'A nested reply',
                createdAgo: '1 minute ago',
                editable: false,
                author: { name: 'John Doe', avatar_url: AVATAR_URI },
                replies: [],
            },
        ];

        await render(hbs`<CommentThread::Comment @comment={{this.comment}} @contextApi={{this.contextApi}} />`);

        assert.dom('.thread-comment').exists({ count: 2 }, 'comment and its reply are rendered');
        assert.dom('.thread-comment-author-name').hasText('Jane Doe');
        assert.dom('.thread-comment-conent-paragraph').hasText('Hello world');
        assert.dom('.thread-comment-replies .thread-comment-conent-paragraph').hasText('A nested reply');
        assert.dom('.thread-comment-replies .thread-comment-author-name').hasText('John Doe');
    });

    test('edit and delete actions are only available when the comment is editable', async function (assert) {
        await render(hbs`<CommentThread::Comment @comment={{this.comment}} @contextApi={{this.contextApi}} />`);

        assert.dom('.thread-comment-conent-actions-reply').exists();
        assert.dom('.thread-comment-conent-actions-edit').exists();
        assert.dom('.thread-comment-conent-actions-delete').exists();

        this.set('comment', { ...this.comment, editable: false });
        await render(hbs`<CommentThread::Comment @comment={{this.comment}} @contextApi={{this.contextApi}} />`);

        assert.dom('.thread-comment-conent-actions-reply').exists();
        assert.dom('.thread-comment-conent-actions-edit').doesNotExist();
        assert.dom('.thread-comment-conent-actions-delete').doesNotExist();
    });

    test('replying publishes through the context api and closes the reply form', async function (assert) {
        await render(hbs`<CommentThread::Comment @comment={{this.comment}} @contextApi={{this.contextApi}} />`);

        assert.dom('textarea').doesNotExist();

        await click('.thread-comment-conent-actions-reply button');
        assert.dom('textarea').exists('reply form is shown');

        await fillIn('textarea', 'My reply');
        const publishReplyButton = [...this.element.querySelectorAll('button')].find((button) => button.textContent.includes('comment-thread.publish-reply-button-text'));
        await click(publishReplyButton);

        assert.deepEqual(
            this.calls.map((call) => call.method),
            ['publishReply'],
            'contextApi.publishReply called'
        );
        assert.strictEqual(this.calls[0].comment, this.comment);
        assert.strictEqual(this.calls[0].input, 'My reply');
        assert.dom('textarea').doesNotExist('reply form is closed after publishing');
    });

    test('cancelling a reply closes the reply form without publishing', async function (assert) {
        await render(hbs`<CommentThread::Comment @comment={{this.comment}} @contextApi={{this.contextApi}} />`);

        await click('.thread-comment-conent-actions-reply button');
        assert.dom('textarea').exists();

        const cancelButton = [...this.element.querySelectorAll('button')].find((button) => button.textContent.includes('common.cancel'));
        await click(cancelButton);

        assert.dom('textarea').doesNotExist('reply form is closed');
        assert.strictEqual(this.calls.length, 0, 'nothing was published');
    });

    test('editing saves through the context api and closes the edit form', async function (assert) {
        await render(hbs`<CommentThread::Comment @comment={{this.comment}} @contextApi={{this.contextApi}} />`);

        await click('.thread-comment-conent-actions-edit button');
        assert.dom('textarea').exists('edit form is shown');
        assert.dom('textarea').hasValue('Hello world');
        assert.dom('.thread-comment-conent-paragraph').doesNotExist();

        await fillIn('textarea', 'Hello world, edited');
        const saveButton = [...this.element.querySelectorAll('button')].find((button) => button.textContent.includes('common.save'));
        await click(saveButton);

        assert.deepEqual(
            this.calls.map((call) => call.method),
            ['updateComment'],
            'contextApi.updateComment called'
        );
        assert.strictEqual(this.calls[0].comment.content, 'Hello world, edited');
        assert.dom('textarea').doesNotExist('edit form is closed after saving');
        assert.dom('.thread-comment-conent-paragraph').hasText('Hello world, edited');
    });

    test('deleting invokes the context api with the comment', async function (assert) {
        await render(hbs`<CommentThread::Comment @comment={{this.comment}} @contextApi={{this.contextApi}} />`);

        await click('.thread-comment-conent-actions-delete button');

        assert.deepEqual(
            this.calls.map((call) => call.method),
            ['deleteComment'],
            'contextApi.deleteComment called'
        );
        assert.strictEqual(this.calls[0].comment, this.comment);
    });
});
