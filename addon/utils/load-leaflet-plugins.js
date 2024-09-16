import loadAssets from './load-assets';

export default function loadLeafletPlugins(assets = { basePath: 'engines-dist/leaflet', scripts: [], stylesheets: [], globalIndicatorKey: null }) {
    loadAssets(assets);
}
