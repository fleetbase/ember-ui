# Next Content Panel Component

The `next-content-panel` component is a UI element that can be used to display content that can be toggled open or closed. It is built with Ember.js and utilizes the FontAwesome library for icons.

## Usage

```hbs

{{next-content-panel
  title="Example Panel"
  isOpen=true
  isLoading=false
  actionButtons=(array
    (hash
      type="primary"
      text="Action Button 1"
      icon="plus-circle"
      iconPrefix="fas"
      onClick=(action "actionButton1Clicked")
    )
    (hash
      type="secondary"
      text="Action Button 2"
      icon="edit"
      iconPrefix="fas"
      onClick=(action "actionButton2Clicked")
    )
  )
}}
  {{!-- Content to display in panel body goes here --}}
{{/next-content-panel}}


```

The `next-content-panel` component has several configurable options that can be passed as parameters. These include:

| Prop name                       | Description                                                                                                                                                                                                                     |
|--------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `wrapperClass` (optional)      | A CSS class to apply to the outermost wrapper element.                                                                                                                                                                         |
| `containerClass` (optional)    | A CSS class to apply to the container element inside the outermost wrapper element.                                                                                                                                            |
| `panelClass` (optional)        | A CSS class to apply to the panel element inside the container element.                                                                                                                                                         |
| `panelHeaderClass` (optional)  | A CSS class to apply to the header element inside the panel element.                                                                                                                                                            |
| `panelHeaderLeftClass` (optional) | A CSS class to apply to the left-hand side of the header element.                                                                                                                                                               |
| `titleContainerClass` (optional) | A CSS class to apply to the container element for the title and prefix title elements.                                                                                                                                          |
| `prefixTitleClass` (optional)  | A CSS class to apply to the prefix title element.                                                                                                                                                                               |
| `panelTitleClass` (optional)   | A CSS class to apply to the title element.                                                                                                                                                                                       |
| `titleStatusContainerClass` (optional) | A CSS class to apply to the container element for the title status element.                                                                                                                                                  |
| `titleStatusClass` (optional)  | A CSS class to apply to the title status element.                                                                                                                                                                                |
| `prefixTitleRightContainerClass` (optional) | A CSS class to apply to the container element for the right-hand prefix title element.                                                                                                                                       |
| `prefixTitleRightClass` (optional) | A CSS class to apply to the right-hand prefix title element.                                                                                                                                                                     |
| `titleStatusRightContainerClass` (optional) | A CSS class to apply to the container element for the right-hand title status element.                                                                                                                                       |
| `titleStatusRightClass` (optional) | A CSS class to apply to the right-hand title status element.                                                                                                                                                                     |
| `panelHeaderRightClass` (optional) | A CSS class to apply to the right-hand side of the header element.                                                                                                                                                               |
| `actionButtons` (optional)     | An array of objects representing action buttons to display in the header. Each object must have a `type` (string), `text` (string), and `onClick` (function) property. Other optional properties include `icon`



## Example

```hbs

{{!-- Example usage of the Next Content Panel component --}}
{{#next-content-panel
    @title="Example Panel"
    @panelClass="bg-white shadow-lg"
    @panelHeaderClass="bg-gray-100"
    @panelBodyClass="p-4"
}}
    {{!-- Content goes here --}}
    <p>This is an example of the Next Content Panel component.</p>
    <p>You can put any content you want inside the body of the panel.</p>
{{/next-content-panel}}


```

This code will generate a panel with a gray header, a white background, and a shadow. The title of the panel is "Example Panel", and the body contains two paragraphs of text. You can customize the appearance of the panel using the various classes and properties available in the component.







