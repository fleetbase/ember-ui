import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const FILE_UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTHER_FILE_UUID = '9c858901-8a57-4791-81fe-4c455b099bc9';

module('Integration | Helper | get-file-url', function (hooks) {
    setupRenderingTest(hooks);

    test('a plain url is returned verbatim without touching the store', async function (assert) {
        const store = this.owner.lookup('service:store');
        this.set('url', 'https://cdn.example.com/uploads/invoice.pdf');

        await render(hbs`{{get-file-url this.url}}`);

        assert.dom(this.element).hasText('https://cdn.example.com/uploads/invoice.pdf');
        assert.strictEqual(store.calls.length, 0, 'non-uuid input never hits the store');
    });

    test('a relative path is returned verbatim', async function (assert) {
        this.set('url', '/assets/images/logo.png');

        await render(hbs`{{get-file-url this.url}}`);

        assert.dom(this.element).hasText('/assets/images/logo.png');
    });

    test('a uuid-like string that is not a valid uuid is treated as a url', async function (assert) {
        this.set('url', 'not-a-uuid-at-all');

        await render(hbs`{{get-file-url this.url}}`);

        assert.dom(this.element).hasText('not-a-uuid-at-all');
    });

    test('non-string input is coerced to a string', async function (assert) {
        this.set('url', 12345);

        await render(hbs`{{get-file-url this.url}}`);

        assert.dom(this.element).hasText('12345');
    });

    test('empty and missing input render nothing', async function (assert) {
        this.set('blank', '');
        this.set('nothing', undefined);
        this.set('nullish', null);

        await render(hbs`<span id="blank">{{get-file-url this.blank}}</span><span id="undef">{{get-file-url this.nothing}}</span><span id="null">{{get-file-url this.nullish}}</span>`);

        assert.dom('#blank').hasNoText();
        assert.dom('#undef').hasNoText();
        assert.dom('#null').hasNoText();
    });

    test('a uuid resolves to the url of an already loaded file record', async function (assert) {
        const store = this.owner.lookup('service:store');
        store.createRecord('file', { id: FILE_UUID, url: 'https://cdn.example.com/files/peeked.png' });
        this.set('id', FILE_UUID);

        await render(hbs`{{get-file-url this.id}}`);

        assert.dom(this.element).hasText('https://cdn.example.com/files/peeked.png');
    });

    test('a uuid that is not in the store is fetched and rendered once it loads', async function (assert) {
        const requested = [];
        this.owner.register(
            'service:store',
            class extends Service {
                peekRecord() {
                    return null;
                }

                findRecord(modelName, id) {
                    requested.push([modelName, id]);
                    return Promise.resolve({ id, url: 'https://cdn.example.com/files/fetched.png' });
                }
            }
        );
        this.set('id', FILE_UUID);

        await render(hbs`{{get-file-url this.id}}`);

        assert.deepEqual(requested, [['file', FILE_UUID]], 'the file is fetched from the store by id');
        assert.dom(this.element).hasText('https://cdn.example.com/files/fetched.png');
    });

    test('a failed lookup renders nothing instead of throwing', async function (assert) {
        this.owner.register(
            'service:store',
            class extends Service {
                peekRecord() {
                    return null;
                }

                findRecord() {
                    return Promise.reject(new Error('404'));
                }
            }
        );
        this.set('id', FILE_UUID);

        await render(hbs`{{get-file-url this.id}}`);

        assert.dom(this.element).hasNoText();
    });

    test('a file record without a url renders nothing', async function (assert) {
        const store = this.owner.lookup('service:store');
        store.createRecord('file', { id: FILE_UUID });
        this.set('id', FILE_UUID);

        await render(hbs`{{get-file-url this.id}}`);

        assert.dom(this.element).hasNoText();
    });

    test('changing the input resolves the new file', async function (assert) {
        const store = this.owner.lookup('service:store');
        store.createRecord('file', { id: FILE_UUID, url: 'https://cdn.example.com/files/first.png' });
        store.createRecord('file', { id: OTHER_FILE_UUID, url: 'https://cdn.example.com/files/second.png' });
        this.set('id', FILE_UUID);

        await render(hbs`{{get-file-url this.id}}`);
        assert.dom(this.element).hasText('https://cdn.example.com/files/first.png');

        this.set('id', OTHER_FILE_UUID);
        await settled();

        assert.dom(this.element).hasText('https://cdn.example.com/files/second.png');
    });
});
