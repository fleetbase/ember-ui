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

| Parameter | Description |
| --- | --- |
| `title` | The title of the panel |
| `isOpen` | Whether the panel is open or closed |
| `isLoading` | Whether the panel is currently loading content |
| `pad` | Whether to add padding to the panel body |
| `actionButtons` | An array of objects representing action buttons to display on the right side of the panel header |
| `prefixTitle` | A prefix to display before the title |
| `prefixTitleRight` | A prefix to display after the title on the right side |
| `titleStatus` | A status to display next to the title |
| `titleStatusRight` | A status to display after the title on the right side |


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







