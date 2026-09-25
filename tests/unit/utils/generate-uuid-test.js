import { module, test } from 'qunit';
import generateUuid from '@fleetbase/ember-ui/utils/generate-uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

module('Unit | Utility | generate-uuid', function (hooks) {
    let nativeRandomUUID;

    hooks.beforeEach(function () {
        nativeRandomUUID = crypto.randomUUID;
    });

    hooks.afterEach(function () {
        // `randomUUID` is a plain data property on the crypto instance in the browsers we
        // target, so restoring it is enough; delete it when it was never there to begin with.
        if (nativeRandomUUID === undefined) {
            delete crypto.randomUUID;
        } else {
            crypto.randomUUID = nativeRandomUUID;
        }
    });

    test('it uses crypto.randomUUID when the platform offers it', function (assert) {
        crypto.randomUUID = () => 'ffffffff-ffff-4fff-bfff-ffffffffffff';

        assert.strictEqual(generateUuid(), 'ffffffff-ffff-4fff-bfff-ffffffffffff', 'the platform generator is used as given');
    });

    test('without randomUUID it builds a v4 uuid from getRandomValues', function (assert) {
        crypto.randomUUID = undefined;

        const uuid = generateUuid();

        assert.ok(V4.test(uuid), `${uuid} is a well-formed v4 uuid`);
    });

    test('the fallback sets the version and variant bits whatever the random bytes are', function (assert) {
        crypto.randomUUID = undefined;

        const nativeGetRandomValues = crypto.getRandomValues;

        try {
            // All-zero bytes: only the version and variant nibbles may come back non-zero.
            crypto.getRandomValues = (array) => array.fill(0x00);
            assert.strictEqual(generateUuid(), '00000000-0000-4000-8000-000000000000', 'version 4 and variant 8 are forced into all-zero bytes');

            // All-ones bytes: the same two nibbles are masked down rather than left as f.
            crypto.getRandomValues = (array) => array.fill(0xff);
            assert.strictEqual(generateUuid(), 'ffffffff-ffff-4fff-bfff-ffffffffffff', 'version 4 and variant b are masked into all-one bytes');
        } finally {
            crypto.getRandomValues = nativeGetRandomValues;
        }
    });

    test('it does not repeat itself', function (assert) {
        crypto.randomUUID = undefined;

        const seen = new Set(Array.from({ length: 50 }, () => generateUuid()));

        assert.strictEqual(seen.size, 50, 'fifty draws from the fallback are all distinct');
    });
});
