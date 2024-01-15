// app/components/otp-input.js
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { isBlank } from '@ember/utils';

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
    constructor(owner, { numberOfDigits }) {
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
        switch (event.key) {
            case 'ArrowLeft':
                if (index > 0) {
                    this.handleFocus(index - 1);
                }
                break;
            case 'ArrowRight':
                if (index < this.numberOfDigits - 1) {
                    this.handleFocus(index + 1);
                }
                break;
            case 'Backspace':
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
}
