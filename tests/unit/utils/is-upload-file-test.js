import isUploadFile from '@fleetbase/ember-ui/utils/is-upload-file';
import { UploadFile } from 'ember-file-upload';
import { module, test } from 'qunit';

function uploadFileFrom(file) {
    return new UploadFile(file);
}

module('Unit | Utility | is-upload-file', function () {
    test('it recognises an UploadFile instance', function (assert) {
        const uploadFile = uploadFileFrom(new File(['data'], 'report.pdf', { type: 'application/pdf' }));

        assert.true(isUploadFile(uploadFile));
    });

    test('it rejects the raw File the UploadFile wraps', function (assert) {
        const file = new File(['data'], 'report.pdf', { type: 'application/pdf' });

        assert.false(isUploadFile(file), 'a browser File is not an UploadFile');
    });

    test('it rejects a Blob', function (assert) {
        assert.false(isUploadFile(new Blob(['data'])));
    });

    test('it rejects nullish values', function (assert) {
        assert.false(isUploadFile(null));
        assert.false(isUploadFile(undefined));
    });

    test('it rejects primitives', function (assert) {
        assert.false(isUploadFile(''));
        assert.false(isUploadFile('report.pdf'));
        assert.false(isUploadFile(0));
        assert.false(isUploadFile(false));
        assert.false(isUploadFile(NaN));
    });

    test('it rejects plain objects that merely look like an upload', function (assert) {
        assert.false(isUploadFile({ name: 'report.pdf', size: 4, type: 'application/pdf' }), 'duck typing is not enough — the check is instanceof');
    });

    test('it rejects arrays and empty objects', function (assert) {
        assert.false(isUploadFile([]));
        assert.false(isUploadFile({}));
    });

    test('it is callable with no argument', function (assert) {
        assert.false(isUploadFile());
    });
});
