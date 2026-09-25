import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const CATEGORIES = ['operations', 'finance'];

module('Integration | Component | modals/save-report', function (hooks) {
    setupRenderingTest(hooks);

    let toggles;

    hooks.beforeEach(function () {
        toggles = 0;
        this.set('options', {
            categoryOptions: CATEGORIES,
            toggleScheduling: () => toggles++,
        });
    });

    const TEMPLATE = hbs`<Modals::SaveReport @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    module('the core fields', function () {
        test('it asks for a required title, a description and a category', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).containsText('Report Title');
            assert.dom(this.element).containsText('Description');
            assert.dom(this.element).containsText('Category');
            assert.dom('input.form-input').hasAttribute('placeholder', 'Enter report title...');
            assert.dom('textarea').hasAttribute('placeholder', 'Optional description...');
        });

        test('the category picker lists every option plus a placeholder', async function (assert) {
            await render(TEMPLATE);

            const labels = findAll('option').map((option) => option.textContent.trim());
            assert.true(labels.includes('Select category...'));
            assert.true(labels.includes('operations'));
            assert.true(labels.includes('finance'));
        });

        test('typing a title and description writes them back to the options', async function (assert) {
            const options = { categoryOptions: CATEGORIES, toggleScheduling: () => {} };
            this.set('options', options);

            await render(TEMPLATE);
            await fillIn('input.form-input', 'Quarterly orders');
            await fillIn('textarea', 'Orders grouped by month');

            assert.strictEqual(options.title, 'Quarterly orders');
            assert.strictEqual(options.description, 'Orders grouped by month');
        });
    });

    module('scheduling', function () {
        test('no scheduling section is shown unless enabled', async function (assert) {
            await render(TEMPLATE);

            assert.dom('input[type="checkbox"]').doesNotExist();
            assert.dom(this.element).doesNotContainText('Schedule this report');
        });

        test('enabling scheduling offers an opt-in checkbox', async function (assert) {
            this.set('options', { ...this.options, showScheduling: true });

            await render(TEMPLATE);

            assert.dom('input[type="checkbox"]').exists();
            assert.dom(this.element).containsText('Schedule this report');
            assert.dom(this.element).doesNotContainText('Frequency', 'the schedule detail stays hidden until opted in');
        });

        test('ticking the box reports the toggle', async function (assert) {
            this.set('options', { ...this.options, showScheduling: true });

            await render(TEMPLATE);
            await click('input[type="checkbox"]');

            assert.strictEqual(toggles, 1);
        });

        test('once scheduled it asks for a frequency and a time', async function (assert) {
            this.set('options', { ...this.options, showScheduling: true, isScheduled: true, frequencyOptions: ['daily', 'weekly'] });

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Frequency');
            assert.dom(this.element).containsText('Time');
            assert.ok(find('input[type="time"]'), 'a time field is offered');
        });

        test('the checkbox reflects the current scheduled state', async function (assert) {
            this.set('options', { ...this.options, showScheduling: true, isScheduled: true });

            await render(TEMPLATE);

            assert.dom('input[type="checkbox"]').isChecked();
        });
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::SaveReport />`);

        assert.ok(find('input.form-input'), 'the title field still renders');
        assert.dom(this.element).doesNotContainText('undefined');
    });
});
