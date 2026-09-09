import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | timeline/item', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('activity', { code: 'dispatched', status: 'Dispatched' });
    });

    const TEMPLATE = hbs`
        <Timeline::Item @activity={{this.activity}} @activeStatus={{this.activeStatus}} @context={{this.context}} as |activity context|>
            <span class="entry">{{activity.status}}</span>
            <span class="context">{{context.label}}</span>
        </Timeline::Item>
    `;

    test('it yields the activity and the context', async function (assert) {
        this.set('context', { label: 'Order 123' });

        await render(TEMPLATE);

        assert.dom('.timeline-item').exists();
        assert.dom('.entry').hasText('Dispatched');
        assert.dom('.context').hasText('Order 123');
    });

    test('it is inactive by default', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.timeline-item').doesNotHaveClass('active');
    });

    test('a matching active status marks it active, case-insensitively', async function (assert) {
        this.set('activeStatus', 'DISPATCHED');

        await render(TEMPLATE);

        assert.dom('.timeline-item').hasClass('active');
    });

    test('a different active status leaves it inactive', async function (assert) {
        this.set('activeStatus', 'delivered');

        await render(TEMPLATE);

        assert.dom('.timeline-item').doesNotHaveClass('active');
    });

    test('an activity with no code is never matched by status', async function (assert) {
        this.set('activity', { status: 'Dispatched' });
        this.set('activeStatus', 'dispatched');

        await render(TEMPLATE);

        assert.dom('.timeline-item').doesNotHaveClass('active');
    });

    test('an explicit isActive on the activity wins over the status match', async function (assert) {
        this.set('activity', { code: 'dispatched', status: 'Dispatched', isActive: true });
        this.set('activeStatus', 'delivered');

        await render(TEMPLATE);

        assert.dom('.timeline-item').hasClass('active', 'the explicit flag takes precedence');
    });

    test('an explicit isActive false overrides a status match', async function (assert) {
        this.set('activity', { code: 'dispatched', status: 'Dispatched', isActive: false });
        this.set('activeStatus', 'dispatched');

        await render(TEMPLATE);

        assert.dom('.timeline-item').doesNotHaveClass('active');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Timeline::Item @activity={{this.activity}} data-test-item="yes" />`);

        assert.dom('.timeline-item').hasAttribute('data-test-item', 'yes');
    });
});
