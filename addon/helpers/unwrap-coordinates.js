import { helper } from '@ember/component/helper';
import { isArray } from '@ember/array';

const L = window.leaflet || window.L;
/**
 * Recursively wraps geographic coordinates so that all longitude values are normalized
 * to the canonical range of [-180, 180] degrees.
 *
 * This function assumes coordinates are provided in GeoJSON order: [lng, lat, ...].
 * It works in two primary scenarios:
 *
 * 1. **Single Coordinate Array:**
 *    If the input is a coordinate point (an array of numbers where the first element
 *    is the longitude and the second is the latitude), the function applies the wrap
 *    formula to the longitude component. Any additional dimensions (such as altitude)
 *    are preserved.
 *
 *    For example:
 *    ```js
 *    // Input: [200, 45]  (200° longitude is out-of-range)
 *    // Output: [-160, 45]
 *    ```
 *
 * 2. **Nested Coordinate Arrays:**
 *    If the input is an array of coordinate points (e.g. a line string, polygon ring, or
 *    multi-ring/multi-polygon structure), the function recursively processes each sub-array.
 *
 *    For example:
 *    ```js
 *    // Input: [[200, 45], [210, 46], [220, 47]]
 *    // Output: [[-160, 45], [-150, 46], [-140, 47]]
 *    ```
 *
 * If the input is not an array, the function returns it unchanged.
 *
 * @param {*} coords - The coordinate or nested array of coordinates to be wrapped.
 *                     Expected format for a coordinate is [lng, lat, ...].
 * @returns {*} A new coordinate or nested array of coordinates with longitudes normalized
 *              to the range [-180, 180]. Non-array inputs are returned as-is.
 *
 * @example
 * // Wrapping a single coordinate:
 * const coord = [200, 45];
 * const wrappedCoord = leafletWrapCoordinates(coord);
 * // wrappedCoord is [-160, 45]
 *
 * @example
 * // Wrapping a polygon ring:
 * const ring = [
 *   [200, 45],
 *   [210, 46],
 *   [220, 47],
 *   [200, 45] // closing the ring
 * ];
 * const wrappedRing = leafletWrapCoordinates(ring);
 * // wrappedRing is [[-160, 45], [-150, 46], [-140, 47], [-160, 45]]
 *
 * @export
 */
export function leafletWrapCoordinates(coords) {
    // If this is a coordinate point (e.g. [lng, lat, ...])
    if (isArray(coords) && typeof coords[0] === 'number' && coords.length >= 2) {
        const lng = coords[0];
        // Wrap the longitude into [-180, 180]
        const wrappedLng = ((((lng + 180) % 360) + 360) % 360) - 180;
        // Return a new coordinate array preserving any extra dimensions (such as altitude)
        return [wrappedLng, ...coords.slice(1)];
    }
    // Otherwise, assume it's a nested array (e.g. a ring or array of rings)
    else if (isArray(coords)) {
        return coords.map(leafletWrapCoordinates);
    }
    // If it's not an array, just return it.
    return coords;
}

/**
 * Converts a latitude and longitude pair to a projected CRS point using Leaflet's projection.
 *
 * @param {number} lat - The latitude value.
 * @param {number} lng - The longitude value.
 * @param {Object} [crs=L.CRS.EPSG3857] - The coordinate reference system to use (defaults to EPSG:3857).
 * @returns {L.Point} The projected CRS point as an instance of L.Point.
 */
export function latLngToCRS(lat, lng, crs = L.CRS.EPSG3857) {
    const latLng = L.latLng(lat, lng);
    const point = crs.project(latLng);
    return crs.unproject(point);
}

/**
 * Recursively converts an array of geographic coordinates in GeoJSON order ([lng, lat, ...])
 * to Leaflet's projected CRS coordinates.
 *
 * This function expects that the input `coords` is an array containing coordinate arrays
 * in GeoJSON order. For example:
 *
 *   - A single coordinate: [lng, lat, ...]
 *   - A line string or ring: an array of coordinates, e.g., [[lng, lat], [lng, lat], ...]
 *   - A nested array for polygons or multipolygons.
 *
 * The conversion process involves two steps:
 *
 * 1. **Wrapping:**
 *    The coordinates are first passed through `leafletWrapCoordinates` to ensure that
 *    all longitude values are normalized to the canonical range of [-180, 180].
 *
 * 2. **Projection:**
 *    The geographic coordinates are then converted to a projected CRS using `latLngToCRS`.
 *
 * Depending on the structure of the input, the function returns:
 *
 *   - A single projected point (L.Point) if a single coordinate array is provided.
 *   - An array of projected points if an array of coordinates (e.g., line string) is provided.
 *   - A nested array of projected points for polygons or multipolygons.
 *
 * @param {*} coords - An array of coordinate arrays in GeoJSON order ([lng, lat, ...]).
 *                     This can be a single coordinate, an array of coordinates, or a nested array.
 * @returns {*} The coordinate(s) converted to the projected CRS, matching the structure of the input.
 *
 * @example
 * // Converting a single coordinate:
 * const projectedPoint = unwrapCoordinates([ -80, 26 ]);
 *
 * @example
 * // Converting a line string (ring):
 * const projectedLine = unwrapCoordinates([
 *   [ -80, 26 ],
 *   [ -80.1, 26.1 ],
 *   [ -80.2, 26.2 ]
 * ]);
 *
 * @example
 * // Converting a polygon (array of rings):
 * const projectedPolygon = unwrapCoordinates([
 *   [
 *     [ -80, 26 ],
 *     [ -80.1, 26.1 ],
 *     [ -80.2, 26.2 ],
 *     [ -80, 26 ]
 *   ]
 * ]);
 */
export function leafletUnwrapCoordinates(coords) {
    if (!isArray(coords)) {
        // If it's not an array, return it as-is.
        return coords;
    }

    // Ensure coordinates are wrapped properly to the canonical [-180, 180] range.
    coords = leafletWrapCoordinates(coords);

    // If the first element is a number, assume this is a single coordinate [lng, lat, ...].
    if (typeof coords[0] === 'number') {
        // Call leafletWrapCoordinates again for safety (though it should already be wrapped).
        coords = leafletWrapCoordinates(coords);
        // Note: Since our input is in GeoJSON order ([lng, lat]), we convert by swapping the order.
        return latLngToCRS(coords[1], coords[0]);
    }

    // If the first element is an array and its first element is a number,
    // assume this is an array of coordinates (e.g., a line string or ring).
    if (isArray(coords[0]) && typeof coords[0][0] === 'number') {
        return coords.map((c) => latLngToCRS(c[1], c[0]));
    }

    // Otherwise, assume it's a nested array (e.g., for polygons or multipolygons)
    return coords.map(leafletUnwrapCoordinates);
}

/**
 * Ember helper to "unwrap" coordinate arrays for Leaflet usage.
 *
 * This helper converts coordinate data into a form that is compatible with Leaflet’s
 * coordinate reference system. It supports two types of input:
 *
 * 1. **GeoJSON Geometry Object:**
 *    An object with a `coordinates` property. In this case the coordinates are assumed
 *    to already be in GeoJSON order ([lng, lat, ...]). The helper unwraps these
 *    coordinates using `leafletUnwrapCoordinates` and returns a new geometry object
 *    with the unwrapped coordinates.
 *
 * 2. **Array of Coordinates:**
 *    An array of coordinate arrays (e.g. a line string, ring, or polygon) provided in
 *    [lat, lng] order. The helper first converts these to GeoJSON order ([lng, lat])
 *    and then unwraps them using `leafletUnwrapCoordinates`.
 *
 * **Note:**
 * - The unwrapping process adjusts coordinate values to ensure they form a continuous
 *   representation (for example, when dealing with dateline-crossing geometries).
 * - If the input is neither an object with a `coordinates` property nor an array,
 *   it is returned unchanged.
 *
 * @param {Array|Object} input - Either:
 *    - A GeoJSON geometry object with a `coordinates` property, where coordinates are in [lng, lat] order.
 *    - An array of coordinate arrays in [lat, lng] order.
 * @returns {Array|Object} A new geometry object or coordinate array with unwrapped coordinates,
 *                         preserving the structure of the input.
 *
 * @example
 * // Example 1: GeoJSON geometry object input:
 * let geojson = {
 *   type: 'Polygon',
 *   coordinates: [
 *     [[-80, 26], [-80.1, 26.1], [-80.2, 26.2], [-80, 26]]
 *   ]
 * };
 * let result = unwrapCoordinates([geojson]);
 *
 * @example
 * // Example 2: Array of coordinates in [lat, lng] order:
 * let coords = [
 *   [26, -80],
 *   [26.1, -80.1],
 *   [26.2, -80.2]
 * ];
 * let result = unwrapCoordinates([coords]);
 */
export default helper(function unwrapCoordinates([input]) {
    if (!input) {
        return input;
    }

    // If input is an object with a "coordinates" property,
    // assume it is a GeoJSON geometry where coordinates are in [lng, lat] order.
    if (typeof input === 'object' && input.coordinates) {
        const unwrappedCoordinates = leafletUnwrapCoordinates(input.coordinates);
        return {
            ...input,
            coordinates: unwrappedCoordinates,
        };
    }

    // Otherwise, assume input is an array of coordinates.
    // The helper expects these coordinates to be in [lat, lng] order.
    // Convert them to GeoJSON order ([lng, lat]) before unwrapping.
    if (isArray(input) && input.length > 0) {
        if (typeof input[0][0] === 'number') {
            // Input is an array of coordinates in [lat, lng] order.
            input = input.map(([latitude, longitude]) => [longitude, latitude]);
        } else {
            // If the structure is nested (e.g., for polygons or multipolygons),
            // reverse the outer array as a fallback. (This branch can be customized as needed.)
            input = input.reverse();
        }
    }
    const unwrappedCoordinates = leafletUnwrapCoordinates(input);
    return unwrappedCoordinates;
});
