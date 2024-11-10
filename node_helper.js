const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function () {
        this.config = {};

        // Verzögerung einfügen, um sicherzustellen, dass MagicMirror vollständig geladen ist
        setTimeout(() => {
            console.log("MagicMirror is ready. Fetching ShellyPV status...");
            this.fetchShellyPVStatus();
        }, 15000); // Verzögert um 5 Sekunden (5000 ms)
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;

            // Sobald die Konfiguration empfangen wurde, kann die Statusabfrage gestartet werden
            if (this.config.shellysPV && Array.isArray(this.config.shellysPV)) {
                console.log("Configuration received, fetching ShellyPV status...");
                this.fetchShellyPVStatus();
            }
        } else if (notification === "GET_SHELLYPV_STATUS") {
            this.fetchShellyPVStatus();
        }
    },

    fetchShellyPVStatus: async function () {
        const results = [];

        // Überprüfen, ob 'shellys' existiert und ein Array ist
        if (!this.config.shellysPV || !Array.isArray(this.config.shellysPV)) {
            console.error("No valid shellysPV configuration found or 'shellysPV' is not an array.");
            return;
        }

        for (const shellyPV of this.config.shellysPV) {
            try {
                const response = await axios.post(
                    `${this.config.serverUri}/device/status`,
                    `id=${shellyPV.id}&auth_key=${this.config.authKey}`
                );

                const data = response.data?.data?.device_status;

                if (data) {
                    const isOn = data.relays ? data.relays[0].ison : data["switch:0"].output;
                    const power = data.meters ? data.meters[0].power : data["switch:0"].apower;

                    results.push({
                        name: shellyPV.name,
                        isOn: isOn,
                        power: power !== undefined ? power : null,
			statusClass: isOn ? 'on' : 'off', // Dynamisch die Klasse setzen
                    });
                } else {
                    results.push({
                        name: shellyPV.name,
                        isOn: false,
                        power: null,
			statusClass: 'off', // Standardmäßig ausgeschaltet
                    });
                }
            } catch (error) {
                console.error(`Error fetching status for ${shellyPV.name}:`, error);
                results.push({
                    name: shellyPV.name,
                    isOn: false,
                    power: null,
		    statusClass: 'off', // Standardmäßig ausgeschaltet
                });
            }
        }

        this.sendSocketNotification("SHELLYPV_STATUS_UPDATE", results);
    },

    fetchShellyPVStatus: async function () {
        const results = [];

        // Überprüfen, ob 'shellys' existiert und ein Array ist
        if (!this.config.shellysPV || !Array.isArray(this.config.shellysPV)) {
            console.error("No valid shellysPV configuration found or 'shellysPV' is not an array.");
            return;
        }

        for (const shellyPV of this.config.shellysPV) {
            try {
                const response = await axios.post(
                    `${this.config.serverUri}/device/status`,
                    `id=${shellyPV.id}&auth_key=${this.config.authKey}`
                );

                const data = response.data?.data?.device_status;

                if (data) {
                    const isOn = data.relays ? data.relays[0].ison : data["switch:0"].output;
                    const power = data.meters ? data.meters[0].power : data["switch:0"].apower;

                    results.push({
                        name: shellyPV.name,
                        isOn: isOn,
                        power: power !== undefined ? power : null,
                    });
                } else {
                    results.push({
                        name: shellyPV.name,
                        isOn: false,
                        power: null,
                    });
                }
            } catch (error) {
                console.error(`Error fetching status for ${shellyPV.name}:`, error);
                results.push({
                    name: shellyPV.name,
                    isOn: false,
                    power: null,
                });
            }
        }

        this.sendSocketNotification("SHELLYPV_STATUS_UPDATE", results);
    },
});
