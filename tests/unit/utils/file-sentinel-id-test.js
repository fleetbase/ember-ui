import fileSentinelId from 'dummy/utils/file-sentinel-id';
import { module, test } from 'qunit';

module('Unit | Utility | file-sentinel-id', function () {
    test('it extracts the uuid from a file reference', function (assert) {
        assert.strictEqual(fileSentinelId('file:226307ff-ddd5-49b2-9ad7-e100f968f270'), '226307ff-ddd5-49b2-9ad7-e100f968f270');
    });

    test('anything else is not a reference', function (assert) {
        assert.strictEqual(fileSentinelId('file:'), null, 'an empty reference');
        assert.strictEqual(fileSentinelId('{"uuid":"x"}'), null, 'expanded json');
        assert.strictEqual(fileSentinelId('data:image/png;base64,AAAA'), null, 'a data url');
        assert.strictEqual(fileSentinelId({ uuid: 'x' }), null, 'an object');
        assert.strictEqual(fileSentinelId(null), null);
    });
});
