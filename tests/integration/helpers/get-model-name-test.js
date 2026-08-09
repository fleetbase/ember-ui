import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

class FuelReportModel {}
FuelReportModel.modelName = 'fuel-report';

class ApiCredentialModel {}
ApiCredentialModel.modelName = 'apiCredential';

class PascalModel {}
PascalModel.modelName = 'FuelReport';

module('Integration | Helper | get-model-name', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('model', new FuelReportModel());
    });

    test('it reads modelName off the record constructor', async function (assert) {
        await render(hbs`{{get-model-name this.model}}`);

        assert.dom(this.element).hasText('fuel-report');
    });

    test('it falls back to the legacy _internalModel model name', async function (assert) {
        this.set('legacy', { _internalModel: { modelName: 'legacy-thing' } });

        await render(hbs`{{get-model-name this.legacy}}`);

        assert.dom(this.element).hasText('legacy-thing');
    });

    test('the fallback argument is used when no model name can be found', async function (assert) {
        this.set('plain', { id: 1 });

        await render(hbs`{{get-model-name this.plain "record"}}`);

        assert.dom(this.element).hasText('record');
    });

    test('without a fallback an unknown model renders nothing', async function (assert) {
        this.set('plain', { id: 1 });

        await render(hbs`{{get-model-name this.plain}}`);

        assert.dom(this.element).hasNoText();
    });

    test('humanize turns a dasherized name into title-cased words', async function (assert) {
        await render(hbs`{{get-model-name this.model humanize=true}}`);

        assert.dom(this.element).hasText('Fuel Report');
    });

    test('humanize upper-cases known abbreviations', async function (assert) {
        this.set('model', new ApiCredentialModel());

        await render(hbs`{{get-model-name this.model humanize=true}}`);

        assert.dom(this.element).hasText('API Credential');
    });

    test('lowercase lower-cases the whole name', async function (assert) {
        this.set('model', new PascalModel());

        await render(hbs`{{get-model-name this.model lowercase=true}}`);

        assert.dom(this.element).hasText('fuelreport');
    });

    test('capitalize only upper-cases the first character', async function (assert) {
        await render(hbs`{{get-model-name this.model capitalize=true}}`);

        assert.dom(this.element).hasText('Fuel-report', 'the dash is left untouched');
    });

    test('capitalizeWords capitalizes each whitespace separated word', async function (assert) {
        await render(hbs`{{get-model-name this.model humanize=true lowercase=true capitalizeWords=true}}`);

        assert.dom(this.element).hasText('Fuel Report', 'the options are applied in order: humanize, lowercase, then capitalizeWords');
    });

    test('humanize combined with lowercase yields a plain lowercase phrase', async function (assert) {
        await render(hbs`{{get-model-name this.model humanize=true lowercase=true}}`);

        assert.dom(this.element).hasText('fuel report');
    });

    test('options default to off', async function (assert) {
        this.set('model', new PascalModel());

        await render(hbs`{{get-model-name this.model humanize=false lowercase=false capitalize=false capitalizeWords=false}}`);

        assert.dom(this.element).hasText('FuelReport', 'the raw model name is returned untouched');
    });
});
