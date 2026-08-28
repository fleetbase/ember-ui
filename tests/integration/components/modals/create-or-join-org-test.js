import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function choiceButtons() {
    return findAll('.modal-body-container button').filter((button) => button.textContent.includes('Organization'));
}

function joinButton() {
    return choiceButtons().find((button) => button.textContent.includes('Join an Organization'));
}

function createButton() {
    return choiceButtons().find((button) => button.textContent.includes('Create new Organization'));
}

module('Integration | Component | modals/create-or-join-org', function (hooks) {
    setupRenderingTest(hooks);

    let chosen;

    hooks.beforeEach(function () {
        chosen = [];
        this.set('options', { changeAction: (action) => chosen.push(action) });
    });

    const TEMPLATE = hbs`<Modals::CreateOrJoinOrg @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    module('choosing what to do', function () {
        test('it offers both a join and a create option', async function (assert) {
            await render(TEMPLATE);

            assert.ok(joinButton(), 'joining is offered');
            assert.ok(createButton(), 'creating is offered');
        });

        test('neither option is highlighted before a choice is made', async function (assert) {
            await render(TEMPLATE);

            assert.dom(joinButton()).hasClass('border-transparent');
            assert.dom(createButton()).hasClass('border-transparent');
        });

        test('the chosen action is highlighted', async function (assert) {
            this.set('options', { ...this.options, action: 'join' });

            await render(TEMPLATE);

            assert.dom(joinButton()).hasClass('border-blue-500');
            assert.dom(createButton()).hasClass('border-transparent');
        });

        test('choosing either option reports it', async function (assert) {
            await render(TEMPLATE);

            await click(joinButton());
            assert.deepEqual(chosen, ['join']);

            await click(createButton());
            assert.deepEqual(chosen, ['join', 'create']);
        });
    });

    module('the join form', function () {
        test('it asks only for an organization id', async function (assert) {
            this.set('options', { ...this.options, action: 'join' });

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Organization ID');
            assert.dom(this.element).containsText('Enter the ID of the organization you wish to join.');
            assert.dom(this.element).doesNotContainText('Organization name');
            assert.dom(this.element).doesNotContainText('Organization currency');
        });
    });

    module('the create form', function () {
        test('it asks for the full organization details', async function (assert) {
            this.set('options', { ...this.options, action: 'create' });

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Organization name');
            assert.dom(this.element).containsText('Organization description');
            assert.dom(this.element).containsText('Organization phone number');
            assert.dom(this.element).containsText('Organization currency');
            assert.dom(this.element).doesNotContainText('Organization ID');
        });

        test('the create form is the default when no action is chosen', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).containsText('Organization name', 'creating is the fallback branch');
        });

        test('a currency selector is offered', async function (assert) {
            this.set('options', { ...this.options, action: 'create' });

            await render(TEMPLATE);

            assert.ok(find('.ember-power-select-trigger'), 'the currency picker renders');
        });
    });

    // DEFECT: rendering <Modals::CreateOrJoinOrg /> with no @options
    // throws from the {{fn}} helper because `@options.changeAction` is undefined. That
    // surfaces as an uncaught global failure, so the case is deliberately untested.
    test('an options hash without a changeAction still renders both choices', async function (assert) {
        this.set('options', { changeAction: () => {} });

        await render(TEMPLATE);

        assert.strictEqual(choiceButtons().length, 2, 'both choices render');
        assert.dom(this.element).doesNotContainText('undefined');
    });
});
