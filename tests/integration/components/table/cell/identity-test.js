import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ObjectProxy from '@ember/object/proxy';
import { registerResourceDescriptor, setResourceOpener } from '@fleetbase/ember-ui/utils/resource-registry';

const CELL = '[data-test-identity-cell]';
const LABEL = '[data-test-identity-label]';
const DOT = '[data-test-resource-identity-status-dot]';

function badgeLabels() {
    return findAll('[data-test-resource-identity-meta-badge]').map((node) => node.textContent.trim());
}

module('Integration | Component | table/cell/identity', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('template:components/widget/summary', hbs`<span data-test-widget-summary>{{@resource.name}}</span>`);
        this.set('row', { resourceType: 'widget', id: 'w1', name: 'Widget One' });
        this.set('column', {});
    });

    function registerWidget(owner, overrides = {}) {
        return registerResourceDescriptor(owner, {
            key: 'widget',
            icon: 'cube',
            modelNames: ['widget'],
            title: (record) => record.name,
            ...overrides,
        });
    }

    const TEMPLATE = hbs`<Table::Cell::Identity @row={{this.row}} @value={{this.value}} @column={{this.column}} @onClick={{this.onClick}} />`;

    module('choosing the resource', function () {
        test('the row itself is the resource by default', async function (assert) {
            registerWidget(this.owner);

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('Widget One');
            assert.dom('[data-resource-type="widget"]').exists();
        });

        test('an object @value is preferred over the row', async function (assert) {
            registerWidget(this.owner);
            this.set('value', { resourceType: 'widget', name: 'From value' });

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('From value');
        });

        test('a plain @value is not a resource, so the row is used', async function (assert) {
            registerWidget(this.owner);
            this.set('value', 'just text');

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('Widget One');
        });

        test('column.resourcePath may name a path on the row', async function (assert) {
            registerWidget(this.owner);
            this.set('row', { id: 'r1', widget: { resourceType: 'widget', name: 'Nested widget' } });
            this.set('column', { resourcePath: 'widget' });

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('Nested widget');
        });

        test('column.resourcePath may be a function', async function (assert) {
            registerWidget(this.owner);
            this.set('column', { resourcePath: (row) => ({ resourceType: 'widget', name: `Computed from ${row.id}` }) });

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('Computed from w1');
        });

        test('a proxied resource is unwrapped', async function (assert) {
            registerWidget(this.owner);
            this.set('row', { widget: ObjectProxy.create({ content: { resourceType: 'widget', name: 'Proxied' } }) });
            this.set('column', { resourcePath: 'widget' });

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('Proxied');
        });

        test('a resourcePath is read safely when there is no row at all', async function (assert) {
            registerWidget(this.owner);
            this.set('row', null);
            this.set('column', { resourcePath: 'widget', emptyText: 'Nothing' });

            await render(TEMPLATE);

            assert.dom('[data-test-identity-empty-text]').hasText('Nothing', 'a missing row reads as no resource rather than throwing');
        });

        test('with no resource it shows the empty text', async function (assert) {
            this.set('row', null);

            await render(TEMPLATE);
            assert.dom('[data-test-identity-empty-text]').hasText('-');

            this.set('column', { emptyText: 'None' });
            assert.dom('[data-test-identity-empty-text]').hasText('None');
        });
    });

    module('the label', function () {
        test('column.labelPath reads a path, falling back to the descriptor title', async function (assert) {
            registerWidget(this.owner);
            this.set('row', { resourceType: 'widget', name: 'Widget One', nickname: 'Wodget' });

            this.set('column', { labelPath: 'nickname' });
            await render(TEMPLATE);
            assert.dom(LABEL).hasText('Wodget');

            this.set('column', { labelPath: 'missing' });
            assert.dom(LABEL).hasText('Widget One', 'an empty path falls back to the title');
        });

        test('column.labelPath may be a function', async function (assert) {
            registerWidget(this.owner);
            this.set('column', { labelPath: (resource) => `Fn ${resource.name}` });

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('Fn Widget One');
        });

        test('column.labelValue is used literally or called', async function (assert) {
            registerWidget(this.owner);

            this.set('column', { labelValue: 'Literal' });
            await render(TEMPLATE);
            assert.dom(LABEL).hasText('Literal');

            this.set('column', { labelValue: (resource) => `Called ${resource.name}` });
            assert.dom(LABEL).hasText('Called Widget One');
        });

        test('column.labelFormatter wins over everything', async function (assert) {
            registerWidget(this.owner);
            this.set('column', { labelFormatter: () => 'Formatted', labelValue: 'Literal', labelPath: 'name' });

            await render(TEMPLATE);

            assert.dom(LABEL).hasText('Formatted');
        });
    });

    module('the image', function () {
        test('column.mediaPath names where the photo comes from', async function (assert) {
            registerWidget(this.owner);
            this.set('row', { resourceType: 'widget', name: 'Widget One', photo: '/img/a.png' });
            this.set('column', { mediaPath: 'photo' });

            await render(TEMPLATE);

            assert.dom('[data-test-resource-identity-image]').hasAttribute('src', '/img/a.png');
        });

        test('with nothing to show it falls back to the descriptor icon', async function (assert) {
            registerWidget(this.owner, { icon: 'wrench', image: () => ({}) });

            await render(TEMPLATE);

            assert.dom('[data-test-identity-icon]').exists();
        });

        test('with no descriptor at all there is still an icon', async function (assert) {
            this.set('row', { name: 'Plain' });

            await render(TEMPLATE);

            assert.dom('[data-test-identity-icon]').exists();
        });
    });

    module('the status dot', function () {
        test('it is shown when the resource reports an online state', async function (assert) {
            registerWidget(this.owner, { online: (record) => record.connected });
            this.set('row', { resourceType: 'widget', name: 'Widget One', connected: true });

            await render(TEMPLATE);

            assert.dom(DOT).hasClass('text-green-500');
        });

        test('it is withheld when nothing reports one', async function (assert) {
            registerWidget(this.owner);

            await render(TEMPLATE);

            assert.dom(DOT).doesNotExist();
        });

        test('column.showStatusDot and showOnlineIndicator decide outright', async function (assert) {
            registerWidget(this.owner);

            this.set('column', { showStatusDot: true });
            await render(TEMPLATE);
            assert.dom(DOT).exists();

            this.set('column', { showOnlineIndicator: true });
            assert.dom(DOT).exists('the older spelling is accepted too');

            registerWidget(this.owner, { online: () => true });
            this.set('column', { showStatusDot: false });
            assert.dom(DOT).doesNotExist('and it can be refused');
        });

        test('column.onlinePath asks for the dot and reads the flag', async function (assert) {
            registerWidget(this.owner);
            this.set('row', { resourceType: 'widget', name: 'Widget One', up: true });
            this.set('column', { onlinePath: 'up' });

            await render(TEMPLATE);
            assert.dom(DOT).hasClass('text-green-500');

            this.set('row', { resourceType: 'widget', name: 'Widget One', up: false });
            assert.dom(DOT).hasClass('text-yellow-200');
        });

        test('an onlinePath with nothing at it falls through to the status', async function (assert) {
            registerWidget(this.owner, { status: () => 'active' });
            this.set('row', { resourceType: 'widget', name: 'Widget One' });
            this.set('column', { onlinePath: 'missing' });

            await render(TEMPLATE);

            assert.dom(DOT).hasClass('text-green-500', 'the descriptor status tones the dot instead');
        });

        test('column.statusPath may be a path or a function', async function (assert) {
            registerWidget(this.owner);
            this.set('row', { resourceType: 'widget', name: 'Widget One', state: 'failed' });

            this.set('column', { statusPath: 'state' });
            await render(TEMPLATE);
            assert.dom(DOT).hasClass('text-red-500');

            this.set('column', { statusPath: () => 'pending' });
            assert.dom(DOT).hasClass('text-yellow-500');
        });

        test('column.statusToneMap and the descriptor tones colour the dot', async function (assert) {
            registerWidget(this.owner, { statusTones: { bespoke: 'text-purple-500' } });
            this.set('row', { resourceType: 'widget', name: 'Widget One', state: 'bespoke' });

            this.set('column', { statusPath: 'state' });
            await render(TEMPLATE);
            assert.dom(DOT).hasClass('text-purple-500', 'the descriptor tones apply');

            this.set('column', { statusPath: 'state', statusToneMap: { bespoke: 'text-blue-500' } });
            assert.dom(DOT).hasClass('text-blue-500', 'and the column overrides them');
        });

        test('a dot on a resource with no descriptor still tones itself', async function (assert) {
            this.set('row', { name: 'Plain', state: 'failed' });
            this.set('column', { statusPath: 'state' });

            await render(TEMPLATE);

            assert.dom(DOT).hasClass('text-red-500', 'the default tone map applies with no descriptor behind it');
        });

        test('column.statusToneClass may compute the class outright', async function (assert) {
            registerWidget(this.owner);
            this.set('column', { showStatusDot: true, statusToneClass: () => 'text-pink-500' });

            await render(TEMPLATE);

            assert.dom(DOT).hasClass('text-pink-500');
        });
    });

    module('the badges', function () {
        test('descriptor badges are shown, capped at two', async function (assert) {
            registerWidget(this.owner, {
                badges: () => [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }],
            });

            await render(TEMPLATE);

            assert.deepEqual(badgeLabels(), ['One', 'Two'], 'the default limit is two');
        });

        test('column.badgeLimit raises or lowers the cap', async function (assert) {
            registerWidget(this.owner, { badges: () => [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }] });
            this.set('column', { badgeLimit: 3 });

            await render(TEMPLATE);

            assert.deepEqual(badgeLabels(), ['One', 'Two', 'Three']);
        });

        test('column.badges may be a list or a function', async function (assert) {
            registerWidget(this.owner);

            this.set('column', { badges: [{ label: 'Listed' }] });
            await render(TEMPLATE);
            assert.deepEqual(badgeLabels(), ['Listed']);

            this.set('column', { badges: (resource) => [{ label: `Fn ${resource.name}` }] });
            assert.deepEqual(badgeLabels(), ['Fn Widget One']);
        });

        test('a badges function that returns nothing shows none', async function (assert) {
            registerWidget(this.owner);
            this.set('column', { badges: () => null });

            await render(TEMPLATE);

            assert.deepEqual(badgeLabels(), []);
        });

        test('badges are resolved when the resource came from @value and there is no row', async function (assert) {
            registerWidget(this.owner, { badges: () => [{ label: 'One', relatedId: 'x' }] });
            this.set('row', undefined);
            this.set('value', { resourceType: 'widget', name: 'From value' });

            await render(hbs`<Table::Cell::Identity @value={{this.value}} @column={{this.column}} />`);

            assert.dom(LABEL).hasText('From value');
            assert.deepEqual(badgeLabels(), ['One'], 'a cell with no row still resolves its badges');
        });

        test('column.hideBadges withholds them', async function (assert) {
            registerWidget(this.owner, { badges: () => [{ label: 'One' }] });
            this.set('column', { hideBadges: true });

            await render(TEMPLATE);

            assert.deepEqual(badgeLabels(), []);
        });

        test('a row identified by uuid is still recognised as itself', async function (assert) {
            registerWidget(this.owner, {
                badges: () => [
                    { label: 'Itself', relatedId: 'u-1' },
                    { label: 'Other', relatedId: 'u-2' },
                ],
            });
            this.set('row', { resourceType: 'widget', uuid: 'u-1', name: 'Widget One' });

            await render(TEMPLATE);

            assert.deepEqual(badgeLabels(), ['Other'], 'uuid stands in for id');
        });

        test('a row with neither id nor uuid keeps every badge', async function (assert) {
            registerWidget(this.owner, {
                badges: () => [
                    { label: 'One', relatedId: 'x' },
                    { label: 'Two', relatedId: 'y' },
                ],
            });
            this.set('row', { resourceType: 'widget', name: 'Widget One' });

            await render(TEMPLATE);

            assert.deepEqual(badgeLabels(), ['One', 'Two'], 'with no self id nothing is self-referential');
        });

        test('a badge pointing back at the row itself is dropped', async function (assert) {
            registerWidget(this.owner, {
                badges: () => [
                    { label: 'Itself', relatedId: 'w1' },
                    { label: 'Other', relatedId: 'w2' },
                ],
            });

            await render(TEMPLATE);

            assert.deepEqual(badgeLabels(), ['Other']);
        });
    });

    module('clicking', function () {
        test('with nothing to do the cell is static', async function (assert) {
            registerWidget(this.owner);

            await render(TEMPLATE);

            assert.dom('[data-test-identity-static]').exists();
            assert.dom('[data-test-identity-button]').doesNotExist();
        });

        test('an opener makes it a button that opens the resource', async function (assert) {
            registerWidget(this.owner);
            const opened = [];
            setResourceOpener(this.owner, 'widget', (record) => {
                opened.push(record);
                return true;
            });

            await render(TEMPLATE);
            await click('[data-test-identity-button]');

            assert.deepEqual(opened, [this.row]);
        });

        test('@onClick, column.onClick and column.action all run', async function (assert) {
            registerWidget(this.owner);
            const calls = [];
            this.set('onClick', () => calls.push('arg'));
            this.set('column', { onClick: () => calls.push('column'), action: () => calls.push('action') });

            await render(TEMPLATE);
            await click('[data-test-identity-button]');

            assert.deepEqual(calls, ['arg', 'column', 'action'], 'every handler is given its turn');
        });

        test('a handler stops the resource being opened as well', async function (assert) {
            registerWidget(this.owner);
            const opened = [];
            const calls = [];
            setResourceOpener(this.owner, 'widget', (record) => {
                opened.push(record);
                return true;
            });
            this.set('onClick', () => calls.push('handled'));

            await render(TEMPLATE);
            await click('[data-test-identity-button]');

            assert.deepEqual(calls, ['handled']);
            assert.deepEqual(opened, [], 'the opener is not also run');
        });

        test('column.action alone is enough to make it clickable', async function (assert) {
            registerWidget(this.owner);
            const calls = [];
            this.set('column', { action: () => calls.push('action') });

            await render(TEMPLATE);
            await click('[data-test-identity-button]');

            assert.deepEqual(calls, ['action']);
        });
    });

    module('permissions', function () {
        test('column.permission disables the cell when the ability is refused', async function (assert) {
            registerWidget(this.owner);
            this.owner.register(
                'service:abilities',
                class extends Service {
                    cannot(permission) {
                        return permission === 'refused';
                    }
                }
            );
            this.set('column', { permission: 'refused', action: () => {} });

            await render(TEMPLATE);

            assert.dom('[data-test-identity-button]').isDisabled();
        });

        test('an allowed permission leaves it enabled', async function (assert) {
            registerWidget(this.owner);
            this.owner.register(
                'service:abilities',
                class extends Service {
                    cannot() {
                        return false;
                    }
                }
            );
            this.set('column', { permission: 'allowed', action: () => {} });

            await render(TEMPLATE);

            assert.dom('[data-test-identity-button]').isNotDisabled();
        });

        test('an abilities service that throws leaves the cell enabled', async function (assert) {
            registerWidget(this.owner);
            this.owner.register(
                'service:abilities',
                class extends Service {
                    cannot() {
                        throw new Error('no such ability');
                    }
                }
            );
            this.set('column', { permission: 'explodes', action: () => {} });

            await render(TEMPLATE);

            assert.dom('[data-test-identity-button]').isNotDisabled();
        });
    });

    module('the hover card and wrapper', function () {
        test('a resource with a summary component arms a hover card', async function (assert) {
            registerWidget(this.owner, { components: { summary: 'widget/summary' } });

            await render(TEMPLATE);

            assert.dom('[data-test-resource-hover-card-anchor]').exists();
        });

        test('column.popover={{false}} withholds it', async function (assert) {
            registerWidget(this.owner, { components: { summary: 'widget/summary' } });
            this.set('column', { popover: false });

            await render(TEMPLATE);

            assert.dom('[data-test-resource-hover-card-anchor]').doesNotExist();
        });

        test('column.wrapperClass replaces the default width cap', async function (assert) {
            registerWidget(this.owner);

            await render(TEMPLATE);
            assert.dom('.table-cell-identity').hasClass('max-w-md', 'the default caps the width');

            this.set('column', { wrapperClass: 'w-full' });
            assert.dom('.table-cell-identity').hasClass('w-full');
        });

        test('column.resourceType names the type when the record cannot say', async function (assert) {
            registerWidget(this.owner);
            this.set('row', { name: 'Anonymous' });
            this.set('column', { resourceType: 'widget' });

            await render(TEMPLATE);

            assert.dom('[data-resource-type="widget"]').exists();
        });

        test('it forwards splattributes', async function (assert) {
            registerWidget(this.owner);

            await render(hbs`<Table::Cell::Identity @row={{this.row}} @column={{this.column}} data-test-mine="yes" />`);

            assert.dom('[data-test-mine="yes"]').exists();
        });
    });

    test('the cell copes with no column at all', async function (assert) {
        registerWidget(this.owner);

        await render(hbs`<Table::Cell::Identity @row={{this.row}} />`);

        assert.dom(CELL).exists();
        assert.dom(LABEL).hasText('Widget One');
    });
});
