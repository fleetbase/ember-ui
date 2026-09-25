import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ObjectProxy from '@ember/object/proxy';
import { registerResourceDescriptor, setResourceOpener } from '@fleetbase/ember-ui/utils/resource-registry';

const PILL = '[data-test-resource-pill]';

module('Integration | Component | resource/pill', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('template:components/widget/pill', hbs`<span data-test-widget-pill>{{@resource.name}}</span>`);
        this.owner.register('template:components/widget/summary', hbs`<span data-test-widget-summary>{{@resource.name}}</span>`);
        this.set('record', { resourceType: 'widget', name: 'Widget One', photo_url: '/img/widget.png' });
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

    module('what it shows', function () {
        test('it titles and subtitles the record from its descriptor', async function (assert) {
            registerWidget(this.owner);
            this.set('record', { resourceType: 'widget', name: 'Widget One', serial: 'W-1' });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom(PILL).hasAttribute('data-resource-type', 'widget');
            assert.dom('[data-test-resource-pill-title]').hasText('Widget One');
            assert.dom('[data-test-resource-pill-subtitle]').hasText('W-1');
        });

        test('@title and @subtitle override the descriptor', async function (assert) {
            registerWidget(this.owner);
            this.set('record', { resourceType: 'widget', name: 'Widget One', serial: 'W-1' });

            await render(hbs`<Resource::Pill @resource={{this.record}} @title="Explicit" @subtitle="Also explicit" />`);

            assert.dom('[data-test-resource-pill-title]').hasText('Explicit');
            assert.dom('[data-test-resource-pill-subtitle]').hasText('Also explicit');
        });

        test('an empty @subtitle is an explicit choice to show none', async function (assert) {
            registerWidget(this.owner);
            this.set('record', { resourceType: 'widget', name: 'Widget One', serial: 'W-1' });

            await render(hbs`<Resource::Pill @resource={{this.record}} @subtitle="" />`);

            assert.dom('[data-test-resource-pill-subtitle]').doesNotExist('an empty subtitle is not rendered');
        });

        test('with no record it shows the fallback title', async function (assert) {
            await render(hbs`<Resource::Pill />`);
            assert.dom('[data-test-resource-pill-title]').hasText('-', 'the default fallback is a dash');

            await render(hbs`<Resource::Pill @titleFallback="Nothing here" />`);
            assert.dom('[data-test-resource-pill-title]').hasText('Nothing here');
        });

        test('@resourceType names the type of a record that cannot resolve itself', async function (assert) {
            registerWidget(this.owner);
            this.set('record', { name: 'Anonymous widget' });

            await render(hbs`<Resource::Pill @resource={{this.record}} @resourceType="widget" />`);

            assert.dom(PILL).hasAttribute('data-resource-type', 'widget');
            assert.dom('[data-test-resource-pill-title]').hasText('Anonymous widget');
        });

        test('the record’s own type wins over @resourceType', async function (assert) {
            registerWidget(this.owner);
            registerResourceDescriptor(this.owner, { key: 'other', modelNames: ['other'] });
            this.set('record', { resourceType: 'widget', name: 'Widget One' });

            await render(hbs`<Resource::Pill @resource={{this.record}} @resourceType="other" />`);

            assert.dom(PILL).hasAttribute('data-resource-type', 'widget');
        });

        test('a proxied record is unwrapped before it is read', async function (assert) {
            registerWidget(this.owner);
            this.set('record', ObjectProxy.create({ content: { resourceType: 'widget', name: 'Proxied widget' } }));

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-resource-pill-title]').hasText('Proxied widget');
        });
    });

    module('the image', function () {
        test('a descriptor image url is rendered as a photo', async function (assert) {
            registerWidget(this.owner, { image: () => ({ url: '/img/from-descriptor.png' }) });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-resource-pill-image]').hasAttribute('src', '/img/from-descriptor.png');
        });

        test('@imageSrc overrides the descriptor', async function (assert) {
            registerWidget(this.owner, { image: () => ({ url: '/img/from-descriptor.png' }) });

            await render(hbs`<Resource::Pill @resource={{this.record}} @imageSrc="/img/override.png" />`);

            assert.dom('[data-test-resource-pill-image]').hasAttribute('src', '/img/override.png');
        });

        test('a descriptor icon renders an icon tile instead of a photo', async function (assert) {
            registerWidget(this.owner, { image: () => ({ icon: 'wrench', iconClass: 'text-red-500' }) });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-resource-pill-icon]').exists();
            assert.dom('[data-test-resource-pill-icon]').hasClass('text-red-500');
            assert.dom('[data-test-resource-pill-image]').doesNotExist();
        });

        test('@icon overrides the descriptor image', async function (assert) {
            registerWidget(this.owner, { image: () => ({ url: '/img/from-descriptor.png' }) });

            await render(hbs`<Resource::Pill @resource={{this.record}} @icon="wrench" />`);

            assert.dom('[data-test-resource-pill-icon]').exists();
        });

        test('a descriptor image component is rendered in place of both', async function (assert) {
            registerWidget(this.owner, { image: () => ({ component: 'widget/pill' }) });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-widget-pill]').hasText('Widget One');
            assert.dom('[data-test-resource-pill-icon]').doesNotExist();
        });

        test('with nothing to show at all it falls back to the descriptor icon, then a cube', async function (assert) {
            registerWidget(this.owner, { icon: 'wrench', image: () => ({}) });
            this.set('record', { resourceType: 'widget', name: 'No image' });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);
            assert.dom('[data-test-resource-pill-icon]').exists('the descriptor icon fills the tile');

            await render(hbs`<Resource::Pill @resource={{this.record}} @resourceType="nothing-registered" />`);
            assert.dom('[data-test-resource-pill-icon]').exists('and with no descriptor at all there is still a tile');
        });
    });

    module('the online dot', function () {
        test('it is shown when the descriptor knows whether the record is online', async function (assert) {
            registerWidget(this.owner, { online: (record) => record.connected });
            this.set('record', { resourceType: 'widget', name: 'Widget One', connected: true });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-pill-online-indicator]').hasClass('text-green-500');
        });

        test('an offline record is amber', async function (assert) {
            registerWidget(this.owner, { online: (record) => record.connected });
            this.set('record', { resourceType: 'widget', name: 'Widget One', connected: false });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-pill-online-indicator]').hasClass('text-yellow-200');
        });

        test('it is withheld when nothing knows', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-pill-online-indicator]').doesNotExist();
        });

        test('@online and @showOnlineIndicator override the descriptor', async function (assert) {
            registerWidget(this.owner, { online: () => false });

            await render(hbs`<Resource::Pill @resource={{this.record}} @online={{true}} />`);
            assert.dom('[data-test-pill-online-indicator]').hasClass('text-green-500', '@online wins');

            await render(hbs`<Resource::Pill @resource={{this.record}} @showOnlineIndicator={{false}} />`);
            assert.dom('[data-test-pill-online-indicator]').doesNotExist('@showOnlineIndicator can withhold it');

            await render(hbs`<Resource::Pill @resource={{this.record}} @showOnlineIndicator={{true}} />`);
            assert.dom('[data-test-pill-online-indicator]').exists('and can ask for it');
        });
    });

    module('opening', function () {
        test('with no opener registered the pill is static', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom(`${PILL}.fleetbase-pill--static`).exists();
            assert.dom(`${PILL} a`).doesNotExist();
        });

        test('an opener makes it a link that opens the record', async function (assert) {
            registerWidget(this.owner);
            const opened = [];
            setResourceOpener(this.owner, 'widget', (record) => {
                opened.push(record);
                return true;
            });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);
            assert.dom(`${PILL} a`).exists();

            await click(`${PILL} a`);
            assert.deepEqual(opened, [this.record]);
        });

        test('@static keeps it static even when it could open', async function (assert) {
            registerWidget(this.owner);
            setResourceOpener(this.owner, 'widget', () => true);

            await render(hbs`<Resource::Pill @resource={{this.record}} @static={{true}} />`);

            assert.dom(`${PILL} a`).doesNotExist();
        });

        test('@onClick wins over the opener', async function (assert) {
            registerWidget(this.owner);
            const opened = [];
            const clicks = [];
            setResourceOpener(this.owner, 'widget', (record) => {
                opened.push(record);
                return true;
            });
            this.set('onClick', () => clicks.push('clicked'));

            await render(hbs`<Resource::Pill @resource={{this.record}} @onClick={{this.onClick}} />`);
            await click(`${PILL} a`);

            assert.deepEqual(clicks, ['clicked']);
            assert.deepEqual(opened, [], 'the registered opener is not also run');
        });

        test('@onClick makes a pill with no opener clickable', async function (assert) {
            registerWidget(this.owner);
            const clicks = [];
            this.set('onClick', () => clicks.push('clicked'));

            await render(hbs`<Resource::Pill @resource={{this.record}} @onClick={{this.onClick}} />`);
            await click(`${PILL} a`);

            assert.strictEqual(clicks.length, 1);
        });

        test('a pill with no record at all cannot open', async function (assert) {
            registerWidget(this.owner);
            setResourceOpener(this.owner, 'widget', () => true);

            await render(hbs`<Resource::Pill @resourceType="widget" />`);

            assert.dom(`${PILL} a`).doesNotExist('nothing to open means nothing to click');
        });
    });

    module('the hover card', function () {
        test('it is armed when the resource has a summary component', async function (assert) {
            registerWidget(this.owner, { components: { summary: 'widget/summary' } });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-resource-hover-card-anchor]').exists('the hover card is rendered ready to arm');
        });

        test('@noPopover withholds it', async function (assert) {
            registerWidget(this.owner, { components: { summary: 'widget/summary' } });

            await render(hbs`<Resource::Pill @resource={{this.record}} @noPopover={{true}} />`);

            assert.dom('[data-test-resource-hover-card-anchor]').doesNotExist();
        });

        test('it is withheld when there is no summary component to show', async function (assert) {
            registerResourceDescriptor(this.owner, { key: 'plain', modelNames: ['plain'] });
            this.set('record', { resourceType: 'plain', name: 'Plain' });

            await render(hbs`<Resource::Pill @resource={{this.record}} />`);

            assert.dom('[data-test-resource-hover-card-anchor]').doesNotExist();
        });

        test('it is withheld when there is no record', async function (assert) {
            registerWidget(this.owner, { components: { summary: 'widget/summary' } });

            await render(hbs`<Resource::Pill @resourceType="widget" />`);

            assert.dom('[data-test-resource-hover-card-anchor]').doesNotExist();
        });
    });

    module('blocks and classes', function () {
        test('a block replaces the title and subtitle', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Pill @resource={{this.record}} as |resource|><span data-test-block>{{resource.name}}</span></Resource::Pill>`);

            assert.dom('[data-test-block]').hasText('Widget One');
            assert.dom('[data-test-resource-pill-title]').doesNotExist();
        });

        test('@useBlock={{false}} keeps the default rendering even with a block', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Pill @resource={{this.record}} @useBlock={{false}} as |resource|><span data-test-block>{{resource.name}}</span></Resource::Pill>`);

            assert.dom('[data-test-resource-pill-title]').hasText('Widget One');
            assert.dom('[data-test-block]').doesNotExist();
        });

        test('it forwards its class arguments and splattributes', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Resource::Pill @resource={{this.record}} @class="extra-class" @titleClass="title-x" data-test-mine="yes" />`);

            assert.dom(PILL).hasClass('resource-pill');
            assert.dom(PILL).hasClass('extra-class');
            assert.dom(PILL).hasAttribute('data-test-mine', 'yes');
            assert.dom('[data-test-resource-pill-title]').hasClass('title-x');
        });
    });
});
