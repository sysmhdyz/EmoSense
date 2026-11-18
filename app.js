/* EmoSense AI - Controlador principal y persistencia */
(() => {
  const $ = id => document.getElementById(id);
  const analyzer = new EmotionAnalyzer();
  const kb = new KnowledgeBaseEngine();
  const ai = new AIEngine();
  const KEY = "emosense_history_v1";
  const txt = $("txt");

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { toast("No se pudo guardar en este navegador."); } };
  const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // Navegación por pestañas
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + tab.dataset.view));
    if (tab.dataset.view === "history") renderHistory();
    if (tab.dataset.view === "stats") renderStats();
    document.querySelector(".content").scrollTop = 0;
  }));

  txt.addEventListener("input", () => { $("count").textContent = txt.value.length + " / 600"; txt.classList.remove("error"); });
  $("chips").addEventListener("click", e => {
    const chip = e.target.closest(".chip"); if (!chip) return;
    txt.value = chip.dataset.t; txt.dispatchEvent(new Event("input")); analyze();
  });
  $("btnClear").addEventListener("click", () => {
    txt.value = ""; txt.dispatchEvent(new Event("input")); $("result").classList.add("hidden"); txt.focus();
  });
  $("btnAnalyze").addEventListener("click", analyze);

  async function analyze() {
    const text = txt.value.trim();
    if (!text) { txt.classList.add("error"); toast("Escribe un texto antes de analizar."); txt.focus(); return; }
    const btn = $("btnAnalyze"); btn.disabled = true; btn.textContent = "Analizando…";
    const local = analyzer.analyze(text);
    let r = local, source = "Léxico local";
    if (ai.enabled) {
      try {
        const aiMap = await ai.analyze(text);
        const w = local.hits > 0 ? 0.3 : 0; // con coincidencias léxicas: 70% IA + 30% léxico
        const map = {};
        Object.keys(analyzer.meta).forEach(n => map[n] = aiMap[n] * (1 - w) + local.breakdown.find(b => b.name === n).pct * w);
        r = analyzer.fromPercentages(map, local.hits); source = "IA + léxico"; $("aiStatus").textContent = "✅ " + ai.provider + ": " + (ai.lastInfo || "ok");
      } catch (err) { toast("IA no disponible. Mira el detalle en el panel de IA."); $("aiStatus").textContent = "⚠️ " + err.message; $("aiBox").open = true; }
    } else if (local.hits === 0) {
      toast("No se reconocieron palabras. Activa el motor de IA para mayor cobertura.");
    }
    btn.disabled = false; btn.textContent = "Analizar Emoción";
    const base = kb.deepen(r, text);
    const insight = KnowledgeBaseEngine.merge(base, source === "IA + léxico" ? ai.lastInsight : null);
    const k = kb.infer(r);
    showResult(r, k, source, insight);
    const list = load();
    list.unshift({ id: Date.now() + Math.random().toString(16).slice(2, 6), ts: Date.now(), text, primary: r.primary, confidence: r.confidence, color: r.color, emoji: r.emoji });
    save(list.slice(0, 200));
  }

  // Configuración del motor de IA
  function aiStatus() {
    $("aiStatus").textContent = ai.enabled ? "✅ IA activa: " + ai.provider + " (modo híbrido)" : "Sin clave: se usa solo el léxico local.";
    $("aiBox").querySelector("summary").textContent = ai.enabled ? "🤖 Motor de IA: activo" : "🤖 Motor de IA (opcional)";
  }
  $("aiSave").addEventListener("click", () => {
    const v = $("aiKey").value.trim();
    if (!v) { toast("Pega primero tu API key."); return; }
    ai.key = v; $("aiKey").value = ""; aiStatus(); toast("Clave guardada en este navegador.");
  });
  $("aiRemove").addEventListener("click", () => { ai.key = ""; aiStatus(); });

  function showResult(r, k, source, ins) {
    const card = $("result");
    card.classList.add("hidden"); void card.offsetWidth; card.classList.remove("hidden");
    card.style.setProperty("--c", r.color);
    $("resEmoji").textContent = r.emoji;
    $("resName").textContent = r.primary;
    $("resPct").textContent = r.confidence + "% · intensidad " + k.level;
    $("resBar").style.width = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => { $("resBar").style.width = r.confidence + "%"; }));
    const others = r.breakdown.slice(1).filter(b => b.pct > 0);
    $("resBreakdown").innerHTML = others.length
      ? others.map(b => `<li><span>${b.emoji} ${esc(b.name)}</span><div class="mini"><i style="width:${b.pct}%;background:${b.color}"></i></div><span>${b.pct}%</span></li>`).join("")
      : '<li style="display:block;color:#64748B">No se detectaron otras emociones.</li>';
    $("insFeelings").innerHTML = ins.emociones.map(e => `<span class="feel">${esc(e)}</span>`).join("");
    $("insSituation").textContent = ins.situacion ? "Situación: " + ins.situacion : "";
    $("insExplain").textContent = ins.explicacion;
    $("insNeed").textContent = ins.necesidad ? "Lo que podrías necesitar: " + ins.necesidad : "";
    $("insSupport").innerHTML = ins.apoyo.map(a => `<li>${esc(a)}</li>`).join("");
    const risk = KnowledgeBaseEngine.riskMessage(ins.riesgo);
    $("insRisk").textContent = risk; $("insRisk").classList.toggle("hidden", !risk);
    $("kbDiag").textContent = "Diagnóstico: " + k.diagnosis;
    $("kbRec").textContent = k.recommendation;
    $("kbRules").textContent = "Motor: " + source + " · Regla aplicada: " + k.ruleUsed + " · Reglas activadas: " + k.rulesFired.join(", ");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderHistory() {
    const list = load(), box = $("historyList");
    if (!list.length) { box.innerHTML = '<p class="empty">Aún no hay análisis guardados.<br>Analiza un texto y aparecerá aquí.</p>'; return; }
    box.innerHTML = list.map(i => `
      <div class="card" style="--c:${i.color}">
        <div class="card-top"><span>${new Date(i.ts).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</span><span>${i.emoji}</span></div>
        <p>${esc(i.text)}</p>
        <div class="card-foot"><span class="tag">${esc(i.primary)} · ${i.confidence}%</span><button class="del" data-id="${i.id}">Eliminar</button></div>
      </div>`).join("");
  }
  $("historyList").addEventListener("click", e => {
    const b = e.target.closest(".del"); if (!b) return;
    save(load().filter(i => i.id !== b.dataset.id)); renderHistory(); toast("Registro eliminado.");
  });
  $("btnDeleteAll").addEventListener("click", () => {
    if (!load().length) { toast("El historial ya está vacío."); return; }
    if (confirm("¿Borrar todo el historial? Esta acción no se puede deshacer.")) { save([]); renderHistory(); }
  });

  function renderStats() {
    const list = load(), counts = {};
    Object.keys(analyzer.meta).forEach(n => counts[n] = 0);
    list.forEach(i => { if (counts[i.primary] !== undefined) counts[i.primary]++; });
    $("statTotal").textContent = list.length;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    $("statTop").textContent = list.length ? analyzer.meta[top[0]].emoji + " " + top[0] : "—";
    const max = Math.max(1, ...Object.values(counts));
    $("statBars").innerHTML = Object.entries(counts).map(([n, c]) =>
      `<div class="srow"><span>${analyzer.meta[n].emoji} ${esc(n.split(" ")[0])}</span><div class="mini"><i data-w="${c / max * 100}" style="background:${analyzer.meta[n].color}"></i></div><strong>${c}</strong></div>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#statBars i").forEach(el => el.style.width = el.dataset.w + "%")));
  }

  renderHistory(); renderStats(); aiStatus();
})();
