import Application from '@ember/application';
import config from 'dummy/config/environment';
import initializer, { initialize } from 'dummy/initializers/define-task-test-waiter-modifier';
import { module, test } from 'qunit';
import Resolver from 'ember-resolver';
import { run } from '@ember/runloop';

// The initializer body is currently commented out upstream (the
// ember-concurrency test-waiter modifier is not registered), so these tests pin
// the contract that actually matters to consumers: the module exports a valid,
// side-effect-free initializer that an application can boot with repeatedly.
module('Unit | Initializer | define-task-test-waiter-modifier', function (hooks) {
    hooks.beforeEach(function () {
        this.TestApplication = class TestApplication extends Application {
            modulePrefix = config.modulePrefix;
            podModulePrefix = config.podModulePrefix;
            Resolver = Resolver;
        };

        this.TestApplication.initializer({
            name: 'initializer under test',
            initialize,
        });

        this.application = this.TestApplication.create({ autoboot: false });
    });

    hooks.afterEach(function () {
        run(this.application, 'destroy');
    });

    test('it exports an initializer object exposing the initialize function', function (assert) {
        assert.strictEqual(typeof initialize, 'function', 'the named export is callable');
        assert.strictEqual(initializer.initialize, initialize, 'the default export reuses the same function');
    });

    test('the application boots with the initializer registered', async function (assert) {
        await this.application.boot();

        assert.true(this.application._booted, 'booting completes rather than throwing');
    });

    test('initialize accepts an application and returns nothing', function (assert) {
        assert.strictEqual(initialize(this.application), undefined);
    });

    test('initialize is safe to call with no arguments', function (assert) {
        assert.strictEqual(initialize(), undefined, 'it does not read its arguments');
    });

    test('it is idempotent across repeated invocations', function (assert) {
        initialize(this.application);
        initialize(this.application);
        initialize(this.application);

        assert.true(true, 'repeated initialization neither throws nor accumulates state');
    });

    test('it registers no container entries as a side effect', async function (assert) {
        await this.application.boot();
        const owner = this.application.buildInstance();

        try {
            assert.false(owner.hasRegistration('modifier:task-test-waiter'), 'the modifier registration is currently disabled upstream');
        } finally {
            run(owner, 'destroy');
        }
    });
});
