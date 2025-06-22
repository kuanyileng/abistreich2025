// data.js – Spielstand & Tippdaten persistent verwalten
const fs = require("fs");
const file = "./spielstand.json";

let data = {
  spieler: {},
  aktuelleRunde: 1,
  tipps: {},
};

// Lade Daten bei Start
if (fs.existsSync(file)) {
  try {
    const inhalt = fs.readFileSync(file, "utf8");
    data = JSON.parse(inhalt);
    console.log("✅ Spielstand geladen");
  } catch (err) {
    console.error("⚠️ Fehler beim Laden von spielstand.json:", err);
  }
}

// Speichern-Funktion
function speichern() {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  data,
  speichern,
};
