export type WokeFlagId =
  | "sexual_content_unanticipated"
  | "lgbt_explicit"
  | "forced_inclusion"
  | "political_agenda"
  | "message_over_story"
  | "historical_revisionism"
  | "moral_imbalance"
  | "no_content_warning"
  | "coherent_diversity"
  | "ambiguous_social_theme"
  | "feminism_forced"; // 👈 NUEVA FLAG

export type WokeFlag = {
  id: WokeFlagId;
  label: string;
  description: string;
  weight: number; // cuánto suma/resta al score
  category: "principal" | "secondary" | "info";
};

export const WOKE_FLAGS: WokeFlag[] = [
  {
    id: "sexual_content_unanticipated",
    label: "Contenido sexual no anticipado",
    description: "Escenas sexuales explícitas o relevantes sin aviso previo claro.",
    weight: 2,
    category: "principal",
  },
  {
    id: "lgbt_explicit",
    label: "Contenido afectivo-sexual LGTBI explícito",
    description: "Relaciones o actos LGTBI con peso narrativo explícito.",
    weight: 2,
    category: "principal",
  },
  {
    id: "forced_inclusion",
    label: "Inclusión percibida como forzada",
    description: "Personajes o cambios sin función narrativa clara.",
    weight: 2,
    category: "principal",
  },
  {
    id: "political_agenda",
    label: "Agenda política explícita",
    description: "Mensajes políticos contemporáneos integrados de forma directa.",
    weight: 2,
    category: "principal",
  },
  {
    id: "message_over_story",
    label: "Mensaje sobre narrativa",
    description: "El mensaje ideológico prima sobre coherencia o ritmo.",
    weight: 2,
    category: "principal",
  },

  // 🔴 NUEVA FLAG CLAVE
  {
    id: "feminism_forced",
    label: "Feminismo empoderado / forzado",
    description:
      "Empoderamiento femenino tratado de forma ideológica, forzada o aleccionadora, priorizando el mensaje sobre la narrativa.",
    weight: 2,
    category: "principal",
  },

  {
    id: "historical_revisionism",
    label: "Relectura ideológica del pasado",
    description: "Valores actuales aplicados de forma anacrónica.",
    weight: 1,
    category: "secondary",
  },
  {
    id: "moral_imbalance",
    label: "Desequilibrio moral",
    description: "Una sola visión del mundo presentada como incuestionable.",
    weight: 1,
    category: "secondary",
  },
  {
    id: "no_content_warning",
    label: "Contenido sensible sin aviso previo",
    description: "El espectador no puede anticipar el tipo de contenido.",
    weight: 1,
    category: "secondary",
  },
  {
    id: "coherent_diversity",
    label: "Diversidad contextual coherente",
    description: "Diversidad integrada sin condicionar la narrativa.",
    weight: 0,
    category: "info",
  },
  {
    id: "ambiguous_social_theme",
    label: "Tema social tratado con ambigüedad",
    description: "Tema social sin imponer una conclusión cerrada.",
    weight: -1,
    category: "info",
  },
];
