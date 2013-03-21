define([
    "text!_bundle/templates/layerRowTemplate.html",
    "_bundle/views/adminLayerSettingsView"
    ], 
    function(ViewTemplate, AdminLayerSettingsView) {
    return Backbone.View.extend({
        tagName: 'div',
        className: 'layer',

        events: {
            "click .admin-add-layer-cancel" : "hideLayerSettings",
//            "click .admin-add-layer-ok"     : "hideLayerSettings",
            "click .admin-remove-layer"     : "removeLayer",
            "click"                         : "toggleLayerSettings",
            "click .show-edit-layer"        : "clickLayerSettings"
        },

        // At initialization we bind to the relevant events on the `Todos`
        // collection, when items are added or changed. Kick things off by
        // loading any preexisting todos that might be saved in *localStorage*.
        initialize : function() {
            this.instance           = this.options.instance;
            this.model              = this.options.model;
            this.classNames         = this.options.classes;
            this.template           = _.template(ViewTemplate);
            this.render();
        },

        // Re-rendering the App just means refreshing the statistics -- the rest
        // of the app doesn't change.
        render : function() {
            this.$el.html(this.template({model:this.model}));
            this._renderLayerTools();

        },

        _renderLayerTools: function() {
            var sandbox = this.instance.sandbox;
            var layer = this.model;
            var tooltips = this.instance.getLocalization('tooltip');
            var tools = this.$el.find('div.layer-tools');
            var icon = this.$el.find('div.layer-icon');
            if(layer.isBaseLayer()) {
                icon.addClass('layer-base');
                icon.attr('title', tooltips['type-base']);
            }
            else if(layer.isLayerOfType('WMS')) {
                if(layer.isGroupLayer()) {
                    icon.addClass('layer-group');
                }
                else {
                    icon.addClass('layer-wms');
                }
                icon.attr('title', tooltips['type-wms']);
            }
            // FIXME: WMTS is an addition done by an outside bundle so this shouldn't be here
            // but since it would require some refactoring to make this general
            // I'll just leave this like it was on old implementation
            else if(layer.isLayerOfType('WMTS')) {
                icon.addClass('layer-wmts');
                icon.attr('title', tooltips['type-wms']);
            }
            else if(layer.isLayerOfType('WFS')) {
                icon.addClass('layer-wfs');
                icon.attr('title', tooltips['type-wfs']);
            }
            else if(layer.isLayerOfType('VECTOR')) {
                icon.addClass('layer-vector');
                icon.attr('title', tooltips['type-wms']);
            }

            if(layer.getMetadataIdentifier()) {
                tools.find('div.layer-info').addClass('icon-info');
                tools.find('div.layer-info').click(function() {
                      var rn = 'catalogue.ShowMetadataRequest';
                      var uuid = layer.getMetadataIdentifier();
                         var additionalUuids = [];
                    var additionalUuidsCheck = {};
                    additionalUuidsCheck[uuid] = true; 
                    var subLayers = layer.getSubLayers(); 
                    if( subLayers && subLayers.length > 0 ) {
                        for( var s = 0 ; s < subLayers.length;s++) {
                            var subUuid = subLayers[s].getMetadataIdentifier();
                            if( subUuid && subUuid != "" && !additionalUuidsCheck[subUuid] ) { 
                                additionalUuidsCheck[subUuid] = true;
                                additionalUuids.push({
                                    uuid: subUuid
                                });
                                 
                            }
                        }
                    }
                                    
                    sandbox.postRequestByName(rn, [
                        { uuid : uuid }, additionalUuids
                    ]);
                });
            }
        },
        toggleLayerSettings : function(e) {
            var element = jQuery(e.currentTarget);

            if(element.parents('.admin-add-layer').length == 0 && 
                !element.find('.admin-add-layer').hasClass('show-edit-layer')) {
            e.stopPropagation();

                if(this.model.admin.style_decoded == null && this.model.admin.style != null) {
                    var styles = [];
                    styles.push(this.options.layerTabModel.decode64(this.model.admin.style));
                    this.model.admin.style_decoded = styles;
                }
                var settings = new AdminLayerSettingsView({
                    model: this.model,  
                    instance : this.options.instance, 
                    classes : this.classNames
                });
                element.append(settings.$el);
                element.find('.layout-slider').slider({min:0, max: 100, value:100, slide: function( event, ui ) {
                    jQuery(ui.handle).parents('.left-tools').find( "#opacity-slider" ).val( ui.value );
                }});

                //this.$el.find("#add-layer-inspire-theme").tagit({availableTags: ["Hallinnolliset yksiköt", "Hydrografia", "Kiinteistöt", "Kohteet", "Koordinaattijärjestelmät", "Korkeus", "Liikenneverkot", "Maankäyttö", "Maanpeite","Maaperä","Merialueet", "Metatieto"]});


                setTimeout(function(){
                    element.find('.admin-add-layer').addClass('show-edit-layer');
                }, 30);
            } else {
                element.find('.admin-add-layer').removeClass('show-edit-layer');
                setTimeout(function(){
                    element.find('.admin-add-layer').remove();
                },300);

            }
        },
        hideLayerSettings : function(e) {
            e.stopPropagation();
            var element = jQuery(e.currentTarget);
            if(element.parents('.admin-add-layer').hasClass('show-edit-layer')) {
                element.parents('.admin-add-layer').removeClass('show-edit-layer');
                setTimeout(function(){
                    element.parents('.admin-add-layer').remove();
                },300);

            }
        },
        // removeLayer : function(e) {
        //     var me = this;
        //     //This will be handled by: jQuery(e.currentTarget).parents('.admin-layerselector')
        //     var element = jQuery(e.currentTarget);


        // },
        removeLayer: function(e) {
            var me = this;
            var element = jQuery(e.currentTarget);
            var addLayerDiv = element.parents('.admin-add-layer');
            var id = element.parents('.admin-add-layer').attr('data-id');
            var baseUrl =  me.options.instance.getSandbox().getAjaxUrl(),
                action_route = "action_route=DeleteLayer",
                idKey = "&layer_id=";

            var url = baseUrl + action_route + idKey + id;
            jQuery.ajax({
                type : "GET",
                dataType: 'json',
                beforeSend: function(x) {
                    if(x && x.overrideMimeType) {
                        x.overrideMimeType("application/j-son;charset=UTF-8");
                    }
                },
                url : url,
                success : function(resp) {
                    if(resp == null) {
                        //close this
                        if(addLayerDiv.hasClass('show-edit-layer')) {
                            addLayerDiv.removeClass('show-edit-layer');
                            setTimeout(function(){
                                element.trigger({
                                    type: "adminAction",
                                    command: 'removeLayer',
                                    modelId: me.model.getId()
                                });
                                addLayerDiv.remove();
                            },300);

                        }

                    } else {
                        //problem
                        console.log('Removing layer did not work.')
                    }
                },
                error : function(jqXHR, textStatus) {
                    if(callbackFailure && jqXHR.status != 0) {
                        alert(' false ');
                    }
                }
            });


        },

        clickLayerSettings: function(e) {
            if(!jQuery(e.target).hasClass('admin-add-layer-ok')) {
                e.stopPropagation();
            } else {
                this.trigger(e);
            }
        }
    });
});
