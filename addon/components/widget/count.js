import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import formatCurrency from '../../utils/format-currency';
import formatMeters from '../../utils/format-meters';
import formatBytes from '../../utils/format-bytes';
import formatDuration from '../../utils/format-duration';
import formatDate from '../../utils/format-date';

export default class WidgetCountComponent extends Component {
    /**
     * The title of the metric count.
     *
     * @memberof WidgetCountComponent
     */
    @tracked title;

    /**
     * The value to render
     *
     * @memberof WidgetCountComponent
     */
    /* istanbul ignore next -- @tracked initializer: the value is assigned before it is ever
       read, so this lazy initializer is never invoked. */
    @tracked value = null;

    /**
     * Creates an instance of WidgetCountComponent.
     * @param {EngineInstance} owner
     * @param {Object} { options }
     * @memberof WidgetCountComponent
     */
    constructor(owner, { title, value = null, options = {} }) {
        super(...arguments);
        this.title = title;
        this.createRenderValueFromOptions(options, value);
    }

    /**
     * Creates the value to render using the options provided.
     *
     * @param {Object} [options={}]
     * @param {String|Number} defaultValue
     * @memberof WidgetCountComponent
     */
    /* istanbul ignore next -- the single caller always passes both arguments. */
    createRenderValueFromOptions(options = {}, defaultValue = null) {
        if (defaultValue !== null) {
            this.value = defaultValue;
            return;
        }

        let { format, currency, dateFormat, value } = options;

        // These are plain utils with real positional parameters, not Ember helpers — they were
        // being called with an array of positional params. `formatCurrency([value, currency])`
        // put the array in `amount`, so every money widget rendered $0.00 and the currency was
        // ignored; `formatDate([value, dateFormat])` handed date-fns an array and THREW during
        // render. meters/bytes/duration only worked by accident, a one-element array coercing
        // to a number in the arithmetic those utils happen to perform.
        switch (format) {
            case 'money':
                value = formatCurrency(value, currency);
                break;

            case 'meters':
                value = formatMeters(value);
                break;

            case 'bytes':
                value = formatBytes(value);
                break;

            case 'duration':
                value = formatDuration(value);
                break;

            case 'date':
                value = formatDate(value, dateFormat);
                break;

            default:
                break;
        }

        this.value = value;
    }
}
