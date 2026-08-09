import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, findAll, find } from '@ember/test-helpers';
import { selectChoose } from 'ember-power-select/test-support';
import { hbs } from 'ember-cli-htmlbars';

function tabs() {
    return findAll('.ui-tab');
}

function tabLabels() {
    return tabs().map((tab) => tab.textContent.trim());
}

function activeTab() {
    return find('.ui-tab.active');
}

function keyInputs() {
    return findAll('[aria-label="Translation Key"]');
}

function valueInputs() {
    return findAll('[aria-label="Translation Value"]');
}

function renderedKeys() {
    return keyInputs().map((input) => input.value);
}

function removeButtons() {
    return findAll('.text-danger');
}

// Setting .value directly and firing only `blur` exercises the component's own handler
// without a re-render landing while the field is still focused, which otherwise reassigns the
// tracked `translations` object mid-render and raises a backtracking assertion (DEFECTS.md #26).
async function editAndBlur(input, value) {
    input.value = value;
    await triggerEvent(input, 'blur');
}

function addButton() {
    return findAll('button').find((button) => button.textContent.includes('Add new translation'));
}

module('Integration | Component | translations-editor', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('onChange', (translations) => changes.push(JSON.parse(JSON.stringify(translations))));
        // The language picker is a <CountrySelect>, which fetches its own option list.
        this.owner.lookup('service:fetch').responses['lookup/countries'] = [
            { name: 'Singapore', cca2: 'SG', emoji: '\u{1F1F8}\u{1F1EC}' },
            { name: 'United States', cca2: 'US', emoji: '\u{1F1FA}\u{1F1F8}' },
        ];
    });

    const TEMPLATE = hbs`
        <TranslationsEditor
            @value={{this.value}}
            @defaultKeys={{this.defaultKeys}}
            @label={{this.label}}
            @labelClass={{this.labelClass}}
            @onChange={{this.onChange}}
        />
    `;

    function lastChange() {
        return changes[changes.length - 1];
    }

    module('rendering', function () {
        test('with no value it renders an empty editor', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.translations-editor-input').exists();
            assert.dom('.translation-editor-input-header').containsText('Translations');
            assert.strictEqual(tabs().length, 0, 'there are no languages yet');
            assert.notOk(addButton(), 'nothing can be added until a language exists');
        });

        test('the label can be overridden and classed', async function (assert) {
            this.set('label', 'Order statuses');
            this.set('labelClass', 'my-label');

            await render(TEMPLATE);

            assert.dom('.my-label').hasText('Order statuses');
        });

        test('it renders a tab per language and loads the first', async function (assert) {
            this.set('value', { en: { greeting: 'Hello' }, fr: { greeting: 'Bonjour' } });

            await render(TEMPLATE);

            assert.deepEqual(tabLabels(), ['en', 'fr']);
            assert.dom(activeTab()).hasText('en', 'the first language is loaded');
            assert.deepEqual(renderedKeys(), ['greeting']);
            assert.strictEqual(valueInputs()[0].value, 'Hello');
        });

        test('switching tabs shows that language', async function (assert) {
            this.set('value', { en: { greeting: 'Hello' }, fr: { greeting: 'Bonjour' } });

            await render(TEMPLATE);
            await click(tabs()[1]);

            assert.dom(activeTab()).hasText('fr');
            assert.strictEqual(valueInputs()[0].value, 'Bonjour');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<TranslationsEditor data-test-translations="yes" />`);

            assert.dom('.translations-editor-input').hasAttribute('data-test-translations', 'yes');
        });
    });

    module('default keys', function () {
        test('missing default keys are filled in for every language', async function (assert) {
            this.set('value', { en: { greeting: 'Hello' }, fr: {} });
            this.set('defaultKeys', ['greeting', 'farewell']);

            await render(TEMPLATE);

            assert.deepEqual(renderedKeys(), ['greeting', 'farewell'], 'the missing key is added to en');
            assert.strictEqual(valueInputs()[0].value, 'Hello', 'the existing translation is preserved');
            assert.strictEqual(valueInputs()[1].value, '', 'the added key starts empty');

            await click(tabs()[1]);
            assert.deepEqual(renderedKeys(), ['greeting', 'farewell'], 'and to fr');
        });

        test('with no default keys the value is used as-is', async function (assert) {
            this.set('value', { en: { greeting: 'Hello' } });

            await render(TEMPLATE);

            assert.deepEqual(renderedKeys(), ['greeting']);
        });

        test('an array value produces no language tabs at all', async function (assert) {
            this.set('value', ['not', 'an', 'object']);
            this.set('defaultKeys', ['greeting']);

            await render(TEMPLATE);

            assert.deepEqual(tabLabels(), [], 'the array is discarded rather than indexed');
        });

        test('a blank value is discarded rather than rendered', async function (assert) {
            this.set('value', '');
            this.set('defaultKeys', ['greeting']);

            await render(TEMPLATE);

            assert.strictEqual(tabs().length, 0);
        });
    });

    module('editing translations', function (hooks) {
        hooks.beforeEach(function () {
            this.set('value', { en: { greeting: 'Hello', farewell: 'Bye' } });
        });

        test('editing a value reports the new translations', async function (assert) {
            await render(TEMPLATE);

            await editAndBlur(valueInputs()[0], '  Good day  ');

            assert.strictEqual(lastChange().en.greeting, 'Good day', 'the value is trimmed');
        });

        test('renaming a key underscores it and keeps the value', async function (assert) {
            await render(TEMPLATE);

            await editAndBlur(keyInputs()[0], 'Formal Greeting');

            const change = lastChange();
            assert.strictEqual(change.en.formal_greeting, 'Hello', 'the value moves to the new key');
            assert.strictEqual(change.en.greeting, undefined, 'the old key is gone');
        });

        test('a translation can be removed', async function (assert) {
            await render(TEMPLATE);

            await click(removeButtons()[0]);

            assert.deepEqual(renderedKeys(), ['farewell']);
            assert.strictEqual(lastChange().en.greeting, undefined);
        });

        test('a new empty translation can be added', async function (assert) {
            await render(TEMPLATE);

            await click(addButton());

            assert.deepEqual(renderedKeys(), ['greeting', 'farewell', 'translation_0'], 'the new key takes the first free translation_N index');
            assert.strictEqual(lastChange().en.translation_0, null);
        });

        test('adding after a removal does not reuse a key that is still in play', async function (assert) {
            await render(TEMPLATE);

            await click(addButton()); // -> translation_0
            await click(addButton()); // -> translation_1
            await click(removeButtons()[0]); // remove greeting; translation_1 survives
            await click(addButton()); // must go past the highest index in use, not the count

            assert.deepEqual(renderedKeys(), ['farewell', 'translation_0', 'translation_1', 'translation_2'], 'a fourth entry appears and nothing is overwritten');
        });

        test('it edits without an onChange handler', async function (assert) {
            await render(hbs`<TranslationsEditor @value={{this.value}} />`);

            await click(addButton());

            assert.deepEqual(renderedKeys(), ['greeting', 'farewell', 'translation_0']);
        });
    });
    module('adding a language', function () {
        test('a chosen country becomes a new active tab seeded with the default keys', async function (assert) {
            this.set('value', { en: { greeting: 'Hello' } });
            this.set('defaultKeys', ['greeting', 'farewell']);

            await render(TEMPLATE);
            await selectChoose('.fleetbase-power-select', 'United States');

            assert.deepEqual(tabLabels(), ['en', 'us'], 'the ISO code is lowercased into a tab');
            assert.strictEqual(activeTab().textContent.trim(), 'us', 'and the new language is selected');
            assert.deepEqual(renderedKeys(), ['greeting', 'farewell'], 'the new language starts with every default key');
            assert.deepEqual(
                valueInputs().map((input) => input.value),
                ['', ''],
                'and no values'
            );
            assert.deepEqual(
                lastChange(),
                { en: { greeting: 'Hello', farewell: null }, us: { greeting: null, farewell: null } },
                'the addition is reported alongside the existing languages'
            );
        });

        test('with no default keys a new language starts empty', async function (assert) {
            await render(TEMPLATE);
            await selectChoose('.fleetbase-power-select', 'United States');

            assert.deepEqual(tabLabels(), ['us']);
            assert.deepEqual(renderedKeys(), [], 'there is nothing to seed it with');

            await click(addButton());

            assert.deepEqual(renderedKeys(), ['translation_0'], 'and it can still be filled in by hand');
        });

        test('a language can be added without an onChange handler', async function (assert) {
            await render(hbs`<TranslationsEditor />`);
            await selectChoose('.fleetbase-power-select', 'United States');

            assert.deepEqual(tabLabels(), ['us']);
        });
    });

    // `defaultKeys` defaults to `[]` only when the argument is absent; an explicit null takes the
    // other path through `setDefaultKeys`, which hands the value straight back.
    module('an explicit null defaultKeys', function () {
        test('the value is passed through untouched', async function (assert) {
            this.set('value', { en: { greeting: 'Hello' } });
            this.set('defaultKeys', null);

            await render(TEMPLATE);

            assert.deepEqual(tabLabels(), ['en']);
            assert.deepEqual(renderedKeys(), ['greeting'], 'nothing is added and nothing is dropped');
        });

        test('no value at all still renders an empty editor', async function (assert) {
            this.set('defaultKeys', null);

            await render(TEMPLATE);

            assert.deepEqual(tabLabels(), [], 'there is nothing to show');
            assert.dom('.translations-editor-input').exists('but the editor still renders');
        });
    });
});
