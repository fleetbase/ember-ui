# Multi-Select Filter Component

This is a reusable Multi-Select Filter component built with Ember.js. It provides a customizable UI element that allows users to select multiple options from a list.

## Usage

To use the Multi-Select Filter component, you can simply import it into your Ember component and include it in your template as follows:


```hbs

<MultiSelectFilter @options={{this.options}} @search={{fn this.search}} @searchField={{@filter.multiOptionSearchField}} @searchEnabled={{@filter.multiOptionSearchEnabled}} @searchPlaceholder={{@filter.multiOptionSearchPlaceholder}} @selected={{this.value}} @placeholder={{@placeholder}} @allowClear={{@allowClear}} @isLoading={{this.isLoading}} @onChange={{fn this.onChange}} />

```

You can customize the Multi-Select Filter component by passing in different props:

| Option              | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| `options`           | The list of options to select from.                                        |
| `search`            | The search function to filter the options list.                            |
| `searchField`       | The field to search for the options.                                       |
| `searchEnabled`     | Whether or not to enable search functionality.                             |
| `searchPlaceholder` | The placeholder text for the search field.                                 |
| `selected`          | The selected value(s).                                                     |
| `placeholder`       | The placeholder text to display when no value is selected.                 |
| `allowClear`        | Whether or not to allow clearing the selected value(s).                    |
| `isLoading`         | Whether or not to display a loading spinner.                                |
| `onChange`          | The function to call when a value is selected.                              |


Additionally, you can also provide a block to customize the option label displayed in the dropdown.

```hbs

<MultiSelectFilter @options={{this.options}} @selected={{this.value}} as |option|>
    {{or (get option @optionLabel) option}}
</MultiSelectFilter>

```

## Example

```hbs

<div class="filter-multi-option">
    <MultiSelect @selectClass="form-input-sm flex-1" @options={{this.options}} @search={{fn this.search}} @searchField={{@filter.multiOptionSearchField}} @searchEnabled={{@filter.multiOptionSearchEnabled}} @searchPlaceholder={{@filter.multiOptionSearchPlaceholder}} @selected={{this.value}} @placeholder={{@placeholder}} @onChange={{fn this.onChange}} @allowClear={{@allowClear}} as |option|>
        {{or (get option @optionLabel) option}}
    </MultiSelect>

    {{#if this.isLoading}}
        <div class="ember-model-select__loading">
            <ModelSelect::Spinner />
        </div>
    {{/if}}
</div>

```
