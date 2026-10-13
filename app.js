"use strict";

const KEY = "wedding_daten_v1";

const START_BUDGET = [
  "Location", "Catering und Getränke", "Kleidung", "Ringe", "Fotograf und Video",
  "Musik und DJ", "Dekoration und Blumen", "Einladungen und Papeterie", "Torte",
  "Trauung", "Transport", "Unterkunft", "Sonstiges"
];

const START_KATEGORIEN = ["Deko", "Musik", "Outfit", "Essen", "Sonstiges"];

// m = Monate vor der Hochzeit, d = Tage vor der Hochzeit
const START_CHECK = [
  { m: 12, t: "Location anfragen und besichtigen" },
  { m: 12, t: "Termin beim Standesamt anfragen" },
  { m: 12, t: "Budget festlegen" },
  { m: 10, t: "Fotograf buchen" },
  { m: 10, t: "Catering buchen" },
  { m: 10, t: "DJ oder Band buchen" },
  { m: 8, t: "Gästeliste erstellen" },
  { m: 8, t: "Save the Date verschicken" },
  { m: 6, t: "Brautkleid und Anzug aussuchen" },
  { m: 6, t: "Ringe aussuchen" },
  { m: 4, t: "Einladungen verschicken" },
  { m: 4, t: "Hotel für Gäste organisieren" },
  { m: 2, t: "Ablaufplan erstellen" },
  { m: 2, t: "Musikwünsche festlegen" },
  { m: 1, t: "Zusagen und Absagen prüfen" },
  { m: 1, t: "Dienstleister bestätigen" },
  { d: 7, t: "Letzte Absprachen treffen" },
  { d: 7, t: "Ringe und Dokumente bereitlegen" }
];

/* ---------- Daten ---------- */

function standard() {
  return {
    eingerichtet: false,
    name1: "", name2: "", datum: "", budget: 0,
    kreisName: "Engerer Kreis",
    checkliste: [], budgetKat: [], gaeste: [], dienstleister: [], ablauf: [],
    notizen: [], notizKat: START_KATEGORIEN.slice()
  };
}

function laden() {
  try {
    const roh = localStorage.getItem(KEY);
    if (roh) return Object.assign(standard(), JSON.parse(roh));
  } catch (e) { /* ignorieren */ }
  return standard();
}

const MODUS_KEY = "wedding_modus_v1";
let modus = null; // "lokal" oder "cloud"
try {
  const m = localStorage.getItem(MODUS_KEY);
  if (m === "lokal" || m === "cloud") modus = m;
} catch (e) { /* ignorieren */ }

function lokaleDaten() {
  try {
    const roh = localStorage.getItem(KEY);
    return roh ? JSON.parse(roh) : null;
  } catch (e) { return null; }
}

let daten = standard();

function speichern() {
  if (modus === "lokal") {
    try { localStorage.setItem(KEY, JSON.stringify(daten)); } catch (e) { alert("Speichern nicht möglich."); }
    return;
  }
  if (!window.Cloud) { alert("Cloud nicht verfügbar. Bitte Internetverbindung und firebase-config.js prüfen."); return; }
  window.Cloud.speichern(JSON.stringify(daten)).catch((e) => {
    alert("Speichern in der Cloud fehlgeschlagen: " + (e && (e.code || e.message) || "Fehler"));
  });
}

/* ---------- Hilfsfunktionen ---------- */

const $ = (id) => document.getElementById(id);

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function parseDatum(s) { const t = s.split("-").map(Number); return new Date(t[0], t[1] - 1, t[2]); }
function datumString(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function heute() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function tageZwischen(a, b) { return Math.round((b - a) / 86400000); }
function monateAbziehen(d, m) {
  const r = new Date(d.getFullYear(), d.getMonth() - m, 1);
  const letzter = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), letzter));
  return r;
}
function tageAbziehen(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n); }
function schoen(s) {
  return parseDatum(s).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}
function euro(n) { return Number(n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }

function zeile(label, wert, klasse) {
  return '<li class="' + (klasse || "") + '"><span>' + label + "</span><span>" + wert + "</span></li>";
}

function formModus(p, bearb, textNeu, textBearb) {
  $(p + "-form-titel").textContent = bearb ? textBearb : textNeu;
  $(p + "-abbrechen").hidden = !bearb;
  if (bearb) $(p + "-form").scrollIntoView({ behavior: "smooth", block: "center" });
}

function listenAktion(id, handler) {
  const el = $(id);
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-aktion]");
    if (!b || b.type === "checkbox") return;
    handler(b.dataset.aktion, b.dataset.id);
  });
  el.addEventListener("change", (e) => {
    const b = e.target;
    if (b.type === "checkbox" && b.dataset.aktion) handler(b.dataset.aktion, b.dataset.id);
  });
}

/* ---------- Fälligkeiten berechnen ---------- */

function berechneFaelligkeiten() {
  if (!daten.datum) return;
  const hz = parseDatum(daten.datum);
  const h = heute();
  const autos = daten.checkliste.filter((a) => a.auto && !a.erledigt);
  autos.forEach((a) => {
    a.soll = datumString(a.monate != null ? monateAbziehen(hz, a.monate) : tageAbziehen(hz, a.tage || 0));
  });
  const spaet = autos.filter((a) => parseDatum(a.soll) < h).sort((x, y) => (x.soll < y.soll ? -1 : 1));
  spaet.forEach((a, i) => {
    let d = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1 + i * 2);
    if (d > hz) d = h < hz ? hz : h;
    a.datum = datumString(d);
    a.ueberfaellig = true;
  });
  autos.filter((a) => parseDatum(a.soll) >= h).forEach((a) => { a.datum = a.soll; a.ueberfaellig = false; });
}

/* ---------- Navigation ---------- */

function zeigeSeite(name) {
  document.querySelectorAll(".seite").forEach((s) => { s.hidden = s.id !== "seite-" + name; });
  document.querySelectorAll("#menue button").forEach((b) => b.classList.toggle("aktiv", b.dataset.seite === name));
  window.scrollTo(0, 0);
}
$("menue").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-seite]");
  if (b) zeigeSeite(b.dataset.seite);
});

/* ---------- Anzeige ---------- */

function renderKopf() {
  const titel = "Wedding " + daten.name1 + "&" + daten.name2;
  $("titel").textContent = titel;
  document.title = titel;
  document.querySelectorAll(".kreis-name").forEach((e) => { e.textContent = daten.kreisName; });
  const opt = document.querySelector('#gast-filter option[value="kreis"]');
  if (opt) opt.textContent = "Nur " + daten.kreisName;
}

function renderStart() {
  const hz = daten.datum ? parseDatum(daten.datum) : null;
  const tage = hz ? tageZwischen(heute(), hz) : 0;
  $("countdown-tage").textContent = Math.abs(tage);
  if (tage > 0) $("countdown-text").textContent = (tage === 1 ? "Tag" : "Tage") + " bis zur Hochzeit";
  else if (tage === 0) $("countdown-text").textContent = "Heute ist euer großer Tag!";
  else $("countdown-text").textContent = "Tage seit der Hochzeit";
  $("start-datum").textContent = daten.datum ? schoen(daten.datum) : "";

  const erledigt = daten.checkliste.filter((a) => a.erledigt).length;
  const ueber = daten.checkliste.filter((a) => istUeberfaellig(a)).length;
  const g = summeGaeste(daten.gaeste);
  const geplant = daten.budgetKat.reduce((s, k) => s + (k.geplant || 0), 0);
  const ist = daten.budgetKat.reduce((s, k) => s + (k.tatsaechlich || 0), 0);
  $("start-uebersicht").innerHTML =
    zeile("Aufgaben erledigt", erledigt + " / " + daten.checkliste.length) +
    zeile("Überfällige Aufgaben", ueber, ueber > 0 ? "rot" : "") +
    zeile("Budget geplant", euro(geplant)) +
    zeile("Kosten tatsächlich", euro(ist)) +
    zeile("Gäste (Personen) gesamt", g.pers) +
    zeile("Zugesagt (Personen)", g.zu) +
    zeile("Dienstleister", daten.dienstleister.length) +
    zeile("Programmpunkte", daten.ablauf.length);
}

function istUeberfaellig(a) {
  return !a.erledigt && (a.ueberfaellig || parseDatum(a.datum) < heute());
}

function renderCheckliste() {
  const gesamt = daten.checkliste.length;
  const fertig = daten.checkliste.filter((a) => a.erledigt).length;
  $("check-info").textContent = fertig + " von " + gesamt + " erledigt";
  $("check-fortschritt").style.width = (gesamt ? (fertig / gesamt) * 100 : 0) + "%";

  const sortiert = daten.checkliste.slice().sort((a, b) => {
    if (a.erledigt !== b.erledigt) return a.erledigt ? 1 : -1;
    return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0;
  });
  $("check-liste").innerHTML = sortiert.length ? sortiert.map((a) => {
    let tag = "";
    if (!a.erledigt && a.auto && a.ueberfaellig) tag = '<span class="tag rot">Überfällig – bald erledigen</span>';
    else if (istUeberfaellig(a)) tag = '<span class="tag rot">Überfällig</span>';
    return '<li class="zeile' + (a.erledigt ? " fertig" : "") + '">' +
      '<input type="checkbox" data-aktion="haken" data-id="' + a.id + '"' + (a.erledigt ? " checked" : "") + ">" +
      '<div class="inhalt"><strong>' + esc(a.titel) + '</strong><span class="klein">' + schoen(a.datum) + "</span>" + tag + "</div>" +
      '<div class="knoepfe"><button type="button" data-aktion="bearbeiten" data-id="' + a.id + '">✎</button>' +
      '<button type="button" class="loesch" data-aktion="loeschen" data-id="' + a.id + '">✕</button></div></li>';
  }).join("") : '<li class="klein">Noch keine Aufgaben.</li>';
}

function budgetSumme() {
  const geplant = daten.budgetKat.reduce((s, k) => s + (k.geplant || 0), 0);
  const ist = daten.budgetKat.reduce((s, k) => s + (k.tatsaechlich || 0), 0);
  let html = zeile("Gesamtbudget", daten.budget ? euro(daten.budget) : "nicht festgelegt") +
    zeile("Geplant (Summe)", euro(geplant)) +
    zeile("Tatsächliche Kosten", euro(ist));
  if (daten.budget) {
    const rest = daten.budget - ist;
    html += rest >= 0 ? zeile("Noch übrig", euro(rest)) : zeile("Über dem Budget", euro(-rest), "rot");
    const frei = daten.budget - geplant;
    html += frei >= 0 ? zeile("Noch nicht verplant", euro(frei)) : zeile("Mehr geplant als Budget", euro(-frei), "rot");
  }
  $("budget-summe").innerHTML = html;
}

function renderBudget() {
  $("budget-liste").innerHTML = daten.budgetKat.length ? daten.budgetKat.map((k) =>
    '<div class="bud-zeile" data-id="' + k.id + '">' +
    '<div class="bud-kopf"><input type="text" data-feld="name" value="' + esc(k.name) + '">' +
    '<button type="button" data-aktion="loeschen" data-id="' + k.id + '">✕</button></div>' +
    '<div class="bud-felder">' +
    '<label>Geplant (€)<input type="number" inputmode="decimal" min="0" step="any" data-feld="geplant" value="' + (k.geplant || "") + '"></label>' +
    '<label>Tatsächlich (€)<input type="number" inputmode="decimal" min="0" step="any" data-feld="tatsaechlich" value="' + (k.tatsaechlich || "") + '"></label>' +
    "</div></div>"
  ).join("") : '<p class="klein">Keine Kategorien. Lege oben eine neue an.</p>';
  budgetSumme();
}

function summeGaeste(liste) {
  const r = { einl: 0, pers: 0, zu: 0, ab: 0, offen: 0 };
  liste.forEach((g) => {
    r.einl += g.einladungen; r.pers += g.personen;
    if (g.status === "zugesagt") r.zu += g.personen;
    else if (g.status === "abgesagt") r.ab += g.personen;
    else r.offen += g.personen;
  });
  return r;
}

function renderGaeste() {
  const alle = summeGaeste(daten.gaeste);
  const kreis = summeGaeste(daten.gaeste.filter((g) => g.kreis));
  $("gaeste-summe").innerHTML =
    zeile("Einladungen gesamt", alle.einl) +
    zeile("Personen gesamt", alle.pers) +
    zeile("Zugesagt", alle.zu) +
    zeile("Offen", alle.offen) +
    zeile("Abgesagt", alle.ab) +
    zeile("Erwartet (zugesagt + offen)", alle.zu + alle.offen) +
    zeile(esc(daten.kreisName), "", "unter") +
    zeile("Personen", kreis.pers) +
    zeile("davon zugesagt", kreis.zu) +
    zeile("davon offen", kreis.offen) +
    zeile("Einladungen", kreis.einl);

  const f = $("gast-filter").value;
  const liste = daten.gaeste.filter((g) => f === "alle" || (f === "kreis" ? g.kreis : !g.kreis));
  $("gast-liste").innerHTML = liste.length ? liste.map((g) => {
    const klasse = g.status === "zugesagt" ? "gruen" : g.status === "abgesagt" ? "rot" : "";
    return '<li class="zeile"><div class="inhalt"><strong>' + esc(g.name) + "</strong>" +
      '<span class="klein">' + g.personen + " Pers. · " + g.einladungen + " Einl.</span>" +
      '<span><span class="tag ' + klasse + '">' + esc(g.status) + "</span>" +
      (g.kreis ? '<span class="tag">' + esc(daten.kreisName) + "</span>" : "") + "</span>" +
      (g.notiz ? '<span class="pre">' + esc(g.notiz) + "</span>" : "") + "</div>" +
      '<div class="knoepfe"><button type="button" data-aktion="bearbeiten" data-id="' + g.id + '">✎</button>' +
      '<button type="button" class="loesch" data-aktion="loeschen" data-id="' + g.id + '">✕</button></div></li>';
  }).join("") : '<li class="klein">Keine Gäste in dieser Ansicht.</li>';
}

function renderDienstleister() {
  $("dl-liste").innerHTML = daten.dienstleister.length ? daten.dienstleister.map((d) =>
    '<li class="zeile"><div class="inhalt"><strong>' + esc(d.name) + '</strong><span class="klein">' + esc(d.art) + "</span></div>" +
    '<div class="knoepfe"><button type="button" data-aktion="bearbeiten" data-id="' + d.id + '">✎</button>' +
    '<button type="button" class="loesch" data-aktion="loeschen" data-id="' + d.id + '">✕</button></div></li>'
  ).join("") : '<li class="klein">Noch keine Dienstleister.</li>';
}

function renderAblauf() {
  $("ab-liste").innerHTML = daten.ablauf.length ? daten.ablauf.map((p) =>
    '<li class="zeile" data-id="' + p.id + '"><span class="griff" title="Ziehen">☰</span>' +
    '<span class="zeit">' + esc(p.zeit) + '</span><div class="inhalt"><strong>' + esc(p.titel) + "</strong></div>" +
    '<div class="knoepfe"><button type="button" data-aktion="bearbeiten" data-id="' + p.id + '">✎</button>' +
    '<button type="button" class="loesch" data-aktion="loeschen" data-id="' + p.id + '">✕</button></div></li>'
  ).join("") : '<li class="klein">Noch keine Programmpunkte.</li>';
}

function renderNotizen() {
  const aktFilter = $("no-filter").value || "alle";
  const aktKat = $("no-kategorie").value;
  const katOpt = daten.notizKat.map((k) => '<option value="' + esc(k) + '">' + esc(k) + "</option>").join("");
  $("no-kategorie").innerHTML = '<option value="">Ohne Kategorie</option>' + katOpt;
  $("no-kategorie").value = daten.notizKat.includes(aktKat) ? aktKat : "";
  $("no-filter").innerHTML = '<option value="alle">Alle</option>' + katOpt;
  $("no-filter").value = (aktFilter === "alle" || daten.notizKat.includes(aktFilter)) ? aktFilter : "alle";

  const f = $("no-filter").value;
  const liste = daten.notizen.filter((n) => f === "alle" || n.kat === f);
  $("no-liste").innerHTML = liste.length ? liste.map((n) =>
    '<li class="zeile"><div class="inhalt"><strong>' + esc(n.titel) + "</strong>" +
    '<span><span class="tag">' + esc(n.kat || "Ohne Kategorie") + "</span></span>" +
    (n.text ? '<span class="pre">' + esc(n.text) + "</span>" : "") + "</div>" +
    '<div class="knoepfe"><button type="button" data-aktion="bearbeiten" data-id="' + n.id + '">✎</button>' +
    '<button type="button" class="loesch" data-aktion="loeschen" data-id="' + n.id + '">✕</button></div></li>'
  ).join("") : '<li class="klein">Keine Notizen.</li>';

  $("no-kat-liste").innerHTML = daten.notizKat.map((k, i) =>
    '<li class="zeile"><div class="inhalt"><strong>' + esc(k) + "</strong></div>" +
    '<div class="knoepfe"><button type="button" data-aktion="umbenennen" data-id="' + i + '">✎</button>' +
    '<button type="button" class="loesch" data-aktion="loeschen" data-id="' + i + '">✕</button></div></li>'
  ).join("");
}

function renderEinstellungen() {
  $("e-name1").value = daten.name1;
  $("e-name2").value = daten.name2;
  $("e-datum").value = daten.datum;
  $("e-budget").value = daten.budget || "";
  $("e-kreis").value = daten.kreisName;
  $("modus-anzeige").textContent = modus === "cloud" ? "Cloud (mit Konto)" : "Lokal auf diesem Gerät";
  $("konto-karte").hidden = modus !== "cloud";
}

function renderAlles() {
  renderKopf(); renderStart(); renderCheckliste(); renderBudget(); renderGaeste();
  renderDienstleister(); renderAblauf(); renderNotizen(); renderEinstellungen();
}

/* ---------- Willkommen ---------- */

let zustand = "pruefen"; // waehlen | pruefen | login | laden | bereit
let lokalAngeboten = false;

function start() {
  $("modus").hidden = zustand !== "waehlen";
  $("login").hidden = zustand !== "login";
  $("laden").hidden = !(zustand === "pruefen" || zustand === "laden");
  const bereit = zustand === "bereit";
  $("willkommen").hidden = !(bereit && !daten.eingerichtet);
  $("app").hidden = !(bereit && daten.eingerichtet);
  if (bereit && daten.eingerichtet) renderAlles();
}

$("willkommen-form").addEventListener("submit", (e) => {
  e.preventDefault();
  daten.name1 = $("w-name1").value.trim();
  daten.name2 = $("w-name2").value.trim();
  daten.datum = $("w-datum").value;
  daten.budget = Number($("w-budget").value) || 0;
  daten.budgetKat = START_BUDGET.map((n) => ({ id: uid(), name: n, geplant: 0, tatsaechlich: 0 }));
  daten.checkliste = START_CHECK.map((x) => ({
    id: uid(), titel: x.t, datum: daten.datum, erledigt: false, auto: true,
    monate: x.m != null ? x.m : null, tage: x.d != null ? x.d : null, soll: "", ueberfaellig: false
  }));
  daten.eingerichtet = true;
  zustand = "bereit";
  berechneFaelligkeiten();
  speichern();
  start();
});

/* ---------- Checkliste ---------- */

$("check-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("check-id").value;
  const titel = $("check-titel-eingabe").value.trim();
  const datum = $("check-datum").value;
  if (id) {
    const a = daten.checkliste.find((x) => x.id === id);
    if (a) {
      if (a.datum !== datum) { a.auto = false; a.ueberfaellig = false; }
      a.titel = titel; a.datum = datum;
    }
  } else {
    daten.checkliste.push({ id: uid(), titel: titel, datum: datum, erledigt: false, auto: false, monate: null, tage: null, soll: "", ueberfaellig: false });
  }
  speichern(); resetCheck(); renderCheckliste(); renderStart();
});
function resetCheck() {
  $("check-form").reset(); $("check-id").value = "";
  $("check-datum").value = datumString(heute());
  formModus("check", false, "Aufgabe hinzufügen", "Aufgabe bearbeiten");
}
$("check-abbrechen").addEventListener("click", resetCheck);
listenAktion("check-liste", (aktion, id) => {
  const a = daten.checkliste.find((x) => x.id === id);
  if (!a) return;
  if (aktion === "haken") { a.erledigt = !a.erledigt; berechneFaelligkeiten(); speichern(); renderCheckliste(); renderStart(); }
  if (aktion === "loeschen" && confirm("Aufgabe löschen?")) {
    daten.checkliste = daten.checkliste.filter((x) => x.id !== id); speichern(); renderCheckliste(); renderStart();
  }
  if (aktion === "bearbeiten") {
    $("check-id").value = a.id; $("check-titel-eingabe").value = a.titel; $("check-datum").value = a.datum;
    formModus("check", true, "Aufgabe hinzufügen", "Aufgabe bearbeiten");
  }
});

/* ---------- Budget ---------- */

$("budget-form").addEventListener("submit", (e) => {
  e.preventDefault();
  daten.budgetKat.push({ id: uid(), name: $("budget-name").value.trim(), geplant: 0, tatsaechlich: 0 });
  speichern(); e.target.reset(); renderBudget(); renderStart();
});
$("budget-liste").addEventListener("change", (e) => {
  const feld = e.target.dataset.feld;
  if (!feld) return;
  const zeileEl = e.target.closest(".bud-zeile");
  const k = daten.budgetKat.find((x) => x.id === zeileEl.dataset.id);
  if (!k) return;
  if (feld === "name") k[feld] = e.target.value.trim() || k.name;
  else k[feld] = Math.max(0, Number(e.target.value) || 0);
  speichern(); budgetSumme(); renderStart();
});
$("budget-liste").addEventListener("click", (e) => {
  const b = e.target.closest('[data-aktion="loeschen"]');
  if (b && confirm("Kategorie löschen?")) {
    daten.budgetKat = daten.budgetKat.filter((x) => x.id !== b.dataset.id);
    speichern(); renderBudget(); renderStart();
  }
});
$("budget-leeren").addEventListener("click", () => {
  if (confirm("Alle Budget-Kategorien löschen?")) { daten.budgetKat = []; speichern(); renderBudget(); renderStart(); }
});

/* ---------- Gäste ---------- */

$("gast-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const g = {
    name: $("gast-name").value.trim(),
    status: $("gast-status").value,
    personen: Math.max(1, parseInt($("gast-personen").value, 10) || 1),
    einladungen: Math.max(0, parseInt($("gast-einladungen").value, 10) || 0),
    kreis: $("gast-kreis").checked,
    notiz: $("gast-notiz").value.trim()
  };
  const id = $("gast-id").value;
  if (id) { const alt = daten.gaeste.find((x) => x.id === id); if (alt) Object.assign(alt, g); }
  else { g.id = uid(); daten.gaeste.push(g); }
  speichern(); resetGast(); renderGaeste(); renderStart();
});
function resetGast() {
  $("gast-form").reset(); $("gast-id").value = "";
  $("gast-personen").value = 1; $("gast-einladungen").value = 1;
  formModus("gast", false, "Gast hinzufügen", "Gast bearbeiten");
}
$("gast-abbrechen").addEventListener("click", resetGast);
$("gast-filter").addEventListener("change", renderGaeste);
listenAktion("gast-liste", (aktion, id) => {
  const g = daten.gaeste.find((x) => x.id === id);
  if (!g) return;
  if (aktion === "loeschen" && confirm("Gast löschen?")) {
    daten.gaeste = daten.gaeste.filter((x) => x.id !== id); speichern(); renderGaeste(); renderStart();
  }
  if (aktion === "bearbeiten") {
    $("gast-id").value = g.id; $("gast-name").value = g.name; $("gast-status").value = g.status;
    $("gast-personen").value = g.personen; $("gast-einladungen").value = g.einladungen;
    $("gast-kreis").checked = !!g.kreis; $("gast-notiz").value = g.notiz || "";
    formModus("gast", true, "Gast hinzufügen", "Gast bearbeiten");
  }
});

/* ---------- Dienstleister ---------- */

$("dl-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = { name: $("dl-name").value.trim(), art: $("dl-art").value.trim() };
  const id = $("dl-id").value;
  if (id) { const alt = daten.dienstleister.find((x) => x.id === id); if (alt) Object.assign(alt, d); }
  else { d.id = uid(); daten.dienstleister.push(d); }
  speichern(); resetDl(); renderDienstleister(); renderStart();
});
function resetDl() {
  $("dl-form").reset(); $("dl-id").value = "";
  formModus("dl", false, "Dienstleister hinzufügen", "Dienstleister bearbeiten");
}
$("dl-abbrechen").addEventListener("click", resetDl);
listenAktion("dl-liste", (aktion, id) => {
  const d = daten.dienstleister.find((x) => x.id === id);
  if (!d) return;
  if (aktion === "loeschen" && confirm("Dienstleister löschen?")) {
    daten.dienstleister = daten.dienstleister.filter((x) => x.id !== id); speichern(); renderDienstleister(); renderStart();
  }
  if (aktion === "bearbeiten") {
    $("dl-id").value = d.id; $("dl-name").value = d.name; $("dl-art").value = d.art;
    formModus("dl", true, "Dienstleister hinzufügen", "Dienstleister bearbeiten");
  }
});

/* ---------- Ablaufplan mit Drag & Drop ---------- */

$("ab-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const p = { zeit: $("ab-zeit").value, titel: $("ab-titel-eingabe").value.trim() };
  const id = $("ab-id").value;
  if (id) { const alt = daten.ablauf.find((x) => x.id === id); if (alt) Object.assign(alt, p); }
  else { p.id = uid(); daten.ablauf.push(p); }
  speichern(); resetAb(); renderAblauf(); renderStart();
});
function resetAb() {
  $("ab-form").reset(); $("ab-id").value = "";
  formModus("ab", false, "Programmpunkt hinzufügen", "Programmpunkt bearbeiten");
}
$("ab-abbrechen").addEventListener("click", resetAb);
$("ab-sortieren").addEventListener("click", () => {
  daten.ablauf.sort((a, b) => (a.zeit < b.zeit ? -1 : a.zeit > b.zeit ? 1 : 0));
  speichern(); renderAblauf();
});
listenAktion("ab-liste", (aktion, id) => {
  const p = daten.ablauf.find((x) => x.id === id);
  if (!p) return;
  if (aktion === "loeschen" && confirm("Programmpunkt löschen?")) {
    daten.ablauf = daten.ablauf.filter((x) => x.id !== id); speichern(); renderAblauf(); renderStart();
  }
  if (aktion === "bearbeiten") {
    $("ab-id").value = p.id; $("ab-zeit").value = p.zeit; $("ab-titel-eingabe").value = p.titel;
    formModus("ab", true, "Programmpunkt hinzufügen", "Programmpunkt bearbeiten");
  }
});

let ziehen = null;
const abListe = $("ab-liste");
abListe.addEventListener("pointerdown", (e) => {
  const griff = e.target.closest(".griff");
  if (!griff) return;
  ziehen = griff.closest("li");
  ziehen.classList.add("zieht");
  abListe.setPointerCapture(e.pointerId);
  e.preventDefault();
});
abListe.addEventListener("pointermove", (e) => {
  if (!ziehen) return;
  const andere = Array.from(abListe.children).filter((x) => x !== ziehen);
  let ziel = null;
  for (const it of andere) {
    const r = it.getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { ziel = it; break; }
  }
  if (ziel) { if (ziehen.nextSibling !== ziel) abListe.insertBefore(ziehen, ziel); }
  else if (abListe.lastElementChild !== ziehen) abListe.appendChild(ziehen);
  if (e.clientY < 140) window.scrollBy(0, -8);
  else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 8);
});
function ziehenEnde() {
  if (!ziehen) return;
  ziehen.classList.remove("zieht");
  ziehen = null;
  const ids = Array.from(abListe.children).map((li) => li.dataset.id);
  const neu = ids.map((id) => daten.ablauf.find((x) => x.id === id)).filter(Boolean);
  if (neu.length === daten.ablauf.length) { daten.ablauf = neu; speichern(); }
  renderAblauf();
}
abListe.addEventListener("pointerup", ziehenEnde);
abListe.addEventListener("pointercancel", ziehenEnde);

/* ---------- Notizen ---------- */

$("no-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const n = { titel: $("no-titel-eingabe").value.trim(), kat: $("no-kategorie").value, text: $("no-text").value.trim() };
  const id = $("no-id").value;
  if (id) { const alt = daten.notizen.find((x) => x.id === id); if (alt) Object.assign(alt, n); }
  else { n.id = uid(); daten.notizen.push(n); }
  speichern(); resetNo(); renderNotizen();
});
function resetNo() {
  $("no-form").reset(); $("no-id").value = "";
  formModus("no", false, "Notiz hinzufügen", "Notiz bearbeiten");
}
$("no-abbrechen").addEventListener("click", resetNo);
$("no-filter").addEventListener("change", renderNotizen);
listenAktion("no-liste", (aktion, id) => {
  const n = daten.notizen.find((x) => x.id === id);
  if (!n) return;
  if (aktion === "loeschen" && confirm("Notiz löschen?")) {
    daten.notizen = daten.notizen.filter((x) => x.id !== id); speichern(); renderNotizen();
  }
  if (aktion === "bearbeiten") {
    $("no-id").value = n.id; $("no-titel-eingabe").value = n.titel; $("no-kategorie").value = n.kat || "";
    $("no-text").value = n.text || "";
    formModus("no", true, "Notiz hinzufügen", "Notiz bearbeiten");
  }
});
$("no-kat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("no-kat-name").value.trim();
  if (name && !daten.notizKat.includes(name)) daten.notizKat.push(name);
  speichern(); e.target.reset(); renderNotizen();
});
listenAktion("no-kat-liste", (aktion, id) => {
  const i = Number(id);
  const alt = daten.notizKat[i];
  if (alt === undefined) return;
  if (aktion === "loeschen" && confirm("Kategorie löschen? Notizen darin bleiben erhalten.")) {
    daten.notizen.forEach((n) => { if (n.kat === alt) n.kat = ""; });
    daten.notizKat.splice(i, 1); speichern(); renderNotizen();
  }
  if (aktion === "umbenennen") {
    const neu = (prompt("Neuer Name der Kategorie:", alt) || "").trim();
    if (neu && !daten.notizKat.includes(neu)) {
      daten.notizen.forEach((n) => { if (n.kat === alt) n.kat = neu; });
      daten.notizKat[i] = neu; speichern(); renderNotizen();
    }
  }
});

/* ---------- Einstellungen ---------- */

$("einst-form").addEventListener("submit", (e) => {
  e.preventDefault();
  daten.name1 = $("e-name1").value.trim();
  daten.name2 = $("e-name2").value.trim();
  daten.datum = $("e-datum").value;
  daten.budget = Number($("e-budget").value) || 0;
  daten.kreisName = $("e-kreis").value.trim() || "Engerer Kreis";
  berechneFaelligkeiten(); speichern(); renderAlles();
  alert("Gespeichert. Die Fälligkeiten wurden neu berechnet.");
});
$("alles-loeschen").addEventListener("click", () => {
  if (confirm("Wirklich ALLE Daten auf diesem Gerät löschen?")) {
    daten = standard(); speichern(); resetCheck(); start();
  }
});

/* ---------- Kalender-Export (.ics) ---------- */

function icsText(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsInhalt() {
  const name = "Wedding " + daten.name1 + "&" + daten.name2;
  const jetzt = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const z = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedding App//DE", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", "X-WR-CALNAME:" + icsText(name)];

  daten.checkliste.filter((a) => !a.erledigt).forEach((a) => {
    const tag = a.datum.replace(/-/g, "");
    z.push("BEGIN:VEVENT", "UID:" + a.id + "@wedding-app", "DTSTAMP:" + jetzt,
      "DTSTART:" + tag + "T090000", "DTEND:" + tag + "T093000",
      "SUMMARY:" + icsText(a.titel), "DESCRIPTION:" + icsText(name),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(a.titel), "TRIGGER:PT0S", "END:VALARM",
      "END:VEVENT");
  });

  if (daten.datum) {
    const hz = parseDatum(daten.datum);
    const start = datumString(hz).replace(/-/g, "");
    const ende = datumString(new Date(hz.getFullYear(), hz.getMonth(), hz.getDate() + 1)).replace(/-/g, "");
    z.push("BEGIN:VEVENT", "UID:hochzeitstag@wedding-app", "DTSTAMP:" + jetzt,
      "DTSTART;VALUE=DATE:" + start, "DTEND;VALUE=DATE:" + ende,
      "SUMMARY:" + icsText(name + " – Hochzeitstag"),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Heute ist der große Tag!", "TRIGGER:PT9H", "END:VALARM",
      "END:VEVENT");
  }
  z.push("END:VCALENDAR");
  return z.join("\r\n");
}

async function exportIcs() {
  if (!daten.datum) { alert("Bitte zuerst ein Hochzeitsdatum eintragen."); return; }
  const inhalt = icsInhalt();
  try {
    const datei = new File([inhalt], "wedding-kalender.ics", { type: "text/calendar" });
    if (navigator.canShare && navigator.canShare({ files: [datei] })) {
      await navigator.share({ files: [datei], title: "Wedding Kalender" });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  const blob = new Blob([inhalt], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "wedding-kalender.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
document.querySelectorAll(".ics-knopf").forEach((b) => b.addEventListener("click", exportIcs));

/* ---------- Start ---------- */

/* ---------- Anmeldung und Cloud ---------- */

function fehlerText(e) {
  const c = e && e.code ? e.code : "";
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") return "E-Mail oder Passwort ist falsch.";
  if (c === "auth/email-already-in-use") return "Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.";
  if (c === "auth/weak-password") return "Das Passwort ist zu kurz (mindestens 6 Zeichen).";
  if (c === "auth/invalid-email") return "Die E-Mail-Adresse ist ungültig.";
  if (c === "auth/network-request-failed") return "Keine Internetverbindung.";
  if (c === "auth/too-many-requests") return "Zu viele Versuche. Bitte später erneut probieren.";
  if (c === "auth/operation-not-allowed") return "E-Mail-Anmeldung ist in Firebase nicht aktiviert.";
  return "Fehler: " + (c || (e && e.message) || "unbekannt");
}

async function loginAktion(neu) {
  const fehler = $("login-fehler");
  const mail = $("l-mail").value.trim();
  const pw = $("l-pw").value;
  fehler.textContent = "";
  if (!window.Cloud) { fehler.textContent = "Cloud nicht erreichbar. Bitte firebase-config.js prüfen."; return; }
  if (!mail || !pw) { fehler.textContent = "Bitte E-Mail und Passwort eingeben."; return; }
  try {
    if (neu) await window.Cloud.registrieren(mail, pw);
    else await window.Cloud.anmelden(mail, pw);
    $("l-pw").value = "";
  } catch (e) { fehler.textContent = fehlerText(e); }
}

$("login-form").addEventListener("submit", (e) => { e.preventDefault(); loginAktion(false); });
$("l-neu").addEventListener("click", () => loginAktion(true));
$("l-reset").addEventListener("click", async () => {
  const fehler = $("login-fehler");
  const mail = $("l-mail").value.trim();
  if (!window.Cloud) { fehler.textContent = "Cloud nicht erreichbar."; return; }
  if (!mail) { fehler.textContent = "Bitte zuerst die E-Mail eingeben."; return; }
  try {
    await window.Cloud.passwortReset(mail);
    fehler.textContent = "E-Mail zum Zurücksetzen wurde gesendet (auch Spam prüfen).";
  } catch (e) { fehler.textContent = fehlerText(e); }
});
$("abmelden").addEventListener("click", () => { if (window.Cloud) window.Cloud.abmelden(); });

// Wird von cloud.js aufgerufen
window.WeddingApp = {
  auth(user) {
    if (user) { zustand = "laden"; $("konto-mail").textContent = user.email || ""; }
    else { zustand = "login"; daten = standard(); }
    start();
  },
  neueDaten(obj) {
    let neu = Object.assign(standard(), obj || {});
    let uebernommen = false;
    if (!neu.eingerichtet && !lokalAngeboten) {
      lokalAngeboten = true;
      const lokal = lokaleDaten();
      if (lokal && lokal.eingerichtet &&
          confirm("Auf diesem Gerät gibt es lokal gespeicherte Daten. In die Cloud übernehmen?")) {
        neu = Object.assign(standard(), lokal);
        uebernommen = true;
      }
    }
    daten = neu;
    zustand = "bereit";
    if (daten.eingerichtet) {
      const vorher = JSON.stringify(daten);
      berechneFaelligkeiten();
      if (uebernommen || JSON.stringify(daten) !== vorher) speichern();
    }
    start();
  },
  fehler(code) {
    zustand = "laden";
    $("laden-text").textContent = "Cloud-Fehler: " + code + ". Prüfe die Firestore-Regeln und die Internetverbindung.";
    start();
  }
};

/* ---------- Speicherort wählen und wechseln ---------- */

function modusWaehlen(neu) {
  try { localStorage.setItem(MODUS_KEY, neu); } catch (e) { /* ignorieren */ }
  location.reload();
}

$("m-lokal").addEventListener("click", () => modusWaehlen("lokal"));
$("m-cloud").addEventListener("click", () => modusWaehlen("cloud"));
$("l-lokal").addEventListener("click", () => {
  if (confirm("Stattdessen lokal auf diesem Gerät speichern?")) modusWaehlen("lokal");
});
$("laden-lokal").addEventListener("click", () => {
  if (confirm("Stattdessen lokal auf diesem Gerät speichern?")) modusWaehlen("lokal");
});

$("modus-wechseln").addEventListener("click", () => {
  if (modus === "lokal") {
    if (confirm("Zur Cloud wechseln? Ihr müsst euch dort anmelden. Die lokalen Daten bleiben auf diesem Gerät und können nach der Anmeldung übernommen werden.")) {
      modusWaehlen("cloud");
    }
  } else {
    if (!confirm("Zu lokalem Speichern wechseln? Die Cloud-Daten bleiben in der Cloud erhalten.")) return;
    if (daten.eingerichtet &&
        confirm("Aktuelle Cloud-Daten auf dieses Gerät kopieren? (Vorhandene lokale Daten werden überschrieben.)")) {
      try { localStorage.setItem(KEY, JSON.stringify(daten)); } catch (e) { alert("Kopieren nicht möglich."); return; }
    }
    modusWaehlen("lokal");
  }
});

/* ---------- Start ---------- */

resetCheck();

if (modus === "lokal") {
  daten = Object.assign(standard(), lokaleDaten() || {});
  zustand = "bereit";
  if (daten.eingerichtet) { berechneFaelligkeiten(); speichern(); }
  start();
} else if (modus === "cloud") {
  zustand = "pruefen";
  start();
  // Die Cloud-Bibliothek wird nur im Cloud-Modus geladen
  import("./cloud.js").catch(() => {
    if (zustand === "pruefen") {
      zustand = "login";
      start();
      $("login-fehler").textContent = "Cloud konnte nicht geladen werden. Internet und firebase-config.js prüfen.";
    }
  });
  setTimeout(() => {
    if (zustand === "pruefen") {
      zustand = "login";
      start();
      $("login-fehler").textContent = "Verbindung zur Cloud fehlgeschlagen. Internet und firebase-config.js prüfen.";
    }
  }, 10000);
} else {
  zustand = "waehlen";
  start();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
