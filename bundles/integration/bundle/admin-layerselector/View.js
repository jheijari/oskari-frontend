/**
 * @class Oskari.integration.bundle.todo.View
 *
 * This is an reference implementation View which implements functionality
 *  with BackboneJS within Oskari flyouts.
 *
 * THIS WILL DECLARE FOLLOWING
 *
 * - eventHandlers  which will receive notifications from Oskari
 * - requirementsConfig to support loading with require - This might change though
 * - requirements - INITIAL REQUIREMENTS
 *
 * This example is based on ToDO app from BackboneJS which required *some*
 * modifications to fit into model/collection/view/template form.
 * Sample was not fully fixed but will do as an example.
 *
 *
 */
Oskari.clazz.define('Oskari.integration.bundle.admin-layerselector.View', function() {
}, {

//    _mapLayerUrl : '/web/fi/kartta?p_p_id=Portti2Map_WAR_portti2mapportlet&p_p_lifecycle=2&action_route=GetMapLayerClasses',
    _mapLayerUrl : '/web/fi/kartta?p_p_id=Portti2Map_WAR_portti2mapportlet&p_p_lifecycle=2&action_route=GetAdminMapLayers',

    /**
     * @property eventHandlers
     * a set of event handling functions for this view
     * These will be registered/unregistered automagically
     *
     */
    "eventHandlers" : {
        "MapLayerVisibilityChangedEvent" : function(event) {
            console.log("YEP", event);
        },
        "AfterMapMoveEvent" : function(event) {

        },
        'MapLayerEvent' : function(event) {


            if(event.getOperation() === 'update') {

                var sandbox = this.getSandbox();
                // populate layer list
                var mapLayerService = sandbox.getService('Oskari.mapframework.service.MapLayerService');
                var layers = mapLayerService.getAllLayers();
                if(this.view != null){
                    this.view.addToCollection(layers);
                } else {
                    this.layers = layers;
                }

/*                var mapLayerService = this.sandbox.getService('Oskari.mapframework.service.MapLayerService');
                var layerId = event.getLayerId();

                var layer = mapLayerService.findMapLayer(layerId);
                this.plugins['Oskari.userinterface.Flyout'].handleLayerModified(layer);
*/
            }
            else if(event.getOperation() === 'add') {

                var sandbox = this.getSandbox();
                // populate layer list
                var mapLayerService = sandbox.getService('Oskari.mapframework.service.MapLayerService');
                var layers = mapLayerService.getAllLayers();
debugger;
                if(this.view != null){
                    this.view.addToCollection(layers);
                } else {
                    this.layers = layers;
                }

            } else {

                var sandbox = this.getSandbox();
                // populate layer list
                var mapLayerService = sandbox.getService('Oskari.mapframework.service.MapLayerService');
                var layers = mapLayerService.getAllLayers();
                if(this.view != null){
                    this.view.addToCollection(layers);
                } else {
                    this.layers = layers;
                }
            }


        }
    },

    /**
     * @property requirementsConfig
     *
     * requirejs requirements config to fix paths
     *
     */
    "requirementsConfig" : {
        "waitSeconds" : 15,
        "paths" : {
            '_bundle' : '../../../Oskari/bundles/integration/bundle/admin-layerselector'
        }
    },


    init : function() {
        //this.getEl().bind("action", this.handleAction, this);
/*
        var me = this;
        var sandbox = me.getSandbox()
        var mapLayerService = sandbox.getService('Oskari.mapframework.service.MapLayerService');

        jQuery.ajax({
            type : "GET",
            dataType: 'json',
            beforeSend: function(x) {
              if(x && x.overrideMimeType) {
               x.overrideMimeType("application/j-son;charset=UTF-8");
              }
             },
            url : me._mapLayerUrl,
            success : function(pResp) {
//                me._loadAllLayersAjaxCallBack(pResp, callbackSuccess);
                me._loadAllLayersAjaxCallBack(pResp, null, mapLayerService);
            },
            error : function(jqXHR, textStatus) {
                if(callbackFailure && jqXHR.status != 0) {
                    callbackFailure();
                }
            }
        }); 
*/
    },

    /**
     * @method render
     * This is called when *everything* is ready for Backbone to be started
     * Called with requirements from above as arguments to method in
     * defined order.
     */
    "render" : function() {
        var me = this;
        var container = this.getEl();
        container.addClass("admin-layerselector");
debugger;        
        container.on("adminAction", {me: this}, me.handleAction);

        var locale = this.getLocalization();
        var confRequirementsConfig = 
            (this.getConfiguration()||{}).requirementsConfig;
        var requirementsConfig = 
            confRequirementsConfig||this.requirementsConfig;

        require.config(requirementsConfig);
        require(["_bundle/views/layerSelectorView"], function(LayerSelectorView) {

            // Finally, we kick things off by creating the **App**.
            me.view = new LayerSelectorView({
                el : container,
                instance : me.instance,
                locale : me.locale
            });
            if(me.layers != null) {
                me.view.addToCollection(me.layers);
            }
        });
    },
// copy-paste
    _loadAllLayersAjaxCallBack : function(pResp, callbackSuccess, mapLayerService) {
        var me = this,
        sandbox = me.getSandbox();
//        var allLayers = pResp;//pResp.layers;
debugger;
/*        var keys = _.keys(pResp);
        for(var i = 0; i < keys.length; i++){
            var id = keys[i];
            var organization = pResp[id];
            var layerKeys = _.keys(organization.maplayers);
            for(var j = 0; j < layerKeys.length; j++) {
                var layer = organization.maplayers[layerKeys[j]];

                var mapLayer = me.createMapLayer(layer);
                if(mapLayerService._reservedLayerIds[mapLayer.getId()] !== true) {
                    mapLayerService.addLayer(mapLayer, true);
                }
            }
        }
*/


        var allLayers = pResp.layers;
        for(var i = 0; i < allLayers.length; i++) {
            
            var mapLayer = mapLayerService.createMapLayer(allLayers[i]);
            mapLayer.admin = allLayers[i].admin;
            if(mapLayerService._reservedLayerIds[mapLayer.getId()] !== true) {
                mapLayerService.addLayer(mapLayer, true);
            }
        }

        // notify components of added layer if not suppressed
        this._allLayersAjaxLoaded = true;
        var event = sandbox.getEventBuilder('MapLayerEvent')(null, 'add');
        sandbox.notifyAll(event);
        if(callbackSuccess) {
            callbackSuccess();
        }
    },
    handleAction: function(e) {
        e.stopPropagation();
debugger;
        var me = e.data.me;
        var sandbox = me.getSandbox()
        var mapLayerService = sandbox.getService('Oskari.mapframework.service.MapLayerService');
        if(e.command == "removeLayer") {
            mapLayerService.removeLayer(e.modelId);
        } else if(e.command == "addLayer") {
            e.layerData.name = e.layerData.admin.nameFi;
            var mapLayer = mapLayerService.createMapLayer(e.layerData);
            mapLayer.admin = e.layerData.admin;
            if(mapLayerService._reservedLayerIds[mapLayer.getId()] !== true) {
                mapLayerService.addLayer(mapLayer);
            }
        } else if(e.command == "editLayer") {
            e.layerData.name = e.layerData.admin.nameFi;
//            var mapLayer = mapLayerService.createMapLayer(e.layerData);
//            mapLayer.admin = e.layerData.admin;
            mapLayerService.updateLayer(e.layerData.id, e.layerData);
        }
    }


}, {
    "extend" : ["Oskari.integration.bundle.bb.View"]
});
