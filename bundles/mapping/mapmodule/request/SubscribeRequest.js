/**
 * @class Oskari.mapframework.bundle.mapmodule.request.SubscribeRequest
 */
Oskari.clazz.define('Oskari.mapframework.bundle.mapmodule.request.SubscribeRequest',
    /**
     * @method create called automatically on construction
     * @static
     */
    function (subscriber, eventName, subscriptionStatus) {
        this._subscriber = subscriber;
        this._eventName = eventName;
        this._subscriptionStatus = subscriptionStatus;
    }, {
        /** @static @property __name event name */
        __name: 'SubscribeRequest',
        /**
         * @method getName
         * @return {String} the name for the event
         */
        getName: function () {
            return this.__name;
        },
        getEventName: function () {
            return this._eventName;
        },
        getSubscriber: function () {
            return this._subscriber;
        },
        getSubscriptionStatus: function () {
            return this._subscriptionStatus;
        }
    }, {
    /**
     * @property {String[]} protocol array of superclasses as {String}
     * @static
     */
        'protocol': ['Oskari.mapframework.request.Request']
    });
