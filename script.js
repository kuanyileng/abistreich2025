const socket = io();

let username = "";
let aktuellePunkte = 0;
let aktuelleRunde = 1;

function zeigeScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((div) => (div.style.display = "none"));
  document.getElementById(id).style.display = "block";
  document.getElementById(
    "guthabenAnzeige"
  ).innerText = `${aktuellePunkte} Promberger`;
}

document.getElementById("speichernBtn").onclick = () => {
  const nameInput = document.getElementById("nameInput").value.trim();
  if (nameInput !== "") {
    username = nameInput;
    socket.emit("registriereSpieler", username);
  }
};

document.getElementById("tippForm").onsubmit = (e) => {
  e.preventDefault();
  const einsatz = parseInt(document.getElementById("einsatz").value);
  const tipp = document.querySelector('input[name="tipp"]:checked')?.value;

  if (isNaN(einsatz) || einsatz <= 0 || einsatz > aktuellePunkte) {
    alert("Ungültiger Einsatz!");
    return;
  }
  if (!tipp) {
    alert("Bitte wähle Lehrer oder Schüler!");
    return;
  }

  socket.emit("tippAbgegeben", { username, einsatz, tipp });
  zeigeScreen("warte");
};

socket.on("registriert", (data) => {
  aktuellePunkte = data.punkte;
  if (data.verloren) {
    zeigeScreen("verloren");
  } else {
    zeigeScreen("guthaben");
  }
});

socket.on("spielStartet", (runde) => {
  aktuelleRunde = runde;
  document.getElementById("spielnummer").innerText = `Spiel ${runde}`;
  zeigeScreen("tipp");
});

socket.on("spielErgebnis", ({ username: u, ergebnis, betrag }) => {
  if (u !== username) return;

  aktuellePunkte =
    ergebnis === "win" ? aktuellePunkte + betrag : aktuellePunkte - betrag;
  document.getElementById("ergebnisText").innerText =
    ergebnis === "win"
      ? `You win! +${betrag} Promberger`
      : `You lost! -${betrag} Promberger`;
  zeigeScreen("ergebnis");
});

socket.on("gameOver", (name) => {
  if (name === username) {
    zeigeScreen("verloren");
  }
});

socket.on("neueRunde", (runde) => {
  aktuelleRunde = runde;
});

socket.on("finalergebnis", ({ username: u, platz, punkte }) => {
  if (u === username) {
    document.getElementById(
      "endstand"
    ).innerText = `Dein finales Guthaben beträgt: ${punkte} Promberger. Du bist Platz ${platz}.`;
    zeigeScreen("ende");
  }
});

socket.on("registrierungFehlgeschlagen", (nachricht) => {
  alert(nachricht);
});

// Ganz am Ende von script.js hinzufügen:
zeigeScreen("start");
