# Next View Section Subheader Component

This is a reusable Next View Section Subheader component that allows you to display a header with a title, subtitle, icon and an optional search bar. You can also provide actions to be displayed on the right side of the header.

## Usage

To use the Next View Section Subheader component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<div class="next-view-section-subheader {{if @hideActions 'actions-hidden'}}" ...attributes>
    <div class="next-view-section-subheader-left {{@leftSubheaderClass}}">
        <div class="flex flex-row items-center">
            {{#if @icon}}
                <FaIcon @icon={{@icon}} @size={{@iconSize}} @prefix={{@iconPrefix}} class="{{@iconClass}} mr-2" />
            {{/if}}
            <h2 class="next-view-section-subheader-title">{{@title}}</h2>
            {{#if @subtitle}}
                <div>
                    {{@subtitle}}
                </div>
            {{/if}}
        </div>
        {{#if @onSearch}}
            <Input @type="text" @value={{@searchQuery}} placeholder={{or @searchPlaceholder (concat "Search " (pluralize @title))}} class="w-64 ml-3 form-input form-input-sm {{@searchInputClass}}" {{on "keyup" @onSearch}} />
        {{/if}}
    </div>
    {{#unless @hideActions}}
        <div class="next-view-section-subheader-actions {{@actionsWrapperClass}}">
            {{yield}}
        </div>
    {{/unless}}
</div>

```

You can customize the Next View Section Subheader component by passing in different props:

- `title`: The title to be displayed in the header.
- `subtitle`: The subtitle to be displayed in the header.
- `icon`: The icon to be displayed in the header.
- `iconSize`: The size of the icon to be displayed in the header.
- `iconPrefix`: The prefix for the icon (e.g. fas, far, fab).
- `iconClass`: The CSS class to be applied to the icon.
- `searchQuery`: The search query value to be displayed in the search bar.
- `searchPlaceholder`: The placeholder text to be displayed in the search bar.
- `searchInputClass`: The CSS class to be applied to the search input.
- `onSearch`: The action to be called when the search input value is changed.
- `hideActions`: A boolean indicating whether or not to hide the actions section of the header.
- `actionsWrapperClass`: The CSS class to be applied to the actions section of the header.
- `leftSubheaderClass`: The CSS class to be applied to the left section of the header.

## Example

```hbs

<div class="next-view-section-subheader {{if @hideActions 'actions-hidden'}}" ...attributes>
    <div class="next-view-section-subheader-left {{@leftSubheaderClass}}">
        <div class="flex flex-row items-center">
            {{#if @icon}}
                <FaIcon @icon={{@icon}} @size={{@iconSize}} @prefix={{@iconPrefix}} class="{{@iconClass}} mr-2" />
            {{/if}}
            <h2 class="next-view-section-subheader-title">{{@title}}</h2>
            {{#if @subtitle}}
                <div>
                    {{@subtitle}}
                </div>
            {{/if}}
        </div>
        {{#if @onSearch}}
            <Input @type="text" @value={{@searchQuery}}


```


