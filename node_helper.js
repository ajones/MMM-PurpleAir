/* Magic Mirror
 * Module: MMM-PurpleAir
 *
 * author: Aaron Jones
 * MIT Licensed.
 */
var NodeHelper = require('node_helper');
var request = require('request');

module.exports = NodeHelper.create({
    start: function () {
        console.log(this.name + ' helper started ...');
    },

    socketNotificationReceived: function(notificationName, data) {
        console.log(data)
        const {
          responseKey,
          req,
        } = data
        if (notificationName === 'MMM-PurpleAir.Request') {
            var that = this;
            request(req, function(error, response, body) {
                console.log(`MMM-PurpleAir response code: ${response.statusCode}`);
                
                // console.log("send notification: "+payload.id);
                that.sendSocketNotification(responseKey, {
                    error,
                    request,
                    response
                });
            });
        }
    }
});
