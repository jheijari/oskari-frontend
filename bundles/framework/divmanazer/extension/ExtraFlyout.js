/**
 * @class Oskari.userinterface.extension.ExtraFlyout
 *
 * Extra Flyout implementation which shall be used as a super class
 * to actual implementations.
 *
 */
Oskari.clazz.define('Oskari.userinterface.extension.ExtraFlyout',
	/**
     * @method create called automatically on construction
     * @static
     *
     * Always extend this class, never use as is.
     */
    function (title, options) {
    	// UI text for title
        this.title = title;

        /* @property container the DIV element */
        this.container = null;
        this.options = options ||  {};

        this.__render();
        Oskari.makeObservable(this);
    },
    {
	    __visible: false,
		__popup: null,
	    __templates : {
	    	popup: jQuery('<div class="oskari-flyout">' +
	    		'<div class="oskari-flyouttoolbar">' +
	    		'	<div class="oskari-flyoutheading"></div>' +
	    		'	<div class="oskari-flyout-title"><p></p></div>' +
	    		'	<div class="oskari-flyouttools">' +
	    		'		<div class="oskari-flyouttool-close icon-close icon-close:hover"></div>' +
	    		'	</div>' +
	    		'</div>' +
	    		'<div class="oskari-flyoutcontentcontainer"></div>' +
	    		'</div>')
	    },
        __temp:{
            sideTool:_.template(
                '<div class="sidetool">'  +
                '<div class="icon icon-arrow-white-right"></div>' +
                '<label class="verticalsidelabel"></label>'  +
                '</div>')
        },
	    isVisible : function() {
	    	return this.__visible;
	    },
	    show: function(){
	    	var me = this;
	    	me.__popup.show();
    		me.__visible = true;
    		this.trigger('show');
	    },
	    hide: function(suppressEvent){
	    	var me = this;
	    	me.__popup.hide();
    		me.__visible = false;
    		suppressEvent = suppressEvent ? suppressEvent: false;

    		if(!suppressEvent) {
    			this.trigger('hide');
    		}
	    },
	    __render: function(){
	    	var me = this;
	        var popup = me.__popup || me.__templates.popup.clone();

	        if(!me.__popup) {
                if(!me.options.container) {
	        	  jQuery('body').append(popup);
                } else {
                    me.options.container.append(popup);
                }
	        	popup.find('.icon-close').bind('click', function(){
	        		me.hide();
	        	});
	        	me.__popup = popup;
	        	me.hide(true);
	    	}

	    	if(me.options.visible === true) {
	    		me.show();
	    	}

	    	me.setTitle(me.title);
	    	me.addClass(me.options.cls);
			me.setSize(me.options.width, me.options.height);
	    },
	    setTitle: function(title) {
	    	var me = this;
	    	if(!this.__popup) {
	    		return;
	    	}
	    	me.__popup.find('.oskari-flyout-title p').html(title || '');
	    },
	    getTitle: function() {
	    	var me = this;
	    	return me.__popup.find('.oskari-flyout-title p');
	    },
	    /**
	     * @method  @public setContent Set content
	     * @param {Object} content jQuery object
	     */
	    setContent: function(content) {
	    	var me = this;
	    	me.__popup.find('.oskari-flyoutcontentcontainer').html(content);
	    },
	    addClass: function(cls) {
	    	if(!this.__popup) {
	    		return;
	    	}
	    	this.__popup.addClass(cls);
	    },
	    setSize : function(width, height) {
	    	if(!this.__popup) {
	    		return;
	    	}
	    	if(width) {
	    		this.__popup.css('width', width);
	    	}
	    	if(height) {
	    		this.__popup.css('height', height);
	    	}

	    },
	    bringToTop : function() {
	    	if(!this.__popup) {
	    		return;
	    	}
            this.__popup.css('z-index', 20000);
	    },
	    move : function(left, top, keepOnScreen) {
	    	if(!this.__popup) {
	    		return;
	    	}
	    	if(keepOnScreen) {
	    		var size = this.getSize();
	            if(left + size.width > jQuery(window).width()) {
	                left = jQuery(window).width() - size.width;
	            }
	            if(left < 0) {
	                left = 0;
	            }
	            if(top + size.height > jQuery(window).height()) {
	                top = jQuery(window).height() - size.height;
	            }
	            if(top < 0) {
	                top = 0;
	            }
	    	}
            this.__popup.css({
                left: left,
                top: top
            });
	    },
	    getPosition : function() {
	    	if(!this.__popup) {
	    		return;
	    	}
	    	return this.__popup.position();
	    },
	    getSize : function() {
	    	if(!this.__popup) {
	    		return;
	    	}
	    	return {
	    		width : this.__popup.outerWidth(),
	    		height : this.__popup.height()
	    	};
        },
        /**
         * @method makeDraggable
         * Makes dialog draggable with jQuery Event Drag plugin
         * @param options  optional options for draggable
         */
        makeDraggable: function (options) {
            var me = this,
                dragOptions = options ? options : {
                scroll: false,
                handle: '.oskari-flyouttoolbar'
            };
            me.__popup.css('position', 'absolute');
            me.__popup.draggable(dragOptions);
        },
        getElement: function(){
            return this.__popup;
        },

/************************************************************************************************
* Side tool functions
************************************************************************************************/
         //this function collects the label and calls the default flyout function addSideTool sending the label and the callback function.
        getSideLabel : function( text ) {
            var sidelabel = jQuery(this.__temp.sideTool());
            sidelabel.find('label').text(text);
            return sidelabel;
        },
        _calcSideLabelPositions: function(){
            var me = this;
            var sidelabels = me.__popup.find('.sidetool');
            var flyout = me.__popup;
            var heights = flyout.find('.oskari-flyouttoolbar').outerHeight();
            jQuery.each(sidelabels.get(), function(index, sidelabel) {
                if(index === 0) {
                    jQuery(this).css('top', heights);
                    heights += jQuery(this).height() + 10;
                }
                else {
                    jQuery(this).css('top', heights + 'px');
                    heights += jQuery(this).height() + 10;
                }
            });
        },
        /**
         * @method  @public addSideTool Add side tool for flyout
         * @param {String}   label    sidetool label
         * @param {Function} callback sidetool callback
         */
        addSideTool: function(label, callback){
            var me = this;
            var sidelabel = this.getSideLabel(label);

            var textWidth = function (el)
            {
                // Only create the dummy element once
                var calc = jQuery('<span>').css('font', el.css('font')).css({'font-size': el.css('font-size'), display: 'none', 'white-space': 'nowrap' }).appendTo('body');
                var width = calc.html(el.html()).width();
                // Empty out the content until next time - not needed, but cleaner
                calc.remove();
                return width;
            };

            var textSize = textWidth(sidelabel.find('label'));

            var flyout = me.__popup;
            var parent = flyout.parent();

            sidelabel.css('left', null);
            flyout.append(sidelabel);

            sidelabel.css('height', (textSize + sidelabel.find('.icon').height() + 10) + 'px');

            if(typeof callback === 'function') {
                sidelabel.on('click', function() {
                    var position = me.__popup.position();
                    var bounds = {
                        left : position.left + sidelabel.position().left,
                        top : position.top + sidelabel.position().top
                    };
                    bounds.right = bounds.left + sidelabel.outerWidth();
                    bounds.bottom = bounds.top + sidelabel.height();
                    callback(sidelabel, bounds);
                });
            }

            me._calcSideLabelPositions();

            if(!me._addedResizeListener){
                me.__popup.bind('DOMSubtreeModified', function(){
                    clearTimeout(me._sidetoolTimer);
                    me._sidetoolTimer = setTimeout(function(){
                        me._calcSideLabelPositions();
                    }, 10);
                });
                me._addedResizeListener = true;
            }
        },
        /**
         * @method  @public removeSideTools Remove sidetools
         */
        removeSideTools: function(){
            var me = this;
            var sidelabels = me.__popup.find('.sidetool');
            sidelabels.each(function(index, sidelabel) {
                jQuery(sidelabel).remove();
            });
        }
});