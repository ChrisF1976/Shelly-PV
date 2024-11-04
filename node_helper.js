const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function () {
        this.config = {};
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
        } else if (notification === "GET_SHELLY_STATUS") {
            this.fetchShellyStatus();
        }
    },

    fetchShellyStatus: async function () {
        const results = [];

        for (const shelly of this.config.shellys) {
            try {
                const response = await axios.post(
                    `${this.config.serverUri}/device/status`,
                    `id=${shelly.id}&auth_key=${this.config.authKey}`
                );

                const data = response.data?.data?.device_status;

                if (data) {
                    const isOn = data.relays ? data.relays[0].ison : data["switch:0"].output;
                    const power = data.meters ? data.meters[0].power : data["switch:0"].apower;

                    results.push({
                        name: shelly.name,
                        isOn: isOn,
                        power: power !== undefined ? power : null,
                    });
                } else {
                    results.push({
                        name: shelly.name,
                        isOn: false,
                        power: null,
                    });
                }
            } catch (error) {
                console.error(`Error fetching status for ${shelly.name}:`, error);
                results.push({
                    name: shelly.name,
                    isOn: false,
                    power: null,
                });
            }
        }

        this.sendSocketNotification("SHELLY_STATUS_UPDATE", results);
    },
});
