import { helper } from '@ember/component/helper';
import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | activity-log', function (hooks) {
    setupRenderingTest(hooks);

    let queries;

    hooks.beforeEach(function () {
        this.activities = [];
        queries = [];

        const activities = this.activities;
        const translations = {
            'common.activity': 'Activity',
            'common.date': 'Date',
            'common.filter-by-field': 'Filter by Date',
            'common.refresh': 'Refresh',
        };

        class StoreStub extends Service {
            query(modelName, query) {
                queries.push(query);
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

    // -------------------------------------------------------------------------
    // Appended coverage: the controls (date filter, reload), the causer/subject
    // click callbacks, and the event-verb / badge branches.
    // -------------------------------------------------------------------------

    module('the controls', function () {
        test('no controls are rendered when they are switched off', async function (assert) {
            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.strictEqual(find('.fleetbase-date-picker'), null, 'no date filter');
            assert.strictEqual(
                findAll('button').find((button) => button.querySelector('svg.fa-arrows-rotate')),
                undefined,
                'no refresh control'
            );
        });

        test('controls are rendered by default', async function (assert) {
            await render(hbs`<ActivityLog />`);

            assert.ok(find('.fleetbase-date-picker'), 'a date filter is offered');
            assert.ok(
                findAll('button').find((button) => button.querySelector('svg.fa-arrows-rotate')),
                'a refresh control is offered'
            );
        });

        test('refreshing re-queries the activities', async function (assert) {
            this.activities.push(activity({ event: 'created' }));

            await render(hbs`<ActivityLog />`);
            assert.strictEqual(queries.length, 1, 'the log loads once on insert');

            const refresh = findAll('button').find((button) => button.querySelector('svg.fa-arrows-rotate'));
            await click(refresh);

            assert.strictEqual(queries.length, 2, 'and again when refreshed');
        });

        test('choosing a date filters the query and re-runs it', async function (assert) {
            await render(hbs`<ActivityLog />`);
            await click('.fleetbase-date-picker');
            await click(findAll('.air-datepicker-cell.-day-:not(.-other-month-)')[9]);

            assert.strictEqual(queries.length, 2, 'the log reloads for the chosen date');
            assert.ok(queries.at(-1).created_at, 'and the date is sent as a filter');
        });
    });

    module('clicking through to a record', function () {
        test('clicking the actor reports the causer', async function (assert) {
            const causer = { id: 'usr_1', name: 'Shiv Thakker' };
            const clicked = [];
            this.set('onCauserClick', (received) => clicked.push(received));
            this.activities.push(activity({ causer }));

            await render(hbs`<ActivityLog @showControls={{false}} @onCauserClick={{this.onCauserClick}} />`);
            await click('.activity-log-actor');

            assert.deepEqual(clicked, [causer]);
        });

        test('clicking the object reports the subject', async function (assert) {
            const subject = { id: 'ord_1', name: 'Order 1' };
            const clicked = [];
            this.set('onSubjectClick', (received) => clicked.push(received));
            this.activities.push(activity({ subject, event: 'created' }));

            await render(hbs`<ActivityLog @showControls={{false}} @onSubjectClick={{this.onSubjectClick}} />`);
            await click('.activity-log-object');

            assert.deepEqual(clicked, [subject]);
        });

        test('it clicks happily without handlers', async function (assert) {
            this.activities.push(activity({ event: 'created' }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await click('.activity-log-actor');
            await click('.activity-log-object');

            assert.dom('.activity-log-item').exists('the log survives');
        });
    });

    module('describing the event', function () {
        // Badges are only rendered when @showBadges is on.
        async function renderWith(context, options) {
            context.activities.length = 0;
            context.activities.push(activity(options));

            await render(hbs`<ActivityLog @showControls={{false}} @showBadges={{true}} />`);
        }

        test('a created event is badged and phrased as created', async function (assert) {
            await renderWith(this, { event: 'created' });

            assert.dom('.activity-log-item').containsText('created');
            assert.dom('.activity-log-item').containsText('Created');
        });

        test('a deleted event is badged and phrased as deleted', async function (assert) {
            await renderWith(this, { event: 'deleted' });

            assert.dom('.activity-log-item').containsText('deleted');
            assert.dom('.activity-log-item').containsText('Deleted');
        });

        test('a restored event is badged and phrased as restored', async function (assert) {
            await renderWith(this, { event: 'restored' });

            assert.dom('.activity-log-item').containsText('restored');
            assert.dom('.activity-log-item').containsText('Restored');
        });

        test('an unrecognised event falls back to updated', async function (assert) {
            await renderWith(this, { event: 'archived' });

            assert.dom('.activity-log-item').containsText('updated');
        });

        test('an explicit description wins over the event', async function (assert) {
            await renderWith(this, { event: 'created', description: 'imported from a spreadsheet' });

            assert.dom('.activity-log-item').containsText('imported from a spreadsheet');
        });

        test('an update carrying changes is phrased as a change', async function (assert) {
            await renderWith(this, {
                event: 'updated',
                properties: { old: { status: 'pending' }, attributes: { status: 'active' } },
            });

            assert.dom('.activity-log-item').containsText('changed');
        });

        test('a first-time value is shown without a previous value', async function (assert) {
            await renderWith(this, {
                event: 'updated',
                properties: { old: { notes: 'null' }, attributes: { notes: 'Handle with care' } },
            });

            assert.dom('.activity-log-item').containsText('Handle with care');
        });
    });

    module('formatting values', function () {
        // Attach::Popover is lazily rendered and opens on hover, and its content is wormholed
        // outside the test root, so it has to be read from the document.
        async function openChanges() {
            await triggerEvent('.activity-log-change-trigger', 'mouseenter');
        }

        function popoverCells() {
            return Array.from(document.querySelectorAll('.activity-log-changes-popover .activity-log-changes-row [role="cell"]')).map((cell) => cell.textContent.trim());
        }

        test('a boolean change is rendered as true/false', async function (assert) {
            this.activities.push(
                activity({
                    properties: { old: { is_active: false, note: 'a' }, attributes: { is_active: true, note: 'b' } },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await openChanges();

            const cells = popoverCells();
            assert.true(cells.includes('false'), cells.join(' | '));
            assert.true(cells.includes('true'), cells.join(' | '));
        });

        test('an empty array renders as []', async function (assert) {
            this.activities.push(
                activity({
                    properties: { old: { tags: ['a'], note: 'a' }, attributes: { tags: [], note: 'b' } },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await openChanges();

            const cells = popoverCells();
            assert.true(cells.includes('[]'), cells.join(' | '));
        });

        test('a populated array renders as JSON', async function (assert) {
            this.activities.push(
                activity({
                    properties: { old: { tags: [], note: 'a' }, attributes: { tags: ['urgent'], note: 'b' } },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await openChanges();

            const cells = popoverCells();
            assert.true(
                cells.some((cell) => cell.includes('urgent')),
                cells.join(' | ')
            );
        });

        test('a GeoJSON point is rendered as lat/lng', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { location: { type: 'Point', coordinates: [103.8198, 1.3521] }, note: 'a' },
                        attributes: { location: { type: 'Point', coordinates: [103.85, 1.29] }, note: 'b' },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await openChanges();

            const cells = popoverCells();
            assert.true(
                cells.some((cell) => cell.startsWith('Point(1.3521, 103.8198)')),
                cells.join(' | ')
            );
        });

        test('an ISO timestamp is rendered as a readable date', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { scheduled_at: '2026-01-02T03:04:05Z', note: 'a' },
                        attributes: { scheduled_at: '2026-02-03T04:05:06Z', note: 'b' },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await openChanges();

            const cells = popoverCells();
            assert.true(
                cells.some((cell) => /Jan 2, 2026/.test(cell)),
                cells.join(' | ')
            );
            assert.false(
                cells.some((cell) => cell.includes('2026-01-02T03:04:05Z')),
                'the raw ISO string is not shown'
            );
        });

        test('an unparseable date-shaped string is left as-is', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { scheduled_at: '2026-13-45T99:99:99Z', note: 'a' },
                        attributes: { scheduled_at: 'later', note: 'b' },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await openChanges();

            const cells = popoverCells();
            assert.true(cells.includes('2026-13-45T99:99:99Z'), cells.join(' | '));
        });

        test('an object change is rendered as JSON', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { meta: { a: 1 }, note: 'a' },
                        attributes: { meta: { a: 2 }, note: 'b' },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            await openChanges();

            const cells = popoverCells();
            assert.true(
                cells.some((cell) => cell.includes('"a":1')),
                cells.join(' | ')
            );
        });

        test('an unchanged attribute is not listed', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { status: 'active', meta: { a: 1 } },
                        attributes: { status: 'archived', meta: { a: 1 } },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').includesText('Status', 'the changed attribute is described');
            assert.dom('.activity-log-item').doesNotIncludeText('Meta', 'the deep-equal object is skipped');
        });
    });

    module('describing the subject', function () {
        test('a namespaced subject type is humanized to its last segment', async function (assert) {
            this.activities.push(
                activity({
                    event: 'created',
                    subject_type: 'Fleetbase\\FleetOps\\Models\\ServiceRate',
                    subject: {},
                    properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

            assert.dom('.activity-log-item').includesText('service rate', find('.activity-log-item').textContent);
        });

        test('a created event is phrased as "a new ..."', async function (assert) {
            this.activities.push(activity({ event: 'created', subject_type: 'Fleetbase\\Models\\Order', subject: {}, properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } } }));

            await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

            assert.dom('.activity-log-item').includesText('a new order');
        });

        test('a vowel-initial type takes "an"', async function (assert) {
            this.activities.push(activity({ event: 'deleted', subject_type: 'Fleetbase\\Models\\Address', subject: {}, properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } } }));

            await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

            assert.dom('.activity-log-item').includesText('an address');
        });

        test('a consonant-initial type takes "a"', async function (assert) {
            this.activities.push(activity({ event: 'deleted', subject_type: 'Fleetbase\\Models\\Vehicle', subject: {}, properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } } }));

            await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

            assert.dom('.activity-log-item').includesText('a vehicle');
        });

        test('the subject display name is appended when it differs from the type', async function (assert) {
            this.activities.push(
                activity({
                    event: 'created',
                    subject_type: 'Fleetbase\\Models\\Order',
                    subject: { display_name: 'Order 4471' },
                    properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

            assert.dom('.activity-log-item').includesText('Order 4471');
        });

        test('every display fallback is tried in turn', async function (assert) {
            const fallbacks = [
                [{ name: 'By name' }, 'By name'],
                [{ title: 'By title' }, 'By title'],
                [{ address: 'By address' }, 'By address'],
                [{ tracking: 'By tracking' }, 'By tracking'],
                [{ public_id: 'By public id' }, 'By public id'],
                [{ uuid: 'By uuid' }, 'By uuid'],
            ];

            for (const [subject, expected] of fallbacks) {
                this.activities.length = 0;
                this.activities.push(activity({ event: 'created', subject_type: 'Fleetbase\\Models\\Order', subject, properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } } }));

                await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

                assert.dom('.activity-log-item').includesText(expected, `${Object.keys(subject)[0]} is used`);
            }
        });

        test('a subject with no usable name falls back to the type label', async function (assert) {
            this.activities.push(
                activity({ event: 'created', subject_type: 'Fleetbase\\Models\\Order', subject: { id: 'ord_1' }, properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } } })
            );

            await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

            assert.dom('.activity-log-item').includesText('order');
            assert.dom('.activity-log-item').doesNotIncludeText('Unknown');
        });

        test('an empty subject type contributes no target phrase', async function (assert) {
            this.activities.push(activity({ event: 'created', subject_type: '', subject: {}, properties: { old: { a: 1, b: 1 }, attributes: { a: 2, b: 2 } } }));

            await render(hbs`<ActivityLog @showControls={{false}} @showSubjectContext={{true}} />`);

            assert.dom('.activity-log-item').exists('the entry still renders');
        });
    });

    module('limiting the feed', function () {
        test('maxVisibleActivities truncates the list', async function (assert) {
            for (let index = 0; index < 5; index++) {
                this.activities.push(activity({ event: 'created', subject: { name: `Subject ${index}` } }));
            }

            await render(hbs`<ActivityLog @showControls={{false}} @maxVisibleActivities={{2}} />`);

            assert.strictEqual(findAll('.activity-log-item').length, 2, 'only the first two entries are shown');
        });

        test('a non-numeric limit is ignored', async function (assert) {
            for (let index = 0; index < 3; index++) {
                this.activities.push(activity({ event: 'created', subject: { name: `Subject ${index}` } }));
            }

            await render(hbs`<ActivityLog @showControls={{false}} @maxVisibleActivities="lots" />`);

            assert.strictEqual(findAll('.activity-log-item').length, 3, 'every entry is shown');
        });

        test('a zero limit is ignored', async function (assert) {
            this.activities.push(activity({ event: 'created', subject: { name: 'Subject' } }));

            await render(hbs`<ActivityLog @showControls={{false}} @maxVisibleActivities={{0}} />`);

            assert.strictEqual(findAll('.activity-log-item').length, 1);
        });
    });

    test('a failed load leaves the empty state in place', async function (assert) {
        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                query() {
                    return Promise.reject(new Error('activities unavailable'));
                }
            }
        );

        await render(hbs`<ActivityLog @showControls={{false}} />`);

        assert.dom('.activity-log-empty').exists('the feed degrades to its empty state rather than throwing');
    });

    // Every fixture above is a fully-populated activity. A partial payload — which is what a
    // malformed or trimmed API response looks like — exercises the whole fallback chain at once.
    module('a partial activity payload', function () {
        test('an entry with no fields at all still renders with sensible fallbacks', async function (assert) {
            this.activities.push({});

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 }, 'the entry renders rather than being dropped');
            assert.dom('.activity-log-sentence').includesText('Unknown', 'an unnamed causer is described generically');
            assert.dom('.activity-log-time').doesNotHaveAttribute('datetime', 'and with no parseable date there is nothing to stamp');
            assert.dom('.activity-log-time').hasText('', 'so there is no relative time to read');
        });

        test('an entry with no causer name falls back to Unknown for the actor', async function (assert) {
            this.activities.push(activity({ causer: null, subject: null, subject_type: null }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 });
            assert.dom('.activity-log-sentence').includesText('Unknown', 'the sentence names nobody in particular');
        });

        test('an unparseable date is treated as no date', async function (assert) {
            this.activities.push(activity({ created_at: 'not-a-date' }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 }, 'the entry survives');
            assert.dom('.activity-log-time').hasText('', 'and shows no relative time');
        });

        test('a Date instance is accepted as well as an ISO string', async function (assert) {
            this.activities.push(activity({ created_at: new Date('2026-06-01T12:00:00Z') }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-time').exists('a real Date is parsed');
            assert.dom('.activity-log-time').includesText('ago');
        });

        test('an invalid Date instance is treated as no date', async function (assert) {
            this.activities.push(activity({ created_at: new Date('nonsense') }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 });
            assert.dom('.activity-log-time').hasText('', 'an invalid Date is no better than none');
        });

        test('an entry timestamped only by its update falls back to updated_at', async function (assert) {
            this.activities.push(activity({ created_at: null, updated_at: '2026-06-02T09:00:00Z' }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-time').hasAttribute('datetime', '2026-06-02T09:00:00Z');
        });

        test('a subject type of separators alone is shown as given', async function (assert) {
            this.activities.push(activity({ subject: {}, subject_type: '\\\\', humanized_subject_type: null }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 }, 'an unsplittable subject type does not break the row');
        });

        // The component has no @activities argument — everything comes from the store — so the
        // non-array has to arrive the way a real one would, out of the query result's toArray().
        test('a query result that does not yield an array is treated as none', async function (assert) {
            this.owner.unregister('service:store');
            this.owner.register(
                'service:store',
                class extends Service {
                    query() {
                        return Promise.resolve({ toArray: () => 'nope' });
                    }
                }
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-empty').exists('a non-array is normalised to an empty feed');
            assert.dom('.activity-log-item').doesNotExist();
        });

        test('an undated activity sorts against another without throwing', async function (assert) {
            this.activities.push(activity({ created_at: null, updated_at: null, causer: { name: 'Ada' } }), activity({ created_at: null, updated_at: null, causer: { name: 'Grace' } }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 2 }, 'both undated rows survive the sort');
        });

        test('an actor with a blank name falls back to the placeholder initial', async function (assert) {
            this.activities.push(activity({ causer: { name: '' } }));

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-marker span').hasText('S', 'an empty name is not null, so it survives ?? and only the || catches it');
        });

        test('an attribute cleared to null is still reported as a change', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { note: 'a previous note' },
                        attributes: { note: null },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 });
            assert.dom('.activity-log-sentence').includesText('note', 'clearing a value counts as changing it');
        });
    });

    module('summarising a single change', function () {
        test('a change to an id-like attribute is not summarised inline', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { company_uuid: 'a1' },
                        attributes: { company_uuid: 'b2' },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 });
            assert.dom('.activity-log-sentence').doesNotIncludeText('b2', 'an identifier is not worth quoting in the sentence');
        });

        test('a change to a complex value is not summarised inline either', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { meta: { a: 1 } },
                        attributes: { meta: { a: 2 } },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);

            assert.dom('.activity-log-item').exists({ count: 1 });
            assert.dom('.activity-log-sentence').doesNotIncludeText('{', 'an object is not rendered into the sentence');
        });

        test('priority attributes are ordered ahead of the rest', async function (assert) {
            this.activities.push(
                activity({
                    properties: {
                        old: { zebra: 'a', status: 'pending' },
                        attributes: { zebra: 'b', status: 'active' },
                    },
                })
            );

            await render(hbs`<ActivityLog @showControls={{false}} />`);
            // The change table lives in a lazily-rendered popover opened by hovering the trigger.
            await triggerEvent('.activity-log-change-trigger', 'mouseenter');

            const rows = findAll('.activity-log-changes-popover .activity-log-change-attribute').map((node) => node.textContent.trim());
            assert.true(rows.length >= 2, 'both changes are listed');
            assert.true(rows[0].toLowerCase().includes('status'), 'the priority attribute comes first');
        });
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
