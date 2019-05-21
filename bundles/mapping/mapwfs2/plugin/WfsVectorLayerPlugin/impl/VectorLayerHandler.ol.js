/* eslint-disable new-cap */
import olSourceVector from 'ol/source/Vector';
import olLayerVector from 'ol/layer/Vector';
import olFormatGeoJSON from 'ol/format/GeoJSON';
import { tile as tileStrategyFactory } from 'ol/loadingstrategy';
import { createXYZ } from 'ol/tilegrid';

import { AbstractLayerHandler, LOADING_STATUS_VALUE } from './AbstractLayerHandler.ol';
import { applyOpacity } from '../util/style';
import { WFS_ID_KEY } from '../util/props';
import { RequestCounter } from './RequestCounter';
import olLayerTile from 'ol/layer/Tile';
import olSourceTileDebug from 'ol/source/TileDebug';

const MAP_MOVE_THROTTLE_MS = 2000;
const OPACITY_THROTTLE_MS = 1500;

/**
 * @class VectorLayerHandler
 * LayerHandler implementation for vector layers
 */
export class VectorLayerHandler extends AbstractLayerHandler {
    constructor (layerPlugin) {
        super(layerPlugin);
        this.loadingStrategies = {};
        this.simpleGeoms = {};
        this.fullGeoms = {};
    }
    createEventHandlers () {
        const handlers = super.createEventHandlers();
        if (this.plugin.getMapModule().has3DSupport()) {
            handlers['AfterChangeMapLayerOpacityEvent'] = Oskari.util.throttle(event =>
                this._updateLayerStyle(event.getMapLayer()), OPACITY_THROTTLE_MS);
            handlers['AfterMapMoveEvent'] = Oskari.util.throttle(() =>
                this._loadFeaturesForAllLayers(), MAP_MOVE_THROTTLE_MS);
        }
        return handlers;
    }
    getStyleFunction (layer, styleFunction, selectedIds) {
        return (feature, resolution) => {
            const isSelected = selectedIds.has(feature.get(WFS_ID_KEY));
            const style = styleFunction(feature, resolution, isSelected);
            if (!this.plugin.getMapModule().has3DSupport()) {
                return style;
            }
            return applyOpacity(style, layer.getOpacity());
        };
    }
    addMapLayerToMap (layer, keepLayerOnTop, isBaseMap) {
        super.addMapLayerToMap(layer, keepLayerOnTop, isBaseMap);
        const opacity = this.plugin.getMapModule().has3DSupport() ? 1 : layer.getOpacity() / 100;
        const source = this._createLayerSource(layer);
        const vectorLayer = new olLayerVector({
            opacity,
            visible: layer.isVisible(),
            renderMode: 'hybrid',
            source
        });
        this.applyZoomBounds(layer, vectorLayer);
        this.plugin.getMapModule().addLayer(vectorLayer, !keepLayerOnTop);
        this.plugin.setOLMapLayers(layer.getId(), vectorLayer);
        if (this.plugin.getMapModule().has3DSupport()) {
            this._loadFeaturesForLayer(layer);
        }
        return vectorLayer;
    }
    refreshLayer (layer) {
        if (!layer) {
            return;
        }
        const source = this._getLayerSource(layer);
        if (!source) {
            return;
        }
        source.clear();
        this._loadFeaturesForLayer(layer);
    }
    /**
     * @private
     * @method _createLayerSource To get an ol vector source for the layer.
     * @param {Oskari.mapframework.bundle.mapwfs2.domain.WFSLayer} layer
     * @return {ol.source.Vector} vector layer source
     */
    _createLayerSource (layer) {
        const map = this.plugin.getMapModule().getMap();
        const projection = map.getView().getProjection();
        const tileSize = (map.getSize() || [0, 0]).map(size => size > 1024 ? 1024 : size > 512 ? 512 : 256);
        const tileGrid = createXYZ({
            extent: projection.getExtent(),
            tileSize
        });
        const strategy = tileStrategyFactory(tileGrid);
        this.loadingStrategies['' + layer.getId()] = strategy;
        const source = new olSourceVector({
            format: new olFormatGeoJSON(),
            url: Oskari.urls.getRoute('GetWFSFeatures'),
            projection: projection,
            strategy: strategy
        });
        source.setLoader(this._getFeatureLoader(layer, source));
        return source;
    }
    /**
     * @method _createDebugLayer Helper for debugging purposes.
     * Use from console. Set breakpoint to _createLayerSource and add desired layer to map.
     *
     * Like so:
     * Set breakpoint on "const tileGrid = createXYZ({ ... });"
     * Call this._createDebugLayer(source)
     * @param {FeatureExposingMVTSource} source layer source
     */
    _createDebugLayer (tileGrid) {
        this.plugin.getMapModule().getMap().addLayer(new olLayerTile({
            source: new olSourceTileDebug({
                projection: this.plugin.getMapModule().getMap().getView().getProjection(),
                tileGrid
            })
        }));
    }
    _useSimplifiedGeoms (layer) {
        this.simpleGeoms['' + layer.getId()].forEach((geom, ftr) => {
            ftr.setGeometry(geom);
        });
    }
    _useFullGeoms (layer) {
        this.fullGeoms['' + layer.getId()].forEach((geom, ftr) => {
            ftr.setGeometry(geom);
        });
    }
    /**
     * @private
     * @method _getFeatureLoader To get an ol loader impl for the layer.
     * @param {Oskari.mapframework.bundle.mapwfs2.domain.WFSLayer} layer
     * @param {ol.source.Vector} source
     * @return {function} loader function for the layer
     */
    _getFeatureLoader (layer, source) {
        const counter = new RequestCounter();
        const simpleGeomMap = this.simpleGeoms['' + layer.getId()] || new Map();
        const fullGeomMap = this.fullGeoms['' + layer.getId()] || new Map();
        this.simpleGeoms['' + layer.getId()] = simpleGeomMap;
        this.fullGeoms['' + layer.getId()] = fullGeomMap;
        const updateLoadingStatus = status => {
            counter.update(status);
            this.tileLoadingStateChanged(layer.getId(), counter);
        };
        return (extent, resolution, projection) => {
            updateLoadingStatus(LOADING_STATUS_VALUE.LOADING);
            jQuery.ajax({
                type: 'GET',
                dataType: 'json',
                data: {
                    id: layer.getId(),
                    srs: projection.getCode(),
                    bbox: extent.join(',')
                },
                url: Oskari.urls.getRoute('GetWFSFeatures'),
                success: (resp) => {
                    const features = source.getFormat().readFeatures(resp);
                    features.forEach(ftr => {
                        ftr.set(WFS_ID_KEY, ftr.getId());
                        simpleGeomMap.set(ftr, ftr.getGeometry().simplify(1000));
                        fullGeomMap.set(ftr, ftr.getGeometry());
                    });
                    source.addFeatures(features);
                    this.updateLayerProperties(layer, source);
                    updateLoadingStatus(LOADING_STATUS_VALUE.COMPLETE);
                },
                error: () => updateLoadingStatus(LOADING_STATUS_VALUE.ERROR)
            });
        };
    }
    /**
     * @private
     * @method _loadFeaturesForAllLayers Load features to all wfs layers.
     * Uses current map view's extent.
     */
    _loadFeaturesForAllLayers () {
        const mapView = this.plugin.getMap().getView();
        const extent = mapView.calculateExtent();
        const resolution = mapView.getResolution();
        const projection = mapView.getProjection();
        Oskari.getSandbox().findAllSelectedMapLayers()
            .filter(lyr => this.layerIds.includes(lyr.getId()))
            .forEach(lyr => this._loadFeaturesForLayer(lyr, extent, resolution, projection));
    }
    /**
     * @private
     * @method _loadFeaturesForLayer Loads features to the layer.
     *
     * Uses OpenLayers internal methods.
     * Load must be called manually in stacked 3D map mode.
     * (No target container defined for 3D view)
     *
     * @param {Oskari.mapframework.bundle.mapwfs2.domain.WFSLayer} lyr
     * @param {ol.Extent} extent (optional)
     * @param {Number} resolution (optional)
     * @param {ol.proj.Projection} projection (optional)
     */
    _loadFeaturesForLayer (lyr, extent, resolution, projection) {
        if (!extent) {
            const mapView = this.plugin.getMap().getView();
            extent = mapView.calculateExtent();
            resolution = mapView.getResolution();
            projection = mapView.getProjection();
        }
        const olLayers = this.plugin.getOLMapLayers(lyr.getId());
        if (olLayers.length === 0) {
            return;
        }
        const olLayer = olLayers[0];
        if (!this._shouldLoadFeatures(olLayer, resolution)) {
            return;
        }
        const strategy = this.loadingStrategies['' + lyr.getId()];
        strategy(extent, resolution).forEach(tileExt => {
            olLayer.getSource().loadFeatures(tileExt, resolution, projection);
        });
    }

    _shouldLoadFeatures (olLayer, resolution) {
        if (!olLayer.getVisible()) {
            return false;
        }
        return resolution <= olLayer.getMaxResolution() && resolution >= olLayer.getMinResolution();
    }
};
