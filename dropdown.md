# Next User Button Component

This is a reusable Next User Button component built with Ember.js. It provides a customizable UI element that allows users to trigger a dropdown menu with a single click.


## Usage

To use the Next User Button component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<NextUserButton
  @wrapperClass="my-wrapper-class"
  @triggerClass="my-trigger-class"
  @contentClass="my-content-class"
  @dropdownMenuClass="my-dropdown-menu-class"
  @verticalPosition="bottom"
  @horizontalPosition="right"
  @initiallyOpened={{false}}
  @renderInPlace={{false}}
  @onOpen={{this.onOpen}}
  @onClose={{this.onClose}}
  @items={{this.items}}
>
  {{#let this.user as |user|}}
    {{user.fullName}}
  {{/let}}
</NextUserButton>

```

You can customize the Next User Button component by passing in different props:


- `wrapperClass`: The CSS class to apply to the button's wrapper div.
- `triggerClass`: The CSS class to apply to the button's trigger element.
- `contentClass`: The CSS class to apply to the dropdown menu's content element.
- `dropdownMenuClass`: The CSS class to apply to the dropdown menu wrapper element.
- `verticalPosition`: The vertical position of the dropdown menu. Can be "top", "center", or "bottom".
- `horizontalPosition`: The horizontal position of the dropdown menu. Can be "left", "center", or "right".
- `initiallyOpened`: Whether or not the dropdown menu should be initially opened.
- `renderInPlace`: Whether or not the dropdown menu should be rendered in place or appended to the body.
- `onOpen`: A function to be called when the dropdown menu is opened.
- `onClose`: A function to be called when the dropdown menu is closed.
- `items`: An array of items to be displayed in the dropdown menu. Each item should be an object with a label property and an optional action property.

## Example

```hbs

<div class="next-user-button my-wrapper-class" ...attributes>
    <BasicDropdown 
      @defaultClass={{@wrapperClass}} 
      @onOpen={{@onOpen}} 
      @onClose={{@onClose}} 
      @verticalPosition={{@verticalPosition}} 
      @horizontalPosition={{@horizontalPosition}} 
      @renderInPlace={{or @renderInPlace true}} 
      @initiallyOpened={{@initiallyOpened}} 
      as |dd|
    >
        <dd.Trigger class={{@triggerClass}}>
            {{yield dd}}
        </dd.Trigger>
        <dd.Content class={{@contentClass}}>
            <div class="next-dd-menu {{@dropdownMenuClass}} {{if dd.isOpen 'is-open'}}">
                {{#each @items as |item|}}
                    <Layout::Header::Dropdown::Item @item={{item}} @onAction={{fn this.onAction dd}} />
                {{/each}}
            </div>
        </dd.Content>
    </BasicDropdown>
</div>


```

This will render a Next User Button component with the default configuration. When the user clicks on the button, a dropdown menu will be displayed, showing the items passed in as a prop. The dropdown menu can be customized by passing in different props.


