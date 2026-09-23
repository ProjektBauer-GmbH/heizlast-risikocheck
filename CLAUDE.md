# Heizlast-Risikocheck: Projektkontext für Entwickler und Claude Code

## Worum es geht
Web-Tool für Planungsbüros und HLK-Ingenieure (Schweiz, SIA). Es fragt ein Projekt über einen Entscheidungsbaum ab und zeigt, wie riskant eine **fehlende oder fehlerhafte Heizlastberechnung** in diesem Projekt ist: Sternstufe 1–5, empfohlene Prüftiefe und ein Risikoregister (Tabelle).

- Zweck: Arbeitstool für Profis **und** Lead-Generierung (CTA «Second Opinion anfragen» ab Stufe 4).
- Einsatz: Einbettung per iFrame auf Kunden-/Firmenwebsites.
- Sprache der UI: Deutsch (Schweiz) – kein «ß», «ss» verwenden.
- Stand: klickbarer Prototyp v2.1 (21.09.2026; Fragekarten mit Antwortübersicht, Second-Opinion-Wert in %, Risikomatrix gekoppelt mit Register, eigene Risiken, lokale Speicherung, CD Planfabrik, Annotationstool). Kein Build, kein Framework, kein Backend.

## Dateien
| Datei | Inhalt |
|---|---|
| `index.html` | Markup + `window.HRC_CONFIG` (Einbettungs-Konfiguration) |
| `src/risk-model.js` | **Fachmodell**: `ACTIONS`, `LEVELNAME`, `ITEMS` (Kriterien mit Stufe, Irreversibel-Flag, Risiko-/Konsequenztext). Fachliche Änderungen nur hier. |
| `src/app.js` | UI-Logik: Checkboxen erzeugen, `selected()` (Baumlogik), `render()` (Auswertung + Tabelle), Export, CTA, iFrame-Höhe |
| `src/annotate.js` | **Review-Werkzeug** (nur aktiv mit `?annotate` in der URL): Element anklicken → kommentieren → «Batch kopieren» liefert Markdown mit Selektor, Elementtext, Tool-Zustand und Kommentar. Speichert in localStorage (`hrc-annotations`). Eigenständig, vor Auslieferung an Kunden optional entfernen (Datei + Script-Tag). |
| `src/styles.css` | Design-Tokens (hell/dunkel), Layout |
| `docs/risk-assessment-heizlast.pdf` / `entscheidungsbaum.png` | **Fachliche Quelle** (Entscheidungsbaum + Texte) – massgebend bei Unklarheiten |
| `CD/Karte_7_Thinking_Steps_Kleinformat.pdf` | **Corporate Design Planfabrik** – Referenz für Farben/Schrift: Blau `#4565AD` auf Weiss, Schrift GT Pressura (kommerziell, nicht eingebunden; Fallback Archivo) |
| `docs/vorlage-ole-risk-register.png` | Ursprüngliche Inspiration (Risk Register aus Fahrleitungsplanung, vorher/nachher) |

Lokal starten: `index.html` im Browser öffnen oder `npx serve .`.

## Fachlogik (aus docs/risk-assessment-heizlast.pdf)
Wurzel: Projektrisiko «Fehlende / fehlerhafte Heizlast».

**Bestand**
- B1 Ersatz Wärmeerzeuger (Ja/Nein) – rein informativ; die Gebäudehülle wird **unabhängig von B1** abgefragt (Entscheid 21.09.2026, Abweichung vom Baum):
  - B2 unverändert → Verbrauch bekannt ★ (B2a) / unbekannt ★★ (B2b)
  - B3 (Teil-)Sanierung Hülle ★★★
- Risikoverstärker (Mehrfachauswahl): B4 Nachrüsten FBH ★★★★ · B5 Fernwärme ★★★★(!) · B6 Erdsondenfeld ★★★★★(!) · B7 Grundwasser-Sondenbohrung ★★★★★(!) *(Platzhaltertext)*

**Neubau**
- Dimensionen (Mehrfachauswahl, «Abfrage aller Dimensionen»): N1 Wärmeerzeuger ★★★ · N2 Leitungsnetz ★★ · N3 Wärmeabgabe FBH ★★★
- Risikoverstärker: N4 TABS ★★★★(!) · N5 Erdsondenfeld ★★★★★(!) · N6 Fernwärme ★★★★(!) · N7 Grosses/komplexes Gebäude ★★★★ · N8 Grundwasser-Sondenbohrung ★★★★★(!) *(Platzhaltertext)*

**Kombination:** `max()` – die höchste Stufe ist massgebend; **Kumulation:** ab 2 gleichzeitigen Risikoverstärkern Gesamtstufe +1, gedeckelt auf 5 (`CUMUL_MIN_AMPS`/`CUMUL_BONUS` in `risk-model.js`; Registerzeilen behalten ihre eigene Stufe, Export enthält eine Zeile «Gesamt»). Risiko- und Konsequenztexte aller Treffer werden gesammelt (Tabelle, nach Stufe absteigend sortiert).

**Stufen → Handlung**
1 Keine Heizlast nötig, andere Methoden ausreichend · 2 Heizlast rechnen, normale Qualitätssicherung (im PDF «QS», auf Anweisung ausgeschrieben) · 3 Plausibilisierung im 4-Augen-Prinzip · 4 Second Opinion empfohlen · 5 Unabhängige Freigabe zwingend vor Bohrung/Bestellung.

**(!) Irreversibel:** eigenes Flag, unabhängig von der Sternzahl. Gilt für Erdsonde, Grundwasser-Sondenbohrung, TABS **und Fernwärme** (Entscheid 21.09.2026: der Baum gilt, nicht die Legende). Prüfung muss vor Bohrung/Bestellung abgeschlossen sein.

## Ausbau v2.x: ENTWURF, nicht aus dem PDF (unterer Block in `risk-model.js`)
Der Check wurde bewusst substanzieller gemacht. Prinzip: **Der Entscheidungsbaum bleibt unangetastet**; seine Stufe ist die «Tragweite» und bestimmt die empfohlene Handlung je Registerzeile (`ACTIONS`). Dazu kommt:
- **Projektkontext** (`CONTEXT_QUESTIONS`): Gebäudetyp und Projektphase nach SIA 112. Beides rein informativ (Auswertung, Export), keine Bewertung (sonst Doppelzählung mit N7). Die Frist-Box aus v2.0 wurde im Review entfernt.
- **Wahrscheinlichkeit** (`PROB_QUESTIONS`): Bei Tragweite 1 gilt immer Wahrscheinlichkeit 1 (keine Heizlast nötig, Review 23.09.2026). Im Register eigene Spalte mit Begründung. Methode, Urheber, Grundlagen, Prüfung → Punkte 0–8 → Stufe 1–5 (`PROB_STEPS`). «Noch keine Heizlast» setzt direkt 5 und überspringt die Folgefragen. Jede Option hat `tip` (Erklärung hinter dem «?»).
- **Risikomatrix** 5×5 in voller Breite direkt über dem Register: jede Register-ID sitzt als Chip in ihrer Zelle (Wahrscheinlichkeit × Tragweite), «Σ» = durch Kumulation angehobene Gesamtstufe, Hover koppelt Zeile ↔ Chip. Rechts «So entsteht die Position» mit Punkteherleitung. Register hat Spalte «Risikoklasse» (`RISKCLASSES`: ≤4 Gering · ≤9 Mittel · ≤15 Hoch · ≤25 Kritisch).
- **Second-Opinion-Wert in %** (Kernidee: «Stufe 3 von 5» sagt für sich nichts, die eigentliche Frage ist: Braucht es eine Zweitmeinung?): höchster Wert aller Risiken / 25, plus `SO_EXTRA` = 4 Prozentpunkte je weiterem Risiko ab Klasse Hoch. `SO_LEVELS`: ab 40 % empfohlen, ab 64 % stark empfohlen (= Klasse Kritisch), ab 80 % zwingend. Die blaue Karte ist **immer** sichtbar, der Text passt sich der Einstufung an. Die Karte daneben zeigt dieselbe Grösse (Risikoklasse = Tragweite × Wahrscheinlichkeit, mit beiden Komponenten), damit Prozentwert und Risikokarte keine widersprüchlichen Signale geben (Review 23.09.2026).
- **Eigene Risiken**: Formular unter dem Register (Bezeichnung, Beschreibung, Tragweite, Wahrscheinlichkeit). Sie erscheinen in Register und Matrix und verändern höchste Stufe und Second-Opinion-Wert. Die Massnahmenverfolgung aus v2.0 wurde im Review wieder entfernt.
- Alles davon trägt das Badge **ENTWURF**, solange `DRAFT = true` (Modell) und `HRC_CONFIG.draftBadges !== false`. **Skalen, Punkte, Schwellen und Texte muss der Auftraggeber prüfen**, danach `DRAFT = false`.

## Bedienfluss (Fragekarten → Auswertung)
- **Fragebogen** (`view = "q"`): eine weisse Karte pro Frage, Fortschritt «Frage x von y» + Balken. Rechts daneben die **Antwortübersicht** («Ihre Antworten»): gegebene Antworten, Klick springt zur Frage. Erste Frage = **Projektname** (Pflicht; erscheint im Kopf, Register-Meta, Export und CSV-Dateiname). Pfad aus `steps()`: Name → Gebäudetyp → Phase → Projektart → Baum (Bestand: Wärmeerzeuger → Hülle → ggf. Verbrauch → Verstärker; Neubau: Dimensionierung → Verstärker) → Belastbarkeit. 8–12 Fragen. Einzelauswahl per Maus/Touch springt automatisch weiter (Tastatur nicht). Bei Neubau ist **nichts vorausgewählt**.
- **«?»-Symbole**: Erklärung bei Hover/Fokus. Kriterien aus dem Baum zeigen ihren Risikotext aus dem PDF (`data-tip-item` bzw. `ITEMS[id].risk`), Entwurfsfragen ihr `tip`. Ein Klick auf «?» wählt die Option nicht aus.
- **Auswertung** (`view = "r"`): erst nach der letzten Frage. Links Second-Opinion-Karte, rechts «Risiko: Höchste Stufe» (kleine Punkte, ohne Handlungstext) und «Ihre Angaben». Darunter Matrix, Register, eigenes Risiko, Legende, Fusstext.
- **Darstellung:** Stufen als Punkte, Export mit Zahlen. Register-IDs **R-01 …** nach Wert absteigend, Modellcodes (B6 usw.) nur intern. **Kein «(!)» und keine Gedankenstriche** in der Oberfläche (Stilvorgabe, gilt auch für neue Texte). Konsequenzen: eine Zeile pro Konsequenz (`splitCons` trennt an Satzgrenzen und Strichpunkten).
- **Speicherung:** Antworten und eigene Risiken liegen nur im `localStorage` des Browsers (`hrc-state`), nichts geht an einen Server (Hinweis steht bei der Projektfrage). Beim Laden geht es bei der ersten offenen Frage weiter. «Zurücksetzen» leert alles, «Beispiel laden» überschreibt den Stand.

## Konfiguration (`window.HRC_CONFIG` in index.html)
- `exports` (bool): CSV-Download + Drucken einblenden. In sandboxed Viewern (z. B. claude.ai-Artifact) `false`, dort funktionieren Downloads nicht.
- `contactUrl` (string|null): Ziel des Buttons «Second Opinion anfragen» (Karte ist immer sichtbar). Noch **nicht gesetzt** → Button zeigt Hinweis-Toast.
- `draftBadges` (bool): Badge «ENTWURF» bei allen Inhalten, die nicht aus dem PDF stammen. Nach Freigabe durch den Auftraggeber auf `false`.

iFrame-Einbettung: Das Tool sendet `postMessage({type:"hrc-height", height})` an die Elternseite. Beispiel in `README.md`.

## Offene fachliche Punkte (mit Auftraggeber klären, NICHT eigenmächtig umsetzen)
1. **Kühllast fehlt.** Tool wurde als Heiz- *und* Kühllast-Tool gedacht; Modell deckt nur Heizlast ab. Entweder zweiter Baum (SIA 382/2) oder Tool bleibt explizit «Heizlast».
2. **Fachtext Grundwasser-Sondenbohrung fehlt.** B7/N8 sind mit `ph:true` und `PLACEHOLDER_TEXT` umgesetzt (UI zeigt Badge «PLATZHALTER»). Risiko-/Konsequenztext vom Auftraggeber einholen, dann `ph` entfernen.
3. **Legende im PDF nachziehen.** Die Legende nennt (!) nur für Erdsonde/Grundwasser und TABS; entschieden ist, dass auch Fernwärme (!) trägt. Quelle sollte angepasst werden, damit PDF und Tool übereinstimmen.
4. **Rolle von B1.** Seit die Hülle immer abgefragt wird, beeinflusst B1 die Bewertung nicht mehr. Frage behalten (Kontext für Export) oder streichen?
5. **Entwurfsinhalte v2.x validieren.** Punkte/Schwellen der Wahrscheinlichkeit, Matrixklassen, Second-Opinion-Formel und -Schwellen (40/60/80 %), Zuschlag je weiterem Risiko, Tooltip-Texte.
6. **N7 «Grosses / komplexes Gebäude» ist für Ingenieure zu diffus** (Rückmeldung aus dem Review). Aktuell mit Merkmalen aus dem PDF-Text präzisiert; eine messbare Schwelle (z. B. EBF, Anzahl Nutzungszonen) muss der Auftraggeber liefern.

## Mögliche nächste Schritte
- ~~Punkte 2–4 (Kumulation, (!)-Flag, Lücke Bestand)~~ – erledigt 21.09.2026.
- Projektkopf (Projektname, Bearbeiter, Datum) für Export/Druck.
- PDF-Export mit Firmenlogo statt Browser-Druck.
- Tracking der CTA-Klicks (Event an Elternseite per postMessage).
- Mehrsprachigkeit (FR/IT) – Texte dafür aus `risk-model.js` in ein i18n-Objekt ziehen.
- Optional später: Einbettung per `<script>`-Tag statt iFrame (Web Component mit Shadow DOM).

## Regeln für Änderungen
- Fachtexte in `risk-model.js` wörtlich aus der Quelle übernehmen; Änderungen daran nur auf Anweisung.
- Keine Frameworks/Build-Tools einführen, solange nicht nötig – Tool muss als statische Dateien lauffähig bleiben.
- Farben nur über CSS-Tokens (`:root` + Dark-Mode-Blöcke). Stufenfarben `--l1`…`--l5` sind semantisch.
- Akzentfarbe ist das Planfabrik-Blau (`--accent`, siehe `CD/`); Neutraltöne sind darauf abgestimmt.
- Bei Änderungen an CSS/JS die Versionsnummer `?v=` in den vier Einbindungen in `index.html` erhöhen, sonst liefern Browser die alte Datei aus dem Cache.
- Nach jeder Änderung: Seite öffnen, «Beispiel laden» → Second Opinion 80 % zwingend, Risikoklasse Kritisch 20 von 25 (Tragweite 5 × Wahrscheinlichkeit 4), 2 Zeilen (R-01 Erdsondenfeld Kritisch 4 × 5 = 20, R-02 Gebäudehülle unverändert Mittel 4 × 2 = 8); Browser-Konsole fehlerfrei. Vorher localStorage `hrc-state` beachten (gespeicherter Stand wird geladen).
- Review-Anmerkungen kommen als Markdown-Batch aus `?annotate`: Selektoren beziehen sich auf den dort genannten Schritt/Zustand.
