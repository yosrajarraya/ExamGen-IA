// ─── Constantes partagées entre admin et enseignant ──────────────────────────

export const DEFAULT_SECTIONS = {
  zoneNomPrenom: true,
  zoneGroupe: true,
  blocNote: true,
  blocCommentaires: true,
  blocSignature: true,
  blocRemarques: true,
};

export const SECTION_LABELS = {
  zoneNomPrenom: 'Zone Nom & Prénom',
  zoneGroupe: 'Zone Groupe',
  blocNote: 'Bloc Note',
  blocCommentaires: 'Bloc Commentaires',
  blocSignature: 'Bloc Signature',
  blocRemarques: 'Bloc Remarques / NB',
};

export const TYPE_LABELS = {
  final:      { label: 'Examen Final',        color: '#1e4fa8' },
  cc:         { label: 'Contrôle Continu',    color: '#0d7a55' },
  rattrapage: { label: 'Rattrapage',          color: '#92600a' },
  tp:         { label: 'TP / Projet',         color: '#6d4fc9' },
};

export const MODEL_TYPES = [
  { id: 'final',      label: 'Examen Final'      },
  { id: 'cc',         label: 'Contrôle Continu'  },
  { id: 'rattrapage', label: 'Rattrapage'         },
  { id: 'tp',         label: 'TP / Projet'        },
];

export const LANGUAGES = ['Français', 'Arabe', 'Bilingue'];

export const FONTS = [
  'Arial', 'Times New Roman', 'Calibri', 'Georgia', 'Helvetica', 'Cambria',
];

export const FONT_SIZES = ['10pt', '11pt', '12pt', '13pt', '14pt'];

export const SEMESTRES = ['1', '2'];

export const DUREES = ['30min', '1h', '1h30', '2h', '2h30', '3h'];

export const currentYear = new Date().getFullYear();
export const ANNEES = Array.from(
  { length: 6 },
  (_, i) => `${currentYear + i}-${currentYear + i + 1}`
);

export const DEPARTEMENTS = [
  'Département Génie Informatique',
  'Département Génie Civil',
  'Département Génie Mécanique',
  'Département Génie des Procédés',
  'Département Génie Industriel',
  'Département Architecture',
  'Département Sciences de Base',
  'Département Langues et Communication',
  'Département Management et Économie',
];

export const DISCIPLINES = [
  'Cycle Préparatoire — 1ère année',
  'Cycle Préparatoire — 2ème année',
  'Architecture — 1ère année',
  'Architecture — 2ème année',
  'Architecture — 3ème année',
  'Architecture — 4ème année',
  'Architecture — 5ème année',
  "Licence Génie Logiciel et Système d'Information — 1ère année",
  "Licence Génie Logiciel et Système d'Information — 2ème année",
  "Licence Génie Logiciel et Système d'Information — 3ème année",
  'Licence Management des Systèmes Industriels — 1ère année',
  'Licence Management des Systèmes Industriels — 2ème année',
  'Licence Management des Systèmes Industriels — 3ème année',
  'Génie Informatique — 1ère année',
  'Génie Informatique — 2ème année',
  'Génie Informatique — 3ème année',
  'Génie Civil — 1ère année',
  'Génie Civil — 2ème année',
  'Génie Civil — 3ème année',
  'Génie Mécanique — 1ère année',
  'Génie Mécanique — 2ème année',
  'Génie Mécanique — 3ème année',
  'Génie Industriel — 1ère année',
  'Génie Industriel — 2ème année',
  'Génie Industriel — 3ème année',
  'Mastère Intelligence Artificielle — 1ère année',
  'Mastère Intelligence Artificielle — 2ème année',
  'Mastère Cybersécurité — 1ère année',
  'Mastère Cybersécurité — 2ème année',
];

export const DOCUMENTS_OPTIONS = [
  'PC & Internet non autorisés',
  'PC autorisé, Internet non autorisé',
  'Documents autorisés',
  'Documents non autorisés',
  'Non autorisés',
];

// ─── Normalisation d'un template (utilisée admin + enseignant) ────────────────

export const normalizeTemplate = (t, existingLocalId = null) => ({
  ...t,
  _localId: existingLocalId || t._id || t._localId || `local_${Date.now()}`,
  _id: t._id,
  templateStyle: t.templateStyle || 'long',
  margeH: String(t.margeH ?? 2),
  margeV: String(t.margeV ?? 2),
  sections: { ...DEFAULT_SECTIONS, ...(t.sections || {}) },
  exercices: t.exercices || [],
});

// ─── Valeur par défaut d'un nouveau modèle ────────────────────────────────────

export const makeDefaultModel = () => ({
  _localId: `local_${Date.now()}`,
  nom: 'Nouveau modèle',
  type: 'final',
  actif: true,
  langue: 'Français',
  templateStyle: 'long',
  universiteFr: 'Université Nord-Américaine privée',
  institutFr: 'Institut International de Technologie',
  departementFr: 'Département Génie Informatique',
  universiteAr: 'الجامعة الشمالية الأمريكية الخاصة',
  institutAr: 'معهد التكنولوجيا الدولي',
  departementAr: '',
  campusText: 'SFAX - TUNISIA',
  campusTextEn: 'North American Private University',
  campusTagline: 'TECHNOLOGY · BUSINESS · ARCHITECTURE',
  titreExamen: 'EXAMEN SESSION PRINCIPALE',
  matiere: '',
  discipline: '',
  enseignants: '',
  anneeUniversitaire: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  semestre: '1',
  dateExamen: '',
  duree: '1h30',
  documentsAutorises: 'Documents non autorisés',
  feuilleType: "Feuille d'énoncé",
  sections: { ...DEFAULT_SECTIONS },
  police: 'Times New Roman',
  taille: '12pt',
  margeH: '2',
  margeV: '2',
  remarques: '',
  exercices: [],
});

// ─── Extrait les données d'affichage à partir d'un modèle ────────────────────
// Utilisé par les previews A4 (admin et enseignant)

export const getPreviewData = (model, examForm = {}) => {
  const sec = { ...DEFAULT_SECTIONS, ...(model?.sections || {}) };
  return {
    universityAr:  model?.universiteAr    || 'الجامعة الشمالية الأمريكية الخاصة',
    universityFr:  model?.universiteFr    || 'Université Nord-Américaine privée',
    institute:     model?.institutFr      || 'Institut International de Technologie',
    department:    model?.departementFr   || 'Département Génie Informatique',
    campusText:    model?.campusText      || 'SFAX - TUNISIA',
    campusTextEn:  model?.campusTextEn    || 'North American Private University',
    campusTagline: model?.campusTagline   || 'TECHNOLOGY · BUSINESS · ARCHITECTURE',
    subject:       examForm?.matiere      || model?.matiere    || '',
    discipline:    examForm?.filiere      || model?.discipline || '',
    teachers:      examForm?.enseignants  || model?.enseignants || '',
    docs:          examForm?.documentsAutorises || model?.documentsAutorises || '',
    academicYear:  examForm?.anneeUniversitaire || model?.anneeUniversitaire || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    semestre:      examForm?.semestre     || model?.semestre   || '1',
    dateExamen:    examForm?.dateExamen   || model?.dateExamen || '',
    duration:      examForm?.duree        || model?.duree      || '1h30',
    titre:         examForm?.titre        || model?.titreExamen || 'EXAMEN SESSION PRINCIPALE',
    feuilleType:   model?.feuilleType     || "Feuille d'énoncé",
    remarques:     model?.remarques       || '',
    sec,
  };
};

// ─── Helpers pour le type d'examen ───────────────────────────────────────────

export const getExamTypeLabel = (type) =>
  ({
    final:      'Examen final',
    cc:         'Contrôle continu',
    rattrapage: 'Rattrapage',
    tp:         'TP noté',
  }[type] || type || '');
