
Oskari.clazz.define('Oskari.mapping.publisher.tool.MapRotator',
    function () {
    }, {
        index: 500,
        allowedLocations: ['top left', 'top right'],
        lefthanded: 'top left',
        righthanded: 'top right',
        allowedSiblings: [
            'Oskari.mapframework.bundle.featuredata2.plugin.FeaturedataPlugin',
            'Oskari.mapframework.bundle.mapmodule.plugin.MyLocationPlugin',
            'Oskari.mapframework.bundle.mapmodule.plugin.PanButtons',
            'Oskari.mapframework.bundle.mapmodule.plugin.Portti2Zoombar',
            'Oskari.mapframework.bundle.coordinatetool.plugin.CoordinateToolPlugin',
            'Oskari.mapping.cameracontrols3d.CameraControls3dPlugin',
            'Oskari.mapping.bundle.shadowplugin3d.plugin.ShadowingPlugin'
        ],
        templates: {
            'toolOptions': '<div class="tool-options"></div>'
        },
        noUI: null,
        noUiIsCheckedInModifyMode: false,
        /**
         * Get tool object.
         * @method getTool
         *
         * @returns {Object} tool description
         */
        getTool: function () {
            return {
                id: 'Oskari.mapping.maprotator.MapRotatorPlugin',
                title: 'MapRotator',
                config: {}
            };
        },
        isDisplayed: function () {
            // shouldn't be shown if bundle is not started
            // otherwise results in js errors
            return !!this.getMapRotatorInstance();
        },
        getMapRotatorInstance: function () {
            return this.__sandbox.findRegisteredModuleInstance(this.bundleName);
        },
        // Key in view config non-map-module-plugin tools (for returning the state when modifying an existing published map).
        bundleName: 'maprotator',
        /**
         * Initialise tool
         * @method init
         */
        init: function (data) {
            var me = this;

            var bundleData = data && data.configuration[me.bundleName];
            if (!bundleData) {
                return;
            }
            var conf = bundleData.conf || {};
            me.setEnabled(conf.enabled);
            me.noUiIsCheckedInModifyMode = !!conf.noUI;
            this.getMapRotatorInstance().setState(bundleData.state);
        },
        /**
         * Get values.
         * @method getValues
         * @public
         *
         * @returns {Object} tool value object
         */
        getValues: function () {
            var me = this;
            if (me.state.enabled) {
                var pluginConfig = this.getPlugin().getConfig();
                for (var configName in pluginConfig) {
                    if (configName === 'noUI' && !me.noUI) {
                        pluginConfig[configName] = null;
                        delete pluginConfig[configName];
                    }
                }
                if (me.noUI) {
                    pluginConfig.noUI = me.noUI;
                }
                pluginConfig.enabled = me.state.enabled;
                var json = {
                    configuration: {}
                };
                json.configuration[me.bundleName] = {
                    conf: pluginConfig,
                    state: this.getMapRotatorInstance().getState()
                };
                return json;
            } else {
                return null;
            }
        },
        /**
         * Get extra options.
         * @method @public getExtraOptions
         * @param {Object} jQuery element toolContainer
         * @return {Object} jQuery element template
         */
        getExtraOptions: function (toolContainer) {
            var me = this;
            var template = jQuery(me.templates.toolOptions).clone();
            var loc = Oskari.getLocalization('maprotator', Oskari.getLang());
            var labelNoUI = loc.display.publisher.noUI;
            var input = Oskari.clazz.create(
                'Oskari.userinterface.component.CheckboxInput'
            );

            input.setTitle(labelNoUI);
            input.setHandler(function (checked) {
                if (!me.getPlugin()) {
                    return;
                }
                if (checked === 'on') {
                    me.noUI = true;
                    me.getPlugin().teardownUI();
                } else {
                    me.noUI = false;
                    me.getPlugin().redrawUI();
                }
            });
            if (me.noUiIsCheckedInModifyMode) {
                input.setChecked(true);
                me.noUI = true;
            }
            var inputEl = input.getElement();
            template.append(inputEl);
            return template;
        }
    }, {
        'extend': ['Oskari.mapframework.publisher.tool.AbstractPluginTool'],
        'protocol': ['Oskari.mapframework.publisher.Tool']
    });
