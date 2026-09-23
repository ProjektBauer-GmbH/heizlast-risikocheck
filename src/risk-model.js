// Fachliches Modell: Stufen, Handlungen, Kriterien.
// Texte stammen 1:1 aus docs/risk-assessment-heizlast.pdf (Stand 14.09.2026).
// Ausnahme: B7/N8 (Grundwasser-Sondenbohrung, im PDF «Grundwasser») stehen nur in der Legende des PDF, nicht im Baum – Texte sind Platzhalter.
// (!) bei Fernwärme (B5/N6): Entscheid 21.09.2026 – der Baum gilt, Flag bleibt gesetzt.
// Auf Anweisung (21.09.2026) sind Gedankenstriche in zwei Texten (B3, N4) durch Punkte ersetzt und «QS» ausgeschrieben; der Wortlaut ist sonst unverändert.
// Änderungen an Fachinhalt NUR hier.

const ACTIONS = {
  1:"Keine Heizlast nötig, andere Methoden ausreichend",
  2:"Heizlast rechnen, normale Qualitätssicherung",
  3:"Heizlast rechnen, Plausibilisierung im 4-Augen-Prinzip",
  4:"Second Opinion empfohlen",
  5:"Unabhängige Freigabe zwingend vor Bohrung/Bestellung"
};
const LEVELNAME = {1:"Gering",2:"Erhöht",3:"Mittel",4:"Hoch",5:"Sehr hoch"};

// Kumulationsregel (Entscheid 21.09.2026): ab so vielen gleichzeitigen Risikoverstärkern
// wird die Gesamtstufe um CUMUL_BONUS angehoben (max. 5). Die Zeilen im Register behalten ihre eigene Stufe.
const CUMUL_MIN_AMPS = 2;
const CUMUL_BONUS = 1;

// Platzhalter für Kriterien, deren Fachtext in der Quelle noch fehlt (ph:true). Vom Auftraggeber zu liefern.
const PLACEHOLDER_TEXT = "Platzhalter: Fachtext des Auftraggebers ausstehend.";

const ITEMS = {
  B2a:{name:"Gebäudehülle unverändert", sub:"Verbrauch bekannt", lvl:1, irr:false,
    risk:"Datenlage solide · der gemessene Verbrauch dient als belastbarer Anker, sofern witterungsbereinigt.",
    cons:"Bei mehrjährigen Verbrauchsdaten meist problemlos. Zu beachten: Der Verbrauch ankert die Jahresenergie, nicht die Spitzenlast; der eines alten, oft überdimensionierten Kessels liefert eher eine Obergrenze."},
  B2b:{name:"Gebäudehülle unverändert", sub:"Verbrauch unbekannt", lvl:2, irr:false,
    risk:"Datenlage schwach · ohne Verbrauchsanker stützt sich die Auslegung auf Baualtersklasse und W/m²-Schätzwerte.",
    cons:"W/m²-Werte nach Baujahr liefern für EFH brauchbare, aber grobe Grundlagen; je nach realem Zustand der Hülle über- oder unterschätzt die Auslegung die Last."},
  B3:{name:"(Teil-)Sanierung Hülle", lvl:3, irr:false,
    risk:"Datenlage schwach · nach Teilsanierung mischen sich sanierte und unsanierte Bauteile, ein einheitlicher Kennwert gilt nicht mehr.",
    cons:"Historischer Verbrauch ist als Anker entwertet, W/m²-Schätzwerte greifen nicht. Die Last muss aus den neuen Bauteilaufbauten gerechnet werden."},
  B4:{name:"Nachrüsten FBH", sub:"von Radiatoren zu Fussbodenheizung", lvl:4, irr:false, amp:true,
    risk:"Die Nachrüstung einer Flächenheizung ohne raumweise Kenntnis der Last ist fehleranfällig und teuer korrigierbar.",
    cons:"Zu klein ausgelegte Heizfläche → höhere nötige Vorlauftemperatur → Effizienzverlust der Wärmepumpe; reicht das nicht, sind nachträgliche bauliche Massnahmen nötig, die Geld und Ressourcen kosten und Gewährleistungsfälle auslösen können."},
  B5:{name:"Fernwärmeanschluss", lvl:4, irr:true, amp:true,
    risk:"Die Last bestimmt Erzeugerleistung sowie die Grösse der Übergabestation.",
    cons:"Zu klein dimensioniert → aufwändige und kostspielige Anpassarbeiten. Zu gross dimensioniert → zu hohe Betriebskosten infolge unnötig teurer Contractingverträge."},
  B6:{name:"Erdsondenfeld", lvl:5, irr:true, amp:true,
    risk:"Die Last bestimmt Erzeugerleistung sowie Anzahl und Bohrtiefe der Sonden; der Eingriff in den Untergrund ist teuer und irreversibel.",
    cons:"Zu kurz dimensioniert → thermisches Regenerationsdefizit, über Jahre sinkende Soletemperatur bis zur Vereisung des Sondennahbereichs; zu lang → unwirtschaftliche Bohrmehrkosten."},
  B7:{name:"Grundwasser-Sondenbohrung", lvl:5, irr:true, amp:true, ph:true,
    risk:PLACEHOLDER_TEXT,
    cons:PLACEHOLDER_TEXT},
  N1:{name:"Dimensionierung Wärmeerzeuger", lvl:3, irr:false,
    risk:"Ein Auslegungsfehler wirkt direkt auf die Erzeugerleistung, besonders kritisch bei MFH und grösseren Gebäuden.",
    cons:"Mit steigender Anlagengrösse wachsen die absoluten Fehlkosten."},
  N2:{name:"Dimensionierung Leitungsnetz", lvl:2, irr:false,
    risk:"Netzauslegung und Volumenströme bauen direkt auf der Heizlast auf.",
    cons:"Fehldimensioniertes Netz → hydraulische Probleme (Volumenströme, Fliessgeräusche, erhöhte Pumpenenergie, Unterversorgung entfernter Räume); meist vor oder während der Ausführung korrigierbar."},
  N3:{name:"Dimensionierung Wärmeabgabe FBH", lvl:3, irr:false,
    risk:"Die Flächenheizung wird auch im Neubau raumweise auf die Last ausgelegt.",
    cons:"Zu klein ausgelegt → höhere nötige Vorlauftemperatur und Effizienzverlust; bei deutlicher Unterdeckung kühlbleibende Räume und kostenintensive Nachbesserung."},
  N4:{name:"TABS", sub:"oder Kombination mit FBH", lvl:4, irr:true, amp:true,
    risk:"Thermoaktive Bauteile sind regelungstechnisch anspruchsvoll und verlangen zwingend eine raumweise Heizlastberechnung.",
    cons:"Wegen der thermischen Trägheit nicht raumweise nachregelbar. Ein Auslegungsfehler ist «im Beton vergossen» und führt zu unter- oder überversorgten Räumen; da TABS oft Heizen und Kühlen kombiniert, wirkt der Fehler in beiden Betriebsarten."},
  N5:{name:"Erdsondenfeld", lvl:5, irr:true, amp:true,
    risk:"Die Last bestimmt Erzeugerleistung sowie Anzahl und Bohrtiefe der Sonden; der Eingriff in den Untergrund ist teuer und irreversibel.",
    cons:"Zu kurz dimensioniert → thermisches Regenerationsdefizit, über Jahre sinkende Soletemperatur bis zur Vereisung des Sondennahbereichs; zu lang → unwirtschaftliche Bohrmehrkosten."},
  N6:{name:"Fernwärmeanschluss", lvl:4, irr:true, amp:true,
    risk:"Die Last bestimmt Erzeugerleistung sowie die Grösse der Übergabestation.",
    cons:"Zu klein dimensioniert → aufwändige und kostspielige Anpassarbeiten. Zu gross dimensioniert → zu hohe Betriebskosten infolge unnötig teurer Contractingverträge."},
  N7:{name:"Grosses / komplexes Gebäude", sub:"komplexe Geometrie, heterogene Nutzung, unterschiedliche Solltemperaturen und Nutzungszeiten, viele Sonderbauteile", lvl:4, irr:false, amp:true,
    risk:"Bei komplexer Geometrie und heterogener Nutzung greifen Richt- und Erfahrungswerte nicht.",
    cons:"Unterschiedliche Solltemperaturen und Nutzungszeiten sowie ein hoher Anteil an Sonderbauteilen lassen belastbare Benchmarks fehlen → einzelne Räume oder Gebäudeteile werden unter- oder überversorgt."},
  N8:{name:"Grundwasser-Sondenbohrung", lvl:5, irr:true, amp:true, ph:true,
    risk:PLACEHOLDER_TEXT,
    cons:PLACEHOLDER_TEXT}
};

// =====================================================================================
// ENTWURF, NICHT AUS DEM PDF. Ausbau vom 21.09.2026 (Projektkontext, Wahrscheinlichkeit,
// Risikomatrix, Second-Opinion-Wert, eigene Risiken). Skalen, Punkte, Schwellen und Texte sind
// ein Vorschlag und müssen vom Auftraggeber geprüft werden. Solange DRAFT = true, zeigt die UI das Badge «ENTWURF».
// Die Stufe aus dem Entscheidungsbaum (oben) bleibt unverändert und heisst in der Matrix «Tragweite».
// =====================================================================================
const DRAFT = true;

// Projektkontext: rein informativ (Auswertung, Export). Fliesst NICHT in die Bewertung ein,
// damit «Grosses / komplexes Gebäude» (N7) nicht doppelt zählt.
const CONTEXT_QUESTIONS = [
  {id:"nutzung", recap:"Gebäudetyp", title:"Um welchen Gebäudetyp handelt es sich?", opts:[
    {v:"efh",  label:"Einfamilienhaus"},
    {v:"mfh",  label:"Mehrfamilienhaus"},
    {v:"gew",  label:"Büro / Gewerbe"},
    {v:"oeff", label:"Schule / öffentliche Bauten"},
    {v:"spez", label:"Spezialnutzung", sub:"z. B. Spital, Labor, Hallenbad"}]},
  {id:"phase", recap:"Projektphase", title:"In welcher Phase steht das Projekt?", help:"Phasen nach SIA 112.", opts:[
    {v:"vor",  label:"Vorstudie / Vorprojekt", sub:"Phasen 2–31"},
    {v:"bau",  label:"Bauprojekt / Bewilligung", sub:"Phasen 32–33"},
    {v:"aus",  label:"Ausschreibung / Vergabe", sub:"Phase 41"},
    {v:"real", label:"Ausführungsplanung / Ausführung", sub:"Phasen 51–52"}]}
];

// Wahrscheinlichkeit eines Auslegungsfehlers = Belastbarkeit der Heizlast. Punkte je Antwort (pts), Summe → Stufe 1–5.
// «Noch keine Heizlast» (direct) setzt die Wahrscheinlichkeit direkt und überspringt die Folgefragen.
// tip = Erklärung hinter dem «?»-Symbol, driver = Kurztext, wenn die Antwort die Wahrscheinlichkeit erhöht.
const PROB_QUESTIONS = [
  {id:"w_methode", recap:"Methode", title:"Wie wurde die Heizlast ermittelt?", opts:[
    {v:"raum",   pts:0, label:"Raumweise Berechnung nach SIA 384/2",
      tip:"Die Heizlast ist für jeden Raum einzeln gerechnet. Das ist die Grundlage für die Auslegung von Wärmeabgabe und Hydraulik."},
    {v:"einf",   pts:1, label:"Vereinfachtes Verfahren", sub:"Gebäudeheizlast, nicht raumweise", driver:"Heizlast nicht raumweise gerechnet",
      tip:"Nur die Heizlast des ganzen Gebäudes ist bekannt. Für die Auslegung der Wärmeabgabe pro Raum fehlt die Grundlage."},
    {v:"schaetz",pts:2, label:"Abschätzung", sub:"über Verbrauch oder W/m²-Kennwerte", driver:"Heizlast nur abgeschätzt",
      tip:"Ableitung aus Brennstoffverbrauch oder Kennwerten nach Baujahr. Das liefert eine Grössenordnung, aber keine Auslegungsgrundlage."},
    {v:"keine",  direct:5, label:"Es liegt noch keine Heizlast vor", driver:"Es liegt noch keine Heizlast vor",
      tip:"Die Auslegung stützt sich bisher auf Erfahrungswerte oder auf die Leistung der alten Anlage."}]},
  {id:"w_wer", recap:"Gerechnet durch", title:"Wer hat die Heizlast gerechnet?", opts:[
    {v:"planer", pts:0, label:"HLK-Fachplaner/in",
      tip:"Unabhängige Fachplanung ohne Interesse am Verkauf einer bestimmten Anlage."},
    {v:"inst",   pts:1, label:"Installateur / Unternehmer", driver:"Berechnung durch den ausführenden Unternehmer",
      tip:"Der ausführende Unternehmer rechnet selbst, oft mit vereinfachten Hilfsmitteln und ohne unabhängige Kontrolle."},
    {v:"lief",   pts:2, label:"Lieferant / Hersteller", sub:"Auslegung zusammen mit dem Angebot", driver:"Auslegung durch den Lieferanten (Interessenkonflikt)",
      tip:"Die Auslegung kommt mit dem Angebot. Der Lieferant hat ein eigenes Interesse an der Anlagengrösse."},
    {v:"unklar", pts:2, label:"Unklar", driver:"Urheber der Berechnung unklar",
      tip:"Es ist nicht dokumentiert, wer die Heizlast gerechnet hat und wer dafür einsteht."}]},
  {id:"w_daten", recap:"Grundlagen", title:"Wie gut sind die Berechnungsgrundlagen?", opts:[
    {v:"gut",  pts:0, label:"Aktuelle Pläne und Bauteilaufbauten liegen vor",
      tip:"U-Werte, Flächen und Luftwechsel stammen aus aktuellen Plänen und bekannten Bauteilaufbauten."},
    {v:"teil", pts:1, label:"Teilweise Annahmen", sub:"z. B. U-Werte nach Baujahr", driver:"Grundlagen teilweise angenommen",
      tip:"Einzelne Eingaben sind geschätzt, zum Beispiel U-Werte nach Baujahr statt nach Bauteilaufbau."},
    {v:"schw", pts:2, label:"Überwiegend Annahmen, Pläne fehlen", driver:"Grundlagen überwiegend angenommen",
      tip:"Die meisten Eingaben sind geschätzt. Das Ergebnis ist entsprechend unsicher."}]},
  {id:"w_pruef", recap:"Prüfung", title:"Wurde die Heizlast bereits geprüft?", opts:[
    {v:"unabh",  pts:0, label:"Ja, unabhängig", sub:"Second Opinion durch Dritte",
      tip:"Eine Drittperson ohne Projektbeteiligung hat Eingaben und Ergebnis geprüft."},
    {v:"intern", pts:1, label:"Ja, intern im 4-Augen-Prinzip", driver:"Nur intern geprüft",
      tip:"Eine zweite Person im gleichen Büro hat die Berechnung plausibilisiert."},
    {v:"nein",   pts:2, label:"Nein", driver:"Berechnung ungeprüft",
      tip:"Ausser der rechnenden Person hat niemand die Berechnung angesehen."}]}
];
const PROB_STEPS = [[1,1],[3,2],[5,3],[7,4],[8,5]];                     // Punkte bis … → Stufe (Summe 0–8)
const PROB_FROM_PTS = pts => PROB_STEPS.find(([max]) => pts <= max)[1];
const PROBNAME = {1:"Sehr gering",2:"Gering",3:"Mittel",4:"Hoch",5:"Sehr hoch"};

// Risikomatrix: Wert = Wahrscheinlichkeit × Tragweite (1–25) → Risikoklasse. lvl = Farbtoken --l1…--l5.
const RISKCLASSES = [
  {max:4,  name:"Gering",   lvl:1},
  {max:9,  name:"Mittel",   lvl:3},
  {max:15, name:"Hoch",     lvl:4},
  {max:25, name:"Kritisch", lvl:5}
];
const riskClass = (w, t) => RISKCLASSES.find(c => w * t <= c.max);

// Second-Opinion-Wert in Prozent: höchster Wert aller Risiken / 25, plus Zuschlag je weiterem Risiko ab Klasse Hoch.
// Er übersetzt die abstrakte Stufe in die Frage, die den Nutzer interessiert: Braucht es eine Zweitmeinung?
const SO_SCORE_HIGH = 10;        // ab diesem Wert (Klasse Hoch) zählt ein weiteres Risiko für den Zuschlag
const SO_EXTRA = 4;              // Prozentpunkte je weiterem Risiko ab Klasse Hoch
// Schwellen folgen den Risikoklassen: Hoch (10–15 von 25) = 40–60 % empfohlen, Kritisch (ab 16) = ab 64 % stark empfohlen.
const SO_LEVELS = [
  {min:80, name:"zwingend",           text:"Aufgrund Ihrer Angaben ist eine unabhängige Zweitmeinung zur Heizlast zwingend, bevor bestellt oder gebohrt wird."},
  {min:64, name:"stark empfohlen",    text:"Aufgrund Ihrer Angaben ist eine unabhängige Zweitmeinung zur Heizlast notwendig."},
  {min:40, name:"empfohlen",          text:"Aufgrund Ihrer Angaben empfehlen wir eine unabhängige Zweitmeinung zur Heizlast."},
  {min:20, name:"optional",           text:"Eine Zweitmeinung ist für dieses Projekt nicht zwingend. Bei Unsicherheit prüfen wir Ihre Heizlast gern."},
  {min:0,  name:"nicht erforderlich", text:"Für dieses Projekt ist keine Zweitmeinung nötig. Bei Fragen zur Heizlast sind wir gern für Sie da."}
];
const soLevel = pct => SO_LEVELS.find(l => pct >= l.min);
