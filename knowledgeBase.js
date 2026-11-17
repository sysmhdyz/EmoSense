/* EmoSense AI - Sistema Basado en Conocimientos (reglas IF-THEN) */
class KnowledgeBaseEngine {
  constructor() {
    // Cada regla: id, IF (condición sobre el contexto), THEN (diagnóstico + recomendación).
    // Contexto: { primary, secondary, level: "baja"|"media"|"alta", confidence }
    // Las reglas se evalúan por prioridad: combinaciones específicas primero, generales después.
    this.rules = [
      // Regla 1: IF principal=Enojo AND secundaria=Tristeza THEN enojo que oculta dolor
      { id: 1, IF: c => c.primary === "Enojo" && c.secondary === "Tristeza",
        diag: "Detrás del enojo parece haber dolor o decepción.",
        rec: "Nombra lo que te dolió en lugar de atacar: usa frases como «me sentí…». Respira antes de enviar." },
      // Regla 2: IF principal=Miedo AND secundaria=Enojo THEN reacción defensiva
      { id: 2, IF: c => c.primary === "Miedo / Ansiedad" && c.secondary === "Enojo",
        diag: "Tu mensaje suena defensivo: el miedo se está expresando como enojo.",
        rec: "Pregunta qué necesitas para sentirte seguro y exprésalo con calma, sin culpar a nadie." },
      // Regla 3: IF principal=Tristeza AND secundaria=Miedo THEN incertidumbre y desánimo
      { id: 3, IF: c => c.primary === "Tristeza" && c.secondary === "Miedo / Ansiedad",
        diag: "Hay tristeza mezclada con incertidumbre sobre el futuro.",
        rec: "Divide el problema en pasos pequeños y comparte lo que sientes con alguien de confianza." },
      // Regla 4: IF principal=Alegría AND secundaria=Sorpresa THEN entusiasmo
      { id: 4, IF: c => c.primary === "Alegría" && c.secondary === "Sorpresa",
        diag: "Expresas entusiasmo ante algo inesperado y positivo.",
        rec: "Buen momento para compartir la noticia. Revisa que el mensaje sea claro para quien lo recibe." },
      // Regla 5: IF principal=Sorpresa AND secundaria=Miedo THEN impacto negativo
      { id: 5, IF: c => c.primary === "Sorpresa" && c.secondary === "Miedo / Ansiedad",
        diag: "La sorpresa viene acompañada de inquietud.",
        rec: "Espera a tener más información antes de reaccionar o responder." },
      // Regla 6: IF principal=Enojo AND intensidad=alta THEN riesgo de mensaje hostil
      { id: 6, IF: c => c.primary === "Enojo" && c.level === "alta",
        diag: "Enojo intenso: alto riesgo de enviar un mensaje que luego lamentes.",
        rec: "No envíes el mensaje todavía. Espera 20 minutos, respira (inhala 4 s, exhala 6 s) y reescríbelo sin mayúsculas ni acusaciones." },
      // Regla 7: IF principal=Enojo AND intensidad<=media THEN molestia manejable
      { id: 7, IF: c => c.primary === "Enojo",
        diag: "Molestia moderada que puedes canalizar.",
        rec: "Describe el hecho concreto y lo que pides que cambie. Evita palabras absolutas como «siempre» o «nunca»." },
      // Regla 8: IF principal=Tristeza AND intensidad=alta THEN tristeza profunda
      { id: 8, IF: c => c.primary === "Tristeza" && c.level === "alta",
        diag: "Tristeza profunda en tu texto.",
        rec: "Habla con una persona de confianza hoy. Si este sentimiento dura varios días, considera apoyo profesional de salud mental." },
      // Regla 9: IF principal=Tristeza AND intensidad<=media THEN desánimo leve
      { id: 9, IF: c => c.primary === "Tristeza",
        diag: "Desánimo o nostalgia de intensidad leve a media.",
        rec: "Date un respiro: camina, escucha música o escribe lo que sientes. Si vas a enviar el mensaje, sé directo sobre lo que necesitas." },
      // Regla 10: IF principal=Miedo AND intensidad=alta THEN ansiedad marcada
      { id: 10, IF: c => c.primary === "Miedo / Ansiedad" && c.level === "alta",
        diag: "Ansiedad marcada en el mensaje.",
        rec: "Prueba la técnica 5-4-3-2-1 (5 cosas que ves, 4 que tocas, 3 que oyes, 2 que hueles, 1 que saboreas) antes de decidir o responder." },
      // Regla 11: IF principal=Miedo AND intensidad<=media THEN preocupación
      { id: 11, IF: c => c.primary === "Miedo / Ansiedad",
        diag: "Preocupación o nerviosismo moderado.",
        rec: "Anota qué depende de ti y qué no. Enfócate en una acción pequeña que puedas hacer hoy." },
      // Regla 12: IF principal=Alegría AND intensidad=alta THEN euforia
      { id: 12, IF: c => c.primary === "Alegría" && c.level === "alta",
        diag: "Mucha alegría: tu mensaje transmite energía positiva.",
        rec: "Comparte tu alegría, pero evita prometer cosas en el calor del momento." },
      // Regla 13: IF principal=Alegría AND intensidad<=media THEN bienestar
      { id: 13, IF: c => c.primary === "Alegría",
        diag: "Tono positivo y agradable.",
        rec: "Tu mensaje es amable. Añade un detalle concreto para que el destinatario sienta tu aprecio." },
      // Regla 14: IF principal=Sorpresa THEN reacción de asombro
      { id: 14, IF: c => c.primary === "Sorpresa",
        diag: "Reacción de asombro ante algo inesperado.",
        rec: "Aclara si la sorpresa es buena o mala para evitar malentendidos en tu mensaje." },
      // Regla 15: IF principal=Neutral THEN tono informativo
      { id: 15, IF: c => c.primary === "Neutral",
        diag: "Tono neutral o informativo; casi no hay carga emocional.",
        rec: "Si buscas conectar, agrega una frase que muestre cómo te sientes o cómo se siente la otra persona." }
    ];
  }

  static levelOf(confidence) {
    // Regla de intensidad: baja <45%, media 45-75%, alta >75%
    return confidence < 45 ? "baja" : confidence <= 75 ? "media" : "alta";
  }

  infer(result) {
    const ctx = { primary: result.primary, secondary: result.secondary, confidence: result.confidence, level: KnowledgeBaseEngine.levelOf(result.confidence) };
    const fired = this.rules.filter(r => r.IF(ctx));
    const best = fired[0];
    return {
      level: ctx.level,
      diagnosis: best.diag,
      recommendation: best.rec,
      rulesFired: fired.map(r => r.id),
      ruleUsed: best.id
    };
  }
}
