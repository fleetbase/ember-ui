import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const CARD = '.schedule-item-card';

function item(overrides = {}) {
    return {
        id: 'item_1',
        title: 'Collect the pallet',
        status: 'confirmed',
        start_at: '2024-03-04T09:00:00Z',
        end_at: '2024-03-04T10:30:00Z',
        ...overrides,
    };
}

// The card formats its own times with `toLocaleTimeString`, so the expectation has to be built the
// same way rather than hard-coded — the test runner's timezone is not ours to assume.
function localTime(value) {
    return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

module('Integration | Component | schedule-item-card', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('item', item());
    });

    module('the default presentation', function () {
        test('it renders the title, the humanised status and the time range', async function (assert) {
            await render(hbs`<ScheduleItemCard @item={{this.item}} />`);

            assert.dom(CARD).exists();
            assert.dom(CARD).includesText('Collect the pallet');
            assert.dom(CARD).includesText('Confirmed', 'the status is capitalised');
            assert.dom(CARD).includesText(`${localTime('2024-03-04T09:00:00Z')} - ${localTime('2024-03-04T10:30:00Z')}`);
        });

        test('a duration is shown when the item carries one', async function (assert) {
            this.set('item', item({ duration: 90 }));

            await render(hbs`<ScheduleItemCard @item={{this.item}} />`);

            assert.dom(CARD).includesText('Duration: 90 min');
        });

        test('no duration line is rendered without one', async function (assert) {
            await render(hbs`<ScheduleItemCard @item={{this.item}} />`);

            assert.dom(CARD).doesNotIncludeText('Duration:');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<ScheduleItemCard @item={{this.item}} data-test-card="yes" />`);

            assert.dom('[data-test-card="yes"]').exists();
        });
    });

    // Each status maps to a tailwind colour word that is interpolated into the badge's classes.
    module('the status badge', function () {
        const TONES = [
            ['pending', 'yellow'],
            ['confirmed', 'green'],
            ['in_progress', 'blue'],
            ['completed', 'gray'],
            ['cancelled', 'red'],
            ['no_show', 'orange'],
        ];

        TONES.forEach(([status, colour]) => {
            test(`${status} is toned ${colour}`, async function (assert) {
                this.set('item', item({ status }));

                await render(hbs`<ScheduleItemCard @item={{this.item}} />`);

                assert.dom(`${CARD} span`).hasClass(`bg-${colour}-100`);
                assert.dom(`${CARD} span`).hasClass(`text-${colour}-800`);
            });
        });

        test('an unrecognised status falls back to grey', async function (assert) {
            this.set('item', item({ status: 'invented' }));

            await render(hbs`<ScheduleItemCard @item={{this.item}} />`);

            assert.dom(`${CARD} span`).hasClass('bg-gray-100');
        });

        test('an item with no status at all falls back to grey', async function (assert) {
            await render(hbs`<ScheduleItemCard />`);

            assert.dom(`${CARD} span`).hasClass('bg-gray-100', 'a missing item is not a crash');
        });
    });

    module('the time range', function () {
        test('an item missing its end time shows no range', async function (assert) {
            this.set('item', item({ end_at: null }));

            await render(hbs`<ScheduleItemCard @item={{this.item}} />`);

            assert.dom(CARD).doesNotIncludeText(' - ', 'a half-open range is not rendered');
        });

        test('an item missing its start time shows no range', async function (assert) {
            this.set('item', item({ start_at: null }));

            await render(hbs`<ScheduleItemCard @item={{this.item}} />`);

            assert.dom(CARD).doesNotIncludeText(' - ');
        });
    });

    module('named blocks', function () {
        test('a content block replaces the default body and is given the item', async function (assert) {
            await render(hbs`
                <ScheduleItemCard @item={{this.item}}>
                    <:content as |ctx|>
                        <div class="custom-content">{{ctx.item.title}} in a block</div>
                    </:content>
                </ScheduleItemCard>
            `);

            assert.dom('.custom-content').hasText('Collect the pallet in a block');
            assert.dom(CARD).doesNotIncludeText('Confirmed', 'the default badge is not rendered as well');
        });

        test('an actions block renders alongside the default body', async function (assert) {
            await render(hbs`
                <ScheduleItemCard @item={{this.item}}>
                    <:actions as |ctx|>
                        <button type="button" class="edit-action">Edit {{ctx.item.id}}</button>
                    </:actions>
                </ScheduleItemCard>
            `);

            assert.dom('.edit-action').hasText('Edit item_1');
            assert.dom(CARD).includesText('Collect the pallet', 'the default body is kept');
        });
    });

    module('activating the card', function () {
        test('clicking reports the item and the event', async function (assert) {
            const clicks = [];
            this.set('onClick', (clicked, event) => clicks.push({ clicked, type: event?.type }));

            await render(hbs`<ScheduleItemCard @item={{this.item}} @onClick={{this.onClick}} />`);
            await click(CARD);

            assert.strictEqual(clicks.length, 1, 'the handler runs once');
            assert.strictEqual(clicks[0].clicked, this.item, 'it is handed the item');
            assert.strictEqual(clicks[0].type, 'click', 'alongside the original event');
        });

        test('clicking without a handler is inert', async function (assert) {
            await render(hbs`<ScheduleItemCard @item={{this.item}} />`);
            await click(CARD);

            assert.ok(find(CARD), 'the card survives a click it has nothing to do with');
        });
    });
});
