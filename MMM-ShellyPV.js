Module.register("MMM-ShellyPV", {
    defaults: {
        showPowerValue: true,
        updateInterval: 30 * 1000, // Alle 30 Sekunden aktualisieren
        Radius: "80",
        ShowShellyList: true,
        SecondGauge: true,
        Sum: true,
    },

    start: function () {
        this.shellyData = [];
        // Sicherstellen, dass numerische Werte korrekt initialisiert sind
        this.config.MaxPower = parseFloat(this.config.MaxPower) || null;
        this.config.MaxPowerSource = parseFloat(this.config.MaxPowerSource) || null;
        this.config.Radius = parseFloat(this.config.Radius) || 80;
        this.config.shellysSOURCE = this.config.shellysSOURCE || []; // Sicherstellen, dass shellysSOURCE definiert ist
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

        // Gesamtenergieverbrauch berechnen (unter Ausschluss von Source-Geräten)
        let totalPower = 0;
        this.shellyData.forEach((device) => {
            const isSourceDevice = Array.isArray(this.config.shellysSOURCE) &&
                this.config.shellysSOURCE.some(
                    (sourceDevice) => sourceDevice.name === device.name
                );

            // Add power only if the device is not a source device
            if (!isSourceDevice && device.power !== null) {
                totalPower += device.power;
            }
        });

        // Haupt-Gauge erstellen
        const gauge = document.createElement("div");
        gauge.id = "powerGauge";
        wrapper.appendChild(gauge);

        // Erstelle Haupt-Gauge
        this.createGauge(gauge, totalPower);

        // Liste der Geräte erstellen
        if (this.config.ShowShellyList) {
            const deviceList = document.createElement("ul");

            this.shellyData.forEach((device) => {
                const listItem = document.createElement("li");
                listItem.textContent = device.name;

                // Prüfen, ob das Gerät in shellysSOURCE ist
                const specialDevice = Array.isArray(this.config.shellysSOURCE) &&
                    this.config.shellysSOURCE.find(sourceDevice => sourceDevice.name === device.name);
		

                if (specialDevice) {
                    listItem.classList.add('specialDevice');
                } else if (device.isOn) {
                    listItem.classList.add('on');
                } else {
                    listItem.classList.add('off');
                }

                // Power-Wert anzeigen, wenn aktiviert
                if (this.config.showPowerValue) {
                    const powerValue = document.createElement("span");
                    powerValue.className = "ShellyDevicePowerValue";
                    powerValue.textContent = ` (${device.power || 0}W)`;
                    listItem.appendChild(powerValue);
                }

                deviceList.appendChild(listItem);
            });

            wrapper.appendChild(deviceList);
        }

        return wrapper;
    },

    // Hilfsfunktion zum Erstellen des Gauges
    createGauge: function (element, power) {
        const radius = this.config.Radius;
        const maxPower = this.config.MaxPower;
        const maxPowerSource = this.config.MaxPowerSource;

        // Main circle calculations
        const isExporting = power < 0;
        const displayPower = Math.abs(power); // Ignore whether it's exporting for circle calculation
        const circleColor = isExporting ? "#3498db" : "#3eaf7c";

        const mainCircleDashArray =
            (Math.min(displayPower, maxPower) * 2 * Math.PI * (radius - 10)) / maxPower;

        // Secondary circle calculations (only dependent on the special device)
        const specialDevicePower = this.getSpecialDevicePower();
        const validSpecialDevicePower = specialDevicePower !== null ? Math.abs(specialDevicePower) : 0; // Ensure non-negative
        const cappedSpecialDevicePower = Math.min(validSpecialDevicePower, maxPowerSource);
        const specialCircleDashArray =
            (cappedSpecialDevicePower * 2 * Math.PI * (radius - 25)) / maxPowerSource;

        // Adjust viewBox to be larger than the radius to accommodate glow effects
        const viewBoxMargin = 20; // Extra margin to prevent clipping of the glow
        const viewBoxSize = radius * 2 + viewBoxMargin * 2;
        
	// Berechnung der Gesamtsumme, wenn Sum aktiviert ist
	let totalPowerSum = displayPower; // Grundsumme
	if (this.config.Sum) {
	    totalPowerSum -= validSpecialDevicePower; // Spezialgeräte-Leistung hinzufügen
	}
	
        // SVG rendering
        element.innerHTML = `
            <svg width="${radius * 2}" height="${radius * 2}" viewBox="-${viewBoxMargin} -${viewBoxMargin} ${viewBoxSize} ${viewBoxSize}">
                <!-- Shadow and glow filters -->
                <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="5" dy="5" stdDeviation="5" flood-color="rgba(0, 0, 0, 0.7)" />
                    </filter>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
               
                <!-- Main circle background -->
                <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="#E0E0E0" stroke-width="15" fill="none" filter="url(#glow)"/>
                <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="#E0E0E0" stroke-width="15" fill="none" filter="url(#shadow)"/>
                <!-- Main circle progress -->
                <circle cx="${radius}" cy="${radius}" r="${radius - 10}" stroke="${circleColor}" stroke-width="15" fill="none"
                    stroke-dasharray="${mainCircleDashArray} ${(2 * Math.PI * (radius - 10))}" 
                    stroke-dashoffset="0"
                    transform="rotate(-90 ${radius} ${radius})" />

                <!-- Secondary circle background (if enabled) -->
                ${
                    this.config.SecondGauge
                        ? `
                <circle cx="${radius}" cy="${radius}" r="${radius - 25}" stroke="#E0E0E0" stroke-width="10" fill="none" filter="url(#glow)"/>
                <circle cx="${radius}" cy="${radius}" r="${radius - 25}" stroke="#E0E0E0" stroke-width="10" fill="none" filter="url(#shadow)"/>
                `
                        : ""
                }

                <!-- Secondary circle progress -->
                ${
                    this.config.SecondGauge && specialDevicePower !== null
                        ? `
                <circle cx="${radius}" cy="${radius}" r="${radius - 25}" stroke="#3498db" stroke-width="10" fill="none"
                    stroke-dasharray="${specialCircleDashArray} ${(2 * Math.PI * (radius - 25))}" 
                    stroke-dashoffset="0"
                    transform="rotate(-90 ${radius} ${radius})" />
                `
                        : ""
                }

                <!-- Main circle text -->
                <text x="${radius}" y="${radius}" text-anchor="middle" font-size="22" fill="#fff" filter="url(#shadow)">
                   ${this.config.Sum ? totalPowerSum.toFixed(2) : displayPower.toFixed(2)} W
                </text>

                <!-- Secondary circle text -->
                ${
                    this.config.SecondGauge && specialDevicePower !== null
                        ? `
                <text x="${radius}" y="${radius * 1.3}" text-anchor="middle" font-size="20" fill="#3498db" filter="url(#shadow)">
                    ${cappedSpecialDevicePower.toFixed(2)} W
                </text>
                `
                        : ""
                }
            </svg>
        `;
    },

    getSpecialDevicePower: function () {
        if (!Array.isArray(this.config.shellysSOURCE) || this.config.shellysSOURCE.length === 0) {
            console.warn("Keine Source-Geräte definiert");
            return null; // Keine Source-Geräte definiert
        }

        let totalSpecialDevicePower = 0;

        this.config.shellysSOURCE.forEach((sourceDevice) => {
            const device = this.shellyData.find(
                (d) => d.name === sourceDevice.name
            );
            if (device && device.power !== null) {
                totalSpecialDevicePower += device.power;
            }
        });

        return totalSpecialDevicePower || 0; // Gib 0 zurück, falls keine Werte summiert wurden
    },
});
