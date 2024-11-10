Module.register("MMM-ShellyPV", {
    defaults: {
        updateInterval: 60000, // Aktualisierungsintervall in Millisekunden (standardmäßig jede Minute)
    },

    start: function () {
        this.shellyData = [];
        this.sendSocketNotification("CONFIG", this.config);
        this.scheduleUpdate();
    },

    scheduleUpdate: function () {
        setInterval(() => {
            this.sendSocketNotification("GET_SHELLYPV_STATUS");
        }, this.config.updateInterval);
    },

    getStyles: function () {
        return ["MMM-ShellyPV.css"];
    },

    getTranslations: function () {
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        };
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "SHELLYPV_STATUS_UPDATE") {
            this.shellyData = payload;
            this.updateDom();
        }
    },

    getDom: function () {
        const wrapper = document.createElement("div");
        wrapper.className = "shellyPVGauge";

        // Gesamtenergieverbrauch berechnen
        let totalPower = 0;
        this.shellyData.forEach((device) => {
            if (device.power !== null) {
                totalPower += device.power;
            }
        });

        // Gauge-Element erstellen
        const gauge = document.createElement("div");
        gauge.id = "powerGauge";
        wrapper.appendChild(gauge);

        // Hinzufügen des SVG-Gauge Meters
        this.createGauge(gauge, totalPower/*, this.config.MaxPower || 100, this.config.Radius || 100*/);

        // Liste der Geräte erstellen
        if (this.config.ShowShellyList) {
		const deviceList = document.createElement("ul");
	        this.shellyData.forEach((device) => {
	            const listItem = document.createElement("li");
		    listItem.textContent = device.name;
	                
			// Klasse basierend auf dem Status hinzufügen (on oder off)
	        	if (device.isOn) {
	            		listItem.classList.add('on'); // Gerät ist eingeschaltet
	        	} else {
	            		listItem.classList.add('off'); // Gerät ist ausgeschaltet
	        	}
		   	   
		    deviceList.appendChild(listItem);
	        });
	        wrapper.appendChild(deviceList); // Geräte-Liste anhängen
        }
        return wrapper;
    },

    // Hilfsfunktion zum Erstellen des Gauges
    createGauge: function (element, power) {
        const radius = this.config.Radius || 100; // Standardradius, falls nicht gesetzt
        const maxPower = this.config.MaxPower ||  null; // Standardwert, falls nicht gesetzt
    
    // SVG für das Gauge erstellen
    element.innerHTML = `
        <svg width="${radius * 2}" height="${radius * 2}" viewBox="-10 -10 ${radius * 2 + 20} ${radius * 2 + 10}">
            <!-- Filterdefinitionen für Schatten und Glanz -->
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="5" dy="5" stdDeviation="5" flood-color="rgba(0, 0, 0, 0.6)" />
                </filter>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            
            <!-- Hintergrund des Kreises mit Schatten und Glanz -->
            <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="#E0E0E0" stroke-width="15" fill="none" filter="url(#glow)" />
	    <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="#E0E0E0" stroke-width="15" fill="none" filter="url(#shadow)" />
            
            <!-- Fortschrittsanzeige, abhängig vom Energieverbrauch -->
            <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="#3eaf7c" stroke-width="15" fill="none"
                stroke-dasharray="${Math.min(power, maxPower) * 2 * Math.PI * (radius - 10) / maxPower} ${(2 * Math.PI * (radius - 10))}"/* filter="url(#glow)"*/ />
            
            <!-- Textanzeige des aktuellen Energieverbrauchs, mittig im Kreis mit Schatten -->
            <text x="${radius}" y="${radius}" text-anchor="middle" font-size="22" fill="#fff" filter="url(#shadow)">
                ${power.toFixed(2)} W
            </text>
            
            ${maxPower ? `
            <!-- Textanzeige des Maximalwerts unterhalb des aktuellen Werts mit Schatten -->
            <text x="${radius}" y="${radius * 1.3}" text-anchor="middle" font-size="18" fill="#879194" filter="url(#shadow)">
                Max: ${maxPower} W
            </text>
            ` : ""}
        </svg>
        `;
    }
});
