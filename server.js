const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");
const path = require("path");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

let spieler = {};
let tipps = {};
let aktuelleRunde = 1;
const maxRunden = 7;
let spielLäuft = false;

const spielstandDatei = "./spielstand.json";

function ladeSpielstand() {
  if (fs.existsSync(spielstandDatei)) {
    const daten = fs.readFileSync(spielstandDatei, "utf-8");
    const parsed = JSON.parse(daten);
    spieler = parsed.spieler || {};
    aktuelleRunde = parsed.aktuelleRunde || 1;
  }
}

function speichereSpielstand() {
  fs.writeFileSync(
    spielstandDatei,
    JSON.stringify({ spieler, aktuelleRunde }, null, 2)
  );
}

function aktualisiereRangliste() {
  const liste = Object.entries(spieler)
    .map(([name, daten]) => ({ name, punkte: daten.punkte }))
    .sort((a, b) => b.punkte - a.punkte);
  io.emit("updateRangliste", liste);
}

function sendeEndergebnisse() {
  const platzierungen = Object.entries(spieler)
    .map(([name, daten]) => ({ name, punkte: daten.punkte }))
    .sort((a, b) => b.punkte - a.punkte);
  platzierungen.forEach((eintrag, index) => {
    io.emit("finalergebnis", {
      username: eintrag.name,
      platz: index + 1,
      punkte: eintrag.punkte,
    });
  });
}

ladeSpielstand();

io.on("connection", (socket) => {
  console.log("Neuer Client verbunden");

  const ADMIN_PASSWORT = "abikalypse2025"; // Sicheres Passwort definieren

  socket.on("ranglisteReset", (eingegebenesPasswort) => {
    if (eingegebenesPasswort !== ADMIN_PASSWORT) {
      socket.emit("resetFehlgeschlagen");
      return;
    }

    // Spieler & Daten zurücksetzen
    spieler = {};
    aktuelleRunde = 1;
    tipps = {};
    speichereSpielstand(); // Persistente Löschung
    aktualisiereRangliste(); // UI leeren

    socket.emit("resetErfolg");
  });

  socket.on("registriereSpieler", (username) => {
  // Trim und Normalisierung (optional)
  const name = username.trim();

  // Spielername bereits vergeben?
  if (spieler[name]) {
    socket.emit("registrierungFehlgeschlagen", "Name bereits vergeben. Bitte wähle einen anderen.");
    return;
  }

  // Spieler neu anlegen
  spieler[name] = { punkte: 100 };
  speichereSpielstand();

  socket.emit("registriert", {
    punkte: spieler[name].punkte,
    verloren: false,
  });
  aktualisiereRangliste();
});


  socket.on("tippAbgegeben", ({ username, einsatz, tipp }) => {
    if (!spieler[username] || spieler[username].punkte < einsatz || !spielLäuft)
      return;
    tipps[username] = { einsatz, tipp };
  });

  socket.on("adminStartetSpiel", () => {
    if (spielLäuft || aktuelleRunde > maxRunden) return;
    spielLäuft = true;
    tipps = {};
    io.emit("spielStartet", aktuelleRunde);
  });

  socket.on("adminBeendetSpiel", () => {
    spielLäuft = false;
    sendeEndergebnisse();
  });

  socket.on("adminSetztGewinner", (gewinner) => {
    if (!spielLäuft) return;
    for (let name in tipps) {
      const { einsatz, tipp } = tipps[name];
      const gewonnen = tipp === gewinner;
      if (gewonnen) {
        spieler[name].punkte += einsatz;
        io.emit("spielErgebnis", {
          username: name,
          ergebnis: "win",
          betrag: einsatz,
        });
      } else {
        spieler[name].punkte -= einsatz;
        io.emit("spielErgebnis", {
          username: name,
          ergebnis: "lose",
          betrag: einsatz,
        });
      }
      if (spieler[name].punkte <= 0) {
        io.emit("gameOver", name);
      }
    }
    aktuelleRunde++;
    speichereSpielstand();
    spielLäuft = false;
    aktualisiereRangliste();
    if (aktuelleRunde > maxRunden) {
      sendeEndergebnisse();
    } else {
      io.emit("neueRunde", aktuelleRunde);
    }
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/public/admin.html");
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
