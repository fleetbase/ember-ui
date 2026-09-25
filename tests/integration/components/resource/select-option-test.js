import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ObjectProxy from '@ember/object/proxy';
import { registerResourceDescriptor } from '@fleetbase/ember-ui/utils/resource-registry';

module('Integration | Component | resource/select-option', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('template:components/widget/tile', hbs`<span data-test-widget-tile>{{@resource.name}}</span>`);
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

    module('the title', function () {
        test('it titles the option from the descriptor', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-title]').hasText('Widget One');
        });

        test('@model is accepted as an alias for @option', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::SelectOption @model={{this.record}} />`);

            assert.dom('[data-test-select-option-title]').hasText('Widget One');
        });

        test('@title overrides the descriptor', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::SelectOption @option={{this.record}} @title="Explicit" />`);

            assert.dom('[data-test-select-option-title]').hasText('Explicit');
        });

        test('with no record it shows the fallback', async function (assert) {
            await render(hbs`<Resource::SelectOption />`);
            assert.dom('[data-test-select-option-title]').hasText('-');

            await render(hbs`<Resource::SelectOption @titleFallback="Nothing" />`);
            assert.dom('[data-test-select-option-title]').hasText('Nothing');
        });

        test('a proxied record is unwrapped', async function (assert) {
            registerWidget(this.owner);
            this.set('record', ObjectProxy.create({ content: { resourceType: 'widget', name: 'Proxied' } }));

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-title]').hasText('Proxied');
        });

        test('@resourceType names the type of a record that cannot resolve itself', async function (assert) {
            registerWidget(this.owner);
            this.set('record', { name: 'Anonymous', serial: 'W-7' });

            await render(hbs`<Resource::SelectOption @option={{this.record}} @resourceType="widget" />`);

            assert.dom('[data-test-select-option-details]').hasText('W-7', 'the named descriptor supplies the details');
        });
    });

    module('the details line', function () {
        test('the descriptor details are joined with a separator', async function (assert) {
            registerWidget(this.owner, { selectDetails: () => ['one', 'two'] });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-details]').hasText('one · two');
        });

        test('blank and missing details are dropped', async function (assert) {
            registerWidget(this.owner, { selectDetails: () => ['one', null, '   ', undefined, 'two'] });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-details]').hasText('one · two');
        });

        test('nothing to show means no details line', async function (assert) {
            registerWidget(this.owner, { selectDetails: () => [] });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-details]').doesNotExist();
        });

        test('@details overrides the descriptor, as a list or a single value', async function (assert) {
            registerWidget(this.owner, { selectDetails: () => ['from descriptor'] });

            this.set('details', ['a', 'b']);
            await render(hbs`<Resource::SelectOption @option={{this.record}} @details={{this.details}} />`);
            assert.dom('[data-test-select-option-details]').hasText('a · b');

            await render(hbs`<Resource::SelectOption @option={{this.record}} @details="just one" />`);
            assert.dom('[data-test-select-option-details]').hasText('just one', 'a single value is wrapped');
        });

        test('without details it falls back to the identifier', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-details]').hasText('W-1');
        });
    });

    module('the image', function () {
        test('a descriptor photo is rendered', async function (assert) {
            registerWidget(this.owner, { image: () => ({ url: '/img/a.png' }) });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-photo]').hasAttribute('src', '/img/a.png');
        });

        test('@photo overrides the descriptor', async function (assert) {
            registerWidget(this.owner, { image: () => ({ url: '/img/a.png' }) });

            await render(hbs`<Resource::SelectOption @option={{this.record}} @photo="/img/override.png" />`);

            assert.dom('[data-test-select-option-photo]').hasAttribute('src', '/img/override.png');
        });

        test('a descriptor icon wins over a photo', async function (assert) {
            registerWidget(this.owner, { image: () => ({ icon: 'wrench', url: '/img/a.png' }) });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-icon]').exists();
            assert.dom('[data-test-select-option-photo]').doesNotExist();
        });

        test('with no photo the descriptor icon is used', async function (assert) {
            registerWidget(this.owner, { icon: 'cube', image: () => ({}) });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-icon]').exists();
        });

        test('a fallback photo stands in for a missing one', async function (assert) {
            registerWidget(this.owner, { icon: null, image: () => ({ fallback: '/img/fallback.png' }) });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-photo]').hasAttribute('src', '/img/fallback.png');
        });

        test('with no descriptor and no photo there is no tile at all', async function (assert) {
            this.set('record', { name: 'Plain thing' });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-select-option-icon]').doesNotExist();
            assert.dom('[data-test-select-option-photo]').doesNotExist();
            assert.dom('[data-test-select-option-title]').hasText('Plain thing');
        });

        test('a descriptor image component replaces the tile', async function (assert) {
            registerWidget(this.owner, { image: () => ({ component: 'widget/tile' }) });

            await render(hbs`<Resource::SelectOption @option={{this.record}} />`);

            assert.dom('[data-test-widget-tile]').hasText('Widget One');
            assert.dom('[data-test-select-option-icon]').doesNotExist();
        });
    });

    test('@compact marks the option for a select trigger', async function (assert) {
        registerWidget(this.owner);

        await render(hbs`<Resource::SelectOption @option={{this.record}} @compact={{true}} />`);
        assert.dom('[data-test-select-option]').hasClass('select-option--compact');

        await render(hbs`<Resource::SelectOption @option={{this.record}} />`);
        assert.dom('[data-test-select-option]').doesNotHaveClass('select-option--compact');
    });

    test('it forwards splattributes', async function (assert) {
        registerWidget(this.owner);

        await render(hbs`<Resource::SelectOption @option={{this.record}} data-test-mine="yes" />`);

        assert.dom('[data-test-select-option]').hasAttribute('data-test-mine', 'yes');
    });
});
