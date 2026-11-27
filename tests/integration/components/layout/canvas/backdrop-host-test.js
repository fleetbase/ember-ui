import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { BackdropStub } from '../../../../helpers/shell-stubs';

// Counts constructions and teardowns so a test can tell hidden from destroyed.
const lifecycle = { created: [], destroyed: [] };

class LiveMap extends Component {
    constructor() {
        super(...arguments);
        lifecycle.created.push(this.args.registration.name);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        lifecycle.destroyed.push(this.args.registration.name);
    }
}
setComponentTemplate(
    hbs`<div class="test-map" data-active={{if @isActive "yes" "no"}} data-layers={{@state.layers.length}} data-has-service={{if @backdrop "yes" "no"}}>{{@registration.name}}</div>`,
    LiveMap
);

function applyStyle(element, styles) {
    for (const [property, value] of Object.entries(styles)) {
        element.style.setProperty(property, value);
    }
    return element;
}

module('Integration | Component | layout/canvas/backdrop-host', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        lifecycle.created = [];
        lifecycle.destroyed = [];
        this.owner.register('component:test-live-map', LiveMap);
    });

    function useBackdrop(owner, registrations = []) {
        owner.unregister('service:backdrop');
        owner.register('service:backdrop', BackdropStub);
        const backdrop = owner.lookup('service:backdrop');
        backdrop.registrations = registrations;
        return backdrop;
    }

    const MAP = { name: 'fleet-ops-map', component: 'test-live-map', routes: ['console.fleet-ops'], priority: 0, keepAlive: true };

    test('without a backdrop service it shows the dot grid', async function (assert) {
        this.owner.unregister('service:backdrop');
        await render(hbs`<Layout::Canvas::BackdropHost />`);

        assert.dom('.fb-canvas-backdrop-host .fb-canvas-dot-grid').exists();
        assert.dom('.fb-canvas-backdrop-slot').doesNotExist();
        assert.dom('.fb-canvas-backdrop-host').doesNotHaveAttribute('data-backdrop-active');
    });

    test('with no active backdrop it shows the dot grid', async function (assert) {
        useBackdrop(this.owner, [MAP]);
        await render(hbs`<Layout::Canvas::BackdropHost />`);

        assert.dom('.fb-canvas-dot-grid').exists();
        assert.dom('.fb-canvas-backdrop-slot').doesNotExist('nothing is mounted before it is first active');
    });

    test('the active backdrop renders visible, with the registration, state and service', async function (assert) {
        const backdrop = useBackdrop(this.owner, [MAP]);
        backdrop.activate('fleet-ops-map');
        backdrop.request('orders', { layers: [{ id: 'orders' }] });

        await render(hbs`<Layout::Canvas::BackdropHost />`);

        assert.dom('.fb-canvas-backdrop-host').hasAttribute('data-backdrop-active', 'fleet-ops-map');
        assert.dom('.fb-canvas-backdrop-slot').hasClass('is-active').hasAttribute('data-backdrop', 'fleet-ops-map').hasAttribute('aria-hidden', 'false');
        assert.false(this.element.querySelector('.fb-canvas-backdrop-slot').inert);
        assert.strictEqual(getComputedStyle(this.element.querySelector('.fb-canvas-backdrop-slot')).visibility, 'visible');
        assert.dom('.test-map').hasText('fleet-ops-map').hasAttribute('data-active', 'yes').hasAttribute('data-layers', '1').hasAttribute('data-has-service', 'yes');
        assert.dom('.fb-canvas-dot-grid').doesNotExist();
    });

    test('a keep-alive backdrop is hidden, not torn down, when no backdrop is active, and comes back as it was', async function (assert) {
        const backdrop = useBackdrop(this.owner, [MAP]);
        backdrop.activate('fleet-ops-map');
        await render(hbs`<Layout::Canvas::BackdropHost />`);

        const mapElement = this.element.querySelector('.test-map');
        assert.deepEqual(lifecycle.created, ['fleet-ops-map']);

        backdrop.activate(null);
        await settled();

        const slot = this.element.querySelector('.fb-canvas-backdrop-slot');
        assert.dom(slot).doesNotHaveClass('is-active').hasAttribute('aria-hidden', 'true');
        assert.true(slot.inert, 'the hidden map cannot take focus or clicks');
        assert.strictEqual(getComputedStyle(slot).visibility, 'hidden');
        assert.dom('.fb-canvas-dot-grid').exists('the dot grid shows instead');
        assert.dom('.test-map').hasAttribute('data-active', 'no');
        assert.deepEqual(lifecycle.destroyed, [], 'the map was not destroyed');

        backdrop.activate('fleet-ops-map');
        await settled();

        assert.strictEqual(this.element.querySelector('.test-map'), mapElement, 'the same map element is shown again');
        assert.deepEqual(lifecycle.created, ['fleet-ops-map'], 'and it was never re-created');
        assert.dom('.fb-canvas-dot-grid').doesNotExist();
    });

    test('switching between two backdrops keeps the keep-alive one mounted and hidden', async function (assert) {
        const OTHER = { name: 'storefront-map', component: 'test-live-map', routes: ['console.storefront'], priority: 0, keepAlive: false };
        const backdrop = useBackdrop(this.owner, [MAP, OTHER]);
        backdrop.activate('fleet-ops-map');
        await render(hbs`<Layout::Canvas::BackdropHost />`);

        backdrop.activate('storefront-map');
        await settled();

        assert.dom('.fb-canvas-backdrop-slot').exists({ count: 2 });
        assert.dom('[data-backdrop="storefront-map"]').hasClass('is-active');
        assert.dom('[data-backdrop="fleet-ops-map"]').doesNotHaveClass('is-active');

        backdrop.activate('fleet-ops-map');
        await settled();

        assert.dom('[data-backdrop="storefront-map"]').doesNotExist('a backdrop that is not keep-alive unmounts when it stops being active');
        assert.deepEqual(lifecycle.destroyed, ['storefront-map']);
        assert.deepEqual(lifecycle.created, ['fleet-ops-map', 'storefront-map']);
    });

    test('a service without a mounted list renders just the active backdrop', async function (assert) {
        const backdrop = useBackdrop(this.owner, [MAP]);
        Object.defineProperty(backdrop, 'mounted', { configurable: true, value: undefined });
        await render(hbs`<Layout::Canvas::BackdropHost />`);

        assert.dom('.fb-canvas-backdrop-slot').doesNotExist();

        backdrop.activate('fleet-ops-map');
        await settled();

        assert.dom('.fb-canvas-backdrop-slot.is-active .test-map').exists();
    });

    test('registrations without a name or component are skipped, and a missing state is passed as nothing', async function (assert) {
        const backdrop = useBackdrop(this.owner, [MAP]);
        backdrop.activate('fleet-ops-map');
        Object.defineProperty(backdrop, 'mounted', { configurable: true, value: [{ name: 'broken' }, { component: 'test-live-map' }, null, MAP] });
        Object.defineProperty(backdrop, 'state', { configurable: true, value: undefined });
        await render(hbs`<Layout::Canvas::BackdropHost />`);

        assert.dom('.fb-canvas-backdrop-slot').exists({ count: 1 });
        assert.dom('.test-map').doesNotHaveAttribute('data-layers');
    });

    test('a service whose active backdrop is unset counts as none', async function (assert) {
        const backdrop = useBackdrop(this.owner, [MAP]);
        Object.defineProperty(backdrop, 'active', { configurable: true, value: undefined });
        await render(hbs`<Layout::Canvas::BackdropHost />`);

        assert.dom('.fb-canvas-dot-grid').exists();
    });

    test('in Layout::Canvas the host is the default backdrop, and the map takes the pointer in the content gaps', async function (assert) {
        const backdrop = useBackdrop(this.owner, [MAP]);
        backdrop.activate('fleet-ops-map');
        this.cardClicks = 0;
        this.onCardClick = () => this.cardClicks++;
        this.owner.register('component:test-click-map', setComponentTemplate(hbs`<button type="button" class="click-map">map</button>`, templateOnly()));
        backdrop.registrations = [{ ...MAP, component: 'test-click-map' }];

        await render(hbs`
            <Layout::Canvas>
                <:default><div class="card"><button type="button" class="card-button" {{on "click" this.onCardClick}}>card</button></div></:default>
                <:chrome><div class="tray">tray</div></:chrome>
            </Layout::Canvas>
        `);
        const canvas = applyStyle(this.element.querySelector('.fb-canvas'), { width: '800px', height: '500px' });
        applyStyle(this.element.querySelector('.click-map'), { position: 'absolute', inset: '0', width: '100%', height: '100%' });
        applyStyle(this.element.querySelector('.card'), { width: '120px', height: '60px' });

        assert.dom('.fb-canvas-backdrop .fb-canvas-backdrop-host').exists();
        assert.strictEqual(getComputedStyle(this.element.querySelector('.fb-canvas-content')).pointerEvents, 'none', 'the content layer passes the pointer through');
        assert.strictEqual(getComputedStyle(this.element.querySelector('.card')).pointerEvents, 'auto', 'its cards still take it');

        const rect = canvas.getBoundingClientRect();
        const gap = document.elementFromPoint(rect.left + rect.width * 0.75, rect.top + rect.height * 0.75);
        assert.true(gap.classList.contains('click-map'), 'a point in the content gap reaches the map');

        await click('.card-button');
        assert.strictEqual(this.cardClicks, 1, 'the card stays clickable');

        backdrop.activate(null);
        await settled();
        assert.strictEqual(getComputedStyle(this.element.querySelector('.fb-canvas-content')).pointerEvents, 'auto', 'over the dot grid the content layer takes the pointer again');
    });

    test('a passthrough wrapper lets the pointer through to the map while its children take it', async function (assert) {
        const backdrop = useBackdrop(this.owner, [MAP]);
        backdrop.activate('fleet-ops-map');

        await render(hbs`
            <Layout::Canvas>
                <div class="fb-canvas-passthrough page"><div class="card">card</div></div>
            </Layout::Canvas>
        `);

        assert.strictEqual(getComputedStyle(this.element.querySelector('.page')).pointerEvents, 'none');
        assert.strictEqual(getComputedStyle(this.element.querySelector('.card')).pointerEvents, 'auto');
    });
});
