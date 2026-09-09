import arg from '@fleetbase/ember-ui/utils/decorators/arg';
import { module, test } from 'qunit';

class Widget {
    constructor(args = {}) {
        this.args = args;
    }

    @arg open = true;
    @arg title = 'Default title';
    @arg count = 0;
    @arg missing;
    @arg computed = Math.max(2, 3);
}

class SubWidget extends Widget {
    @arg title = 'Subclass title';
}

module('Unit | Utility | decorators/arg', function () {
    test('it falls back to the field initializer when the arg is absent', function (assert) {
        const widget = new Widget({});

        assert.true(widget.open);
        assert.strictEqual(widget.title, 'Default title');
        assert.strictEqual(widget.count, 0);
        assert.strictEqual(widget.computed, 3, 'the initializer expression is evaluated, not just a literal');
    });

    test('it returns undefined when there is no arg and no initializer', function (assert) {
        assert.strictEqual(new Widget({}).missing, undefined);
    });

    test('a provided arg overrides the initializer', function (assert) {
        const widget = new Widget({ open: false, title: 'Given', count: 42 });

        assert.false(widget.open, 'an explicit false arg wins over a true default');
        assert.strictEqual(widget.title, 'Given');
        assert.strictEqual(widget.count, 42);
    });

    test('only undefined triggers the default — every other falsy arg is honored', function (assert) {
        assert.strictEqual(new Widget({ title: null }).title, null, 'null is a real value');
        assert.strictEqual(new Widget({ title: '' }).title, '', 'an empty string is a real value');
        assert.strictEqual(new Widget({ title: 0 }).title, 0);
        assert.true(Number.isNaN(new Widget({ open: NaN }).open), 'NaN is honored rather than replaced by the default');
        assert.strictEqual(new Widget({ title: undefined }).title, 'Default title', 'an explicitly undefined arg falls back');
    });

    test('the decorated property is a live getter, not a snapshot', function (assert) {
        const args = { title: 'First' };
        const widget = new Widget(args);

        assert.strictEqual(widget.title, 'First');

        args.title = 'Second';
        assert.strictEqual(widget.title, 'Second', 'later arg changes are visible');

        delete args.title;
        assert.strictEqual(widget.title, 'Default title', 'removing the arg restores the default');
    });

    test('repeated access is stable and side-effect free', function (assert) {
        const widget = new Widget({ count: 7 });

        assert.strictEqual(widget.count, 7);
        assert.strictEqual(widget.count, 7);
        assert.false(Object.prototype.hasOwnProperty.call(widget, 'count'), 'reading never installs an own property that would shadow the getter');
    });

    test('the decorated property is read-only', function (assert) {
        const widget = new Widget({});

        assert.throws(
            () => {
                widget.title = 'nope';
            },
            TypeError,
            'the descriptor exposes a getter with no setter'
        );
    });

    test('instances do not share state', function (assert) {
        const a = new Widget({ title: 'A' });
        const b = new Widget({ title: 'B' });
        const c = new Widget({});

        assert.strictEqual(a.title, 'A');
        assert.strictEqual(b.title, 'B');
        assert.strictEqual(c.title, 'Default title');
    });

    test('a subclass may override the default while inheriting the rest', function (assert) {
        const sub = new SubWidget({});

        assert.strictEqual(sub.title, 'Subclass title', 'the subclass initializer wins');
        assert.true(sub.open, 'inherited decorated args still work');
        assert.strictEqual(new SubWidget({ title: 'Passed' }).title, 'Passed', 'args still override the subclass default');
    });

    test('it throws when the instance has no args object', function (assert) {
        const orphan = Object.create(Widget.prototype);

        assert.throws(() => orphan.title, TypeError, 'the getter reads this.args unconditionally');
    });

    test('it reads the arg under the same key as the decorated property', function (assert) {
        const widget = new Widget({ Title: 'wrong case', title: 'right case' });

        assert.strictEqual(widget.title, 'right case', 'lookup is case-sensitive and exact');
    });
});
