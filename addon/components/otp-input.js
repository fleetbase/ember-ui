// app/components/otp-input.js
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { isBlank } from '@ember/utils';
import { notifyPropertyChange } from '@ember/object';

/**
 * Glimmer component for handling OTP (One-Time Password) input.
 *
 * @class OtpInputComponent
 * @extends Component
 */
export default class OtpInputComponent extends Component {
    numberOfDigits = 6;

    /**
     * Array to track individual digit values of the OTP.
     *
     * @property {Array} otpValues
     * @default ['', '', '', '', '', '']
     * @tracked
     */
    @tracked otpValues;

    /**
     * Tracked property for handling the OTP value passed from the parent.
     *
     * @property {String} value
     * @tracked
     */
    @tracked value;

    /**
     * Constructor for the OTP input component.
     *
     * @constructor
     */
    constructor() {
        super(...arguments);
        this.otpValues = Array.from({ length: this.numberOfDigits }, () => '');
        this.handleInput = this.handleInput.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Getter for the complete OTP value obtained by joining individual digits.
     *
     * @property {String} otpValue
     */
    get otpValue() {
        return this.otpValues.join('');
    }

    /**
     * Setter for updating the OTP value based on user input.
     *
     * @property {String} otpValue
     */
    set otpValue(newValue) {
        if (typeof newValue === 'string') {
            this.otpValues = newValue.split('').slice(0, this.numberOfDigits);
        }
    }

    /**
     * Handles focus on the input field at a specified index.
     *
     * @method handleFocus
     * @param {Number} index - The index of the input field to focus on.
     */
    handleFocus(index) {
        const inputId = `otp-input-${index}`;
        const inputElement = document.getElementById(inputId);

        if (inputElement) {
            inputElement.focus();
        }
    }

    /**
     * Handles input events on the input field at a specified index.
     *
     * @method handleInput
     * @param {Number} index - The index of the input field being edited.
     * @param {Event} event - The input event object.
     */
    handleInput(index, event) {
        if (!event || !event.target) {
            console.error('Invalid event object in handleInput');
            return;
        }

        const inputValue = event.target.value;

        this.otpValues[index] = inputValue;

        if (inputValue === '' && index > 0) {
            this.handleFocus(index - 1);
        } else if (index < this.numberOfDigits - 1) {
            this.handleFocus(index + 1);
        }

        // on every input
        if (typeof this.args.onInput === 'function') {
            this.args.onInput(inputValue);
        }

        if (this.otpValues.every((value) => !isBlank(value))) {
            const completeOtpValue = this.otpValues.join('');

            if (typeof this.args.onInputCompleted === 'function') {
                this.args.onInputCompleted(completeOtpValue);
            }
        }
    }

    /**
     * Handles keydown events on the input field at a specified index.
     *
     * @method handleKeyDown
     * @param {Number} index - The index of the input field.
     * @param {Event} event - The keydown event object.
     */
    handleKeyDown(index, event) {
        switch (event.keyCode) {
            case 37:
                if (index > 0) {
                    this.handleFocus(index - 1);
                }
                break;
            case 39:
                if (index < this.numberOfDigits - 1) {
                    this.handleFocus(index + 1);
                }
                break;
            case 8:
                if (this.otpValues[index] !== '') {
                    this.otpValues[index] = '';
                } else if (index > 0) {
                    this.handleFocus(index - 1);
                }
                break;
            default:
                break;
        }
    }

    handlePaste = (index, event) => {
        event.preventDefault();
        const pastedData = event.clipboardData.getData('text/plain');

        if (/^\d{6}$/.test(pastedData)) {
            const pastedValues = pastedData.split('');

            for (let i = 0; i < this.numberOfDigits; i++) {
                this.otpValues[index + i] = pastedValues[i] || '';
            }
            const completeOtpValue = this.otpValues.join('');

            if (typeof this.args.onInputCompleted === 'function') {
                this.args.onInputCompleted(completeOtpValue);
            }
        }
        notifyPropertyChange(this, 'otpValues');
    };

    handleDidInsert(index, element) {
        if (index === 0) {
            element.focus();
        }
    }
}
