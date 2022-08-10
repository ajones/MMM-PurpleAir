const DefaultUpdateIntervalSec = 30;

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
		message: "default message if none supplied in config.js"
	},

	init: function(){
		Log.info(this.name + " is in init!");

	},

	start: function(){
		Log.info(this.name + " is starting!");
		
		this.updateIntervalSec = this.config.updateIntervalSec || DefaultUpdateIntervalSec;
		this.initialLoadDelaySec = this.config.initialLoadDelay || 3;
		
		this.scheduleUpdate(this.initialLoadDelaySec);
	},

	loaded: function(callback) {
		Log.info(this.name + " is loaded!");
		callback();
	},

	// return list of other functional scripts to use, if any (like require in node_helper)
	getScripts: function() {
	return	[
			// sample of list of files to specify here, if no files,do not use this routine, or return empty list

			//'script.js', // will try to load it from the vendor folder, otherwise it will load is from the module folder.
			//'moment.js', // this file is available in the vendor folder, so it doesn't need to be available in the module folder.
			//this.file('anotherfile.js'), // this file will be loaded straight from the module folder.
			//'https://code.jquery.com/jquery-2.2.3.min.js',  // this file will be loaded from the jquery servers.
		]
	}, 

	/*
	// return list of stylesheet files to use if any
	getStyles: function() {
		return 	[
			// sample of list of files to specify here, if no files, do not use this routine, , or return empty list

			//'script.css', // will try to load it from the vendor folder, otherwise it will load is from the module folder.
			//'font-awesome.css', // this file is available in the vendor folder, so it doesn't need to be avialable in the module folder.
			//this.file('anotherfile.css'), // this file will be loaded straight from the module folder.
			//'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css',  // this file will be loaded from the bootstrapcdn servers.
		]
	},
	*/
	// Define required scripts.
	getStyles: function () {
		return ["purpleair.css"];
	},

	// return list of translation files to use, if any
	/*getTranslations: function() {
		return {
			// sample of list of files to specify here, if no files, do not use this routine, , or return empty list

			// en: "translations/en.json",  (folders and filenames in your module folder)
			// de: "translations/de.json"
		}
	}, */ 



	// only called if the module header was configured in module config in config.js
	getHeader: function() {
		//return this.data.header + " Foo Bar";
	},

	// messages received from other modules and the system (NOT from your node helper)
	// payload is a notification dependent data structure
	notificationReceived: function(notification, payload, sender) {
		// once everybody is loaded up
		if(notification==="ALL_MODULES_STARTED"){
			// send our config to our node_helper
			this.sendSocketNotification("CONFIG",this.config)
		}
		if (sender) {
			Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name);
		} else {
			Log.log(this.name + " received a system notification: " + notification);
		}
	},

	// messages received from from your node helper (NOT other modules or the system)
	// payload is a notification dependent data structure, up to you to design between module and node_helper
	socketNotificationReceived: function(notification, payload) {
		Log.info(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		if(notification === "MMM-PurpleAir.Response"){
			this.currentData = JSON.parse(payload.response.body)
			
			// tell mirror runtime that our data has changed,
			// we will be called back at GetDom() to provide the updated content
			this.updateDom(1000)
		}
	},

	// system notification your module is being hidden
	// typically you would stop doing UI updates (getDom/updateDom) if the module is hidden
	suspend: function(){

	},

	// system notification your module is being unhidden/shown
	// typically you would resume doing UI updates (getDom/updateDom) if the module is shown
	resume: function(){

	},

	aqiFromPM(pm) {
		if (pm < 0) {
			return 0
		}
		if (pm > 1000) {
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
	
		return 0
	},

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
	
	getAQIMessage(aqi)  {
		if (aqi <= 50) {
			return "Satisfactory, air pollution poses little or no risk"
		}
		if (aqi <= 100) {
			return "Acceptable; moderate health concern for very sensitive people"
		}
		if (aqi <= 150) {
			return "Sensitive groups may experience health effects"
		}
		if (aqi <= 200) {
			return "Health effects likely"
		}
		if (aqi <= 300) {
			return "Health warnings of emergency conditions"
		}
		return "Health alert serious health effects!"
	},
	
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

	getData: function() {
        Log.info('MMM-PurpleAir: refreshing sensor data...');
        this.sendSocketNotification(
			'MMM-PurpleAir.Request',
			{
				url: `https://api.purpleair.com/v1/sensors/${this.config.sensorIndex}`,
				headers: {
					"X-API-Key": this.config.apiKey,
				}
			}
		);
	},

    scheduleUpdate: function(delaySec) {
		const that = this;
		const nextLoadMillis = (delaySec || this.updateIntervalSec) * 1000;
		
		setTimeout(function() {
			that.getData();
			that.scheduleUpdate(nextLoadMillis);
		}, nextLoadMillis);
	},
})