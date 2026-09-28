import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// A stand-in modal that surfaces the wiring the container is responsible for.
class StubModalComponent extends Component {}

const STUB_MODAL_TEMPLATE = hbs`
    <div class="stub-modal" data-test-modal={{@modalId}} data-test-z={{@zIndex}}>
        <span class="stub-open">{{if @modalIsOpened "open" "closed"}}</span>
        <span class="stub-title">{{@options.title}}</span>
        <button type="button" class="stub-confirm" {{on "click" @onConfirm}}>Confirm</button>
        <button type="button" class="stub-decline" {{on "click" @onDecline}}>Decline</button>
    </div>
`;

module('Integration | Component | modals-container', function (hooks) {
    setupRenderingTest(hooks);

    let confirmed;
    let declined;

    hooks.beforeEach(function () {
        confirmed = [];
        declined = [];

        this.owner.register('component:stub-modal', StubModalComponent);
        this.owner.register('template:components/stub-modal', STUB_MODAL_TEMPLATE);

        this.owner.unregister('service:modals-manager');
        this.owner.register(
            'service:modals-manager',
            class extends Service {
                @tracked modals = [];

                onClickConfirmWithDone(modalId) {
                    confirmed.push(modalId);
                }

                onClickDeclineWithDone(modalId) {
                    declined.push(modalId);
                }
            }
        );

        this.manager = this.owner.lookup('service:modals-manager');
    });

    function modal(id, extra = {}) {
        return {
            id,
            componentToRender: 'stub-modal',
            isOpen: true,
            options: { title: `Modal ${id}`, _zIndex: 100, ...extra },
        };
    }

    test('it renders nothing when there are no modals', async function (assert) {
        await render(hbs`<ModalsContainer />`);

        assert.dom('.stub-modal').doesNotExist();
    });

    test('it renders one component per registered modal', async function (assert) {
        this.manager.modals = [modal('a'), modal('b')];

        await render(hbs`<ModalsContainer />`);

        assert.strictEqual(findAll('.stub-modal').length, 2);
        assert.dom('[data-test-modal="a"]').exists();
        assert.dom('[data-test-modal="b"]').exists();
    });

    test('it forwards the modal id, open state, options and z-index', async function (assert) {
        this.manager.modals = [modal('a', { _zIndex: 250 })];

        await render(hbs`<ModalsContainer />`);

        assert.dom('[data-test-modal="a"] .stub-open').hasText('open');
        assert.dom('[data-test-modal="a"]').hasAttribute('data-test-z', '250');
        assert.dom('.stub-title').hasText('Modal a', 'options reach the rendered component');
    });

    test('it forwards a closed modal state', async function (assert) {
        this.manager.modals = [{ ...modal('a'), isOpen: false }];

        await render(hbs`<ModalsContainer />`);

        assert.dom('[data-test-modal="a"] .stub-open').hasText('closed');
    });

    test('confirming a modal calls the manager with that modal id', async function (assert) {
        this.manager.modals = [modal('a'), modal('b')];

        await render(hbs`<ModalsContainer />`);
        await click('[data-test-modal="b"] .stub-confirm');

        assert.deepEqual(confirmed, ['b'], 'the id is bound per modal, not shared');
        assert.deepEqual(declined, []);
    });

    test('declining a modal calls the manager with that modal id', async function (assert) {
        this.manager.modals = [modal('a'), modal('b')];

        await render(hbs`<ModalsContainer />`);
        await click('[data-test-modal="a"] .stub-decline');

        assert.deepEqual(declined, ['a']);
        assert.deepEqual(confirmed, []);
    });

    test('repeated confirms are each reported', async function (assert) {
        this.manager.modals = [modal('a')];

        await render(hbs`<ModalsContainer />`);
        await click('.stub-confirm');
        await click('.stub-confirm');

        assert.deepEqual(confirmed, ['a', 'a']);
    });

    test('it reacts when a modal is added or removed', async function (assert) {
        this.manager.modals = [modal('a')];
        await render(hbs`<ModalsContainer />`);
        assert.strictEqual(findAll('.stub-modal').length, 1);

        this.manager.modals = [modal('a'), modal('c')];
        await settled();
        assert.strictEqual(findAll('.stub-modal').length, 2, 'a newly opened modal appears');

        this.manager.modals = [];
        await settled();
        assert.dom('.stub-modal').doesNotExist('closing every modal empties the container');
    });

    test('it renders a modal with no options without throwing', async function (assert) {
        this.manager.modals = [{ id: 'bare', componentToRender: 'stub-modal', isOpen: true }];

        await render(hbs`<ModalsContainer />`);

        assert.dom('[data-test-modal="bare"]').exists();
        assert.dom('.stub-title').hasText('', 'a missing options hash renders empty rather than crashing');
    });
});
