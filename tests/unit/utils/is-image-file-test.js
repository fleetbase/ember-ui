import isImageFile, { getFileExtension, toUint8, looksLikeImageBytes } from '@fleetbase/ember-ui/utils/is-image-file';
import { module, test } from 'qunit';

function bytes(...values) {
    return new Uint8Array(values);
}

// Pad to at least 12 bytes so the length guard never masks a signature check.
function signature(...values) {
    const u8 = new Uint8Array(12);
    u8.set(values.slice(0, 12));

    return u8;
}

const PNG_SIGNATURE = signature(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

module('Unit | Utility | is-image-file', function () {
    module('isImageFile', function () {
        test('it rejects nullish and falsy input', function (assert) {
            assert.false(isImageFile(null));
            assert.false(isImageFile(undefined));
            assert.false(isImageFile(0));
            assert.false(isImageFile(''));
            assert.false(isImageFile(false));
            assert.false(isImageFile());
        });

        test('it accepts anything with an image content_type', function (assert) {
            assert.true(isImageFile({ content_type: 'image/png' }));
            assert.true(isImageFile({ content_type: 'image/svg+xml' }));
        });

        test('it falls back to the type field when content_type is absent', function (assert) {
            assert.true(isImageFile({ type: 'image/jpeg' }));
        });

        test('it matches the MIME type case-insensitively', function (assert) {
            assert.true(isImageFile({ content_type: 'IMAGE/PNG' }));
        });

        test('it ignores the generic "file" type used by the API payload', function (assert) {
            assert.false(isImageFile({ type: 'file' }), '"file" is not a MIME type and must not short-circuit');
        });

        test('it recognises a real uploaded-image payload by extension', function (assert) {
            const file = {
                path: '7edXyrWQo.png',
                original_filename: 'Screenshot 2025-11-11 at 12.11.48.png',
                type: 'file',
                content_type: 'image/png',
                file_size: 254603,
            };

            assert.true(isImageFile(file));
        });

        test('it still detects an image when the service mislabels the MIME type', function (assert) {
            const file = { content_type: 'application/octet-stream', original_filename: 'photo.JPG' };

            assert.true(isImageFile(file), 'the extension rescues a mislabelled octet-stream');
        });

        test('it accepts an inline data: image URL', function (assert) {
            assert.true(isImageFile({ url: 'data:image/png;base64,iVBORw0KGgo=' }));
        });

        test('it accepts a data: image URL supplied as the path', function (assert) {
            assert.true(isImageFile({ path: 'data:image/gif;base64,R0lGODlh' }));
        });

        test('it rejects a non-image data URL', function (assert) {
            assert.false(isImageFile({ url: 'data:text/plain;base64,aGk=' }));
        });

        test('it accepts every extension in the allow list', function (assert) {
            for (const ext of ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'svg', 'heic', 'heif', 'avif', 'ico', 'cur']) {
                assert.true(isImageFile({ original_filename: `asset.${ext}` }), `.${ext} is recognised`);
            }
        });

        test('it rejects non-image extensions', function (assert) {
            for (const ext of ['pdf', 'docx', 'mp4', 'zip', 'txt']) {
                assert.false(isImageFile({ original_filename: `asset.${ext}` }), `.${ext} is not an image`);
            }
        });

        test('it sniffs raw bytes when MIME and extension are both unhelpful', function (assert) {
            assert.true(isImageFile({ original_filename: 'mystery', bytes: PNG_SIGNATURE }));
        });

        test('it sniffs a base64 payload', function (assert) {
            const base64 = btoa(String.fromCharCode(...PNG_SIGNATURE));

            assert.true(isImageFile({ original_filename: 'mystery', base64 }));
        });

        test('it returns false when the sniffed bytes are not an image', function (assert) {
            assert.false(isImageFile({ original_filename: 'mystery', bytes: signature(0x00, 0x01, 0x02) }));
        });

        test('it swallows a malformed base64 payload rather than throwing', function (assert) {
            assert.false(isImageFile({ original_filename: 'mystery', base64: 'not valid base64!!!' }));
        });

        test('it falls through to false when nothing identifies the file', function (assert) {
            assert.false(isImageFile({}));
            assert.false(isImageFile({ original_filename: 'README' }));
        });
    });

    module('getFileExtension', function () {
        test('it returns an empty string for nullish or non-string input', function (assert) {
            assert.strictEqual(getFileExtension(null), '');
            assert.strictEqual(getFileExtension(undefined), '');
            assert.strictEqual(getFileExtension(''), '');
            assert.strictEqual(getFileExtension(42), '');
            assert.strictEqual(getFileExtension({}), '');
        });

        test('it reports the sentinel extension for data image URLs', function (assert) {
            assert.strictEqual(getFileExtension('data:image/png;base64,AAAA'), 'dataurl');
        });

        test('it lowercases the extension', function (assert) {
            assert.strictEqual(getFileExtension('PHOTO.JPEG'), 'jpeg');
        });

        test('it strips a query string and a fragment', function (assert) {
            assert.strictEqual(getFileExtension('photo.png?size=large'), 'png');
            assert.strictEqual(getFileExtension('photo.png#preview'), 'png');
            assert.strictEqual(getFileExtension('photo.png?a=1#b'), 'png');
        });

        test('it reads the extension from a full URL path', function (assert) {
            assert.strictEqual(getFileExtension('https://cdn.example.com/a/b/photo.webp'), 'webp');
        });

        test('it reads the extension from a relative path', function (assert) {
            assert.strictEqual(getFileExtension('a/b/photo.gif'), 'gif');
        });

        test('it uses only the last dot', function (assert) {
            assert.strictEqual(getFileExtension('archive.tar.gz'), 'gz');
            assert.strictEqual(getFileExtension('Screenshot 2025-11-11 at 12.11.48.png'), 'png');
        });

        test('it returns an empty string when there is no usable extension', function (assert) {
            assert.strictEqual(getFileExtension('README'), '', 'no dot at all');
            assert.strictEqual(getFileExtension('.gitignore'), '', 'a leading dot is not an extension');
            assert.strictEqual(getFileExtension('trailing.'), '', 'a trailing dot is not an extension');
            assert.strictEqual(getFileExtension('a/b/'), '', 'a directory path has no filename');
        });
    });

    module('toUint8', function () {
        test('it passes a Uint8Array straight through', function (assert) {
            const input = bytes(1, 2, 3);

            assert.strictEqual(toUint8(input), input, 'the same instance is returned, not a copy');
        });

        test('it wraps an ArrayBuffer', function (assert) {
            const result = toUint8(new Uint8Array([4, 5, 6]).buffer);

            assert.true(result instanceof Uint8Array);
            assert.deepEqual([...result], [4, 5, 6]);
        });

        test('it decodes a plain base64 string', function (assert) {
            assert.deepEqual([...toUint8(null, btoa('hi'))], [104, 105]);
        });

        test('it strips a data: prefix before decoding', function (assert) {
            assert.deepEqual([...toUint8(null, `data:image/png;base64,${btoa('hi')}`)], [104, 105]);
        });

        test('it decodes an empty payload after a bare data: prefix', function (assert) {
            assert.deepEqual([...toUint8(null, 'data:image/png;base64')], [], 'a missing comma yields an empty buffer rather than throwing');
        });

        test('it returns null when given neither bytes nor base64', function (assert) {
            assert.strictEqual(toUint8(null, null), null);
            assert.strictEqual(toUint8(undefined, undefined), null);
            assert.strictEqual(toUint8({}, 42), null, 'a non-string base64 value is ignored');
        });

        test('it throws on an undecodable base64 string', function (assert) {
            assert.throws(() => toUint8(null, 'not valid base64!!!'));
        });
    });

    module('looksLikeImageBytes', function () {
        test('it rejects buffers shorter than the minimum header', function (assert) {
            assert.false(looksLikeImageBytes(bytes()));
            assert.false(looksLikeImageBytes(bytes(0xff, 0xd8, 0xff)), 'even a valid JPEG prefix needs 12 bytes to be considered');
            assert.false(looksLikeImageBytes(new Uint8Array(11)));
        });

        test('it recognises a JPEG signature', function (assert) {
            assert.true(looksLikeImageBytes(signature(0xff, 0xd8, 0xff)));
        });

        test('it recognises a PNG signature', function (assert) {
            assert.true(looksLikeImageBytes(PNG_SIGNATURE));
        });

        test('it recognises both GIF versions', function (assert) {
            assert.true(looksLikeImageBytes(signature(0x47, 0x49, 0x46, 0x38, 0x37, 0x61)), 'GIF87a');
            assert.true(looksLikeImageBytes(signature(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), 'GIF89a');
        });

        test('it rejects a GIF-like header with an unknown version byte', function (assert) {
            assert.false(looksLikeImageBytes(signature(0x47, 0x49, 0x46, 0x38, 0x35, 0x61)));
        });

        test('it recognises WEBP by its RIFF container', function (assert) {
            assert.true(looksLikeImageBytes(signature(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)));
        });

        test('it rejects a RIFF container that is not WEBP', function (assert) {
            assert.false(looksLikeImageBytes(signature(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20)), 'RIFF/AVI is not an image');
        });

        test('it recognises BMP', function (assert) {
            assert.true(looksLikeImageBytes(signature(0x42, 0x4d)));
        });

        test('it recognises both TIFF byte orders', function (assert) {
            assert.true(looksLikeImageBytes(signature(0x49, 0x49, 0x2a, 0x00)), 'little-endian');
            assert.true(looksLikeImageBytes(signature(0x4d, 0x4d, 0x00, 0x2a)), 'big-endian');
        });

        test('it recognises ISOBMFF image brands', function (assert) {
            const ftyp = [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70];

            for (const brand of ['heic', 'heix', 'mif1', 'hevc', 'avif', 'avis']) {
                const brandBytes = [...brand].map((character) => character.charCodeAt(0));
                assert.true(looksLikeImageBytes(signature(...ftyp, ...brandBytes)), `${brand} is an image brand`);
            }
        });

        test('it rejects an ISOBMFF file with a video brand', function (assert) {
            const ftyp = [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70];
            const brandBytes = [...'mp42'].map((character) => character.charCodeAt(0));

            assert.false(looksLikeImageBytes(signature(...ftyp, ...brandBytes)), 'mp42 is video, not an image');
        });

        test('it rejects unknown bytes', function (assert) {
            assert.false(looksLikeImageBytes(new Uint8Array(16)));
            assert.false(looksLikeImageBytes(signature(0x25, 0x50, 0x44, 0x46)), 'a PDF header is not an image');
        });
    });
    test('bytes that cannot be read fall through to a negative answer', function (assert) {
        assert.false(isImageFile({ bytes: 12345 }), 'a number is not convertible to a byte view');
        assert.false(isImageFile({ base64: '!!!not base64!!!' }), 'nor is an unparseable base64 string');
    });
});
