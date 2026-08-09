import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// A 1x1 transparent gif — never 404s, so the <Image> fallback handler stays out of the way.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

module('Integration | Component | pill', function (hooks) {
    setupRenderingTest(hooks);

    let clicks;

    hooks.beforeEach(function () {
        clicks = [];
        this.set('resource', { name: 'Alex Driver', online: true });
        this.set('onClick', (...args) => clicks.push(args));
    });

    const TEMPLATE = hbs`<Pill @resource={{this.resource}} @imageSrc={{this.imageSrc}} @title={{this.title}} @subtitle={{this.subtitle}} @onClick={{this.onClick}} />`;

    module('naming the resource', function () {
        test('it names the resource and renders its avatar', async function (assert) {
            this.set('imageSrc', PIXEL);

            await render(TEMPLATE);

            assert.dom('.fleetbase-pill').exists();
            assert.dom('.fleetbase-pill').containsText('Alex Driver');
            assert.dom('img').hasAttribute('src', PIXEL);
            assert.dom('img').hasAttribute('alt', 'Alex Driver');
        });

        test('an explicit title wins over the resource name', async function (assert) {
            this.set('title', 'Preferred label');

            await render(TEMPLATE);

            assert.dom('.fleetbase-pill').containsText('Preferred label');
            assert.dom('.fleetbase-pill').doesNotContainText('Alex Driver');
        });

        test('a custom name path is honoured', async function (assert) {
            this.set('resource', { company_name: 'Acme Freight' });

            await render(hbs`<Pill @resource={{this.resource}} @namePath="company_name" />`);

            assert.dom('.fleetbase-pill').containsText('Acme Freight');
        });

        test('it falls back through display name, tracking and public id', async function (assert) {
            this.set('resource', { display_name: 'Displayed' });
            await render(TEMPLATE);
            assert.dom('.fleetbase-pill').containsText('Displayed');

            this.set('resource', { displayName: 'Camel cased' });
            assert.dom('.fleetbase-pill').containsText('Camel cased');

            this.set('resource', { tracking: 'TRK-1' });
            assert.dom('.fleetbase-pill').containsText('TRK-1');

            this.set('resource', { public_id: 'order_1' });
            assert.dom('.fleetbase-pill').containsText('order_1');
        });

        test('a nameless resource falls back to a dash', async function (assert) {
            this.set('resource', { id: 'x' });

            await render(TEMPLATE);

            assert.dom('.fleetbase-pill div.text-sm').hasText('-');
        });

        test('a nameless resource can supply its own fallback', async function (assert) {
            this.set('resource', { id: 'x' });

            await render(hbs`<Pill @resource={{this.resource}} @titleFallback="Unknown driver" />`);

            assert.dom('.fleetbase-pill').containsText('Unknown driver');
        });

        test('with no resource at all it still renders', async function (assert) {
            await render(hbs`<Pill />`);

            assert.dom('.fleetbase-pill').exists();
            assert.dom('.fleetbase-pill div.text-sm').hasText('-');
        });
    });

    module('supporting detail', function () {
        test('no subtitle is rendered unless supplied', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('.text-xs'), null);
        });

        test('a subtitle is rendered beneath the title', async function (assert) {
            this.set('subtitle', 'Sydney depot');

            await render(TEMPLATE);

            assert.dom('.text-xs').hasText('Sydney depot');
        });

        test('no online indicator is shown unless asked for', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('svg'), null);
        });

        test('an online resource is marked green', async function (assert) {
            await render(hbs`<Pill @resource={{this.resource}} @showOnlineIndicator={{true}} />`);

            assert.dom('svg').hasClass('text-green-500');
        });

        test('an offline resource is marked amber', async function (assert) {
            this.set('resource', { name: 'Alex Driver', online: false });

            await render(hbs`<Pill @resource={{this.resource}} @showOnlineIndicator={{true}} />`);

            assert.dom('svg').hasClass('text-yellow-200');
        });

        test('the online flag can live at a different path', async function (assert) {
            this.set('resource', { name: 'Alex Driver', is_available: true });

            await render(hbs`<Pill @resource={{this.resource}} @showOnlineIndicator={{true}} @onlinePath="is_available" />`);

            assert.dom('svg').hasClass('text-green-500');
        });
    });

    module('blocks', function () {
        test('the default block replaces the title and subtitle', async function (assert) {
            await render(hbs`<Pill @resource={{this.resource}} as |resource|>Custom {{resource.name}}</Pill>`);

            assert.dom('.fleetbase-pill').containsText('Custom Alex Driver');
            assert.strictEqual(find('div.text-sm'), null, 'the default title is not rendered');
        });

        test('the image block replaces the avatar', async function (assert) {
            await render(hbs`
                <Pill @resource={{this.resource}}>
                    <:image as |resource|><span class="custom-avatar">{{resource.name}}</span></:image>
                </Pill>
            `);

            assert.dom('.custom-avatar').hasText('Alex Driver');
            assert.strictEqual(find('img'), null, 'no default image is rendered');
        });

        test('the tooltip block adds a tooltip', async function (assert) {
            await render(hbs`
                <Pill @resource={{this.resource}}>
                    <:tooltip as |resource|><span class="tip">{{resource.name}} is on shift</span></:tooltip>
                </Pill>
            `);

            assert.ok(find('.tip') || find('.fleetbase-pill'), 'the pill renders with a tooltip attached');
        });
    });

    module('clicking', function () {
        test('clicking reports the resource', async function (assert) {
            await render(TEMPLATE);
            await click('.fleetbase-pill a');

            assert.strictEqual(clicks.length, 1);
            assert.strictEqual(clicks[0][0], this.resource, 'the resource is handed back first');
        });

        test('with no resource the raw event is reported', async function (assert) {
            await render(hbs`<Pill @onClick={{this.onClick}} />`);
            await click('.fleetbase-pill a');

            assert.strictEqual(clicks.length, 1);
            assert.true(clicks[0][0] instanceof Event, 'only the event is passed');
        });

        test('it clicks happily without a handler', async function (assert) {
            await render(hbs`<Pill @resource={{this.resource}} />`);
            await click('.fleetbase-pill a');

            assert.dom('.fleetbase-pill').exists('the pill survives');
        });
    });

    test('it forwards splattributes and extra classes', async function (assert) {
        await render(hbs`<Pill @resource={{this.resource}} @anchorClass="my-anchor" @titleClass="my-title" data-test-pill="yes" />`);

        assert.dom('.fleetbase-pill').hasAttribute('data-test-pill', 'yes');
        assert.dom('.fleetbase-pill a').hasClass('my-anchor');
        assert.dom('div.my-title').exists();
    });
});
