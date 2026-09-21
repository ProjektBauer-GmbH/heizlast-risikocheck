// Review-Werkzeug: DOM-Elemente anklicken, kommentieren, alle Anmerkungen als Batch kopieren.
// Nur aktiv mit ?annotate (oder #annotate) in der URL – in der Kunden-Einbettung unsichtbar.
// Eigenständig: Datei + <script>-Tag entfernen, und das Werkzeug ist weg.
(function(){
  if (!/[?&#]annotate\b/.test(location.search + location.hash)) return;

  const KEY = "hrc-annotations";
  let notes = [];
  try { notes = JSON.parse(localStorage.getItem(KEY)) || []; } catch(_){}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch(_){} };
  let picking = false, editing = null;

  const css = `
  [data-annot]{font:600 13px/1.3 var(--body);color:var(--ink)}
  .an-bar{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9000;display:flex;gap:6px;align-items:center;background:var(--surface);border:1px solid var(--accent);border-radius:8px;padding:6px;box-shadow:0 6px 24px color-mix(in srgb,var(--ink) 25%,transparent)}
  .an-bar button,.an-pop button{font:600 13px/1 var(--body);padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
  .an-bar button.on,.an-pop button.pri{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
  .an-bar button:disabled{opacity:.45;cursor:not-allowed}
  .an-hl{position:fixed;z-index:8990;pointer-events:none;border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);border-radius:3px}
  .an-hl span{position:absolute;left:-2px;bottom:100%;background:var(--accent);color:var(--accent-ink);font:500 11px/1 var(--mono);padding:3px 5px;white-space:nowrap;border-radius:3px 3px 0 0}
  .an-pin{position:absolute;z-index:8980;width:22px;height:22px;border-radius:50% 50% 50% 0;background:var(--accent);color:var(--accent-ink);border:2px solid var(--surface);font:700 11px/18px var(--mono);text-align:center;cursor:pointer;padding:0;transform:translate(-50%,-50%)}
  .an-pop{position:fixed;z-index:9010;width:min(340px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--accent);border-radius:8px;padding:12px;box-shadow:0 8px 30px color-mix(in srgb,var(--ink) 30%,transparent)}
  .an-pop code{display:block;font:500 11px/1.4 var(--mono);color:var(--muted);margin-bottom:8px;word-break:break-all}
  .an-pop textarea{width:100%;min-height:84px;font:400 14px/1.4 var(--body);color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px;resize:vertical}
  .an-pop .row{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}
  .an-pop .row .del{margin-right:auto;color:var(--l5)}
  .an-out{position:fixed;inset:10% 10% auto;z-index:9020;background:var(--surface);border:1px solid var(--accent);border-radius:8px;padding:12px}
  .an-out textarea{width:100%;height:50vh;font:500 12px/1.5 var(--mono);color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px}
  body.an-picking, body.an-picking *{cursor:crosshair!important}
  @media print{[data-annot]{display:none!important}}`;
  document.head.appendChild(Object.assign(document.createElement("style"), {textContent: css}));

  const el = (tag, cls, html) => { const e = document.createElement(tag); e.dataset.annot = ""; if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
  const own = t => t.closest && t.closest("[data-annot]");

  // Eindeutiger, möglichst kurzer Selektor: nächste ID + Pfad mit nth-of-type
  function selectorOf(node){
    const parts = [];
    for (let n = node; n && n.nodeType === 1 && n !== document.body; n = n.parentElement){
      if (n.id){ parts.unshift("#" + CSS.escape(n.id)); break; }
      const sibs = [...n.parentElement.children], tag = n.tagName.toLowerCase();
      const cls = [...n.classList].find(c => sibs.filter(x => x.classList.contains(c)).length === 1);   // lesbarer als nth-of-type
      const same = sibs.filter(c => c.tagName === n.tagName);
      parts.unshift(cls ? `${tag}.${CSS.escape(cls)}` : tag + (same.length > 1 ? `:nth-of-type(${same.indexOf(n)+1})` : ""));
    }
    return parts.join(" > ");
  }
  const snippet = n => (n.innerText || n.value || n.alt || "").replace(/\s+/g, " ").trim().slice(0, 90);
  // Zustand des Tools, damit die Anmerkung reproduzierbar ist
  function appState(){
    const res = document.getElementById("result");
    const step = res && !res.hidden ? {id: "Auswertung"} : document.querySelector(".step:not([hidden])");
    const checked = [...document.querySelectorAll("#f input:checked")].map(i => i.id.replace(/^cb_/, "")).join(", ");
    const lvl = document.getElementById("sLevel");
    return {schritt: step ? step.id : "–", auswahl: checked || "–", stufe: lvl ? lvl.textContent : "–"};
  }

  const bar = el("div", "an-bar");
  bar.innerHTML = `<button type="button" data-a="pick">＋ Anmerkung</button><button type="button" data-a="copy">Batch kopieren</button><button type="button" data-a="clear">Leeren</button>`;
  const hl = el("div", "an-hl", "<span></span>"); hl.hidden = true;
  const pins = el("div");
  document.body.append(bar, hl, pins);
  let pop = null;

  function setPicking(v){
    picking = v; document.body.classList.toggle("an-picking", v); hl.hidden = true;
    const b = bar.querySelector('[data-a="pick"]'); b.classList.toggle("on", v); b.textContent = v ? "Element anklicken … (Esc)" : "＋ Anmerkung";
  }
  function drawPins(){
    pins.innerHTML = "";
    notes.forEach((n, i) => {
      let t = null; try { t = document.querySelector(n.selector); } catch(_){}
      if (!t || !t.getClientRects().length) return;          // Element gerade nicht sichtbar (anderer Schritt)
      const r = t.getBoundingClientRect();
      const p = el("button", "an-pin"); p.type = "button"; p.textContent = i+1; p.title = n.comment;
      p.style.left = (r.left + scrollX) + "px"; p.style.top = (r.top + scrollY) + "px";
      p.addEventListener("click", () => openPop(t, i));
      pins.appendChild(p);
    });
    bar.querySelector('[data-a="copy"]').textContent = `Batch kopieren (${notes.length})`;
    bar.querySelector('[data-a="copy"]').disabled = bar.querySelector('[data-a="clear"]').disabled = !notes.length;
  }
  function closePop(){ if (pop){ pop.remove(); pop = null; } editing = null; }
  function openPop(target, index){
    closePop(); setPicking(false);
    const isNew = index == null, sel = isNew ? selectorOf(target) : notes[index].selector;
    editing = index;
    pop = el("div", "an-pop", `<code></code><textarea placeholder="Was soll hier anders sein?"></textarea>
      <div class="row">${isNew ? "" : '<button type="button" class="del">Löschen</button>'}<button type="button" class="esc">Abbrechen</button><button type="button" class="pri">Speichern</button></div>`);
    pop.querySelector("code").textContent = sel;
    const ta = pop.querySelector("textarea"); if (!isNew) ta.value = notes[index].comment;
    document.body.appendChild(pop);
    const r = target.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    pop.style.left = Math.max(16, Math.min(r.left, innerWidth - pr.width - 16)) + "px";
    pop.style.top = (r.bottom + pr.height + 12 < innerHeight ? r.bottom + 8 : Math.max(16, r.top - pr.height - 8)) + "px";
    ta.focus();
    const commit = () => {
      const c = ta.value.trim(); if (!c) return ta.focus();
      if (isNew) notes.push({selector: sel, tag: target.tagName.toLowerCase(), text: snippet(target), state: appState(), width: innerWidth, comment: c});
      else notes[index].comment = c;
      save(); closePop(); drawPins();
    };
    pop.querySelector(".pri").addEventListener("click", commit);
    pop.querySelector(".esc").addEventListener("click", closePop);
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit(); });
    if (!isNew) pop.querySelector(".del").addEventListener("click", () => { notes.splice(index, 1); save(); closePop(); drawPins(); });
  }

  function batch(){
    const d = new Date().toLocaleDateString("de-CH");
    return `# Anmerkungen Heizlast-Risikocheck (${notes.length}) – ${d}\n\n` + notes.map((n, i) =>
      `## ${i+1} · \`${n.selector}\`\n- Element: <${n.tag}>${n.text ? ` «${n.text}»` : ""}\n- Zustand: Schritt ${n.state.schritt} · Auswahl ${n.state.auswahl} · ${n.state.stufe} · Viewport ${n.width}px\n- Kommentar: ${n.comment}\n`).join("\n");
  }
  function showOut(text){
    const o = el("div", "an-out", `<textarea readonly></textarea><div class="an-pop" style="position:static;border:0;box-shadow:none;padding:8px 0 0;width:auto"><div class="row"><button type="button" class="pri">Schliessen</button></div></div>`);
    o.querySelector("textarea").value = text; document.body.appendChild(o);
    o.querySelector("textarea").select(); o.querySelector(".pri").addEventListener("click", () => o.remove());
  }

  bar.addEventListener("click", async e => {
    const a = e.target.dataset.a;
    if (a === "pick") setPicking(!picking);
    if (a === "clear" && confirm(`Alle ${notes.length} Anmerkungen löschen?`)){ notes = []; save(); drawPins(); }
    if (a === "copy"){
      const text = batch();
      try { await navigator.clipboard.writeText(text); e.target.textContent = "Kopiert ✓"; setTimeout(drawPins, 1500); }
      catch(_){ showOut(text); }                               // Clipboard blockiert → Text zum manuellen Kopieren
    }
  });

  // Auswahlmodus: Ereignisse in der Capture-Phase abfangen, damit das Tool darunter nicht reagiert
  document.addEventListener("mousemove", e => {
    if (!picking || own(e.target)) { hl.hidden = true; return; }
    const r = e.target.getBoundingClientRect();
    Object.assign(hl.style, {left: r.left+"px", top: r.top+"px", width: r.width+"px", height: r.height+"px"});
    hl.firstChild.textContent = selectorOf(e.target); hl.hidden = false;
  }, true);
  ["click","mousedown","mouseup","pointerdown","pointerup"].forEach(type => document.addEventListener(type, e => {
    if (!picking || own(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    if (type === "click") openPop(e.target.matches("label input") ? e.target.closest("label") : e.target, null);
  }, true));
  document.addEventListener("keydown", e => { if (e.key === "Escape"){ if (pop) closePop(); else setPicking(false); } });

  // Pins nachführen: das Tool rendert Teile per innerHTML neu, Schritte wechseln, Layout ändert sich
  let raf = 0; const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawPins); };
  new MutationObserver(m => { if (m.some(x => !own(x.target))) redraw(); }).observe(document.querySelector(".wrap"), {childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"]});
  addEventListener("resize", redraw);
  document.addEventListener("scroll", redraw, true);           // auch horizontales Scrollen der Tabelle
  drawPins();
})();
