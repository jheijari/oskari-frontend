/* eslint-disable new-cap */
import { Cluster as olCluster, Vector as olSourceVector, TileDebug as olSourceTileDebug } from 'ol/source';
import { Vector as olLayerVector, Tile as olLayerTile } from 'ol/layer';
import olFormatGeoJSON from 'ol/format/GeoJSON';
import { tile as tileStrategyFactory } from 'ol/loadingstrategy';
import { createXYZ } from 'ol/tilegrid';

import { AbstractLayerHandler, LOADING_STATUS_VALUE } from './AbstractLayerHandler.ol';
import { applyOpacity, clusterStyleFunc } from '../util/style';
import { WFS_ID_KEY } from '../util/props';
import { RequestCounter } from './RequestCounter';

import olPoint from 'ol/geom/Point';
import olLineString from 'ol/geom/LineString';
import olLinearRing from 'ol/geom/LinearRing';
import olPolygon from 'ol/geom/Polygon';
import olMultiPoint from 'ol/geom/MultiPoint';
import olMultiLineString from 'ol/geom/MultiLineString';
import olMultiPolygon from 'ol/geom/MultiPolygon';
import olGeometryCollection from 'ol/geom/GeometryCollection';

import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader';
import OL3Parser from 'jsts/org/locationtech/jts/io/OL3Parser';
import RelateOp from 'jsts/org/locationtech/jts/operation/relate/RelateOp';
const reader = new GeoJSONReader();
const olParser = new OL3Parser();
olParser.inject(olPoint, olLineString, olLinearRing, olPolygon, olMultiPoint, olMultiLineString, olMultiPolygon, olGeometryCollection);

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
    }
    createEventHandlers () {
        const handlers = super.createEventHandlers();
        if (this.plugin.getMapModule().getSupports3D()) {
            handlers['AfterChangeMapLayerOpacityEvent'] = Oskari.util.throttle(event =>
                this._updateLayerStyle(event.getMapLayer()), OPACITY_THROTTLE_MS);
            handlers['AfterMapMoveEvent'] = Oskari.util.throttle(() =>
                this._loadFeaturesForAllLayers(), MAP_MOVE_THROTTLE_MS);
        }
        return handlers;
    }
    getStyleFunction (layer, styleFunction, selectedIds) {
        const clustering = this._isClusteringSupported() && typeof layer.getClusteringDistance() !== 'undefined';
        return (feature, resolution) => {
            // Cluster layer feature
            if (feature.get('features')) {
                if (feature.get('features').length > 1) {
                    const isSelected = !!feature.get('features').find(cur => selectedIds.has(cur.get(WFS_ID_KEY)));
                    return clusterStyleFunc(feature, isSelected);
                } else {
                    // Only single point in cluster. Use it in styling.
                    feature = feature.get('features')[0];
                }
            } else if (clustering) {
                // Vector layer feature, hide points
                if (feature.getGeometry().getType() === 'Point') {
                    return null;
                }
            }
            const isSelected = selectedIds.has(feature.get(WFS_ID_KEY));
            const style = styleFunction(feature, resolution, isSelected);
            if (!this.plugin.getMapModule().getSupports3D()) {
                return style;
            }
            return applyOpacity(style, layer.getOpacity());
        };
    }
    getPropertiesForIntersectingGeom (geometry, layer) {
        if (!geometry || !layer) {
            return;
        }
        const featuresById = new Map();
        const geomFilter = reader.read(geometry);
        const envelope = geomFilter.getEnvelopeInternal();
        const extentFilter = [envelope.getMinX(), envelope.getMinY(), envelope.getMaxX(), envelope.getMaxY()];
        let source = layer.getSource();
        if (source instanceof olCluster) {
            // Get wrapped vector source
            source = source.getSource();
        }
        source.forEachFeatureInExtent(extentFilter, ftr => {
            const geom = olParser.read(ftr.getGeometry());
            if (RelateOp.relate(geomFilter, geom).isIntersects()) {
                featuresById.set(ftr.get(WFS_ID_KEY), ftr.getProperties());
            }
        });
        return Array.from(featuresById.values());
    }
    addMapLayerToMap (layer, keepLayerOnTop, isBaseMap) {
        super.addMapLayerToMap(layer, keepLayerOnTop, isBaseMap);
        const opacity = this.plugin.getMapModule().getSupports3D() ? 1 : layer.getOpacity() / 100;
        const source = this._createLayerSource(layer);
        const vectorLayer = new olLayerVector({
            opacity,
            visible: layer.isVisible(),
            renderMode: 'hybrid',
            source: source
        });
        const olLayers = [vectorLayer];

        // Setup clustering
        if (this._isClusteringSupported() && layer.getClusteringDistance()) {
            const clusterSource = new olCluster({
                distance: layer.getClusteringDistance(),
                source
            });
            const clusterLayer = new olLayerVector({
                opacity,
                visible: layer.isVisible(),
                source: clusterSource
            });
            vectorLayer.on('change:opacity', () => clusterLayer.setOpacity(vectorLayer.getOpacity()));
            olLayers.push(clusterLayer);
        }

        olLayers.forEach(olLayer => {
            this.applyZoomBounds(layer, olLayer);
            this.plugin.getMapModule().addLayer(olLayer, !keepLayerOnTop);
        });

        this.plugin.setOLMapLayers(layer.getId(), olLayers);
        if (this.plugin.getMapModule().getSupports3D()) {
            this._loadFeaturesForLayer(layer);
        }
        return olLayers;
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
        let source = new olSourceVector({
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
    /**
     * @private
     * @method _getFeatureLoader To get an ol loader impl for the layer.
     * @param {Oskari.mapframework.bundle.mapwfs2.domain.WFSLayer} layer
     * @param {ol.source.Vector} source
     * @return {function} loader function for the layer
     */
    _getFeatureLoader (layer, source) {
        const counter = new RequestCounter();
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
                    let features = source.getFormat().readFeatures(resp).map(ftr => {
                        ftr.set(WFS_ID_KEY, ftr.getId());
                        return ftr;
                    });
                    if (this._isClusteringSupported() && layer.getClusteringDistance()) {
                        features = this._disintegreateMultiPoints(features);
                    }
                    source.addFeatures(features);
                    this.updateLayerProperties(layer, source);
                    updateLoadingStatus(LOADING_STATUS_VALUE.COMPLETE);
                },
                error: () => updateLoadingStatus(LOADING_STATUS_VALUE.ERROR)
            });
        };
    }

    /**
     * Break multipoints apart to enable clustering.
     *
     * @param {olFeature[]} features
     * @return {olFeature[]} new feature array with operated features
     */
    _disintegreateMultiPoints (features) {
        const ftrs = [];
        features.forEach(ftr => {
            ftr.set(WFS_ID_KEY, ftr.getId());
            if (ftr.getGeometry() instanceof olMultiPoint) {
                ftr.getGeometry().getPoints().forEach((pointGeom, i) => {
                    const ptFeature = ftr.clone();
                    ptFeature.setGeometry(pointGeom);
                    ptFeature.setId(ftr.getId() + 'clone' + i);
                    ptFeature.set(WFS_ID_KEY, ftr.getId());
                    ftrs.push(ptFeature);
                });
                return;
            }
            ftrs.push(ftr);
        });
        return ftrs;
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
    _isClusteringSupported () {
        return !this.plugin.getMapModule().getSupports3D();
    }
};
