import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';

const DAY = '.air-datepicker-cell.-day-:not(.-other-month-)';

function labels() {
    return findAll('label').map((label) => label.textContent.trim());
}

module('Integration | Component | widget/query-params', function (hooks) {
    setupRenderingTest(hooks);

    let reported;

    hooks.beforeEach(function () {
        reported = [];
        this.set('onChange', (params) => reported.push(params));

        // A stand-in for whatever input a widget nominates: it simply hands its value back.
        this.owner.register('component:test-param-input', class extends Component {});
        this.owner.register(
            'template:components/test-param-input',
            hbs`
                <span class="param-input {{@class}}" data-placeholder={{@placeholder}}>
                    <button type="button" class="pick-alpha" {{on "click" (fn @onChange "alpha")}}>alpha</button>
                    <button type="button" class="pick-beta" {{on "click" (fn @onChange "beta")}}>beta</button>
                </span>
            `
        );
    });

    const TEMPLATE = hbs`<Widget::QueryParams @params={{this.params}} @onChange={{this.onChange}} />`;

    module('rendering', function () {
        test('it renders a labelled control per parameter', async function (assert) {
            this.set('params', {
                status: { component: 'test-param-input' },
                assigned_driver: { component: 'test-param-input' },
            });

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['Status:', 'Assigned driver:'], 'each key is humanized into a label');
            assert.strictEqual(findAll('.param-input').length, 2);
        });

        test('each control is prompted and sized by the component', async function (assert) {
            this.set('params', { assigned_driver: { component: 'test-param-input' } });

            await render(TEMPLATE);

            assert.dom('.param-input').hasAttribute('data-placeholder', 'Assigned driver');
            assert.dom('.param-input').hasClass('form-input-sm');
        });

        test('no parameters renders an empty row', async function (assert) {
            this.set('params', {});

            await render(TEMPLATE);

            assert.strictEqual(findAll('label').length, 0);
            assert.dom('div').exists('the row still renders');
        });

        test('it renders with no parameters argument at all', async function (assert) {
            await render(hbs`<Widget::QueryParams />`);

            assert.strictEqual(findAll('label').length, 0);
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Widget::QueryParams data-test-params="yes" />`);

            assert.dom('[data-test-params="yes"]').exists();
        });
    });

    module('reporting changes', function () {
        test('choosing a value reports it under its parameter name', async function (assert) {
            this.set('params', { status: { component: 'test-param-input' } });

            await render(TEMPLATE);
            await click('.pick-alpha');

            assert.deepEqual(reported, [{ status: 'alpha' }]);
        });

        test('parameters accumulate across controls', async function (assert) {
            this.set('params', {
                status: { component: 'test-param-input' },
                driver: { component: 'test-param-input' },
            });

            await render(TEMPLATE);
            await click(findAll('.pick-alpha')[0]);
            await click(findAll('.pick-beta')[1]);

            assert.deepEqual(reported, [{ status: 'alpha' }, { status: 'alpha', driver: 'beta' }], 'earlier choices are retained');
        });

        test('changing a parameter again replaces its value', async function (assert) {
            this.set('params', { status: { component: 'test-param-input' } });

            await render(TEMPLATE);
            await click('.pick-alpha');
            await click('.pick-beta');

            assert.deepEqual(reported, [{ status: 'alpha' }, { status: 'beta' }]);
        });

        test('it reports happily without an onChange handler', async function (assert) {
            this.set('params', { status: { component: 'test-param-input' } });

            await render(hbs`<Widget::QueryParams @params={{this.params}} />`);
            await click('.pick-alpha');

            assert.dom('.param-input').exists('the widget survives');
        });
    });

    test('a date parameter is reported as its formatted date', async function (assert) {
        this.set('params', { start_date: { component: 'date-picker' } });

        await render(TEMPLATE);

        assert.dom('label').hasText('Start date:');
        assert.ok(find('.fleetbase-date-picker'), 'a date field is rendered');

        await click('.fleetbase-date-picker');
        await click(findAll(DAY)[9]);

        assert.strictEqual(reported.length, 1, 'the change is reported');
        assert.strictEqual(typeof reported[0].start_date, 'string', 'a formatted date is reported');
        assert.true(/\d/.test(reported[0].start_date), 'and it carries the chosen day');
    });
});
