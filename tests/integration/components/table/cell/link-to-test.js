import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const LINK = 'a';

module('Integration | Component | table/cell/link-to', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // The dummy app declares a `console` route for <LinkTo> to resolve against.
        this.set('column', { route: 'console' });
        this.set('row', { id: 'row_1' });
        this.set('value', 'Alex Driver');
    });

    const TEMPLATE = hbs`<Table::Cell::LinkTo @column={{this.column}} @row={{this.row}} @value={{this.value}} />`;

    module('rendering', function () {
        test('it renders the value as a link to the column route', async function (assert) {
            await render(TEMPLATE);

            assert.dom(LINK).hasText('Alex Driver');
            assert.dom(LINK).doesNotHaveClass('disabled', 'the link is navigable');
        });

        test('an empty value falls back to the column link text', async function (assert) {
            this.set('value', null);
            this.set('column', { route: 'console', linkText: 'View record' });

            await render(TEMPLATE);

            assert.dom(LINK).hasText('View record');
        });

        test('with neither a value nor link text it renders a dash', async function (assert) {
            this.set('value', null);

            await render(TEMPLATE);

            assert.dom(LINK).hasText('-');
        });

        test('a block replaces the link body', async function (assert) {
            await render(hbs`
                <Table::Cell::LinkTo @column={{this.column}} @row={{this.row}} @value={{this.value}}>
                    <span class="custom">Custom label</span>
                </Table::Cell::LinkTo>
            `);

            assert.dom('.custom').hasText('Custom label');
            assert.dom(LINK).doesNotContainText('Alex Driver');
        });

        test('the link takes the column class and splattributes', async function (assert) {
            this.set('column', { route: 'console', linkClass: 'text-blue-500' });

            await render(hbs`<Table::Cell::LinkTo @column={{this.column}} @row={{this.row}} @value={{this.value}} data-test-link="yes" />`);

            assert.dom(LINK).hasClass('text-blue-500');
            assert.dom(LINK).hasAttribute('data-test-link', 'yes');
        });
    });

    module('the link icon', function () {
        test('no icon is rendered unless the column asks for one', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('svg'), null);
        });

        test('an icon is rendered before the label', async function (assert) {
            this.set('column', { route: 'console', linkIcon: 'truck' });

            await render(TEMPLATE);

            assert.dom('.btn-icon-wrapper svg').exists();
            assert.dom('svg').hasClass('fa-truck');
        });

        test('the icon appearance is configurable', async function (assert) {
            this.set('column', {
                route: 'console',
                linkIcon: 'truck',
                linkIconPrefix: 'fas',
                linkIconSize: 'lg',
                linkIconClass: 'text-green-500',
                linkIconSpin: true,
            });

            await render(TEMPLATE);

            assert.dom('.btn-icon-wrapper').hasAttribute('data-icon-prefix', 'fas');
            assert.dom('svg').hasClass('fa-lg');
            assert.dom('svg').hasClass('text-green-500');
            assert.dom('svg').hasClass('fa-spin');
        });
    });

    module('permissions', function () {
        test('a link with no permission requirement stays enabled', async function (assert) {
            await render(TEMPLATE);

            assert.dom(LINK).doesNotHaveClass('disabled');
        });

        test('a permitted link stays enabled', async function (assert) {
            this.owner.unregister('service:abilities');
            this.owner.register(
                'service:abilities',
                class extends Service {
                    can() {
                        return true;
                    }
                    cannot() {
                        return false;
                    }
                }
            );
            this.set('column', { route: 'console', permission: 'view record' });

            await render(TEMPLATE);

            assert.dom(LINK).doesNotHaveClass('disabled', 'the link is still navigable');
        });

        test('a forbidden link is disabled', async function (assert) {
            this.owner.unregister('service:abilities');
            this.owner.register(
                'service:abilities',
                class extends Service {
                    can() {
                        return false;
                    }
                    cannot() {
                        return true;
                    }
                }
            );
            this.set('column', { route: 'console', permission: 'view record' });

            await render(TEMPLATE);

            assert.dom(LINK).hasClass('disabled', 'the link is not navigable');
        });
    });
});
