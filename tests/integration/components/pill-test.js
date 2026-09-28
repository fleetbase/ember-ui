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

            assert.dom('.fleetbase-pill').exists('the pill renders');
            assert.ok(find('.tip'), 'with a tooltip attached to it');
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

        test('with no handler it renders static rather than clickable', async function (assert) {
            await render(hbs`<Pill @resource={{this.resource}} />`);

            assert.dom('.fleetbase-pill').exists('the pill renders');
            assert.dom('.fleetbase-pill').hasClass('fleetbase-pill--static');
            assert.dom('.fleetbase-pill a').doesNotExist('with nothing to do there is no anchor to click');
            assert.dom('[data-test-pill-static]').containsText('Alex Driver', 'the body is a static span instead');
        });
    });

    test('it forwards splattributes and extra classes', async function (assert) {
        // @anchorClass lands on the anchor, so the pill needs a handler to render one.
        await render(hbs`<Pill @resource={{this.resource}} @onClick={{this.onClick}} @anchorClass="my-anchor" @titleClass="my-title" data-test-pill="yes" />`);

        assert.dom('.fleetbase-pill').hasAttribute('data-test-pill', 'yes');
        assert.dom('.fleetbase-pill a').hasClass('my-anchor');
        assert.dom('div.my-title').exists();
    });

    module('the resource pill behaviours', function () {
        test('it renders the resource name, subtitle and image', async function (assert) {
            this.set('resource', { name: 'Ada Driver', photo_url: 'https://example.test/ada.png' });

            await render(hbs`<Pill @resource={{this.resource}} @imageSrc={{this.resource.photo_url}} @subtitle="+1 555" />`);

            assert.dom('.fleetbase-pill').includesText('Ada Driver');
            assert.dom('.fleetbase-pill').includesText('+1 555');
            assert.dom('.fleetbase-pill img').hasAttribute('src', 'https://example.test/ada.png');
        });

        test('it falls back through display_name, displayName, tracking, public_id and the title fallback', async function (assert) {
            this.set('resource', { display_name: 'Truck 1' });
            await render(hbs`<Pill @resource={{this.resource}} />`);
            assert.dom('.fleetbase-pill').includesText('Truck 1');

            this.set('resource', { displayName: 'Truck 2' });
            await render(hbs`<Pill @resource={{this.resource}} />`);
            assert.dom('.fleetbase-pill').includesText('Truck 2');

            this.set('resource', { tracking: 'TRK-3' });
            await render(hbs`<Pill @resource={{this.resource}} />`);
            assert.dom('.fleetbase-pill').includesText('TRK-3');

            this.set('resource', { public_id: 'vehicle_4' });
            await render(hbs`<Pill @resource={{this.resource}} />`);
            assert.dom('.fleetbase-pill').includesText('vehicle_4');

            this.set('resource', null);
            await render(hbs`<Pill @resource={{this.resource}} @titleFallback="No vehicle" />`);
            assert.dom('.fleetbase-pill').includesText('No vehicle');

            await render(hbs`<Pill />`);
            assert.dom('.fleetbase-pill').includesText('-');
        });

        test('it is a link only when given something to do', async function (assert) {
            assert.expect(7);

            this.set('resource', { name: 'Ada' });
            this.set('onClick', (resource, event) => {
                assert.strictEqual(resource, this.resource, 'the resource is passed first');
                assert.ok(event instanceof Event, 'followed by the event');
            });

            await render(hbs`<Pill @resource={{this.resource}} @onClick={{this.onClick}} />`);
            assert.dom('.fleetbase-pill > a[href]').exists('clickable pills render an anchor');
            assert.dom('.fleetbase-pill').doesNotHaveClass('fleetbase-pill--static');
            await click('.fleetbase-pill > a');

            await render(hbs`<Pill @resource={{this.resource}} />`);
            assert.dom('.fleetbase-pill > a').doesNotExist('a pill with nothing to do is not a link');
            assert.dom('.fleetbase-pill').hasClass('fleetbase-pill--static');
            assert.dom('[data-test-pill-static]').includesText('Ada');
        });

        test('it calls onClick without a resource argument when there is no resource', async function (assert) {
            assert.expect(1);
            this.set('onClick', (first) => assert.ok(first instanceof Event, 'the event is the first argument'));

            await render(hbs`<Pill @onClick={{this.onClick}} />`);
            await click('.fleetbase-pill > a');
        });

        test('it passes the resource to the tooltip component', async function (assert) {
            this.owner.register('template:components/test-tip', hbs`<span data-test-tip>Tip for {{@resource.name}}</span>`);
            this.set('resource', { name: 'Ada' });

            await render(hbs`<Pill @resource={{this.resource}} @tooltipComponent="test-tip" />`);

            assert.dom('[data-test-tip]', document.body).hasText('Tip for Ada');
        });

        test('it yields the resource to the image, default and tooltip blocks', async function (assert) {
            this.set('resource', { name: 'Ada' });

            await render(hbs`
                <Pill @resource={{this.resource}}>
                    <:image as |r|><span data-test-image-block>{{r.name}}</span></:image>
                    <:default as |r|><span data-test-default-block>{{r.name}}</span></:default>
                    <:tooltip as |r|><span data-test-tooltip-block>{{r.name}}</span></:tooltip>
                </Pill>
            `);

            assert.dom('[data-test-image-block]').hasText('Ada');
            assert.dom('[data-test-default-block]').hasText('Ada');
            assert.dom('.fleetbase-pill img').doesNotExist('the image block replaces the default image');
            assert.dom('[data-test-tooltip-block]', document.body).hasText('Ada');
        });

        test('it renders no tooltip when @noTooltip is set', async function (assert) {
            this.set('resource', { name: 'Ada' });

            await render(hbs`<Pill @resource={{this.resource}} @noTooltip={{true}}><:tooltip>never</:tooltip></Pill>`);

            assert.dom('.ember-attacher', document.body).doesNotExist();
        });

        test('the online indicator reads @online first, then the online path on the resource', async function (assert) {
            this.set('resource', { name: 'Ada', online: false, is_online: true });

            await render(hbs`<Pill @resource={{this.resource}} @showOnlineIndicator={{true}} />`);
            assert.dom('[data-test-pill-online-indicator]').hasClass('text-yellow-200', 'offline by the default path');

            await render(hbs`<Pill @resource={{this.resource}} @showOnlineIndicator={{true}} @onlinePath="is_online" />`);
            assert.dom('[data-test-pill-online-indicator]').hasClass('text-green-500', 'online by a custom path');

            await render(hbs`<Pill @resource={{this.resource}} @showOnlineIndicator={{true}} @online={{true}} />`);
            assert.dom('[data-test-pill-online-indicator]').hasClass('text-green-500', '@online wins');

            await render(hbs`<Pill @showOnlineIndicator={{true}} />`);
            assert.dom('[data-test-pill-online-indicator]').hasClass('text-yellow-200', 'no resource means offline');
        });
    });
});
