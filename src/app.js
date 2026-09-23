// UI-Logik: Fragebogen als Einzelkarten mit Antwortübersicht, Auswertung am Schluss
// (Second-Opinion-Wert, höchste Stufe, Risikomatrix gekoppelt mit dem Register, eigene Risiken), Export, iFrame-Höhe.
const CONFIG = window.HRC_CONFIG || {
  exports:false,            // CSV + Drucken (in eigener Einbettung auf true setzen)
  contactUrl:null,          // z. B. "https://www.beispiel.ch/kontakt?quelle=risikocheck"
  draftBadges:true          // Badge «ENTWURF» bei allem, was nicht aus dem PDF stammt (nach Freigabe auf false)
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// Stufe als Punkte (1–5); in Exporten steht die Zahl
const dots = (n, cls) => `<span class="${cls||''}" role="img" aria-label="Stufe ${n} von 5">${"●".repeat(n)}<span class="off">${"●".repeat(5-n)}</span></span>`;
const lvlVar = n => `var(--l${n})`;
const label = r => r.name + (r.sub && !r.amp ? ` (${r.sub})` : "");
// «?»-Symbol mit Erklärung (Hover/Fokus). Sitzt über dem unsichtbaren Input, ein Klick wählt die Option nicht aus.
const tipHtml = t => t ? `<span class="tip" tabindex="0" role="note" aria-label="${esc(t)}" data-tip="${esc(t)}">?</span>` : "";
// Pro Konsequenz eine eigene Zeile: Fachtext an Satzgrenzen und Strichpunkten trennen (Wortlaut bleibt)
const splitCons = s => s.split(/;\s+|(?<=[.!?])\s+(?=[A-ZÄÖÜ])/).map(x => x.trim()).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1));

function checkbox(container, ids, name){
  $(container).innerHTML = ids.map(id => {
    const it = ITEMS[id];
    return `<label class="opt"><input type="checkbox" name="${name}" id="cb_${id}" value="${id}"><span>${it.name}${it.sub ? ` <small>${it.sub}</small>` : ""}${tipHtml(it.ph ? "" : it.risk)}</span></label>`;
  }).join("");
}
checkbox("ampB", ["B4","B5","B6","B7"], "ampB");
checkbox("dimN", ["N1","N2","N3"], "dimN");
checkbox("ampN", ["N4","N5","N6","N7","N8"], "ampN");

// Kontext- und Wahrscheinlichkeitsfragen aus dem Modell erzeugen (je Frage eine Karte)
const draftBadge = DRAFT && CONFIG.draftBadges !== false ? ' <span class="draft">ENTWURF</span>' : "";
const radioStep = (q, group) => `<div class="step" id="q_${q.id}" data-radio="${q.id}" data-recap="${q.recap}" hidden>
  <div class="group-label">${group}${draftBadge}</div>
  <h2 class="qtitle" tabindex="-1">${q.title}</h2>${q.help ? `<p class="qhelp">${q.help}</p>` : ""}
  <div class="opts col">${q.opts.map(o => `<label class="opt"><input type="radio" name="${q.id}" id="${q.id}_${o.v}" value="${o.v}"><span>${o.label}${o.sub ? ` <small>${o.sub}</small>` : ""}${tipHtml(o.tip)}</span></label>`).join("")}</div>
</div>`;
$("ctxSteps").innerHTML = CONTEXT_QUESTIONS.map(q => radioStep(q, "Projekt")).join("");
$("probSteps").innerHTML = PROB_QUESTIONS.map(q => radioStep(q, "Belastbarkeit der Heizlast")).join("");
document.querySelectorAll(".draft[hidden]").forEach(el => el.hidden = !draftBadge);
// Statische Optionen: Erklärung aus dem Risikotext des zugehörigen Kriteriums
document.querySelectorAll("[data-tip-item]").forEach(i => i.nextElementSibling.insertAdjacentHTML("beforeend", tipHtml(ITEMS[i.dataset.tipItem].risk)));
// Kurzlabel je Option (für Antwortübersicht und «Ihre Angaben»)
document.querySelectorAll("#f label.opt input").forEach(i => i.dataset.label = i.nextElementSibling.firstChild.textContent.trim());
const optOf = (q, v) => q.opts.find(o => o.v === v);

$("legend").innerHTML = [1,2,3,4,5].map(n =>
  `<div style="--c:${lvlVar(n)}">${dots(n,'s')}<p>${ACTIONS[n]}</p></div>`).join("");
const lvlOptions = names => [1,2,3,4,5].map(n => `<option value="${n}"${n===3?" selected":""}>${n} · ${names[n]}</option>`).join("");
$("ownT").innerHTML = lvlOptions(LEVELNAME); $("ownW").innerHTML = lvlOptions(PROBNAME);

const val = n => { const el = document.querySelector(`input[name="${n}"]:checked`); return el ? el.value : null; };
const vals = n => [...document.querySelectorAll(`input[name="${n}"]:checked`)].map(e => e.value);
const projekt = () => $("projekt").value.trim();

function selected(){
  const typ = val("typ"), out = [];
  if (typ === "B"){
    // Hülle/Datenlage wird unabhängig von B1 bewertet (auch ohne Wärmeerzeugerersatz)
    const h = val("huelle");
    if (h === "t") out.push("B3");
    if (h === "u"){ const v = val("verbr"); if (v==="k") out.push("B2a"); if (v==="u") out.push("B2b"); }
    out.push(...vals("ampB"));
  } else if (typ === "N"){
    out.push(...vals("dimN"), ...vals("ampN"));
  }
  return out;
}

// Zustand: Schritt, Ansicht, eigene Risiken. Wird nur lokal im Browser gespeichert (localStorage), nie übertragen.
let cur = 0, view = "q";          // view: "q" Fragebogen · "r" Auswertung
let custom = [];                  // eigene Risiken: {name, text, t, w}
const STORE = "hrc-state";
function saveState(){
  try { localStorage.setItem(STORE, JSON.stringify({projekt: $("projekt").value, checked: [...document.querySelectorAll("#f input:checked")].map(i => i.id), custom})); } catch(_){}
}
function loadState(){
  try {
    const s = JSON.parse(localStorage.getItem(STORE)); if (!s) return;
    $("projekt").value = s.projekt || "";
    (s.checked || []).forEach(id => { const el = $(id); if (el) el.checked = true; });
    custom = (Array.isArray(s.custom) ? s.custom : []).filter(c => c && c.name).map(c => ({name:String(c.name), text:String(c.text||""), t:Math.min(5,Math.max(1,+c.t||3)), w:Math.min(5,Math.max(1,+c.w||3))}));
  } catch(_){}
}

// Schrittfolge: jede Frage eine Karte; der Pfad hängt von den bisherigen Antworten ab
function steps(){
  const typ = val("typ");
  const head = ["q_name", ...CONTEXT_QUESTIONS.map(q => "q_"+q.id), "q_typ"];
  // «Noch keine Heizlast» (direct) überspringt die Folgefragen zur Belastbarkeit
  const first = PROB_QUESTIONS[0], direct = (optOf(first, val(first.id)) || {}).direct;
  const prob = (direct ? [first] : PROB_QUESTIONS).map(q => "q_"+q.id);
  if (typ === "B") return [...head, "q_b1","q_huelle", ...(val("huelle")==="u" ? ["q_verbrauch"] : []), "q_ampB", ...prob];
  if (typ === "N") return [...head, "q_dimN","q_ampN", ...prob];
  return head;
}
const STEPS_MAX = 4 + CONTEXT_QUESTIONS.length + PROB_QUESTIONS.length + 2;   // längster Pfad (Bestand, Hülle unverändert)
const answered = id => {
  const d = $(id).dataset;
  if (d.text) return $(d.text).value.trim() !== "";
  return !d.radio || val(d.radio) !== null;
};
const answerOf = id => {
  const s = $(id), d = s.dataset;
  return d.text ? projekt() : [...s.querySelectorAll("input:checked")].map(i => i.dataset.label).join(", ");
};
// Erreichbar ist alles bis und mit der ersten unbeantworteten Pflichtfrage
function reach(list){ let i = 0; while (i < list.length-1 && answered(list[i])) i++; return i; }
function go(i, focus){
  const list = steps();
  cur = Math.max(0, Math.min(i, reach(list)));
  render();
  if (focus){ const s = $(list[cur]); (s.querySelector("input.text") || s.querySelector(".qtitle")).focus({preventScroll:true}); }
  postHeight();
}
function show(v){ view = v; render(); window.scrollTo(0,0); postHeight(); }

// Wahrscheinlichkeit (ENTWURF): Punkte der Antworten → Stufe 1–5. parts = Herleitung für die Matrix-Erklärung.
function probability(){
  let pts = 0, direct = 0; const drivers = [], parts = [];
  for (const q of PROB_QUESTIONS){
    const o = optOf(q, val(q.id)); if (!o) continue;
    if (o.direct) direct = o.direct; else pts += o.pts;
    parts.push({q: q.recap, a: o.label, pts: o.direct ? null : o.pts});
    if (o.driver) drivers.push(o.driver);
    if (o.direct) break;
  }
  return {w: direct || PROB_FROM_PTS(pts), pts, direct, drivers, parts};
}

// Auswertung. Baum: max-Regel plus Kumulation ab CUMUL_MIN_AMPS Verstärkern (gedeckelt auf 5) = Tragweite.
// Jedes Risiko hat Wahrscheinlichkeit w und Tragweite t; eigene Risiken bringen beides selbst mit.
// Die Register-ID ist projektspezifisch (R-01 …, nach Wert absteigend). Die Modellcodes (B6 usw.) bleiben intern.
function evaluate(){
  const prob = probability();
  // Bei Tragweite 1 ist keine Heizlast nötig, ein Fehler darin ist also nicht möglich: Wahrscheinlichkeit 1 (Review 23.09.2026)
  const wFor = t => t <= 1 ? 1 : prob.w;
  const tree = selected().map(code => ({code, ...ITEMS[code], w: wFor(ITEMS[code].lvl), t: ITEMS[code].lvl}));
  const own = custom.map((c,i) => ({code:"own"+i, own:true, idx:i, name:c.name, risk:c.text, cons:"", lvl:c.t, t:c.t, w:c.w, irr:false}));
  const rows = [...tree, ...own].map(r => ({...r, score: r.w*r.t, rc: riskClass(r.w, r.t)}))
    .sort((a,b) => b.score - a.score || b.lvl - a.lvl)
    .map((r,i) => ({...r, id: "R-" + String(i+1).padStart(2,"0")}));
  const treeMax = Math.max(0, ...tree.map(r => r.lvl));
  const amps = rows.filter(r => r.amp);
  const cumul = amps.length >= CUMUL_MIN_AMPS;
  const treeTotal = cumul ? Math.min(5, treeMax + CUMUL_BONUS) : treeMax;
  const total = Math.max(treeTotal, ...own.map(r => r.t));               // höchste Stufe über alles
  // Second-Opinion-Wert: höchster Wert / 25, plus Zuschlag je weiterem Risiko ab Klasse Hoch
  const best = Math.max(0, wFor(treeTotal)*treeTotal, ...rows.map(r => r.score));
  const extra = Math.max(0, rows.filter(r => r.score >= SO_SCORE_HIGH).length - 1);
  const pct = rows.length ? Math.min(100, Math.round(best/25*100) + SO_EXTRA*extra) : 0;
  return {rows, treeMax, treeTotal, total, amps, cumul, irr: rows.some(r => r.irr), best, extra, pct, ...prob};
}

function renderSteps(){
  const typ = val("typ"), list = steps(), last = reach(list);
  cur = Math.min(cur, last);
  document.querySelectorAll(".step").forEach(el => el.hidden = el.id !== list[cur]);
  // Pfadlänge steht erst fest, wenn Projektart, Hülle und Methode beantwortet sind. Bis dahin nur «Frage x».
  const fixed = typ && (typ === "N" || val("huelle") !== null) && val(PROB_QUESTIONS[0].id) !== null;
  $("stepCount").textContent = `Frage ${cur+1}` + (fixed ? ` von ${list.length}` : "") + ` · ${$(list[cur]).dataset.recap}`;
  $("stepBar").style.width = `${Math.round((cur+1)/(fixed ? list.length : STEPS_MAX)*100)}%`;
  $("prevBtn").hidden = cur === 0;
  $("nextBtn").textContent = typ && cur === list.length-1 ? "Auswertung anzeigen" : "Weiter";
  $("nextBtn").disabled = !answered(list[cur]);
  // Antwortübersicht: gegebene Antworten, per Klick zurück zur Frage
  $("tocList").innerHTML = list.map((id,i) => {
    const a = i > last || (i === last && !answered(id)) ? "" : (answerOf(id) || "keine");
    return `<li><button type="button" data-i="${i}" class="${i===cur?'on':''}" ${i>last?'disabled':''} ${i===cur?'aria-current="step"':''}>
      <span class="tq">${$(id).dataset.recap}</span><span class="ta">${a ? esc(a) : "offen"}</span></button></li>`;
  }).join("");
}

function renderRecap(){
  $("recap").innerHTML = steps().map(id => `<dt>${$(id).dataset.recap}</dt><dd>${esc(answerOf(id) || "keine")}</dd>`).join("");
}

function renderResult(){
  const typ = val("typ");
  const ev = evaluate(), {rows, total, amps, cumul, irr, pct} = ev;

  // Second Opinion: immer sichtbar, Prozentwert + Einstufung
  const so = soLevel(pct);
  $("soPct").textContent = `${pct} %`; $("soName").textContent = so.name;
  $("soBar").style.width = `${pct}%`;
  $("ctaText").textContent = so.text;
  $("soNote").hidden = val("w_pruef") !== "unabh";

  // Gesamtrisiko = höchster Wert (Tragweite × Wahrscheinlichkeit), dieselbe Grösse wie der Prozentwert
  const top = rows[0], rc = top ? RISKCLASSES.find(c => ev.best <= c.max) : null;
  const topW = top ? top.w : ev.w, topT = top ? (ev.best === (ev.treeTotal <= 1 ? 1 : ev.w)*ev.treeTotal ? ev.treeTotal : top.t) : 0;
  $("soCalc").textContent = top ? `Tragweite ${topT} × Wahrscheinlichkeit ${topW} = ${ev.best} von 25 Punkten` : "";
  $("sum").style.setProperty("--lvl", rc ? lvlVar(rc.lvl) : "var(--line)");
  $("sLevel").textContent = rc ? `Risikoklasse ${rc.name} · ${ev.best} von 25` : "Kein Kriterium erfasst";
  $("sParts").innerHTML = top ? `
    <dt>Tragweite</dt><dd>${dots(topT,'dots')} ${topT} von 5 · ${LEVELNAME[topT]}</dd>
    <dt>Wahrscheinlichkeit</dt><dd>${dots(topW,'dots')} ${topW} von 5 · ${PROBNAME[topW]}</dd>` : "";
  $("sWhy").textContent = !top ? "" : topT >= 4 && topW <= 2
    ? "Die Tragweite eines Fehlers ist hoch, die Wahrscheinlichkeit dafür aber gering, weil die Heizlast belastbar ist. Deshalb fällt der Second-Opinion-Wert tiefer aus als die Tragweite allein vermuten lässt."
    : topT <= 2 && topW >= 4
    ? "Die Heizlast ist wenig belastbar, ein Fehler hätte in diesem Projekt aber begrenzte Folgen."
    : "";
  $("sIrr").hidden = !irr;
  const lead = rows.filter(r => r.lvl === Math.max(...rows.map(x => x.lvl))), rest = rows.filter(r => !lead.includes(r));
  $("sFacts").innerHTML = rows.length ? `
    <dt>Höchste Tragweite</dt><dd>${lead.map(r => esc(label(r))).join(" · ")}</dd>${rest.length ? `
    <dt>Weitere Kriterien</dt><dd>${rest.map(r => esc(label(r))).join(" · ")}</dd>` : ""}` : "";
  const note = $("sNote");
  note.hidden = !cumul;
  if (cumul) note.textContent = `${amps.length} Risikoverstärker treffen gleichzeitig zu (${amps.map(a => a.name).join(", ")}). ` + (ev.treeTotal > ev.treeMax
      ? `Die Stufe wird deshalb von ${ev.treeMax} auf ${ev.treeTotal} angehoben.`
      : `Die Höchststufe ist bereits erreicht.`);

  renderMatrix(ev);

  $("tb").innerHTML = rows.length ? rows.map(r => `
    <tr class="${r.id===rows[0].id?'lead':''}" style="--c:${lvlVar(r.lvl)}" data-rid="${r.id}">
      <td class="id">${r.id}</td>
      <td class="crit">${esc(r.name)}${r.sub?`<small>${r.sub}</small>`:''}${r.amp?'<span class="amp">VERSTÄRKER</span>':''}${r.ph?'<span class="ph">PLATZHALTER</span>':''}${r.own?`<span class="ph">EIGENES RISIKO</span><button type="button" class="linkbtn" data-del="${r.idx}">Entfernen</button>`:''}</td>
      <td>${dots(r.lvl,'dots')}</td>
      <td class="prob">${dots(r.w,'dots')}<small>${r.own ? "Ihre Einschätzung" : r.t <= 1 ? "Keine Heizlast nötig, daher kein Fehler möglich" : ev.drivers.length ? esc(ev.drivers.join(", ")) : "Heizlast belastbar"}</small></td>
      <td class="rc" style="--c:${lvlVar(r.rc.lvl)}"><b>${r.rc.name}</b><small>${r.t} × ${r.w} = ${r.score}</small></td>
      <td class="risk"><b>${LEVELNAME[r.lvl]}${r.irr?' (irreversibel)':''}</b>${esc(r.risk)}</td>
      <td>${r.cons ? `<ul class="cons">${splitCons(r.cons).map(c => `<li>${c}</li>`).join("")}</ul>` : ""}</td>
      <td>${ACTIONS[r.lvl]}</td>
    </tr>`).join("") : `<tr><td colspan="8" class="empty">Keine Risiken erfasst.</td></tr>`;

  const d = new Date().toLocaleDateString("de-CH");
  $("regMeta").textContent = `${projekt() || "Projekt"} · ${typ==="B"?"Bestand":"Neubau"} · Stand ${d}`;
  renderRecap();
}

// 5×5-Matrix: Zeilen = Wahrscheinlichkeit (5 oben), Spalten = Tragweite. Jede Register-ID sitzt in ihrer Zelle,
// «Σ» markiert die durch Kumulation angehobene Gesamtstufe. Rechts die Herleitung, warum die Punkte dort liegen.
function renderMatrix(ev){
  const {rows, w, treeMax, treeTotal, cumul, amps, parts, pts, direct, best, extra, pct} = ev;
  const chips = {};
  const put = (y, x, html) => (chips[y+"-"+x] = chips[y+"-"+x] || []).push(html);
  rows.forEach(r => put(r.w, r.t, `<span class="chip" data-rid="${r.id}">${r.id}</span>`));
  const raised = cumul && treeTotal > treeMax;
  if (raised) put(w, treeTotal, `<span class="chip sum" title="Gesamtstufe nach Kumulation">Σ</span>`);
  let html = `<span class="mxy">Wahrscheinlichkeit</span>`;
  for (let y = 5; y >= 1; y--){
    html += `<span class="mxn">${y}</span>`;
    for (let x = 1; x <= 5; x++){
      const here = rows.length && y*x === best && chips[y+"-"+x];
      html += `<span class="mxc${here?' here':''}" style="--c:${lvlVar(riskClass(y,x).lvl)}">${(chips[y+"-"+x]||[]).join("")}</span>`;
    }
  }
  html += `<span></span>` + [1,2,3,4,5].map(x => `<span class="mxn">${x}</span>`).join("") + `<span class="mxx">Tragweite</span>`;
  $("matrix").innerHTML = html;
  $("matrix").setAttribute("aria-label", `Risikomatrix mit ${rows.length} Risiken. Höchster Wert ${best} von 25.`);
  $("mxLegend").innerHTML = RISKCLASSES.map((c,i) => `<span style="--c:${lvlVar(c.lvl)}"><i></i>${c.name} <small>${i ? RISKCLASSES[i-1].max+1 : 1}–${c.max}</small></span>`).join("");

  const top = rows[0];
  $("mxWhy").innerHTML = !rows.length ? "" : `
    <h3>So entsteht die Position</h3>
    <p><b>Tragweite (waagrecht).</b> Sie ist die Stufe des jeweiligen Kriteriums aus dem Register${rows.some(r => r.own) ? ", bei eigenen Risiken Ihre Einschätzung" : ""}.${raised ? ` Weil ${amps.length} Risikoverstärker zusammentreffen, steigt die Gesamtstufe von ${treeMax} auf ${treeTotal} (Σ).` : ""}</p>
    <p><b>Wahrscheinlichkeit (senkrecht).</b> Sie folgt aus Ihren Angaben zur Belastbarkeit der Heizlast und gilt für alle Kriterien aus dem Fragebogen. Ausnahme: Bei Tragweite 1 ist keine Heizlast nötig, dort gilt Wahrscheinlichkeit 1.</p>
    <table class="why"><tbody>${parts.map(p => `<tr><td>${p.q}</td><td>${p.a}</td><td>${p.pts === null ? "direkt" : "+" + p.pts}</td></tr>`).join("")}
      <tr class="sum"><td colspan="2">${direct ? "Ohne Heizlast gilt direkt die höchste Stufe" : `Summe ${pts} von 8 Punkten (${PROB_STEPS.map(([m,l],i) => { const lo = i ? PROB_STEPS[i-1][0]+1 : 0; return `${lo === m ? m : lo+"–"+m} → ${l}`; }).join(", ")})`}</td><td>Stufe ${w}</td></tr></tbody></table>
    <p><b>Second Opinion ${pct} %.</b> Höchster Wert: ${top.id} ${esc(top.name)} mit ${raised && w*treeTotal === best ? `${w} × ${treeTotal} (Σ)` : `${top.w} × ${top.t}`} = ${best} von 25, das sind ${Math.round(best/25*100)} %.${extra ? ` Dazu kommen ${SO_EXTRA*extra} Prozentpunkte für ${extra === 1 ? "1 weiteres Risiko" : extra + " weitere Risiken"} ab Klasse Hoch.` : ""}</p>`;
}

function render(){
  $("qview").hidden = view !== "q";
  $("result").hidden = view !== "r";
  const tag = $("projTag"); tag.textContent = projekt(); tag.hidden = !projekt();
  if (view === "q") renderSteps(); else renderResult();
  saveState();
}

function tableData(){
  const head = ["ID","Kriterium","Tragweite (1–5)","Wahrscheinlichkeit (1–5)","Wert","Risikoklasse","Irreversibel","Risiko","Konsequenz","Empfohlene Handlung"];
  const ev = evaluate();
  const rows = ev.rows.map(r => [r.id, label(r) + (r.own ? " (eigenes Risiko)" : ""), r.t, r.w, r.score, r.rc.name, r.irr?"ja":"nein", `${LEVELNAME[r.lvl]} · ${r.risk}`, r.cons, ACTIONS[r.lvl]]);
  if (ev.rows.length){
    rows.push(["Gesamt", projekt() || "Gesamtrisiko", ev.total, ev.w, ev.best, RISKCLASSES.find(c => ev.best <= c.max).name, ev.irr?"ja":"nein",
      `Second Opinion ${ev.pct} % · ${soLevel(ev.pct).name}`, "", ACTIONS[ev.total]]);
    // Alle Angaben als Schlüssel/Wert, damit der Export für sich allein lesbar ist
    rows.push([], ...steps().map(id => [$(id).dataset.recap, answerOf(id) || "keine"]));
  }
  return [head, ...rows];
}
function toast(msg){ const t=$("toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,2200); }

$("copyBtn").addEventListener("click", async () => {
  const tsv = tableData().map(r => r.map(c => String(c).replace(/\s+/g," ")).join("\t")).join("\n");
  try { await navigator.clipboard.writeText(tsv); toast("Tabelle kopiert. In Excel einfügen."); }
  catch(e){
    const ta=document.createElement("textarea"); ta.value=tsv; document.body.appendChild(ta); ta.select();
    let ok=false; try{ ok=document.execCommand("copy"); }catch(_){}
    ta.remove(); toast(ok ? "Tabelle kopiert. In Excel einfügen." : "Kopieren blockiert. Bitte Tabelle markieren und kopieren.");
  }
});
if (CONFIG.exports){
  $("csvBtn").hidden = false; $("printBtn").hidden = false;
  $("csvBtn").addEventListener("click", () => {
    const csv = "﻿" + tableData().map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\r\n");
    const slug = projekt().toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    a.download = `heizlast-risikoregister${slug ? "-"+slug : ""}.csv`; a.click();
  });
  $("printBtn").addEventListener("click", () => window.print());
}
$("ctaBtn").addEventListener("click", () => {
  if (CONFIG.contactUrl){ window.open(CONFIG.contactUrl, "_blank", "noopener"); }
  else toast("Kontaktziel noch nicht hinterlegt (CONFIG.contactUrl)");
});

// Eigene Risiken: hinzufügen, entfernen; Register, Matrix und Second-Opinion-Wert rechnen neu
$("ownForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("ownName").value.trim(); if (!name) return;
  custom.push({name, text: $("ownText").value.trim(), t: +$("ownT").value, w: +$("ownW").value});
  $("ownForm").reset(); $("ownT").value = $("ownW").value = "3";
  render(); postHeight();
});
$("tb").addEventListener("click", e => {
  const b = e.target.closest("[data-del]"); if (!b) return;
  custom.splice(+b.dataset.del, 1); render(); postHeight();
});
// Kopplung Register ↔ Matrix: Zeile bzw. Chip unter der Maus hebt das Gegenstück hervor
function highlight(rid){ document.querySelectorAll("#result [data-rid]").forEach(el => el.classList.toggle("hl", !!rid && el.dataset.rid === rid)); }
["tb","matrix"].forEach(id => {
  $(id).addEventListener("mouseover", e => { const el = e.target.closest("[data-rid]"); highlight(el ? el.dataset.rid : null); });
  $(id).addEventListener("mouseleave", () => highlight(null));
});

const SAMPLE = {projekt:"Beispielprojekt", checked:["typ_b","b1_y","h_u","v_u","cb_B6","nutzung_efh","phase_bau","w_methode_schaetz","w_wer_inst","w_daten_teil","w_pruef_nein"]};
function apply(s){
  $("f").reset(); cur = 0; view = "q"; custom = [];
  if (s){
    $("projekt").value = s.projekt;
    s.checked.forEach(id => { const el = $(id); if (el) el.checked = true; });
    cur = steps().length - 1; view = "r";      // Beispiel zeigt direkt die Auswertung
  }
  render(); postHeight();
}
$("f").addEventListener("change", () => { render(); postHeight(); });
$("f").addEventListener("input", e => { if (e.target.id === "projekt") render(); });
$("f").addEventListener("submit", e => e.preventDefault());
$("projekt").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); if (projekt()) go(cur+1, true); } });
$("f").addEventListener("click", e => {
  if (e.target.closest(".tip")){ e.preventDefault(); return; }                       // «?» wählt die Option nicht aus
  // Einzelauswahl per Maus/Touch springt direkt zur nächsten Frage (Tastatur: detail === 0 → kein Sprung)
  if (e.target.type === "radio" && e.detail > 0) setTimeout(() => go(cur+1, true), 160);
});
$("prevBtn").addEventListener("click", () => go(cur-1, true));
$("nextBtn").addEventListener("click", () => {
  if (val("typ") && cur === steps().length-1) show("r"); else go(cur+1, true);
});
$("tocList").addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(+b.dataset.i, true); });
$("editBtn").addEventListener("click", () => show("q"));
$("sampleBtn").addEventListener("click", () => apply(SAMPLE));
$("resetBtn").addEventListener("click", () => apply(null));

// iFrame-Einbettung: Höhe an die Elternseite melden
function postHeight(){ try{ if (window.parent !== window) window.parent.postMessage({type:"hrc-height", height:document.documentElement.scrollHeight}, "*"); }catch(_){} }
window.addEventListener("resize", postHeight);

// Start: gespeicherten Stand aus dem Browser laden und bei der ersten offenen Frage weitermachen
loadState(); cur = reach(steps()); render(); postHeight();
