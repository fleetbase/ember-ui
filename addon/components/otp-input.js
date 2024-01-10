import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

/**
 * Glimmer component for OTP (One-Time Password) input.
 *
 * @extends Component
 */
export default class OtpInputComponent extends Component {
    /**
     * An array to store individual digit values of the OTP.
     *
     * @type {string[]}
     */
    @tracked digits = Array(6).fill('');

    /**
     * Flag indicating whether there is an error in the OTP input.
     *
     * @type {boolean}
     */
    @tracked isError = false;

    /**
     * ID for the OTP input element.
     *
     * @type {string}
     */
    inputId = 'otp-input';

    /**
     * Handles the input event for a specific digit of the OTP.
     *
     * @param {number} index - The index of the digit being input.
     * @param {Event} event - The input event.
     */
    handleInput(index, event) {
        let value = event.target.value;
        if (!/^\d*$/.test(value) || value.length > 1) {
            event.preventDefault();
            return;
        }

        this.digits[index] = value;
        this.isError = false;

        if (value && index < this.digits.length - 1) {
            this.moveFocus(index + 1);
        }
    }

    /**
     * Handles the focus event for a specific digit of the OTP.
     *
     * @param {number} index - The index of the digit gaining focus.
     */
    handleFocus(index) {
        this.isError = false;
        this.moveFocus(index);
    }

    /**
     * Handles the key down event for a specific digit of the OTP.
     *
     * @param {number} index - The index of the digit for the key event.
     * @param {KeyboardEvent} event - The key down event.
     */
    handleKeyDown(index, event) {
        if (event.key === 'Backspace' && index > 0 && !this.digits[index]) {
            this.moveFocus(index - 1);
        }
    }

    /**
     * Moves focus to the input element of the specified digit.
     *
     * @param {number} index - The index of the digit whose input element should receive focus.
     */
    moveFocus(index) {
        const inputSelector = `.otp-box:nth-child(${index + 1})`;
        const inputElement = this.element.querySelector(inputSelector);
        if (inputElement) {
            inputElement.focus();
        }
    }

    /**
     * Sets the OTP digits based on the provided OTP string.
     *
     * @param {string} otp - The OTP string to set.
     */
    setOtp(otp) {
        if (otp.length === this.digits.length) {
            this.digits = otp.split('');
        } else {
            this.isError = true;
        }
    }
}
