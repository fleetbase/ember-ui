import { helper } from '@ember/component/helper';
import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | activity-log', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.activities = [];

        const activities = this.activities;
        const translations = {
            'common.activity': 'Activity',
            'common.date': 'Date',
            'common.filter-by-field': 'Filter by Date',
            'common.refresh': 'Refresh',
        };

        class StoreStub extends Service {
            query() {
                return Promise.resolve({
                    toArray() {
                        return activities;
                    },
                });
            }
        }

        this.owner.register('service:store', StoreStub);
        this.owner.register(
            'helper:t',
            helper(([key]) => translations[key] ?? key)
        );
    });

    test('it renders the empty state', async function (assert) {
        await render(hbs`<ActivityLog @showControls={{false}} />`);

        assert.dom('.activity-log-title').hasText('Activity');
        assert.dom('.activity-log-empty').includesText('No activity yet');
    });

    test('it renders a multi-attribute change row with relative timestamp', async function (assert) {
        this.activities.push(
            activity({
                event: 'updated',
                causer: { name: 'Shiv Thakker' },
                subject_type: 'Fleetbase\\Models\\User',
                properties: {
                    old: { status: 'pending', email: 'old@example.com' },
                    attributes: { status: 'active', email: 'new@example.com' },
                },
            })
        );

        await render(hbs`<ActivityLog @showControls={{false}} />`);

        assert.dom('.activity-log-item').exists({ count: 1 });
        assert.dom('.activity-log-sentence').includesText('Shiv Thakker changed 2 attributes');
        assert.dom('.activity-log-time').hasAttribute('datetime', '2026-06-01T12:00:00Z');
        assert.dom('.activity-log-time').includesText('ago');
    });

    test('it keeps subject scoped multi-attribute rows compact', async function (assert) {
        this.activities.push(
            activity({
                event: 'updated',
                subject: { name: 'Ron' },
                subject_type: 'Fleetbase\\Models\\Driver',
                properties: {
                    old: { status: 'offline', phone: '555-0000' },
                    attributes: { status: 'online', phone: '555-1111' },
                },
            })
        );

        await render(hbs`<ActivityLog @subjectId="driver-1" @showControls={{false}} />`);

        assert.dom('.activity-log-sentence').includesText('Shiv Thakker changed 2 attributes');
        assert.dom('.activity-log-sentence').doesNotIncludeText('driver (Ron)');
    });

    test('it shows subject context for company scoped multi-attribute rows', async function (assert) {
        this.activities.push(
            activity({
                event: 'updated',
                subject: { name: 'Production Key' },
                subject_type: 'Fleetbase\\Models\\ApiKey',
                properties: {
                    old: { name: 'Old Key', status: 'inactive', description: 'Old' },
                    attributes: { name: 'Production Key', status: 'active', description: 'Current' },
                },
            })
        );

        await render(hbs`<ActivityLog @companyUuid="company-1" @showControls={{false}} />`);

        assert.dom('.activity-log-sentence').includesText('Shiv Thakker updated an api key (Production Key) with 3 attributes');
    });

    test('it shows subject context for causer scoped multi-attribute rows', async function (assert) {
        this.activities.push(
            activity({
                event: 'created',
                subject: {},
                subject_type: 'Fleetbase\\Models\\ApiKey',
                properties: {
                    attributes: { name: 'Production Key', status: 'active', description: 'Current', token: 'secret' },
                },
            })
        );

        await render(hbs`<ActivityLog @causerId="user-1" @showControls={{false}} />`);

        assert.dom('.activity-log-sentence').includesText('Shiv Thakker created a new api key with 4 attributes');
    });

    test('it can suppress subject context with an explicit override', async function (assert) {
        this.activities.push(
            activity({
                event: 'updated',
                subject: { name: 'Production Key' },
                subject_type: 'Fleetbase\\Models\\ApiKey',
                properties: {
                    old: { status: 'inactive', description: 'Old' },
                    attributes: { status: 'active', description: 'Current' },
                },
            })
        );

        await render(hbs`<ActivityLog @companyUuid="company-1" @showSubjectContext={{false}} @showControls={{false}} />`);

        assert.dom('.activity-log-sentence').includesText('Shiv Thakker changed 2 attributes');
        assert.dom('.activity-log-sentence').doesNotIncludeText('api key');
    });

    test('it can force subject context with an explicit override', async function (assert) {
        this.activities.push(
            activity({
                event: 'updated',
                subject: { name: 'Production Key' },
                subject_type: 'Fleetbase\\Models\\ApiKey',
                properties: {
                    old: { status: 'inactive', description: 'Old' },
                    attributes: { status: 'active', description: 'Current' },
                },
            })
        );

        await render(hbs`<ActivityLog @subjectId="api-key-1" @showSubjectContext={{true}} @showControls={{false}} />`);

        assert.dom('.activity-log-sentence').includesText('Shiv Thakker updated an api key (Production Key) with 2 attributes');
    });

    test('it shows changed attributes with previous and new values in a hover popover', async function (assert) {
        this.activities.push(
            activity({
                properties: {
                    old: { status: 'pending', email: 'old@example.com' },
                    attributes: { status: 'active', email: 'new@example.com' },
                },
            })
        );

        await render(hbs`<ActivityLog @showControls={{false}} />`);
        await triggerEvent('.activity-log-change-trigger', 'mouseenter');

        assert.dom('.activity-log-changes-popover').exists();
        assert.dom('.activity-log-changes-popover').includesText('Attribute');
        assert.dom('.activity-log-changes-popover').includesText('Previous value');
        assert.dom('.activity-log-changes-popover').includesText('New value');
        assert.dom('.activity-log-changes-popover').includesText('Status');
        assert.dom('.activity-log-changes-popover').includesText('pending');
        assert.dom('.activity-log-changes-popover').includesText('active');
    });

    test('it renders a single attribute change inline', async function (assert) {
        this.activities.push(
            activity({
                properties: {
                    old: { status: 'pending' },
                    attributes: { status: 'active' },
                },
            })
        );

        await render(hbs`<ActivityLog @showControls={{false}} />`);

        assert.dom('.activity-log-inline-change').includesText('Status from pending to active');
        assert.dom('.activity-log-sentence').includesText('on User');
    });

    test('it renders created and deleted rows with object labels', async function (assert) {
        this.activities.push(
            activity({
                event: 'created',
                created_at: '2026-06-02T12:00:00Z',
                subject: { name: 'User' },
            }),
            activity({
                event: 'deleted',
                created_at: '2026-06-01T12:00:00Z',
                subject: { name: 'Order' },
                subject_type: 'Fleetbase\\Models\\Order',
            })
        );

        await render(hbs`<ActivityLog @showControls={{false}} />`);

        assert.dom('.activity-log-item').exists({ count: 2 });
        assert.dom('.activity-log-list').includesText('Shiv Thakker created User');
        assert.dom('.activity-log-list').includesText('Shiv Thakker deleted Order');
    });

    test('it preserves named slots and the default block', async function (assert) {
        await render(hbs`
            <ActivityLog @showControls={{false}}>
                <:viewAll><a href="/activity">View all</a></:viewAll>
                <:filters><span data-test-filter>Custom filter</span></:filters>
                <:default><span data-test-default>Default content</span></:default>
            </ActivityLog>
        `);

        assert.dom('a').hasText('View all');
        assert.dom('[data-test-filter]').doesNotExist('filters are hidden when controls are disabled');
        assert.dom('[data-test-default]').hasText('Default content');
    });
});

function activity(options = {}) {
    return {
        event: 'updated',
        created_at: '2026-06-01T12:00:00Z',
        causer: { name: 'Shiv Thakker' },
        subject: { name: 'User' },
        subject_type: 'Fleetbase\\Models\\User',
        properties: {
            old: {},
            attributes: {},
        },
        ...options,
    };
}
