Module.register("MMM-ShellyStatusTable", {
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
            this.sendSocketNotification("GET_SHELLY_STATUS");
        }, this.config.updateInterval);
    },

    getStyles: function () {
        return ["MMM-ShellyStatusTable.css"];
    },

    getTranslations: function () {
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        };
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "SHELLY_STATUS_UPDATE") {
            this.shellyData = payload;
            this.updateDom();
        }
    },

    getDom: function () {
        const wrapper = document.createElement("table");
        wrapper.className = "shellyTable";

        // Tabellenkopf erstellen
        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `
            <th>${this.translate("DEVICE")}</th>
            <th>${this.translate("STATUS")}</th>
            <th>${this.translate("POWER")}</th>
        `;
        wrapper.appendChild(headerRow);

        // Gesamtenergieverbrauch berechnen
        let totalPower = 0;

        // Tabelleneinträge für jedes Gerät hinzufügen
        this.shellyData.forEach((device) => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${device.name}</td>
                <td>${device.isOn ? this.translate("ON") : this.translate("OFF")}</td>
                <td>${device.power !== null ? device.power.toFixed(2) + " W" : this.translate("NA")}</td>
            `;
            wrapper.appendChild(row);

            // Energieverbrauch hinzufügen, wenn vorhanden
            if (device.power !== null) {
                totalPower += device.power;
            }
        });

        // Zeile für Gesamtverbrauch hinzufügen
        const totalRow = document.createElement("tr");
        totalRow.innerHTML = `
            <td><strong>${this.translate("TOTAL")}:</strong></td>
            <td></td>
            <td><strong>${totalPower.toFixed(2)} W</strong></td>
        `;
        wrapper.appendChild(totalRow);

        return wrapper;
    },
});
