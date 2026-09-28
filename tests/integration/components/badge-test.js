import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | badge', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a humanized status with the status styling and a status dot', async function (assert) {
        await render(hbs`<Badge @status="in_transit" />`);

        assert.dom('.status-badge').hasClass('in-transit-status-badge');
        assert.dom('.status-badge').hasText('In transit');
        assert.dom('.status-badge svg[data-icon="circle"]').exists('renders the default status dot icon');
    });

    test('it falls back to the info styling when no type or status is provided', async function (assert) {
        await render(hbs`<Badge @text="Hello" />`);

        assert.dom('.status-badge').hasClass('info-status-badge');
        assert.dom('.status-badge').hasText('Hello');
    });

    test('it prefers @type over @status for styling', async function (assert) {
        await render(hbs`<Badge @type="danger" @status="failed" />`);

        assert.dom('.status-badge').hasClass('danger-status-badge');
        assert.dom('.status-badge').doesNotHaveClass('failed-status-badge');
        assert.dom('.status-badge').hasText('Failed');
    });

    test('it applies size classes', async function (assert) {
        await render(hbs`<Badge @status="available" @size="xxs" />`);
        assert.dom('.status-badge').hasClass('status-badge-xxs');

        await render(hbs`<Badge @status="available" @size="xs" />`);
        assert.dom('.status-badge').hasClass('status-badge-xs');

        await render(hbs`<Badge @status="available" @size="sm" />`);
        assert.dom('.status-badge').hasClass('status-badge-sm');

        await render(hbs`<Badge @status="available" @size="lg" />`);
        assert.dom('.status-badge').hasClass('status-badge-lg');
    });

    test('it can hide the status dot and the text', async function (assert) {
        await render(hbs`<Badge @status="active" @hideIcon={{true}} />`);
        assert.dom('.status-badge svg').doesNotExist('icon is hidden with @hideIcon');
        assert.dom('.status-badge').hasText('Active');

        await render(hbs`<Badge @status="active" @hideStatusDot={{true}} @hideText={{true}} />`);
        assert.dom('.status-badge svg').doesNotExist('icon is hidden with @hideStatusDot');
        assert.dom('.status-badge').hasText('');
    });

    test('it can render a custom icon and disable humanization', async function (assert) {
        await render(hbs`<Badge @status="active" @icon="check" @text="RAW_text" @disableHumanize={{true}} />`);

        assert.dom('.status-badge svg[data-icon="check"]').exists();
        assert.dom('.status-badge').hasText('RAW_text');
    });

    test('it yields block content with the status', async function (assert) {
        await render(hbs`
            <Badge @status="active" as |status|>
                <span data-test-block>{{status}}!</span>
            </Badge>
        `);

        assert.dom('[data-test-block]').hasText('active!');
    });
});
