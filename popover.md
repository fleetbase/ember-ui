# Floating Component

This is a reusable Floating component built with Ember.js. It provides a customizable UI element that allows users to create floating elements that follow a specific target element, with customizable positioning, container, and animation options.

## Usage

To use the Floating component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<Floating @target={{this.targetElement}} @placement="bottom-start">
    {{!-- your floating content here --}}
</Floating>

```

You can customize the Floating component by passing in different props:

- `target`: The target element that the floating element will follow.
- `placement`: The placement of the floating element relative to the target element.
- `container`: The container element that the floating element will be appended to. Default is the body element.
- `arrow`: Whether or not to display an arrow pointing to the target element. Default is true.
- `offset`: The offset distance between the floating element and the target element. Default is 0.
- `shiftOptions`: An object containing options for shifting the floating element's position if it overflows the container. Default is { enabled: true, force: false, initialShift: false, firstShift: true, secondShift: true }.
- `animation`: The type of animation to use when showing and hiding the floating element. Default is "slide".

## Example

```hbs

<div class="relative">
  <button {{on "click" this.toggleFloating}}>Click to toggle floating element</button>
  {{#if this.showFloating}}
    <Floating @target={{this.targetElement}} @placement="bottom-start" @arrow={{false}} @offset={{10}}>
      <div class="p-4 bg-white border rounded shadow">This is a floating element.</div>
    </Floating>
  {{/if}}
</div>

```

This will render a button with the text "Click to toggle floating element". When the user clicks on the button, a floating element will appear below the button, with a distance of 10 pixels between the button and the floating element. The floating element will have a white background, a border, a rounded shape, and a shadow. The floating element will disappear when the user clicks outside of it.