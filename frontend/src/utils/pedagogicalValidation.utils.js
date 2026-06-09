/**
 * Frontend Pedagogical Validation Utility
 * Validates that prompts contain only educational/pedagogical content
 */

const PEDAGOGICAL_KEYWORDS = {
  exam: ['examen', 'examinateur', 'qcm', 'quiz', 'test', 'evaluation', 'évaluation', 'devoir', 'dm', 'contrôle', 'concours', 'bac'],
  exercise: ['exercice', 'exercices', 'entraînement', 'practice', 'travail', 'tp', 'travaux pratiques', 'application', 'problème'],
  question: ['question', 'questions', 'questionnaire', 'interrogation'],
  education: ['cours', 'leçon', 'chapitre', 'théorie', 'concept', 'principe', 'étude', 'étude de cas'],
  subject: ['mathématiques', 'maths', 'français', 'histoire', 'géographie', 'sciences', 'biologie', 'chimie', 'physique', 'informatique'],
  learning: ['apprendre', 'comprendre', 'mémoriser', 'acquérir', 'maîtriser', 'savoir', 'compétence', 'objectif'],
  assessment: ['évaluer', 'noter', 'corriger', 'solution', 'corrigé', 'barème'],
  content: ['tableau', 'code', 'fonction', 'algorithme', 'schéma', 'diagramme', 'graphique', 'formule'],
  actions: ['créer', 'générer', 'élaborer', 'concevoir', 'proposer', 'développer', 'analyser']
};

/**
 * Extract normalized keywords from text
 */
export function extractKeywords(text) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = lower.split(/\s+|[.,!?;:'"()[\]{}\-\/\\]/);
  return new Set(words.filter(w => w.length > 2));
}

/**
 * Calculate Levenshtein distance (typo tolerance)
 */
function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
}

/**
 * Check if word matches keyword with typo tolerance
 */
function fuzzyMatch(word, keyword, maxDistance = 2) {
  if (word.length < 3) return false;
  const distance = levenshteinDistance(word, keyword);
  return distance <= maxDistance;
}

/**
 * Check if text contains pedagogical keywords (with typo tolerance)
 */
export function hasPedagogicalKeywords(text) {
  const keywords = extractKeywords(text);
  
  // Flatten all pedagogical keywords into one set
  const allPedagogicalKeywords = new Set();
  Object.values(PEDAGOGICAL_KEYWORDS).forEach(keywordArray => {
    keywordArray.forEach(keyword => {
      const normalized = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      allPedagogicalKeywords.add(normalized);
    });
  });
  
  // Check exact and fuzzy matches
  for (const word of keywords) {
    // Exact match
    if (allPedagogicalKeywords.has(word)) {
      return true;
    }
    
    // Fuzzy match for typos
    for (const keyword of allPedagogicalKeywords) {
      if (fuzzyMatch(word, keyword, 2)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Frontend validation function
 * Returns { valid: boolean, reason?: string }
 */
export function validatePedagogicalContent(prompt) {
  // Check if prompt is empty
  if (!prompt || String(prompt).trim().length === 0) {
    return {
      valid: false,
      reason: '❌ Le prompt ne peut pas être vide.'
    };
  }

  let trimmedPrompt = String(prompt).trim();
  
  // Clean up special characters at the end (*, !, ?, etc.)
  trimmedPrompt = trimmedPrompt.replace(/[\*\!\?\.\s]+$/, '').trim();
  
  // If prompt becomes empty after cleanup, reject it
  if (trimmedPrompt.length === 0) {
    return {
      valid: false,
      reason: '❌ Le prompt ne peut pas être vide.'
    };
  }

  // Check minimum length
  if (trimmedPrompt.length < 10) {
    return {
      valid: false,
      reason: '❌ Le prompt est trop court. Veuillez donner plus de détails.'
    };
  }

  // Check for common non-pedagogical patterns
  const nonPedagogicalPatterns = [
    /recette/i, /cuisine/i, /plat/i, /manger/i,
    /sport/i, /football/i, /basketball/i, /tennis/i,
    /musique\s+(?!théor)/i, /chanson/i, /concert/i,
    /film/i, /cinéma/i, /série\s+(?!temporelle)/i, /acteur/i,
    /politique\s+(?!histoire)/i, /gouvernement\s+(?!histoire)/i,
    /voyage/i, /tourisme/i, /hôtel/i, /restaurant/i,
    /shopping/i, /vêtement/i, /mode/i,
    /blague/i, /humour/i, /funny/i,
    /jeu vidéo/i, /gaming/i,
    /ami/i, /amitié/i, /romance/i, /amour/i,
    /recette\s+(?!pédagogique)/i, /cuisine\s+(?!histoire)/i
  ];

  for (const pattern of nonPedagogicalPatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        valid: false,
        reason: '❌ Demande non pédagogique. Utilisez des termes éducatifs: examen, exercice, question, cours, etc.'
      };
    }
  }

  // Check if it has pedagogical keywords
  if (!hasPedagogicalKeywords(trimmedPrompt)) {
    return {
      valid: false,
      reason: '❌ Le prompt doit contenir du contenu pédagogique. Exemples: "Créer un examen", "Générer des questions", "Proposer des exercices"'
    };
  }

  return { valid: true };
}

/**
 * Helper to suggest valid prompts
 */
export function getSuggestions() {
  return [
    '📝 Générer un examen sur [matière]',
    '❓ Créer 10 questions QCM sur [concept]',
    '✏️ Proposer 5 exercices pratiques',
    '📚 Élaborer une étude de cas',
    '🎯 Concevoir un test d\'évaluation',
    '🔍 Créer une analyse critique sur [sujet]',
    '💡 Développer un problème pédagogique',
    '📊 Générer une activité d\'apprentissage'
  ];
}
