# Filter Date Component

This is a reusable Filter Date component built with Ember.js. It provides a customizable UI element that allows users to select a date range using a date picker.

## Usage

To use the Filter Date component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<FilterDate @value={{this.selectedDate}} @onChange={{this.filterByDate}} @placeholder="Select date range" />

```

You can customize the Filter Date component by passing in different props:

| Option         | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `value`        | The selected date range.                                                    |
| `onChange`     | The action to be called when the user selects a date range.                 |
| `placeholder`  | The text to be displayed as a placeholder in the date picker.               |


## Example

```hbs

<div class="filter-date">
  <DatePicker @value={{this.selectedDate}} @onSelect={{this.filterByDate}} @placeholder="Select date range" @range={{true}} @toggleSelected={{false}} @autoClose={{false}} class="filter-date-input form-input-sm w-full flex-1" />
</div>

```

This will render a date picker element with the placeholder text "Select date range". When the user selects a date range, the filterByDate action will be called with the selected date range as an argument. The selectedDate property should be updated to reflect the selected date range. The range, toggleSelected, and autoClose props are set to true, false, and false respectively, but you can customize them as needed.
