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
    const radius = this.config.Radius || 100;
    const maxPower = this.config.MaxPower || 100; // Maximalwert für den Gauge-Bereich

    const isExporting = power < 0; // Prüfen, ob der Wert negativ ist (Rückspeisung)
    const displayPower = Math.abs(power); // Absoluten Wert für die Anzeige verwenden
    const circleColor = isExporting ? "#3498db" : "#3eaf7c"; // Farbe abhängig von Verbrauch oder Export

    // SVG für das Gauge erstellen
    element.innerHTML = `
        <svg width="${radius * 2}" height="${radius * 2}" viewBox="-10 -10 ${radius * 2 + 20} ${radius * 2 + 10}">
            <!-- Filter für Schatten und Glanz -->
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
            </defs>

            <!-- Hintergrund des Kreises mit Glanz- und Schatteneffekt -->
            <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="#ddd" stroke-width="15" fill="none" filter="url(#shadow)" />
            
           <!-- Fortschrittsanzeige, abhängig vom Energieverbrauch oder Export -->
            <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="${circleColor}" stroke-width="15" fill="none"
                stroke-dasharray="${Math.min(displayPower, maxPower) * 2 * Math.PI * (radius - 10) / maxPower} ${(2 * Math.PI * (radius - 10))}" 
                transform="rotate(-90 ${radius} ${radius})" />

            <!-- Textanzeige des aktuellen Werts, mit neuer Zeile für "Export" oder "Verbrauch" -->
            <text x="${radius}" y="${radius}" text-anchor="middle" font-size="20" fill="#333">
                ${displayPower.toFixed(2)} W
            </text>
            
            ${isExporting ? `
            <text x="${radius}" y="${radius * 1.5}" text-anchor="middle" font-size="16" fill="#3498db">
                Export
            </text>
            ` : `
            <text x="${radius}" y="${radius * 1.5}" text-anchor="middle" font-size="16" fill="#3eaf7c">
                Verbrauch
            </text>
            `}

            ${maxPower ? `
            <!-- Textanzeige des Maximalwerts -->
            <text x="${radius}" y="${radius * 1.3}" text-anchor="middle" font-size="16" fill="#333">
                Max: ${maxPower} W
            </text>
            ` : ""}
        </svg>
        `;
    }
});
