import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

const CARD = { id: 'card_1', title: 'Collect the pallet', description: 'Bay 4, before noon' };

function card() {
    return find('.kanban-card');
}

module('Integration | Component | kanban/card', function (hooks) {
    setupRenderingTest(hooks);

    let calls;

    hooks.beforeEach(function () {
        calls = [];
        this.set('card', CARD);
        this.set('onClick', (...args) => calls.push(['click', ...args]));
        this.set('onDragStart', (...args) => calls.push(['dragStart', ...args]));
        this.set('onDragEnd', (...args) => calls.push(['dragEnd', ...args]));
    });

    const TEMPLATE = hbs`
        <Kanban::Card
            @card={{this.card}}
            @isDragging={{this.isDragging}}
            @readonly={{this.readonly}}
            @disabled={{this.disabled}}
            @template={{this.template}}
            @onClick={{this.onClick}}
            @onDragStart={{this.onDragStart}}
            @onDragEnd={{this.onDragEnd}}
        />
    `;

    module('rendering', function () {
        test('it renders the title and description', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.kanban-card-title').hasText('Collect the pallet');
            assert.dom('.kanban-card-description').hasText('Bay 4, before noon');
            assert.dom(card()).hasAttribute('data-card-id', 'card_1');
            assert.dom(card()).hasAttribute('role', 'button');
        });

        test('a card without a description renders only the title', async function (assert) {
            this.set('card', { id: 'card_2', title: 'Bare' });

            await render(TEMPLATE);

            assert.dom('.kanban-card-title').hasText('Bare');
            assert.dom('.kanban-card-description').doesNotExist();
        });

        test('a missing card renders an empty shell', async function (assert) {
            this.set('card', undefined);

            await render(TEMPLATE);

            assert.dom('.kanban-card').exists();
            assert.dom('.kanban-card-title').hasText('');
        });

        test('a dragging card is marked', async function (assert) {
            this.set('isDragging', true);

            await render(TEMPLATE);

            assert.dom(card()).hasClass('dragging');
        });

        test('a priority is reflected as a class', async function (assert) {
            this.set('card', { ...CARD, priority: 'high' });

            await render(TEMPLATE);

            assert.dom(card()).hasClass('priority-high');
        });

        test('no priority means no priority class', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(card().className, 'kanban-card', 'only the base class is applied');
        });

        test('a custom template replaces the default body and receives the card', async function (assert) {
            this.owner.register('component:test-card-body', setComponentTemplate(hbs`<div class="custom-body">{{@card.title}}</div>`, templateOnly()));
            this.set('template', 'test-card-body');

            await render(TEMPLATE);

            assert.dom('.custom-body').hasText('Collect the pallet');
            assert.dom('.kanban-card-content').doesNotExist();
        });
    });

    module('draggability', function () {
        test('a card is draggable by default', async function (assert) {
            await render(TEMPLATE);

            assert.dom(card()).hasAttribute('draggable', 'true');
        });

        test('readonly and disabled each make it undraggable', async function (assert) {
            this.set('readonly', true);
            await render(TEMPLATE);
            assert.dom(card()).hasAttribute('draggable', 'false');

            this.set('readonly', false);
            this.set('disabled', true);
            assert.dom(card()).hasAttribute('draggable', 'false');
        });
    });

    module('interaction', function () {
        test('clicking reports the card and the event', async function (assert) {
            await render(TEMPLATE);
            await click(card());

            assert.strictEqual(calls[0][0], 'click');
            assert.strictEqual(calls[0][1], CARD, 'the card is passed through');
            assert.strictEqual(calls[0][2].type, 'click');
        });

        test('drag start reports the card alongside the event', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent(card(), 'dragstart', { dataTransfer: { setData() {}, setDragImage() {} } });
            assert.strictEqual(calls[0][0], 'dragStart');
            assert.strictEqual(calls[0][1], this.card, 'the card comes first');
            assert.strictEqual(calls[0][2].type, 'dragstart', 'followed by the event');

            await triggerEvent(card(), 'dragend', { dataTransfer: { setData() {}, setDragImage() {} } });
            assert.strictEqual(calls[1][0], 'dragEnd');
        });

        // The default card body has no edit or delete control, so a custom template is the only
        // route by which <Kanban>'s @onCardUpdate and @onCardDelete can ever fire.
        test('a custom template can update and delete through the card', async function (assert) {
            this.owner.register(
                'component:test-card-actions',
                setComponentTemplate(
                    hbs`
                        <button type="button" class="custom-update" {{on "click" (fn @onUpdate (hash title="Renamed"))}}>rename</button>
                        <button type="button" class="custom-delete" {{on "click" @onDelete}}>remove</button>
                    `,
                    templateOnly()
                )
            );
            this.set('template', 'test-card-actions');
            this.set('onUpdate', (updates) => calls.push(['update', updates]));
            this.set('onDelete', () => calls.push(['delete']));

            await render(hbs`<Kanban::Card @card={{this.card}} @template={{this.template}} @onUpdate={{this.onUpdate}} @onDelete={{this.onDelete}} />`);

            await click('.custom-update');
            await click('.custom-delete');

            assert.deepEqual(calls, [['update', { title: 'Renamed' }], ['delete']], 'both callbacks reach the consumer');
        });

        test('a custom template with no handlers behind it is harmless', async function (assert) {
            this.owner.register(
                'component:test-card-actions-bare',
                setComponentTemplate(
                    hbs`
                        <button type="button" class="custom-update" {{on "click" (fn @onUpdate (hash title="Renamed"))}}>rename</button>
                        <button type="button" class="custom-delete" {{on "click" @onDelete}}>remove</button>
                    `,
                    templateOnly()
                )
            );
            this.set('template', 'test-card-actions-bare');

            await render(hbs`<Kanban::Card @card={{this.card}} @template={{this.template}} />`);

            await click('.custom-update');
            await click('.custom-delete');

            assert.deepEqual(calls, [], 'nothing is reported, and nothing throws');
        });

        test('it is inert without any handlers', async function (assert) {
            await render(hbs`<Kanban::Card @card={{this.card}} />`);

            await click(card());
            await triggerEvent(card(), 'dragstart', { dataTransfer: { setData() {}, setDragImage() {} } });
            await triggerEvent(card(), 'dragend', { dataTransfer: { setData() {}, setDragImage() {} } });

            assert.dom('.kanban-card').exists('no handler is required');
        });
    });
});
