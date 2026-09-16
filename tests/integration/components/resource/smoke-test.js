import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { registerResourceDescriptors } from '@fleetbase/ember-ui/utils/resource-registry';
import buildCoreResourceDescriptors from '@fleetbase/ember-ui/utils/resource-descriptors/core';

module('Integration | Component | resource identity smoke', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        registerResourceDescriptors(this.owner, buildCoreResourceDescriptors(this.owner));
        this.set('user', { resourceType: 'user', name: 'Ada Lovelace', email: 'ada@example.test', phone: '+1', is_online: true, status: 'active', role_name: 'Admin' });
        this.set('file', { resourceType: 'file', original_filename: 'report.pdf', content_type: 'application/pdf', file_size: 2048, url: 'https://example.test/report.pdf' });
    });

    test('the user family renders a pill, a summary, a select option and an identity cell', async function (assert) {
        await render(hbs`
            <User::Pill @user={{this.user}} />
            <User::Summary @user={{this.user}} />
            <SelectOption::User @option={{this.user}} @compact={{true}} />
            <Table::Cell::UserIdentity @row={{this.user}} @column={{hash label="User"}} />
            <File::Pill @file={{this.file}} />
        `);

        assert.dom('[data-test-resource-pill][data-resource-type="user"]').includesText('Ada Lovelace');
        assert.dom('[data-test-resource-pill][data-resource-type="user"]').includesText('ada@example.test');
        assert.dom('[data-test-resource-pill][data-resource-type="user"] [data-test-pill-online-indicator]').hasClass('text-green-500');
        assert.dom('[data-test-resource-pill][data-resource-type="user"]').hasClass('fleetbase-pill--static', 'no opener registered, so static');
        assert.dom('[data-test-resource-summary-title]').hasText('Ada Lovelace');
        assert.dom('[data-test-resource-summary-fact]').exists();
        assert.dom('[data-test-resource-summary-view]').doesNotExist();
        assert.dom('[data-test-select-option]').hasClass('select-option--compact');
        assert.dom('[data-test-select-option-title]').hasText('Ada Lovelace');
        assert.dom('[data-test-identity-cell][data-test-identity-static]').exists();
        assert.dom('[data-test-identity-label]').hasText('Ada Lovelace');
        assert.dom('[data-test-resource-identity-meta-badge]').doesNotExist('core families carry no inline badges');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('text-green-500');
        assert.dom('[data-test-resource-pill][data-resource-type="file"] a[href]').exists('a file with a url opens');
        assert.dom('[data-test-resource-pill][data-resource-type="file"] [data-test-resource-pill-icon]').exists('non-image files get an icon tile');
    });

    test('hovering a pill arms and shows the summary card, which can be entered', async function (assert) {
        await render(hbs`<User::Pill @user={{this.user}} @popoverDelay={{10}} />`);
        assert.dom('.resource-hover-card', document.body).doesNotExist('nothing rendered before hover');

        await triggerEvent('.fleetbase-pill', 'mouseenter');
        await waitUntil(() => document.querySelector('.resource-hover-card')?.getAttribute('aria-hidden') === 'false', { timeout: 3000 });
        await settled();
        assert.dom('.resource-hover-card [data-test-resource-summary-title]', document.body).hasText('Ada Lovelace');

        await triggerEvent('.fleetbase-pill', 'mouseleave');
        await triggerEvent('.resource-hover-card [data-test-resource-summary]', 'mousemove');

        assert.strictEqual(document.querySelector('.resource-hover-card').getAttribute('aria-hidden'), 'false', 'stays open over the card');

        await triggerEvent(document.body, 'mousemove');
        await waitUntil(() => !document.querySelector('.resource-hover-card'), { timeout: 3000 });
        assert.dom('.resource-hover-card', document.body).doesNotExist('torn down after leaving');
    });

    test('an opener makes the pill and the cell clickable', async function (assert) {
        const opened = [];
        const registry = this.owner.lookup('service:resource-registry');
        registry.setOpener('user', (record) => opened.push(record) && true);

        await render(hbs`<User::Pill @user={{this.user}} /><Table::Cell::UserIdentity @row={{this.user}} @column={{hash label="User"}} />`);
        await click('[data-test-resource-pill] a');
        await click('[data-test-identity-button]');

        assert.strictEqual(opened.length, 2);
        assert.strictEqual(opened[0], this.user);
    });
});
