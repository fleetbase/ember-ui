# Table Cell Resource Identity

`Table::Cell::ResourceIdentity` renders a compact table identity cell for records that need an image, primary label, identifier, status signal, and a short metadata line.

## Usage

```hbs
<Table::Cell::ResourceIdentity
    @row={{this.vehicle}}
    @value={{this.vehicle.display_name}}
    @column={{hash
        labelPath="display_name"
        mediaPath="photo_url"
        fallbackImage="/images/vehicle.svg"
        identifierPath="public_id"
        statusPath="status"
        onlinePath="online"
        statusBadgeSize="xxs"
        imageRounded=true
        metaPaths=(array "plate_number" "driver_name")
    }}
/>
```

## Column Options

| Property | Description |
| --- | --- |
| `labelPath` | Path on `row` for the primary label. Falls back to `valuePath` or `@value`. |
| `labelValue` | Static value or callback for the primary label. |
| `labelFormatter` | Callback for the primary label. |
| `mediaPath` / `photoPath` | Path on `row` for the image URL. |
| `fallbackImage` / `fallbackSrc` | Fallback image passed to the shared `Image` component. |
| `imageSizeClass` | Tailwind size classes for the image and image frame. Defaults to `h-7 w-7`. |
| `imageRounded` | When true, renders the image as `rounded-full`. |
| `imageRoundedClass` | Custom rounded class. Defaults to `rounded-md`. |
| `identifierPath` | Path on `row` for the first secondary metadata value. |
| `statusPath` | Path on `row` for the displayed status. |
| `onlinePath` | Optional boolean path used to color the status dot. |
| `metaPaths` | Array of paths, callbacks, or `{ path, formatter, class, style, icon }` objects for secondary metadata. Use `style: "badge"` for a slim icon-prefixed pill. |
| `statusToneMap` | Map of status values to text color classes for the status dot. |
| `showStatusDot` | Show or hide the status dot. Defaults to `true`. |
| `showStatusBadge` | Render the status as a `Badge` instead of inline text. |
| `statusBadgeSize` | Size passed to `Badge` when `showStatusBadge` is true. Defaults to `xxs`. |

The component forwards clicks to `@onClick`, `@column.onClick`, and `@column.action`, matching the other table cell components.
`column.label` remains the table header label and is not used as row identity text.
