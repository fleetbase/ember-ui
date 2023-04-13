# Console Loading Indicator

This is a reusable Console Loading Indicator component built with Ember.js. It provides a customizable UI element that shows a loading spinner while content is being fetched.

## Usage

To use the Console Loading Indicator component, you can simply import it into your Ember component and include it in your template as follows:

```hbs

<div class="console-loading-indicator pr-2.5 flex items-center" ...attributes>
    <WhileLoading>
        <Spinner @iconClass="text-sky-500 fa-spin-800ms" />
    </WhileLoading>
</div>

```

You can customize the Console Loading Indicator component by passing in different props:


| Option | Description                                                       |
| ------ | ----------------------------------------------------------------- |
| `delay` | The number of milliseconds to delay the loading indicator before it appears. Defaults to 500ms. |


## Example

```hbs


<div class="flex items-center">
  <ConsoleLoadingIndicator @delay={{1000}} />
</div>


```

This will render a loading spinner with the class "console-loading-indicator pr-2.5 flex items-center". The spinner will be delayed by 1000ms before appearing.





