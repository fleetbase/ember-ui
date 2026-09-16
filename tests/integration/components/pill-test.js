import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | pill', function (hooks) {
    setupRenderingTest(hooks);

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
