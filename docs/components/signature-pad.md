# Signature Pad Component

A canvas based signature capture component built on [signature_pad](https://github.com/szimek/signature_pad). The signer draws with a mouse, stylus or finger, and the drawing is emitted as an image data URL.

The canvas is resized with its container and scaled to the device pixel ratio, so signatures stay crisp on retina displays and survive layout changes without losing ink.

## Usage

```hbs
<SignaturePad
    @value={{this.signature}}
    @height={{220}}
    @onChange={{this.handleSignatureChange}}
/>
```

Supply your own toolbar by using the block form — the component yields the same imperative API it passes to `@onReady`:

```hbs
<SignaturePad @showActions={{false}} @onChange={{this.handleSignatureChange}} as |pad|>
    <Button @text="Reset" @onClick={{pad.clear}} />
</SignaturePad>
```

Render a previously captured signature without allowing edits:

```hbs
<SignaturePad @readonly={{true}} @value={{this.order.signature_url}} @alt="Recipient signature" />
```

## Parameters

| Parameter | Default | Description |
| --- | --- | --- |
| `value` | `null` | Image data URL to render into the pad. Re-applied whenever it changes. |
| `height` | `200` | Canvas height in CSS pixels, or any CSS length. Width is fluid. |
| `format` | `'image/png'` | Export mime type. `image/jpeg` and `image/svg+xml` are also supported. |
| `encoderOptions` | — | Quality between 0 and 1 for lossy formats. |
| `penColor` | `'#111827'` | Stroke colour. |
| `backgroundColor` | `'rgba(0,0,0,0)'` | Canvas fill. Transparent by default; set an opaque colour when exporting JPEG. |
| `minWidth` / `maxWidth` / `dotSize` / `minDistance` / `velocityFilterWeight` / `throttle` / `compositeOperation` | signature_pad defaults | Passed straight through to the `SignaturePad` constructor. |
| `disabled` | `false` | Renders the pad but ignores all pointer input. |
| `readonly` | `false` | Renders `value` as a static image instead of a canvas. |
| `autoResize` | `true` | Observe the canvas and refit it when its size changes. |
| `showActions` | `true` | Show the Clear and Undo toolbar. |
| `clearLabel` / `undoLabel` / `placeholder` / `emptyText` / `alt` | `'Clear'` / `'Undo'` / `'Sign here'` / `'No signature'` / `'Signature'` | User facing copy. Plain strings so the addon carries no translation keys — pass `(t "…")` from a host app that uses ember-intl. |
| `wrapperClass` / `canvasClass` / `toolbarClass` | — | Extra classes for the wrapper, canvas and toolbar. |

## Callbacks

| Callback | Arguments | Description |
| --- | --- | --- |
| `onChange` | `(dataUrl, api)` | Fired after every stroke, and on clear and undo. `dataUrl` is `null` when the pad is empty. |
| `onBegin` | `(detail, api)` | The signature_pad `beginStroke` detail. |
| `onEnd` | `(dataUrl, api, detail)` | The signature_pad `endStroke`. Only fires for real strokes, not for clear or undo. |
| `onClear` | `(api)` | Fired after the pad is cleared. |
| `onReady` | `(api)` | Fired once the pad is mounted, sized and hydrated. |

## Imperative API

`onReady` receives — and the block form yields — an object with a stable identity for the lifetime of the component:

| Member | Returns | Description |
| --- | --- | --- |
| `clear()` | — | Clears the pad and emits a change. |
| `undo()` | `Promise` | Removes the last stroke. Falls back to `clear()` when the only ink is a hydrated image. |
| `resize()` | `Promise` | Refits the canvas to its container. |
| `isEmpty()` | `boolean` | Whether the pad has any ink on it. |
| `toData()` | `Array` | The raw signature_pad point groups. |
| `toDataURL(format, encoderOptions)` | `string \| null` | Exports the signature, or `null` when empty. |
| `fromDataURL(dataUrl)` | `Promise` | Loads an image into the pad. |
| `instance()` | `SignaturePad` | The underlying library instance. |

## As a custom field

`signature-pad` is registered in `addon/utils/get-custom-field-type-map.js`, so it appears as **Signature Pad** in the custom field type dropdown with no extra work.

When a signature is drawn on a custom field, the pad debounces briefly after the last stroke, converts the canvas to a PNG, uploads it through the Files API, and stores the same `file:<uuid>` sentinel the `file-upload` field type uses. No server side changes are required — `Fleetbase\Casts\CustomValue` already expands that sentinel into file JSON on read.
