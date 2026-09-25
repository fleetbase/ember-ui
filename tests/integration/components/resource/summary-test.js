import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ObjectProxy from '@ember/object/proxy';
import Service from '@ember/service';
import { registerResourceDescriptor, setResourceOpener } from '@fleetbase/ember-ui/utils/resource-registry';

function factLabels() {
    return findAll('[data-test-resource-summary-fact]').map((node) => node.textContent.replace(/\s+/g, ' ').trim());
}

module('Integration | Component | resource/summary', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('template:components/widget/pill', hbs`<span data-test-widget-pill>{{@resource.name}}</span>`);
        this.set('record', { resourceType: 'widget', name: 'Widget One', serial: 'W-1' });
    });

    function registerWidget(owner, overrides = {}) {
        return registerResourceDescriptor(owner, {
            key: 'widget',
            icon: 'cube',
            modelNames: ['widget'],
            title: (record) => record.name,
            identifier: (record) => record.serial,
            ...overrides,
        });
    }

    module('the header', function () {
        test('it shows the title and identifier', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-resource-summary-title]').hasText('Widget One');
            assert.dom('[data-test-resource-summary-identifier]').hasText('W-1');
        });

        test('with no record it shows the fallback title and no identifier', async function (assert) {
            await render(hbs`<Resource::Summary @titleFallback="Nothing" />`);

            assert.dom('[data-test-resource-summary-title]').hasText('Nothing');
            assert.dom('[data-test-resource-summary-identifier]').doesNotExist();
        });

        test('a record with an image url shows a photo, otherwise an icon', async function (assert) {
            registerWidget(this.owner, { image: () => ({ url: '/img/a.png', shape: 'square' }) });
            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            assert.dom('[data-test-resource-summary-image]').hasAttribute('src', '/img/a.png');
            assert.dom('[data-test-resource-summary-image]').hasAttribute('data-shape', 'square');

            registerWidget(this.owner, { image: () => ({}) });
            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            assert.dom('[data-test-resource-summary-icon]').exists('with nothing to show it falls back to the descriptor icon');
        });

        test('the online dot is shown only when the descriptor knows', async function (assert) {
            registerWidget(this.owner, { online: (record) => record.connected });

            this.set('record', { resourceType: 'widget', name: 'Widget One', connected: true });
            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            assert.dom('[data-test-resource-summary-online]').hasAttribute('data-online', 'true');

            this.set('record', { resourceType: 'widget', name: 'Widget One', connected: false });
            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            assert.dom('[data-test-resource-summary-online]').hasAttribute('data-online', 'false');

            registerWidget(this.owner);
            this.set('record', { resourceType: 'widget', name: 'Widget One' });
            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            assert.dom('[data-test-resource-summary-online]').doesNotExist('nothing known means no dot');
        });

        test('a status is shown as a badge, and a blank one is not', async function (assert) {
            registerWidget(this.owner, { status: (record) => record.state });

            this.set('record', { resourceType: 'widget', name: 'Widget One', state: 'active' });
            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            assert.dom('[data-test-resource-summary-status]').exists();

            this.set('record', { resourceType: 'widget', name: 'Widget One', state: '' });
            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            assert.dom('[data-test-resource-summary-status]').doesNotExist('an empty status is no status');
        });
    });

    module('the facts', function () {
        test('it lists the descriptor facts', async function (assert) {
            registerWidget(this.owner, {
                facts: (record) => [
                    { label: 'Serial', value: record.serial },
                    { label: 'Location', value: 'Depot 4' },
                ],
            });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.ok(
                factLabels().some((text) => text.includes('Depot 4')),
                'a fact is listed'
            );
        });

        test('a fact that only repeats the title, identifier or status is dropped', async function (assert) {
            registerWidget(this.owner, {
                status: () => 'active',
                facts: (record) => [
                    { label: 'Name', value: record.name },
                    { label: 'Serial', value: record.serial },
                    { label: 'State', value: 'active' },
                    { label: 'Location', value: 'Depot 4' },
                ],
            });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            const text = factLabels().join(' | ');
            assert.notOk(/Widget One/.test(text), 'the title is not repeated');
            assert.notOk(/W-1/.test(text), 'the identifier is not repeated');
            assert.ok(/Depot 4/.test(text), 'a fact that adds something is kept');
        });

        test('a related fact is kept even when it repeats, because it renders as a pill', async function (assert) {
            registerWidget(this.owner, {
                facts: (record) => [{ label: 'Itself', related: record, relatedType: 'widget', value: record.name }],
            });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-widget-pill]').exists('the related record renders as its pill');
        });
    });

    module('hydration', function () {
        test('a descriptor hydrate replaces the record it shows', async function (assert) {
            registerWidget(this.owner, {
                hydrate: () => Promise.resolve({ resourceType: 'widget', name: 'Hydrated widget', serial: 'W-9' }),
            });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-resource-summary-title]').hasText('Hydrated widget');
            assert.dom('[data-test-resource-summary-identifier]').hasText('W-9');
        });

        test('a record may load itself when the descriptor does not', async function (assert) {
            registerWidget(this.owner);
            this.set('record', {
                resourceType: 'widget',
                name: 'Stub',
                serial: 'W-1',
                loadResource: () => Promise.resolve({ resourceType: 'widget', name: 'Loaded widget', serial: 'W-2' }),
            });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-resource-summary-title]').hasText('Loaded widget');
        });

        test('a hydrate that returns nothing usable leaves the record alone', async function (assert) {
            registerWidget(this.owner, { hydrate: () => Promise.resolve(null) });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-resource-summary-title]').hasText('Widget One');
        });

        test('a hydrate that fails falls back to what the record already carries', async function (assert) {
            registerWidget(this.owner, { hydrate: () => Promise.reject(new Error('offline')) });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-resource-summary-title]').hasText('Widget One', 'the card still shows what it had');
            assert.dom('[data-test-resource-summary-skeleton]').doesNotExist('and it is no longer loading');
        });

        test('with no record there is nothing to hydrate', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Summary @resourceType="widget" />`);

            assert.dom('[data-test-resource-summary]').exists('the card renders without throwing');
        });

        test('a hydrated proxy is unwrapped', async function (assert) {
            registerWidget(this.owner, {
                hydrate: () => Promise.resolve(ObjectProxy.create({ content: { resourceType: 'widget', name: 'Unwrapped', serial: 'W-3' } })),
            });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-resource-summary-title]').hasText('Unwrapped');
        });
    });

    module('the view action', function () {
        test('it is withheld when there is nothing to view', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);

            assert.dom('[data-test-resource-summary-view]').doesNotExist();
        });

        test('an opener offers the view button and opens the record', async function (assert) {
            registerWidget(this.owner);
            const opened = [];
            setResourceOpener(this.owner, 'widget', (record) => {
                opened.push(record);
                return true;
            });

            await render(hbs`<Resource::Summary @resource={{this.record}} />`);
            await click('[data-test-resource-summary-view]');

            assert.deepEqual(opened, [this.record]);
        });

        test('@onView wins over the opener and is given the record', async function (assert) {
            registerWidget(this.owner);
            const viewed = [];
            const opened = [];
            setResourceOpener(this.owner, 'widget', (record) => {
                opened.push(record);
                return true;
            });
            this.set('onView', (record) => viewed.push(record));

            await render(hbs`<Resource::Summary @resource={{this.record}} @onView={{this.onView}} />`);
            await click('[data-test-resource-summary-view]');

            assert.deepEqual(viewed, [this.record]);
            assert.deepEqual(opened, [], 'the opener is not also run');
        });

        test('@showView={{false}} withholds the button even when it could view', async function (assert) {
            registerWidget(this.owner);
            this.set('onView', () => {});

            await render(hbs`<Resource::Summary @resource={{this.record}} @onView={{this.onView}} @showView={{false}} />`);

            assert.dom('[data-test-resource-summary-view]').doesNotExist();
        });

        test('viewing closes the card when it is hosted in one', async function (assert) {
            registerWidget(this.owner);
            const closes = [];
            this.set('onView', () => {});
            this.set('onClose', () => closes.push('closed'));

            await render(hbs`<Resource::Summary @resource={{this.record}} @onView={{this.onView}} @onClose={{this.onClose}} />`);
            await click('[data-test-resource-summary-view]');

            assert.deepEqual(closes, ['closed']);
        });

        test('@viewLabel names the button', async function (assert) {
            registerWidget(this.owner);
            this.set('onView', () => {});

            await render(hbs`<Resource::Summary @resource={{this.record}} @onView={{this.onView}} @viewLabel="Open widget" />`);

            assert.dom('[data-test-resource-summary-view]').hasText('Open widget');
        });

        test('it falls back to "View" when intl has no label for it', async function (assert) {
            registerWidget(this.owner);
            this.owner.unregister('service:intl');
            this.owner.register(
                'service:intl',
                class extends Service {
                    exists() {
                        return false;
                    }

                    t(key) {
                        return key;
                    }
                }
            );
            this.set('onView', () => {});

            await render(hbs`<Resource::Summary @resource={{this.record}} @onView={{this.onView}} />`);

            assert.dom('[data-test-resource-summary-view]').hasText('View', 'the built-in English label is the last resort');
        });
    });
});
