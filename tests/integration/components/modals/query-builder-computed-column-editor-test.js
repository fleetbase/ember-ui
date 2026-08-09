import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ModalsManagerService from '@fleetbase/ember-ui/services/modals-manager';

module('Integration | Component | modals/query-builder-computed-column-editor', function (hooks) {
    setupRenderingTest(hooks);

    let modalOptions;
    let posts;
    let respondWith;

    hooks.beforeEach(function () {
        modalOptions = { tableName: 'orders' };
        posts = [];
        respondWith = () => Promise.resolve({ valid: true });

        this.owner.unregister('service:modalsManager');
        this.owner.register(
            'service:modalsManager',
            class extends ModalsManagerService {
                getOption(key, fallback) {
                    return modalOptions[key] ?? fallback;
                }
                setOption(key, value) {
                    modalOptions[key] = value;
                }
            }
        );

        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                post(endpoint, body, options) {
                    posts.push({ endpoint, body, options });
                    return respondWith();
                }
            }
        );

        this.owner.unregister('service:notifications');
        this.owner.register('service:notifications', class extends Service {});

        this.set('options', modalOptions);
    });

    const TEMPLATE = hbs`<Modals::QueryBuilderComputedColumnEditor @options={{this.options}} />`;

    // The component publishes itself for the modal footer to drive.
    function editor() {
        return modalOptions.modalComponentInstance;
    }

    module('setup', function () {
        test('it publishes its instance for the modal to drive', async function (assert) {
            await render(TEMPLATE);

            assert.ok(editor(), 'the modal can reach the editor');
        });

        test('a fresh column starts empty and typed as text', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(editor().name, '');
            assert.strictEqual(editor().label, '');
            assert.strictEqual(editor().expression, '');
            assert.strictEqual(editor().description, '');
            assert.strictEqual(editor().type.value, 'string', 'text is the default type');
        });

        test('an existing column is loaded into the editor', async function (assert) {
            modalOptions.computedColumn = {
                name: 'days_open',
                label: 'Days Open',
                expression: 'DATEDIFF(closed_at, opened_at)',
                description: 'How long the order was open',
                type: 'integer',
            };

            await render(TEMPLATE);

            assert.strictEqual(editor().name, 'days_open');
            assert.strictEqual(editor().label, 'Days Open');
            assert.strictEqual(editor().expression, 'DATEDIFF(closed_at, opened_at)');
            assert.strictEqual(editor().description, 'How long the order was open');
            assert.strictEqual(editor().type.value, 'integer');
        });

        test('a column with no type falls back to text', async function (assert) {
            modalOptions.computedColumn = { name: 'x', label: 'X', expression: '1' };

            await render(TEMPLATE);

            assert.strictEqual(editor().type.value, 'string');
        });

        test('it offers every supported column type', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(
                editor().typeOptions.map((option) => option.value),
                ['string', 'integer', 'decimal', 'date', 'datetime', 'boolean']
            );
        });

        test('it offers a catalogue of allowed sql functions and worked examples', async function (assert) {
            await render(TEMPLATE);

            const functions = editor().allowedFunctions;
            assert.true(functions.includes('DATEDIFF'), 'date helpers are offered');
            assert.true(functions.includes('CONCAT'), 'string helpers are offered');
            assert.true(functions.includes('COALESCE'), 'conditional helpers are offered');
            assert.true(functions.includes('SUM'), 'aggregates are offered');

            assert.strictEqual(editor().exampleExpressions.length, 4);
            assert.true(editor().exampleExpressions.every((example) => example.name && example.expression && example.description));
        });
    });

    module('saving', function () {
        test('saving is refused until name, label and expression are all present', async function (assert) {
            await render(TEMPLATE);

            assert.notOk(editor().canSave, 'nothing filled in');

            editor().name = 'days_open';
            assert.notOk(editor().canSave, 'name alone is not enough');

            editor().label = 'Days Open';
            assert.notOk(editor().canSave, 'still no expression');

            editor().expression = 'DATEDIFF(a, b)';
            assert.ok(editor().canSave, 'now complete');
        });

        test('the save-ability is published to the modal', async function (assert) {
            await render(TEMPLATE);

            editor().name = 'days_open';
            editor().label = 'Days Open';
            editor().expression = 'DATEDIFF(a, b)';
            void editor().canSave;

            assert.ok(modalOptions.canSave, 'the modal footer can enable its save button');
        });

        test('saving publishes the assembled column', async function (assert) {
            await render(TEMPLATE);

            editor().name = 'days_open';
            editor().label = 'Days Open';
            editor().expression = 'DATEDIFF(a, b)';
            editor().description = 'How long';
            editor().type = { value: 'integer', label: 'Integer' };

            const saved = editor().save();

            assert.deepEqual(saved, {
                name: 'days_open',
                label: 'Days Open',
                expression: 'DATEDIFF(a, b)',
                description: 'How long',
                type: 'integer',
            });
            assert.deepEqual(modalOptions.computedColumn, saved, 'and hands it back through the modal options');
        });

        test('saving an incomplete column does nothing', async function (assert) {
            await render(TEMPLATE);

            editor().name = 'days_open';

            assert.strictEqual(editor().save(), undefined);
            assert.notOk(modalOptions.computedColumn, 'nothing is published');
        });

        test('a column with no chosen type saves as text', async function (assert) {
            await render(TEMPLATE);

            editor().name = 'x';
            editor().label = 'X';
            editor().expression = '1';
            editor().type = undefined;

            assert.strictEqual(editor().save().type, 'string');
        });
    });

    module('validating the expression', function () {
        test('a valid expression is confirmed', async function (assert) {
            await render(TEMPLATE);
            editor().expression = 'DATEDIFF(a, b)';

            const result = await editor().validateExpression();

            assert.true(result);
            assert.true(editor().isValid);
            assert.deepEqual(editor().validationErrors, []);
            assert.strictEqual(posts[0].endpoint, 'reports/validate-computed-column');
            assert.deepEqual(posts[0].body, { expression: 'DATEDIFF(a, b)', table_name: 'orders' });
            assert.true(posts[0].options.rawError, 'errors are surfaced raw for inspection');
        });

        test('an invalid expression reports the server errors', async function (assert) {
            respondWith = () => Promise.resolve({ valid: false, errors: ['Unknown column "a"'] });

            await render(TEMPLATE);
            editor().expression = 'DATEDIFF(a, b)';

            const result = await editor().validateExpression();

            assert.false(result);
            assert.false(editor().isValid);
            assert.deepEqual(editor().validationErrors, ['Unknown column "a"']);
        });

        test('an invalid expression with no detail gets a generic message', async function (assert) {
            respondWith = () => Promise.resolve({ valid: false });

            await render(TEMPLATE);
            editor().expression = 'bad';

            await editor().validateExpression();

            assert.deepEqual(editor().validationErrors, ['Expression is invalid']);
        });

        test('a failed request surfaces its errors', async function (assert) {
            respondWith = () => Promise.reject({ errors: ['Server unavailable'] });

            await render(TEMPLATE);
            editor().expression = 'DATEDIFF(a, b)';

            const result = await editor().validateExpression();

            assert.false(result);
            assert.deepEqual(editor().validationErrors, ['Server unavailable']);
        });

        test('a failed request with no detail gets a generic message', async function (assert) {
            respondWith = () => Promise.reject(new Error('boom'));

            await render(TEMPLATE);
            editor().expression = 'DATEDIFF(a, b)';

            await editor().validateExpression();

            assert.deepEqual(editor().validationErrors, ['Failed to validate expression']);
        });

        test('an empty expression is not sent to the server', async function (assert) {
            await render(TEMPLATE);

            const result = await editor().validateExpression();

            assert.false(result);
            assert.deepEqual(posts, [], 'no request is made');
            assert.deepEqual(editor().validationErrors, []);
        });

        test('without a table name nothing is validated', async function (assert) {
            delete modalOptions.tableName;

            await render(TEMPLATE);
            editor().expression = 'DATEDIFF(a, b)';

            const result = await editor().validateExpression();

            assert.false(result);
            assert.deepEqual(posts, []);
        });

        test('the validating flag is cleared even when the request fails', async function (assert) {
            respondWith = () => Promise.reject(new Error('boom'));

            await render(TEMPLATE);
            editor().expression = 'DATEDIFF(a, b)';

            await editor().validateExpression();
            await settled();

            assert.false(editor().isValidating, 'the spinner is not left running');
        });
    });

    module('worked examples', function () {
        test('choosing an example loads and validates it', async function (assert) {
            await render(TEMPLATE);

            const [example] = editor().exampleExpressions;
            editor().useExample(example);
            await settled();

            assert.strictEqual(editor().expression, example.expression, 'the expression is loaded');
            assert.strictEqual(posts.length, 1, 'and validated straight away');
            assert.strictEqual(posts[0].body.expression, example.expression);
        });
    });
});
