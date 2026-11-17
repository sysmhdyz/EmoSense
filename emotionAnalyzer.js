/* EmoSense AI - Motor de PLN léxico-semántico (JavaScript puro) */
class EmotionAnalyzer {
  constructor() {
    this.meta = {
      "Alegría": { color: "#F5A524", emoji: "😄" },
      "Tristeza": { color: "#3B82F6", emoji: "😢" },
      "Enojo": { color: "#E5484D", emoji: "😠" },
      "Miedo / Ansiedad": { color: "#8B5CF6", emoji: "😰" },
      "Sorpresa": { color: "#14B8A6", emoji: "😮" },
      "Neutral": { color: "#8A94A6", emoji: "😐" }
    };
    // Lexicón ponderado (raíz:peso 1-3). Raíces de <4 letras se comparan exactas.
    const raw = {
      "Alegría": "feliz:3,alegr:3,content:2,encant:3,genial:2,maravill:3,excelent:2,fantast:3,emocionad:2,amor:2,ador:2,disfrut:2,divert:2,celebr:2,sonri:2,riendo:2,risa:2,gracias:1,agradec:2,orgullos:2,logr:2,exito:2,triunf:2,bendecid:2,afortunad:2,entusiasm:2,optimis:2,esperanz:1,bien:1,dichos:3,gozo:2,ilusion:2,perfect:2",
      "Tristeza": "trist:3,llor:3,deprim:3,dolor:2,sufr:2,solo:1,soledad:2,melanc:3,desanim:2,desesper:3,perdi:2,vacio:2,duelo:2,lastim:2,pena:2,lament:2,abatid:3,decepcion:2,nostalgi:1,culpa:1,fracas:2,infeliz:3,miseri:2,hundid:2,quebrad:2,muert:2,derrot:2,extrano:1,nunca:0,desolad:3,apagad:2,sin:0,llanto:3",
      "Enojo": "enoj:3,furi:3,ira:2,odi:3,rabi:3,molest:2,harto:2,harta:2,irrit:2,indign:3,detest:3,fastidi:2,coraje:3,maldit:2,estupid:2,idiota:2,asco:2,frustr:2,injust:2,ofend:2,grit:2,pelea:2,pelear:2,agres:2,insult:2,traicion:3,mentir:2,mentiros:2,basta:1,desprecio:2,resent:2,encoleriz:3,exasper:3",
      "Miedo / Ansiedad": "miedo:3,temor:3,asust:3,pavor:3,panico:3,ansied:3,ansios:3,nervi:2,preocup:2,agobi:2,estres:2,insegur:2,terror:3,aterr:3,tembl:2,paranoi:2,amenaz:2,peligro:2,incertidumbre:2,inquiet:2,duda:1,dudas:1,presion:1,taquicardia:2,pesadilla:2,fobia:3,vulnerab:2,atemoriz:3,intranquil:2,desasosiego:2,alarm:2,sobresalt:2,angusti:3",
      "Sorpresa": "sorpre:3,asombr:3,increibl:3,impresion:2,impact:2,inesperad:3,repent:2,subito:2,wow:3,vaya:2,guau:3,alucin:2,boquiabiert:3,atonit:3,perplej:2,desconcert:2,shock:2,flipa:2,milagro:2,casualidad:1,descubr:1,revelac:2,estupefact:3,inaudito:2,pasmad:3,anonad:3,curios:1,novedad:1,imagin:1,jamas:0",
      "Neutral": "normal:2,regular:1,ok:2,tranquil:1,rutina:2,comun:1,habitual:2,cotidian:2,trabajo:1,reunion:1,clase:1,hoy:1,manana:1,quizas:2,quiza:2,posible:1,informacion:2,datos:1,reporte:2,informe:2,proyecto:1,tarea:1,oficina:1,horario:1,normalmente:2,simplemente:1,neutral:3,indiferen:3,igual:1,programad:1,document:1"
    };
    this.lexicon = [];
    for (const emo in raw) raw[emo].split(",").forEach(p => {
      const [stem, w] = p.split(":");
      if (Number(w) > 0) this.lexicon.push({ stem, w: Number(w), emo });
    });
    this.negations = new Set(["no", "nunca", "jamas", "tampoco", "nada", "ni"]);
    this.intensifiers = { muy: 1.5, demasiado: 1.8, extremadamente: 2, super: 1.6, bastante: 1.4, mucho: 1.5, mucha: 1.5, tan: 1.3, totalmente: 1.7 };
    // Al negar una emoción, su puntaje se reparte hacia emociones opuestas/neutras
    this.negMap = {
      "Alegría": { "Tristeza": 0.8, "Neutral": 0.2 },
      "Tristeza": { "Alegría": 0.4, "Neutral": 0.6 },
      "Enojo": { "Neutral": 0.7, "Alegría": 0.3 },
      "Miedo / Ansiedad": { "Neutral": 0.6, "Alegría": 0.4 },
      "Sorpresa": { "Neutral": 1 },
      "Neutral": { "Miedo / Ansiedad": 0.5 }
    };
  }

  static normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  tokenize(text) {
    return EmotionAnalyzer.normalize(text).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  }

  matchWord(word) {
    return this.lexicon.find(e => e.stem.length < 4 ? word === e.stem : word.startsWith(e.stem));
  }

  analyze(text) {
    const names = Object.keys(this.meta);
    const scores = Object.fromEntries(names.map(n => [n, 0]));
    const tokens = this.tokenize(text);
    let hits = 0;

    tokens.forEach((word, i) => {
      const m = this.matchWord(word);
      if (!m) return;
      hits++;
      const negated = tokens.slice(Math.max(0, i - 3), i).some(t => this.negations.has(t));
      let mult = 1;
      tokens.slice(Math.max(0, i - 2), i).forEach(t => { if (this.intensifiers[t]) mult = Math.max(mult, this.intensifiers[t]); });
      const val = m.w * mult;
      if (negated) for (const [dest, f] of Object.entries(this.negMap[m.emo])) scores[dest] += val * f;
      else scores[m.emo] += val;
    });

    // Moduladores de puntuación: "!" intensifica, "?" añade duda/sorpresa
    const excl = (text.match(/!/g) || []).length;
    const ques = (text.match(/\?/g) || []).length;
    const boost = 1 + 0.08 * Math.min(excl, 5);
    names.forEach(n => { if (n !== "Neutral") scores[n] *= boost; });
    if (hits > 0 && ques > 0) { scores["Sorpresa"] += 0.4; scores["Miedo / Ansiedad"] += 0.3; }
    scores["Neutral"] += 0.5; // línea base: sin evidencia emocional → Neutral

    const total = names.reduce((s, n) => s + scores[n], 0);
    const map = {};
    names.forEach(n => map[n] = scores[n] / total * 100);
    return this.fromPercentages(map, hits);
  }

  // Construye el objeto de resultado a partir de un mapa {emoción: porcentaje}
  fromPercentages(map, hits = 0) {
    const names = Object.keys(this.meta);
    const pcts = names.map(n => ({ name: n, raw: map[n] || 0, pct: Math.floor(map[n] || 0) }));
    pcts.sort((a, b) => b.raw - a.raw);
    pcts[0].pct += 100 - pcts.reduce((s, p) => s + p.pct, 0);
    const breakdown = pcts.map(p => ({ name: p.name, pct: p.pct, color: this.meta[p.name].color, emoji: this.meta[p.name].emoji }));
    const primary = breakdown[0];
    const sec = breakdown.slice(1).find(b => b.pct > 0 && b.name !== "Neutral") || null;
    return {
      primary: primary.name, confidence: primary.pct,
      color: primary.color, emoji: primary.emoji,
      secondary: sec ? sec.name : null, secondaryPct: sec ? sec.pct : 0,
      breakdown, hits
    };
  }
}
