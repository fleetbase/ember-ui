/**
 * Leaflet tile sources for map components.
 *
 * The keyless OpenStreetMap tile server, the same default Fleet-Ops uses. CARTO's
 * `basemaps.cartocdn.com` raster tiles now require an API key and show an "API key
 * required" watermark without one, and Stadia Maps needs a key outside localhost.
 * OpenStreetMap has no dark style, so the dark themes use the same tiles.
 * OpenStreetMap's tile usage policy requires the attribution to be shown.
 */
export const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const DEFAULT_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Resolve a theme keyword or tile URL to the theme name and tile URL to use.
 *
 * Any `https://` XYZ URL (a keyed provider, say) is used as given. Every keyword, and
 * anything unrecognised, uses the keyless OpenStreetMap tiles.
 *
 * @param {String|null} source 'light', 'dark', 'dark_all' or an https:// tile URL
 * @return {{ theme: String, url: String }}
 */
export default function leafletTileSource(source = null) {
    if (source === 'dark' || source === 'dark_all') {
        return { theme: source, url: DEFAULT_TILE_URL };
    }

    if (typeof source === 'string' && source.startsWith('https://')) {
        return { theme: 'custom', url: source };
    }

    return { theme: 'light', url: DEFAULT_TILE_URL };
}
