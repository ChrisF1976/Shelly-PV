const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function () {
        this.config = {};

        setTimeout(() => {
            console.log("MagicMirror is ready. Fetching ShellyPV status...");
            this.fetchShellyPVStatus();
        }, 15000); // Delay to ensure MagicMirror is fully loaded
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;

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
                    let isOn = false;
                    let power = null;

                    // Check for Gen 1/2 structure (relay-based devices)
                    if (data.relays) {
                        isOn = data.relays[0].ison;
                        power = data.meters ? data.meters[0].power : null;
                    }
                    // Check for Gen 3 structure (pm1:0 devices)
                    else if (data["pm1:0"]) {
                        isOn = true;  // Assume true if data exists for the device
                        power = data["pm1:0"].apower; // Use 'apower' from pm1:0
                    }
                    // Check for "switch:0" structure
                    else if (data["switch:0"]) {
                        isOn = data["switch:0"].output; // Use 'output' for on/off status
                        power = data["switch:0"].apower; // Use 'apower' for power
                    }

                    results.push({
                        name: shellyPV.name,
                        isOn: isOn,
                        power: power !== undefined ? power : null,
                        statusClass: isOn ? 'on' : 'off', // Dynamically set status class
                    });
                } else {
                    results.push({
                        name: shellyPV.name,
                        isOn: false,
                        power: null,
                        statusClass: 'off', // Default to off if no data found
                    });
                }
            } catch (error) {
                console.error(`Error fetching status for ${shellyPV.name}:`, error);
                results.push({
                    name: shellyPV.name,
                    isOn: false,
                    power: null,
                    statusClass: 'off', // Default to off on error
                });
            }
        }

        this.sendSocketNotification("SHELLYPV_STATUS_UPDATE", results);
    },
});
