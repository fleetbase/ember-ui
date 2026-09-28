import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const AVATAR_URI = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

function createComment(content, authorName = 'Test User') {
    return {
        id: `comment_${content}`,
        content,
        createdAgo: '5 minutes ago',
        editable: false,
        author: { name: authorName, avatar_url: AVATAR_URI },
        replies: [],
    };
}

module('Integration | Component | comment-thread', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('subject', { public_id: 'order_test_1', comments: [] });
    });

    test('it renders a comment for each comment provided', async function (assert) {
        this.set('comments', [createComment('First comment', 'Jane Doe'), createComment('Second comment', 'John Doe')]);

        await render(hbs`<CommentThread @subject={{this.subject}} @subjectType="order" @comments={{this.comments}} />`);

        assert.dom('.thread-comment').exists({ count: 2 });
        assert.dom('.thread-comment:first-child .thread-comment-author-name').hasText('Jane Doe');
        assert.dom('.thread-comment:first-child .thread-comment-conent-paragraph').hasText('First comment');
        assert.dom(this.element).containsText('Second comment');
    });

    test('publish button is disabled until input is entered', async function (assert) {
        this.set('comments', []);

        await render(hbs`<CommentThread @subject={{this.subject}} @subjectType="order" @comments={{this.comments}} />`);

        assert.dom('textarea').exists();
        assert.dom('button').isDisabled();

        await fillIn('textarea', 'A brand new comment');
        assert.dom('button').isNotDisabled();
    });

    test('publishing a comment invokes @onPublishComment, reloads comments, and clears the input', async function (assert) {
        const published = [];
        this.set('comments', []);
        this.set('onPublishComment', (input, subject) => {
            published.push({ input, subject });
            return Promise.resolve();
        });
        this.set('onReloadComments', () => Promise.resolve([createComment('A brand new comment')]));

        await render(hbs`
            <CommentThread
                @subject={{this.subject}}
                @subjectType="order"
                @onPublishComment={{this.onPublishComment}}
                @onReloadComments={{this.onReloadComments}}
            />
        `);

        await fillIn('textarea', 'A brand new comment');
        await click('button');

        assert.strictEqual(published.length, 1, 'onPublishComment called once');
        assert.strictEqual(published[0].input, 'A brand new comment');
        assert.strictEqual(published[0].subject, this.subject);
        assert.dom('textarea').hasValue('', 'input cleared after publishing');
        assert.dom('.thread-comment').exists({ count: 1 }, 'reloaded comments are rendered');
        assert.dom('.thread-comment-conent-paragraph').hasText('A brand new comment');
    });

    test('publishing a too-short comment warns and does not publish', async function (assert) {
        const published = [];
        this.set('comments', []);
        this.set('onPublishComment', (input, subject) => {
            published.push({ input, subject });
            return Promise.resolve();
        });

        await render(hbs`<CommentThread @subject={{this.subject}} @subjectType="order" @comments={{this.comments}} @onPublishComment={{this.onPublishComment}} />`);

        await fillIn('textarea', 'a');
        await click('button');

        const notifications = this.owner.lookup('service:notifications');
        const warnings = notifications.calls.filter((call) => call.method === 'warning');

        assert.strictEqual(published.length, 0, 'onPublishComment not called');
        assert.strictEqual(warnings.length, 1, 'a warning notification was shown');
        assert.strictEqual(warnings[0].args[0], 'component.comment-thread.comment-min-length-notification');
        assert.dom('textarea').hasValue('a', 'input is not cleared');
    });

    test('block form yields a comment component and the comment', async function (assert) {
        this.set('comments', [createComment('Yielded comment')]);

        await render(hbs`
            <CommentThread @subject={{this.subject}} @subjectType="order" @comments={{this.comments}} as |Comment comment|>
                <div data-test-yielded>{{comment.content}}</div>
            </CommentThread>
        `);

        assert.dom('[data-test-yielded]').hasText('Yielded comment');
        assert.dom('.thread-comment').doesNotExist('default comment component is not rendered when block is used');
    });

    // -------------------------------------------------------------------------
    // Appended coverage: the yielded context API — replying, editing and deleting
    // a comment, plus the subject-identity getters.
    // -------------------------------------------------------------------------

    // The thread has its own comment box and publish button outside `.thread-comment`, so the
    // per-comment reply and edit controls must be scoped to the comment itself.
    function commentButton(text) {
        return findAll('.thread-comment button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
    }

    function editTextarea() {
        return find('.thread-comment-conent-paragraph-wrapper textarea');
    }

    function replyTextarea() {
        return findAll('.thread-comment textarea').at(-1);
    }

    function editableComment(content = 'First comment') {
        return { ...createComment(content), editable: true };
    }

    module('the yielded context api', function (hooks) {
        hooks.beforeEach(function () {
            this.set('comments', [editableComment()]);
        });

        const TEMPLATE = hbs`
            <CommentThread
                @subject={{this.subject}}
                @subjectType="order"
                @comments={{this.comments}}
                @onPublishReply={{this.onPublishReply}}
                @onUpdateComment={{this.onUpdateComment}}
                @onDeleteComment={{this.onDeleteComment}}
            />
        `;

        test('a comment offers reply, edit and delete when it is editable', async function (assert) {
            await render(TEMPLATE);

            assert.ok(commentButton('reply-comment'), 'replying is offered');
            assert.ok(commentButton('edit-comment'), 'editing is offered');
            assert.ok(commentButton('delete-comment'), 'deleting is offered');
        });

        test('a comment that is not editable offers only a reply', async function (assert) {
            this.set('comments', [createComment("Someone else's comment")]);

            await render(TEMPLATE);

            assert.ok(commentButton('reply-comment'));
            assert.notOk(commentButton('edit-comment'), 'editing is withheld');
            assert.notOk(commentButton('delete-comment'), 'so is deleting');
        });

        test('replying hands the comment and the text to the handler', async function (assert) {
            const replies = [];
            this.set('onPublishReply', (comment, input, subject) => {
                replies.push({ comment, input, subject });
                return Promise.resolve();
            });

            await render(TEMPLATE);
            await click(commentButton('reply-comment'));
            await fillIn(replyTextarea(), 'A considered reply');
            await click(commentButton('publish-reply'));

            assert.strictEqual(replies.length, 1, 'the reply is published once');
            assert.strictEqual(replies[0].input, 'A considered reply');
            assert.strictEqual(replies[0].comment.content, 'First comment', 'the parent comment is identified');
            assert.strictEqual(replies[0].subject, this.subject, 'alongside the thread subject');
        });

        test('a reply can be abandoned', async function (assert) {
            await render(TEMPLATE);
            await click(commentButton('reply-comment'));

            assert.strictEqual(findAll('textarea').length, 2, 'a reply box opens');

            await click(commentButton('cancel'));

            assert.strictEqual(findAll('textarea').length, 1, 'and closes again');
        });

        test('publishing a reply is refused while it is empty', async function (assert) {
            await render(TEMPLATE);
            await click(commentButton('reply-comment'));

            assert.dom(commentButton('publish-reply')).isDisabled();
        });

        test('editing hands the amended comment to the handler', async function (assert) {
            const updates = [];
            this.set('onUpdateComment', (comment, subject) => {
                updates.push({ comment, subject });
                return Promise.resolve();
            });

            await render(TEMPLATE);
            await click(commentButton('edit-comment'));
            await fillIn(editTextarea(), 'An amended comment');
            await click(commentButton('save'));

            assert.strictEqual(updates.length, 1);
            assert.strictEqual(updates[0].comment.content, 'An amended comment', 'the edited text is carried');
            assert.strictEqual(updates[0].subject, this.subject);
        });

        test('an edit can be abandoned', async function (assert) {
            await render(TEMPLATE);
            await click(commentButton('edit-comment'));

            assert.ok(commentButton('cancel'), 'the edit is in progress');

            await click(commentButton('cancel'));

            assert.ok(commentButton('edit-comment'), 'the comment returns to its resting state');
        });

        test('deleting hands the comment to the handler', async function (assert) {
            const deletions = [];
            this.set('onDeleteComment', (comment, subject) => {
                deletions.push({ comment, subject });
                return Promise.resolve();
            });

            await render(TEMPLATE);
            await click(commentButton('delete-comment'));

            assert.strictEqual(deletions.length, 1);
            assert.strictEqual(deletions[0].comment.content, 'First comment');
            assert.strictEqual(deletions[0].subject, this.subject);
        });

        test('replies are rendered beneath their parent', async function (assert) {
            this.set('comments', [{ ...editableComment(), replies: [createComment('A reply', 'Jane Doe')] }]);

            await render(TEMPLATE);

            assert.dom(this.element).containsText('A reply');
            assert.true(findAll('.thread-comment').length >= 2, 'the reply renders as its own comment');
        });
    });

    module('identifying the subject', function () {
        test('comments default to those already on the subject', async function (assert) {
            this.set('subject', { public_id: 'order_test_1', comments: [createComment('From the subject')] });

            await render(hbs`<CommentThread @subject={{this.subject}} @subjectType="order" />`);

            assert.dom(this.element).containsText('From the subject');
        });

        test('an explicit comments argument wins over the subject', async function (assert) {
            this.set('subject', { public_id: 'order_test_1', comments: [createComment('From the subject')] });
            this.set('comments', [createComment('From the argument')]);

            await render(hbs`<CommentThread @subject={{this.subject}} @subjectType="order" @comments={{this.comments}} />`);

            assert.dom(this.element).containsText('From the argument');
            assert.dom(this.element).doesNotContainText('From the subject');
        });

        test('a subject with no comments renders an empty thread', async function (assert) {
            this.set('subject', { public_id: 'order_test_1' });

            await render(hbs`<CommentThread @subject={{this.subject}} @subjectType="order" />`);

            assert.dom('.thread-comment').doesNotExist();
            assert.dom('textarea').exists('but a comment can still be written');
        });
    });

    // Every task in this component has two halves: delegate to the matching `@on…` argument if
    // the caller supplied one, or fall back to the store. The tests above only ever supply the
    // arguments, so the store half is what is exercised here.
    module('falling back to the store', function (hooks) {
        const TEMPLATE = hbs`<CommentThread @subject={{this.subject}} @subjectType="order" @comments={{this.comments}} />`;

        hooks.beforeEach(function () {
            this.store = this.owner.lookup('service:store');
            this.set('comments', []);
        });

        function storeCalls(store, method) {
            return store.calls.filter((call) => call.method === method);
        }

        test('publishing with no handler creates the comment and reloads the thread', async function (assert) {
            await render(TEMPLATE);
            await fillIn('textarea', 'A comment with no handler');
            await click('button');

            const [created] = storeCalls(this.store, 'createRecord');
            assert.strictEqual(created.args[0], 'comment', 'a comment record is created');
            assert.deepEqual(created.args[1], { content: 'A comment with no handler', subject_id: 'order_test_1', subject_type: 'order' }, 'carrying the subject identity');

            const [queried] = storeCalls(this.store, 'query');
            assert.strictEqual(queried.args[0], 'comment', 'the thread is reloaded afterwards');
            assert.deepEqual(
                queried.args[1],
                { withoutParent: 1, sort: '-created_at', subject: 'order_test_1', subject_type: 'order' },
                'a subject with no uuid is queried by its public id'
            );
            assert.dom('textarea').hasValue('', 'and the box is cleared');
        });

        // No @subjectType, and a plain-object subject getModelName cannot name: the type is
        // simply left off the query. This is also the only shape where subjectPublicId falls
        // all the way through public_id and id to uuid.
        test('a subject with no resolvable type is queried without one', async function (assert) {
            this.set('subject', { uuid: 'order_uuid_only' });

            await render(hbs`<CommentThread @subject={{this.subject}} @comments={{this.comments}} />`);
            await fillIn('textarea', 'A comment on an untyped subject');
            await click('button');

            const [created] = storeCalls(this.store, 'createRecord');
            assert.deepEqual(created.args[1], { content: 'A comment on an untyped subject', subject_id: 'order_uuid_only', subject_type: null }, 'the record carries a null type');

            const [queried] = storeCalls(this.store, 'query');
            assert.strictEqual(queried.args[1].subject_uuid, 'order_uuid_only', 'queried by uuid');
            assert.notOk('subject_type' in queried.args[1], 'and no subject_type is sent at all');
        });

        test('a subject carrying a uuid is queried by that uuid instead', async function (assert) {
            this.set('subject', { uuid: 'order_uuid_1', public_id: 'order_test_1' });

            await render(TEMPLATE);
            await fillIn('textarea', 'A comment with no handler');
            await click('button');

            const [queried] = storeCalls(this.store, 'query');
            assert.strictEqual(queried.args[1].subject_uuid, 'order_uuid_1', 'the uuid is preferred');
            assert.strictEqual(queried.args[1].subject, undefined, 'and the public id is not sent as well');
        });

        test('replying with no handler creates a reply against its parent', async function (assert) {
            this.set('comments', [editableComment()]);

            await render(TEMPLATE);
            await click(commentButton('reply-comment'));
            await fillIn(replyTextarea(), 'A reply with no handler');
            await click(commentButton('publish-reply'));

            const [created] = storeCalls(this.store, 'createRecord');
            assert.strictEqual(created.args[0], 'comment');
            assert.deepEqual(
                created.args[1],
                { content: 'A reply with no handler', parent_comment_uuid: 'comment_First comment' },
                'a comment with no uuid or public id falls back to its id as the parent key'
            );
            assert.strictEqual(storeCalls(this.store, 'query').length, 1, 'the thread is reloaded afterwards');
        });

        test('editing with no handler saves the record itself', async function (assert) {
            const saves = [];
            const comment = this.store.createRecord('comment', {
                id: 'comment_1',
                content: 'First comment',
                createdAgo: 'just now',
                editable: true,
                author: { name: 'Test User' },
                replies: [],
            });
            comment.save = () => {
                saves.push(comment.content);
                return Promise.resolve(comment);
            };
            this.set('comments', [comment]);

            await render(TEMPLATE);
            await click(commentButton('edit-comment'));
            await fillIn(editTextarea(), 'An amended comment');
            await click(commentButton('save'));

            assert.deepEqual(saves, ['An amended comment'], 'the record is saved with the edited text');
        });

        test('deleting with no handler destroys the record itself', async function (assert) {
            const destroyed = [];
            const comment = this.store.createRecord('comment', {
                id: 'comment_1',
                content: 'First comment',
                createdAgo: 'just now',
                editable: true,
                author: { name: 'Test User' },
                replies: [],
            });
            comment.destroyRecord = () => {
                destroyed.push(comment.id);
                return Promise.resolve(comment);
            };
            this.set('comments', [comment]);

            await render(TEMPLATE);
            await click(commentButton('delete-comment'));

            assert.deepEqual(destroyed, ['comment_1'], 'the record destroys itself');
        });
    });
});
