/* Magic Mirror
 * Module: MMM-PurpleAir
 *
 * author: Aaron Jones
 * MIT Licensed.
 */
var NodeHelper = require('node_helper');
var request = require('request');

const NotificationType = {
  Request: "request",
  Response: "response",
}

module.exports = NodeHelper.create({
    start: function () {
      console.log(`${this.name} helper starting...`);
    },

    socketNotificationReceived: function(notificationName, data) {
      var that = this;
      const { responseKey, req } = data
      if (notificationName === `${this.name}.${NotificationType.Request}`) {
        request(req, function(error, response, body) {
            console.log(`${that.name} ${responseKey} response code: ${response.statusCode}`);
            that.sendSocketNotification(responseKey, {
                error,
                request,
                response
            });
        });
      }
    }
});
