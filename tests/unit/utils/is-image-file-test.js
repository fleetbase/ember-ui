import isImageFile from 'dummy/utils/is-image-file';
import { module, test } from 'qunit';

module('Unit | Utility | is-image-file', function () {
    test('it works', function (assert) {
        const file = {
            subject_uuid: null,
            caption: null,
            url: null,
            path: '7edXyrWQo.png',
            bucket: null,
            folder: null,
            etag: null,
            original_filename: 'Screenshot 2025-11-11 at 12.11.48.png',
            type: 'file',
            content_type: 'image/png',
            subject_type: null,
            file_size: 254603,
            slug: 'screenshot-2025-11-11-at-121148png-3',
            permalink: null,
            deleted_at: null,
            created_at: '2025-11-12T07:42:51.000Z',
            updated_at: '2025-11-12T07:42:51.000Z',
        };
        let result = isImageFile(file);
        assert.ok(result);
    });
});
