# Heizlast-Risikocheck

Web-Tool für Planungsbüros und HLK-Ingenieure. Es führt in 8 bis 12 Fragen durch ein Projekt und zeigt, wie nötig eine unabhängige Zweitmeinung (Second Opinion) zur Heizlast ist: Prozentwert, Risikomatrix und Risikoregister.

Statische Dateien (HTML, CSS, JavaScript). Kein Build, kein Framework, kein Backend. Alle Angaben bleiben im Browser des Nutzers.

## Starten
`index.html` im Browser öffnen. Oder mit lokalem Server:

```bash
npx serve .
```

## Aufbau
| Datei | Inhalt |
|---|---|
| `index.html` | Markup und Einbettungs-Konfiguration `window.HRC_CONFIG` |
| `src/risk-model.js` | **Fachmodell**: Kriterien, Stufen, Texte, Punkte, Schwellen. Fachliche Änderungen nur hier. |
| `src/app.js` | Ablauf der Fragen, Auswertung, Matrix, Register, Export |
| `src/styles.css` | Design (Farben als Tokens in `:root`, hell und dunkel) |
| `src/annotate.js` | Review-Werkzeug, nur aktiv mit `?annotate` in der URL |
| `docs/` | Fachliche Quelle: Entscheidungsbaum als PDF und PNG |
| `CD/` | Corporate Design (Farbe, Schrift) |
| `CLAUDE.md` | Ausführlicher Projektkontext: Fachlogik, Entscheide, offene Punkte, Regeln für Änderungen |

## Was noch zu prüfen ist
Alles, was nicht aus dem PDF in `docs/` stammt, trägt im Tool das Badge **ENTWURF**: Fragen zur Belastbarkeit der Heizlast, Punkte und Schwellen, Risikomatrix, Second-Opinion-Formel, Tooltip-Texte. Diese Inhalte stehen gesammelt im unteren Block von `src/risk-model.js`. Nach der fachlichen Freigabe dort `DRAFT = false` setzen, dann verschwinden die Badges.

Weitere offene Punkte (Fachtext Grundwasser-Sondenbohrung, Definition «Grosses / komplexes Gebäude», Kühllast) stehen in `CLAUDE.md` unter «Offene fachliche Punkte».

## Konfiguration
In `index.html`:

```js
window.HRC_CONFIG = { exports: true, contactUrl: null, draftBadges: true };
```

- `contactUrl`: Ziel des Buttons «Second Opinion anfragen». **Noch nicht gesetzt.**
- `exports`: CSV-Download und Drucken anzeigen.
- `draftBadges`: Badge «ENTWURF» ein- oder ausblenden.

## Auf einer Website einbetten
Ordner auf den Webserver kopieren (z. B. `/tools/heizlast-risikocheck/`), dann:

```html
<iframe id="hrc" src="/tools/heizlast-risikocheck/index.html" style="width:100%;border:0" title="Heizlast-Risikocheck"></iframe>
<script>
  addEventListener("message", e => {
    if (e.data && e.data.type === "hrc-height") document.getElementById("hrc").style.height = e.data.height + "px";
  });
</script>
```

## Anmerkungen erfassen (Review)
`index.html?annotate` öffnen, «＋ Anmerkung» klicken, Element anklicken, Kommentar speichern. «Batch kopieren» legt alle Anmerkungen als Markdown in die Zwischenablage. Ohne `?annotate` ist das Werkzeug unsichtbar.

## Mitarbeiten
Voraussetzung: GitHub-Konto mit Schreibzugriff auf dieses Repository (Einladung per E-Mail annehmen) und [Git](https://git-scm.com/) oder [GitHub Desktop](https://desktop.github.com/). Mit GitHub Desktop geht alles ohne Kommandozeile: «Clone repository», ändern, «Commit», «Push».

```bash
# 1. Projekt holen (einmalig). Beim ersten Mal fragt Git nach der GitHub-Anmeldung.
git clone https://github.com/ProjektBauer-GmbH/heizlast-risikocheck.git
cd heizlast-risikocheck
# Mit eingerichtetem SSH-Schlüssel alternativ: git clone git@github.com:ProjektBauer-GmbH/heizlast-risikocheck.git

# 2. Vor jeder Arbeit den neusten Stand holen
git pull

# 3. Eigenen Arbeitszweig anlegen
git checkout -b fachtexte-grundwasser

# 4. Dateien bearbeiten, im Browser prüfen, dann einchecken
git add -A
git commit -m "Fachtext Grundwasser-Sondenbohrung ergänzt"
git push -u origin fachtexte-grundwasser
```

Danach auf GitHub einen **Pull Request** eröffnen. So sieht die andere Seite die Änderung, bevor sie in `main` landet. Kleine Textkorrekturen gehen auch direkt auf GitHub: Datei öffnen, Stift-Symbol, ändern, «Commit changes».

Vor dem Einchecken prüfen: «Beispiel laden» ergibt Second Opinion 80 %, Stufe 5, zwei Zeilen im Register, und die Browser-Konsole ist fehlerfrei.
