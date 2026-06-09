/**
 * Pedagogical Content Validation Utility
 * Validates that prompts contain only educational/pedagogical content
 */

const PEDAGOGICAL_KEYWORDS = {
  // Exam and assessment related
  exam: ['examen', 'examinateur', 'examiné', 'qcm', 'quiz', 'test', 'evaluation', 'évaluation', 'devoir', 'devoir maison', 'dm', 'contrôle', 'concours', 'bac', 'baccalauréat', 'concours d\'entrée'],
  
  // Exercise and practice
  exercise: ['exercice', 'exercices', 'entraînement', 'practice', 'travail', 'travaux', 'tp', 'travaux pratiques', 'application', 'problème', 'problèmes'],
  
  // Question types
  question: ['question', 'questions', 'questionnaire', 'interrogation', 'interrogatoire'],
  
  // Educational content
  education: ['cours', 'leçon', 'leçons', 'chapitre', 'chapitres', 'théorie', 'théorique', 'concept', 'concepts', 'principe', 'principes', 'étude', 'étude de cas'],
  
  // Subject matter
  subject: ['mathématiques', 'maths', 'français', 'histoire', 'géographie', 'sciences', 'biologie', 'chimie', 'physique', 'informatique', 'programmation', 'langues', 'anglais', 'arabe', 'espagnol', 'allemand', 'italien', 'portugais', 'japonais', 'chinois', 'russe', 'histoire-géographie', 'svt', 'technologie', 'economie', 'philosophie', 'droit', 'littérature', 'grammaire', 'orthographe', 'vocabulaire'],
  
  // Learning objectives
  learning: ['apprendre', 'comprendre', 'mémoriser', 'retenir', 'acquérir', 'maîtriser', 'connaître', 'savoir', 'pouvoir', 'évaluation', 'compétence', 'compétences', 'objectif', 'objectifs', 'résultat d\'apprentissage'],
  
  // Classroom and teaching
  classroom: ['classe', 'classe de', 'collège', 'lycée', 'université', 'baccalauréat', 'lycéen', 'collégien', 'étudiant', 'professeur', 'enseignant', 'maître', 'école', 'établissement', 'pédagogique', 'didactique'],
  
  // Assessment methods
  assessment: ['évaluer', 'estimer', 'juger', 'noter', 'corriger', 'solution', 'corrigé', 'barème', 'note', 'points', 'score', 'résultat', 'réussite', 'échec', 'taux de réussite'],
  
  // Content types
  content: ['tableau', 'tableau à compléter', 'code à compléter', 'code', 'fonction', 'algorithme', 'schéma', 'schémas', 'diagramme', 'diagrammes', 'graphique', 'graphiques', 'formule', 'formules', 'théorème', 'théorèmes', 'définition', 'définitions'],
  
  // Actions in pedagogy
  actions: ['créer', 'créer une', 'générer', 'élaborer', 'concevoir', 'construire', 'proposer', 'soumettre', 'présenter', 'développer', 'approfondir', 'synthétiser', 'résumer', 'analyser', 'critiquer', 'comparer', 'contraster'],
  
  // Difficulty levels
  difficulty: ['facile', 'difficile', 'moyen', 'niveau', 'première', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'seconde', 'première s', 'première es', 'première l', 'terminale', 'débutant', 'intermédiaire', 'avancé', 'expert']
};

/**
 * Extract keywords from text for analysis
 */
function extractKeywords(text) {
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
  if (word.length < 3) return false; // Don't fuzzy match very short words
  const distance = levenshteinDistance(word, keyword);
  return distance <= maxDistance;
}

/**
 * Check if text contains pedagogical keywords (with typo tolerance)
 */
function hasPedagogicalKeywords(text) {
  const keywords = extractKeywords(text);
  
  // Flatten all pedagogical keywords into one set
  const allPedagogicalKeywords = new Set();
  Object.values(PEDAGOGICAL_KEYWORDS).forEach(keywordArray => {
    keywordArray.forEach(keyword => {
      // Normalize the keyword (remove accents)
      const normalized = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      allPedagogicalKeywords.add(normalized);
    });
  });
  
  // Check if any keyword from text matches pedagogical keywords (exact or fuzzy)
  for (const word of keywords) {
    // Exact match
    if (allPedagogicalKeywords.has(word)) {
      return true;
    }
    
    // Fuzzy match for typos (with tolerance of 1-2 character differences)
    for (const keyword of allPedagogicalKeywords) {
      if (fuzzyMatch(word, keyword, 2)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Main validation function
 * Returns { valid: boolean, reason?: string }
 */
function validatePedagogicalContent(prompt, context = {}) {
  // Check if prompt is empty or too short
  if (!prompt || String(prompt).trim().length === 0) {
    return {
      valid: false,
      reason: 'Le prompt ne peut pas être vide.'
    };
  }

  let trimmedPrompt = String(prompt).trim();
  
  // Clean up special characters at the end (*, !, ?, etc.) but keep meaningful punctuation
  trimmedPrompt = trimmedPrompt.replace(/[\*\!\?\.\s]+$/, '').trim();
  
  // If prompt becomes empty after cleanup, reject it
  if (trimmedPrompt.length === 0) {
    return {
      valid: false,
      reason: 'Le prompt ne peut pas être vide.'
    };
  }

  // Check minimum length (must contain meaningful content)
  if (trimmedPrompt.length < 10) {
    return {
      valid: false,
      reason: 'Le prompt est trop court. Veuillez donner plus de détails sur ce que vous voulez générer.'
    };
  }

  // Check for non-pedagogical content patterns
  const nonPedagogicalPatterns = [
    /recette/i, /cuisine/i, /gastronomie/i, /plat/i, /manger/i,
    /sport/i, /football/i, /basketball/i, /tennis/i, /volleyball/i,
    /musique\s+(?!théor|history)/i, /chanson/i, /concert/i, /artiste/i,
    /film/i, /cinéma/i, /série\s+(?!temporelle)/i, /acteur/i, /réalisateur/i,
    /politique\s+(?!histoire|civique)/i, /président/i, /gouvernement\s+(?!histoire)/i,
    /voyage/i, /tourisme/i, /hôtel/i, /restaurant/i,
    /voiture/i, /moto/i, /avion/i, /bateau/i, /autobus/i,
    /shopping/i, /vêtement/i, /chaussure/i, /mode/i,
    /blague/i, /humour/i, /rire/i, /funny/i,
    /jeu vidéo/i, /gaming/i, /console/i,
    /ami/i, /amitié/i, /romance/i, /amour/i, /relation/i,
    /médecine\s+(?!scolaire|générale|enseignement)/i, /diagnostic/i,
    /prescription/i, /médicament/i, /drogue/i,
    /conseil\s+(?!pédagogique|enseignant)/i, /coaching/i, /mentor/i
  ];

  for (const pattern of nonPedagogicalPatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        valid: false,
        reason: 'Le contenu du prompt ne semble pas pédagogique. Veuillez formuler une demande éducative (examen, exercice, question, cours, etc.).'
      };
    }
  }

  // Check if it has pedagogical keywords
  if (!hasPedagogicalKeywords(trimmedPrompt)) {
    return {
      valid: false,
      reason: 'Le prompt doit contenir du contenu pédagogique. Utilisez des termes comme: examen, exercice, question, cours, concept, etc.'
    };
  }

  // Combine prompt with context for better validation
  const fullContext = [trimmedPrompt, context.matiere, context.niveau, context.contexte].filter(Boolean).join(' ');

  // Additional validation: check if requesting something educational
  const educationalRequests = [
    /(?:générer|créer|élaborer|concevoir|proposer|développer)\s+(?:une?\s+)?(?:examen|exercice|question|quiz|test|devoir|tp|travail)/i,
    /(?:donner|fournir|proposer)\s+(?:un\s+)?(?:examen|exercices|questions|cours|leçon)/i,
    /(?:faire|rédiger|écrire)\s+(?:un\s+)?(?:examen|exercice|question|qcm|test)/i,
    /(?:examen|exercice|question|quiz|test|qcm|devoir)\s+(?:sur|pour|concernant|à propos de|sur le|sur la)/i,
    /(?:création|génération|élaboration)\s+(?:d\'une?\s+)?(?:examen|exercice|question|test)/i
  ];

  const hasEducationalRequest = educationalRequests.some(pattern => pattern.test(trimmedPrompt));

  if (!hasEducationalRequest && !hasPedagogicalKeywords(trimmedPrompt)) {
    return {
      valid: false,
      reason: 'Demande non pédagogique. Veuillez utiliser des termes pédagogiques comme: examen, exercice, question, qcm, test, cours, leçon.'
    };
  }

  return { valid: true };
}

module.exports = {
  validatePedagogicalContent,
  hasPedagogicalKeywords,
  extractKeywords,
  PEDAGOGICAL_KEYWORDS
};
