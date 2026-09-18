import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const CREATOR_USER_UUID = 'user-creator';
const OTHER_USER_UUID = 'user-other';

module('Integration | Helper | can-remove-chat-participant', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('channel', { created_by_uuid: CREATOR_USER_UUID });
        this.set('creatorParticipant', { id: 'participant-1', user_uuid: CREATOR_USER_UUID });
        this.set('otherParticipant', { id: 'participant-2', user_uuid: OTHER_USER_UUID });
        this.set('thirdParticipant', { id: 'participant-3', user_uuid: 'user-third' });
    });

    test('the channel creator can never be removed, not even by themselves', async function (assert) {
        await render(hbs`{{can-remove-chat-participant this.channel this.creatorParticipant this.creatorParticipant}}`);

        assert.dom(this.element).hasText('false');
    });

    test('the channel creator can remove another participant', async function (assert) {
        await render(hbs`{{can-remove-chat-participant this.channel this.creatorParticipant this.otherParticipant}}`);

        assert.dom(this.element).hasText('true');
    });

    test('a participant can remove themselves', async function (assert) {
        await render(hbs`{{can-remove-chat-participant this.channel this.otherParticipant this.otherParticipant}}`);

        assert.dom(this.element).hasText('true');
    });

    test('self removal is matched on participant id, not user uuid', async function (assert) {
        this.set('sameUserDifferentParticipant', { id: 'participant-99', user_uuid: OTHER_USER_UUID });

        await render(hbs`{{can-remove-chat-participant this.channel this.otherParticipant this.sameUserDifferentParticipant}}`);

        assert.dom(this.element).hasText('false', 'a different participant record is not "self" even for the same user');
    });

    test('a non-creator cannot remove a different participant', async function (assert) {
        await render(hbs`{{can-remove-chat-participant this.channel this.otherParticipant this.thirdParticipant}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a missing current participant denies removal', async function (assert) {
        this.set('nobody', null);

        await render(hbs`{{can-remove-chat-participant this.channel this.nobody this.otherParticipant}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a channel without a creator uuid treats an unidentified participant as the creator', async function (assert) {
        this.set('channel', {});
        this.set('anonymous', { id: 'participant-4' });

        await render(hbs`{{can-remove-chat-participant this.channel this.creatorParticipant this.anonymous}}`);

        assert.dom(this.element).hasText('false', 'undefined created_by_uuid matches an undefined user_uuid');
    });
});
