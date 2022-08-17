
const NotificationType = {
  Request: "request",
  Response: "response",
}

Module.register("MMM-PurpleAir", {
	updateIntervalSec:  null,
	initialLoadDelaySec:  null,
	tableClass: null,
	
	currentData: null,

	// holder for config info from module_name.js
	config: {},

	// anything here in defaults will be added to the config data
	// and replaced if the same thing is provided in config
	defaults: {
		debug: false,
    apiKey: "",
    sensorIndex:"",
    updateIntervalSec: 30,
    initialLoadDelaySec: 3, 
	},

	init: function(){
		Log.info(this.name + " is initializing...");
	},

	start: function(){
		Log.info(`${this.name} is starting...`);		

    Log.info(`${this.name} using this configuration ${JSON.stringify(this.config)}`);		
    
		this.scheduleUpdate(this.config.initialLoadDelaySec);
	},

	
	getStyles: function () {
		return ["purpleair.css"];
	},

	// only called if the module header was configured in module config in config.js
	getHeader: function() {
		//return this.data.header + " Foo Bar";
	},

	// messages received from other modules and the system (NOT from your node helper)
	// payload is a notification dependent data structure
	notificationReceived: function(notification, payload, sender) {
    Log.info(`${this.name} received a module notification: ${JSON.stringify({notification, sender:sender?.name})}`);
	},

  notificationName: function (notifType) {
    if (notifType == NotificationType.Request){
      return `${this.name}.${notifType}`  
    }
    return `${this.name}.${notifType}.${this.config.sensorIndex}`
  },

	// messages received from from your node helper (NOT other modules or the system)
	// payload is a notification dependent data structure, up to you to design between module and node_helper
	socketNotificationReceived: function(notification, payload) {
		Log.info(`${this.name} received a socket notification: ${notification} - Payload: ${payload}`);
    if(notification === this.notificationName(NotificationType.Response)){
			this.currentData = JSON.parse(payload.response.body)
			// tell mirror runtime that our data has changed,
			// we will be called back at GetDom() to provide the updated content
			this.updateDom(1000)
		}
	},

  
  /**
   * Formula for the AQI calculation comes from PurpleAir's 
   * support team and can be viewed here 
   * https://docs.google.com/document/d/15ijz94dXJ-YAZLi9iZ_RaBwrZ4KtYeCy08goGBwnbCU/edit
   * @param {float} pm value extracted from the purple air sensor json
   */
	aqiFromPM(pm) {
		// invalid value
    if (pm < 0 || pm > 1000) {
			return 0
		}

		if (pm > 350.5) {
			return this.calcAQI(pm, 500, 401, 500, 350.5)
		} else if (pm > 250.5) {
			return this.calcAQI(pm, 400, 301, 350.4, 250.5)
		} else if (pm > 150.5) {
			return this.calcAQI(pm, 300, 201, 250.4, 150.5)
		} else if (pm > 55.5) {
			return this.calcAQI(pm, 200, 151, 150.4, 55.5)
		} else if (pm > 35.5) {
			return this.calcAQI(pm, 150, 101, 55.4, 35.5)
		} else if (pm > 12.1) {
			return this.calcAQI(pm, 100, 51, 35.4, 12.1)
		} else if (pm >= 0) {
			return this.calcAQI(pm, 50, 0, 12, 0)
		}
    
    // likely an error in the pm grouping above
		return 0
	},

  /**
   * Creates a short message about the current AQI value.
   * Breaks defined by the PurpleAIR provided formulas
   * 
   * @param {*} aqi value derived from aqiFromPM()
   * @returns string short message
   */
	getAQIDescription(aqi) {
		if (aqi <= 50) {
			return "Good"
		}
		if (aqi <= 100) {
			return "Moderate"
		}
		if (aqi <= 150) {
			return "Unhealthy for Sensitive Groups"
		}
		if (aqi <= 200) {
			return "Unhealthy"
		}
		if (aqi <= 300) {
			return "Very Unhealthy"
		}
		return "Hazardous"
	},
	
  /**
   * Creates a nice color representation of the current aqi
   * 
   * @param {*} aqi 
   * @returns string emoji color
   */
	iconForAQI(aqi) {
		if (aqi <= 50) {
			return "🟩"
		}
		if (aqi <= 100) {
			return "🟨"
		}
		if (aqi <= 150) {
			return "🟧"
		}
		if (aqi <= 200) {
			return "🟥"
		}
		if (aqi <= 300) {
			return "🟪"
		}
		return "💀"
	},
	
  /**
   * Longer form message representing the given AQI
   * 
   * @param {*} aqi 
   * @returns 
   */
	getAQIMessage(aqi)  {
		if (aqi <= 50) {
			return "Satisfactory, little or no risk"
		}
		if (aqi <= 100) {
			return "Acceptable; moderate health concern"
		}
		if (aqi <= 150) {
			return "Possible health effects"
		}
		if (aqi <= 200) {
			return "Health effects likely"
		}
		if (aqi <= 300) {
			return "Emergency conditions!"
		}
		return "Health alert! Serious health effects!"
	},
	
  /**
   * Formula for the AQI calculation comes from PurpleAir's 
   * support team and can be viewed here 
   * https://docs.google.com/document/d/15ijz94dXJ-YAZLi9iZ_RaBwrZ4KtYeCy08goGBwnbCU/edit
   */
	calcAQI(Cp, Ih, Il, BPh, BPl) {
		const a = (Ih - Il)
		const b = (BPh - BPl)
		const c = (Cp - BPl)
		return Math.round((a/b)*c + Il)
	},

	// this is the major worker of the module, it provides the displayable content for this module
	getDom: function() {
		const { sensor } = this.currentData || {};
		if (!sensor){
			var wrapper = document.createElement("div");
			wrapper.innerHTML = `loading...`;
			return wrapper;
		}

		const aqi = this.aqiFromPM(sensor.stats["pm2.5_10minute"])

		var wrapper = document.createElement("div");
		wrapper.className = "wrapper"

		var sensorName = document.createElement("h3");
		sensorName.className = "sensor-name"
		sensorName.innerHTML = `${sensor.name}`;
		
		var sensorValue = document.createElement("div");
		sensorValue.className = "sensor-value"
		sensorValue.innerHTML = `${aqi}&nbsp;&nbsp;${this.iconForAQI(aqi)}`;

		var sensorValueDescription = document.createElement("div");
		sensorValueDescription.className = "sensor-value-description"
		sensorValueDescription.innerHTML = `${this.getAQIMessage(aqi)}`;

		wrapper.appendChild(sensorName);
		wrapper.appendChild(sensorValue);
		wrapper.appendChild(sensorValueDescription);


		// pass the created content back to MM to add to DOM.
		return wrapper;
	},


  /**
   * Sends a message out to the node_helper that will call for updated sensor data
   */
	getData: function() {
    Log.info('MMM-PurpleAir: refreshing sensor data...');
    this.sendSocketNotification(
			//'MMM-PurpleAir.Request',
      this.notificationName(NotificationType.Request),
			{
				responseKey: this.notificationName(NotificationType.Response),
				req: {
					url: `https://api.purpleair.com/v1/sensors/${this.config.sensorIndex}`,
					headers: {
						"X-API-Key": this.config.apiKey,
					}
				}
			}
		);
	},

  /**
   * Schedules a getData call after delaySec
   * 
   * @param {number} delaySec 
   */
  scheduleUpdate: function(delaySec) {
		const that = this;
		const nextLoadMillis = (delaySec || this.config.updateIntervalSec) * 1000;
    Log.info(`MMM-PurpleAir: scheduling data update for ${this.config.sensorIndex} in ${nextLoadMillis} millis...`);

		setTimeout(function() {
			that.getData();
			that.scheduleUpdate();
		}, nextLoadMillis);
	},
})
