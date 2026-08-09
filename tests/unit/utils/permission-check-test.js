import { resolveResource, resolveAction, checkPermission, evaluatePermission } from '@fleetbase/ember-ui/utils/permission-check';
import { module, test } from 'qunit';

function abilitiesWithCan(impl) {
    return { can: impl };
}

module('Unit | Utility | permission-check', function () {
    module('resolveResource', function () {
        test('it dasherizes an explicit resource string', function (assert) {
            assert.strictEqual(resolveResource({ resource: 'order' }), 'order');
            assert.strictEqual(resolveResource({ resource: 'FuelReport' }), 'fuel-report', 'camel case becomes dasherized');
            assert.strictEqual(resolveResource({ resource: 'fuel_report' }), 'fuel-report', 'underscores become dashes');
            assert.strictEqual(resolveResource({ resource: 'service rate' }), 'service-rate', 'spaces become dashes');
        });

        test('an explicit resource wins over the model', function (assert) {
            const model = { constructor: { modelName: 'vehicle' } };

            assert.strictEqual(resolveResource({ resource: 'Driver', model }), 'driver');
        });

        test('it falls back to the Ember Data modelName on the constructor', function (assert) {
            const model = { constructor: { modelName: 'fuelReport' } };

            assert.strictEqual(resolveResource({ model }), 'fuel-report');
        });

        test('it falls back to the legacy _internalModel lookup last', function (assert) {
            const model = {
                get(path) {
                    return path === '_internalModel.modelName' ? 'legacy_thing' : undefined;
                },
            };

            assert.strictEqual(resolveResource({ model }), 'legacy-thing');
        });

        test('it ignores non-string and empty resource values', function (assert) {
            assert.strictEqual(resolveResource({ resource: 123 }), null, 'a number is not a usable resource');
            assert.strictEqual(resolveResource({ resource: '' }), null, 'an empty string falls through');
            assert.strictEqual(resolveResource({ resource: {} }), null);
        });

        test('it returns null when nothing can be resolved', function (assert) {
            assert.strictEqual(resolveResource({}), null);
            assert.strictEqual(resolveResource({ model: null }), null);
            assert.strictEqual(resolveResource({ model: undefined }), null);
            assert.strictEqual(resolveResource({ model: {} }), null, 'a POJO with no modelName resolves to null');
            assert.strictEqual(resolveResource({ model: { constructor: { modelName: '' } } }), null, 'a blank modelName is not usable');
        });
    });

    module('resolveAction', function () {
        test('an explicit action always wins', function (assert) {
            assert.strictEqual(resolveAction({ explicit: 'approve' }), 'approve');
            assert.strictEqual(resolveAction({ explicit: 'approve', kind: 'delete' }), 'approve', 'explicit beats kind');
            assert.strictEqual(resolveAction({ explicit: 'approve', kind: 'write', model: { isNew: true } }), 'approve');
        });

        test('the delete kind resolves to delete', function (assert) {
            assert.strictEqual(resolveAction({ kind: 'delete' }), 'delete');
            assert.strictEqual(resolveAction({ kind: 'delete', model: { isNew: true } }), 'delete', 'the model is irrelevant for delete');
        });

        test('the write kind infers create or update from model.isNew', function (assert) {
            assert.strictEqual(resolveAction({ kind: 'write', model: { isNew: true } }), 'create');
            assert.strictEqual(resolveAction({ kind: 'write', model: { isNew: false } }), 'update');
        });

        test('the write kind cannot infer without a boolean isNew', function (assert) {
            assert.strictEqual(resolveAction({ kind: 'write' }), null, 'no model at all');
            assert.strictEqual(resolveAction({ kind: 'write', model: {} }), null, 'isNew missing');
            assert.strictEqual(resolveAction({ kind: 'write', model: { isNew: 'true' } }), null, 'a string isNew is not a boolean');
            assert.strictEqual(resolveAction({ kind: 'write', model: null }), null);
        });

        test('unknown and custom kinds require an explicit action', function (assert) {
            assert.strictEqual(resolveAction({ kind: 'custom' }), null);
            assert.strictEqual(resolveAction({ kind: 'nonsense' }), null);
            assert.strictEqual(resolveAction({}), null);
            assert.strictEqual(resolveAction({ explicit: '' }), null, 'an empty explicit action is falsy and falls through');
        });
    });

    module('checkPermission', function () {
        test('it prefers the can() interface and coerces to a boolean', function (assert) {
            const calls = [];
            const abilities = abilitiesWithCan((permission, subject) => {
                calls.push([permission, subject]);
                return 'truthy but not a boolean';
            });
            const subject = { id: 1 };

            const result = checkPermission(abilities, 'fleet-ops view order', subject);

            assert.strictEqual(result, true, 'the truthy result is coerced to true');
            assert.deepEqual(calls, [['fleet-ops view order', subject]], 'the permission string and subject are forwarded verbatim');
        });

        test('a falsy can() result denies', function (assert) {
            assert.false(
                checkPermission(
                    abilitiesWithCan(() => false),
                    'p',
                    null
                )
            );
            assert.false(
                checkPermission(
                    abilitiesWithCan(() => undefined),
                    'p',
                    null
                )
            );
            assert.false(
                checkPermission(
                    abilitiesWithCan(() => 0),
                    'p',
                    null
                )
            );
        });

        test('it falls back to the cannot() interface and inverts it', function (assert) {
            const calls = [];
            const abilities = {
                cannot(permission, subject) {
                    calls.push([permission, subject]);
                    return false;
                },
            };

            assert.true(checkPermission(abilities, 'fleet-ops delete order', 'subject'));
            assert.deepEqual(calls, [['fleet-ops delete order', 'subject']]);
            assert.false(checkPermission({ cannot: () => true }, 'p', null), 'cannot() true denies');
        });

        test('it supports a bare function ability service', function (assert) {
            const seen = [];
            const abilities = function (permission, subject) {
                seen.push([permission, subject]);
                return 1;
            };

            assert.true(checkPermission(abilities, 'fleet-ops view order', 'model'));
            assert.deepEqual(seen, [['fleet-ops view order', 'model']]);
            assert.false(
                checkPermission(() => null, 'p', null),
                'a falsy return denies'
            );
        });

        test('it denies when the service or permission is missing', function (assert) {
            assert.false(checkPermission(null, 'p', null), 'no service');
            assert.false(checkPermission(undefined, 'p', null));
            assert.false(
                checkPermission(
                    abilitiesWithCan(() => true),
                    '',
                    null
                ),
                'empty permission string'
            );
            assert.false(
                checkPermission(
                    abilitiesWithCan(() => true),
                    null,
                    null
                ),
                'null permission'
            );
            assert.false(checkPermission({}, 'p', null), 'a service with no recognized interface');
            assert.false(checkPermission({ can: 'not-a-function' }, 'p', null), 'a non-callable can property');
        });

        test('it never invokes the service when it short-circuits', function (assert) {
            let called = 0;
            const abilities = abilitiesWithCan(() => {
                called++;
                return true;
            });

            checkPermission(abilities, '', null);
            checkPermission(abilities, undefined, null);

            assert.strictEqual(called, 0, 'a missing permission never reaches the abilities service');
        });
    });

    module('evaluatePermission', function () {
        test('it builds a "schema action resource" permission string', function (assert) {
            const seen = [];
            const abilitiesService = abilitiesWithCan((permission, subject) => {
                seen.push([permission, subject]);
                return true;
            });
            const model = { isNew: true, constructor: { modelName: 'fuelReport' } };

            const result = evaluatePermission({ abilitiesService, kind: 'write', model });

            assert.true(result);
            assert.strictEqual(seen[0][0], 'fleet-ops create fuel-report', 'schema defaults to fleet-ops');
            assert.strictEqual(seen[0][1], model, 'the model is passed as the policy subject');
        });

        test('it honors a custom schema, explicit action and explicit resource', function (assert) {
            const seen = [];
            const abilitiesService = abilitiesWithCan((permission) => {
                seen.push(permission);
                return true;
            });

            evaluatePermission({ abilitiesService, schema: 'storefront', action: 'approve', resource: 'PurchaseOrder' });

            assert.deepEqual(seen, ['storefront approve purchase-order']);
        });

        test('it resolves update for persisted records on a write', function (assert) {
            const seen = [];
            const abilitiesService = abilitiesWithCan((permission) => {
                seen.push(permission);
                return true;
            });

            evaluatePermission({ abilitiesService, kind: 'write', model: { isNew: false, constructor: { modelName: 'order' } } });

            assert.deepEqual(seen, ['fleet-ops update order']);
        });

        test('it returns defaultWhenUnknown when the action cannot be resolved', function (assert) {
            const abilitiesService = abilitiesWithCan(() => true);
            const model = { constructor: { modelName: 'order' } };

            assert.false(evaluatePermission({ abilitiesService, kind: 'write', model }), 'defaults to deny');
            assert.true(evaluatePermission({ abilitiesService, kind: 'write', model, defaultWhenUnknown: true }), 'and to allow when configured');
        });

        test('it returns defaultWhenUnknown when the resource cannot be resolved', function (assert) {
            const abilitiesService = abilitiesWithCan(() => true);

            assert.false(evaluatePermission({ abilitiesService, action: 'approve' }));
            assert.true(evaluatePermission({ abilitiesService, action: 'approve', defaultWhenUnknown: true }));
        });

        test('it returns defaultWhenUnknown when the schema is blank', function (assert) {
            const abilitiesService = abilitiesWithCan(() => true);

            assert.false(evaluatePermission({ abilitiesService, schema: '', action: 'view', resource: 'order' }));
            assert.true(evaluatePermission({ abilitiesService, schema: null, action: 'view', resource: 'order', defaultWhenUnknown: true }));
        });

        test('it coerces a non-boolean defaultWhenUnknown', function (assert) {
            const abilitiesService = abilitiesWithCan(() => true);

            assert.strictEqual(evaluatePermission({ abilitiesService, defaultWhenUnknown: 'yes' }), true, 'truthy defaults coerce to true');
            assert.strictEqual(evaluatePermission({ abilitiesService, defaultWhenUnknown: 0 }), false, 'falsy defaults coerce to false');
        });

        test('it never calls the abilities service when resolution fails', function (assert) {
            let called = 0;
            const abilitiesService = abilitiesWithCan(() => {
                called++;
                return true;
            });

            evaluatePermission({ abilitiesService, kind: 'custom' });

            assert.strictEqual(called, 0);
        });

        test('a denied ability check overrides defaultWhenUnknown', function (assert) {
            const abilitiesService = abilitiesWithCan(() => false);

            assert.false(evaluatePermission({ abilitiesService, action: 'view', resource: 'order', defaultWhenUnknown: true }), 'a resolvable permission is actually checked');
        });

        test('a missing abilities service denies once the permission resolves', function (assert) {
            assert.false(evaluatePermission({ action: 'view', resource: 'order' }));
        });
    });
});
