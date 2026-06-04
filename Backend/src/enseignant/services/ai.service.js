const Groq = require('groq-sdk');
const fs = require('fs');
const axios = require('axios');

let groqInstance = null;
function getGroqClient() {
    if (!groqInstance) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey === 'your_groq_api_key_here') {
            throw new Error("GROQ_API_KEY is missing or empty. Please configure it in your Backend/.env file.");
        }
        groqInstance = new Groq({ apiKey });
    }
    return groqInstance;
}

/* ── Client Ollama (Open Source, Sans Limite) ── */
async function chatWithOllama({ messages, model = 'mistral', temperature = 0.6, max_tokens = 6000 }) {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
    
    try {
        const response = await axios.post(`${ollamaUrl}/api/chat`, {
            model: ollamaModel,
            messages: messages,
            stream: false,
            options: {
                temperature: temperature,
                num_predict: max_tokens,
            }
        }, { timeout: 180000 });
        
        return {
            choices: [{
                message: {
                    content: response.data.message.content
                }
            }]
        };
    } catch (error) {
        console.error('Erreur Ollama:', error.message);
        throw error;
    }
}

/* ── Vérifier si Ollama est disponible ── */
async function isOllamaAvailable() {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    try {
        const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
        return response.status === 200 && response.data.models && response.data.models.length > 0;
    } catch (error) {
        return false;
    }
}







/* ── Extraction de texte selon le type de fichier ── */
async function extractFileContent(file) {
    const mime = file.mimetype;
    const fileName = file.originalname.toLowerCase();

    console.log(`📄 Analyse du fichier: ${file.originalname} (${mime})`);

    // PDF
    if (mime === 'application/pdf' || fileName.endsWith('.pdf')) {
        try {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(file.buffer);
            console.log(`✅ PDF analysé: ${data.text.length} caractères extraits`);
            return { 
                type: 'text', 
                name: file.originalname, 
                content: data.text,
                analysis: `Document PDF de ${Math.ceil(data.text.length / 500)} pages environ` 
            };
        } catch (error) {
            console.error('❌ Erreur PDF:', error.message);
            return { type: 'text', name: file.originalname, content: '[PDF non lisible - format corrompu ou protégé]' };
        }
    }

    // Documents Word (.docx)
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
        try {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            console.log(`✅ Word analysé: ${result.value.length} caractères extraits`);
            return { 
                type: 'text', 
                name: file.originalname, 
                content: result.value,
                analysis: `Document Word avec ${result.value.split('\n').length} lignes`
            };
        } catch (error) {
            console.error('❌ Erreur Word:', error.message);
            // Fallback method pour Word
            try {
                const text = file.buffer.toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                return { type: 'text', name: file.originalname, content: text.substring(0, 15000) };
            } catch {
                return { type: 'text', name: file.originalname, content: '[Document Word non lisible]' };
            }
        }
    }

    // Documents Word anciens (.doc)
    if (mime === 'application/msword' || fileName.endsWith('.doc')) {
        try {
            // Pour les anciens formats .doc, on essaie une extraction basique
            const textract = require('textract');
            return new Promise((resolve) => {
                textract.fromBufferWithMime(mime, file.buffer, (error, text) => {
                    if (error) {
                        console.error('❌ Erreur .doc:', error.message);
                        resolve({ type: 'text', name: file.originalname, content: '[Document .doc non lisible]' });
                    } else {
                        console.log(`✅ Document .doc analysé: ${text.length} caractères`);
                        resolve({ 
                            type: 'text', 
                            name: file.originalname, 
                            content: text,
                            analysis: `Document Word classique`
                        });
                    }
                });
            });
        } catch (error) {
            return { type: 'text', name: file.originalname, content: '[Document .doc non supporté]' };
        }
    }

    // Images → analyse avec vision AI
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName)) {
        try {
            console.log(`🖼️ Image détectée: ${file.originalname}`);
            return {
                type: 'image',
                name: file.originalname,
                mime: mime,
                base64: file.buffer.toString('base64'),
                analysis: `Image ${mime} de ${Math.round(file.buffer.length / 1024)}KB`
            };
        } catch (error) {
            return { type: 'text', name: file.originalname, content: '[Image non lisible]' };
        }
    }

    // Fichiers Excel (.xlsx, .xls)
    if (mime.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        try {
            const xlsx = require('xlsx');
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            let content = '';
            
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const csvData = xlsx.utils.sheet_to_csv(sheet);
                content += `\n--- Feuille: ${sheetName} ---\n${csvData}\n`;
            });
            
            console.log(`📊 Excel analysé: ${workbook.SheetNames.length} feuilles`);
            return { 
                type: 'text', 
                name: file.originalname, 
                content: content,
                analysis: `Fichier Excel avec ${workbook.SheetNames.length} feuille(s)`
            };
        } catch (error) {
            console.error('❌ Erreur Excel:', error.message);
            return { type: 'text', name: file.originalname, content: '[Fichier Excel non lisible]' };
        }
    }

    // Fichiers PowerPoint (.pptx)
    if (mime.includes('presentation') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
        try {
            // Pour PowerPoint, extraction basique du texte
            const text = file.buffer.toString('utf-8').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ');
            const meaningfulText = text.split(' ').filter(word => word.length > 2).join(' ').substring(0, 10000);
            
            console.log(`📊 PowerPoint analysé`);
            return { 
                type: 'text', 
                name: file.originalname, 
                content: meaningfulText,
                analysis: `Présentation PowerPoint`
            };
        } catch (error) {
            return { type: 'text', name: file.originalname, content: '[Présentation PowerPoint non lisible]' };
        }
    }

    // Texte brut (txt, csv, json, md, code…)
    if (mime.startsWith('text/') || mime === 'application/json' || 
        /\.(txt|csv|json|md|js|py|java|c|cpp|html|css|xml|yml|yaml)$/i.test(fileName)) {
        try {
            const content = file.buffer.toString('utf-8');
            console.log(`📝 Fichier texte analysé: ${content.length} caractères`);
            return { 
                type: 'text', 
                name: file.originalname, 
                content: content,
                analysis: `Fichier texte ${mime}`
            };
        } catch (error) {
            return { type: 'text', name: file.originalname, content: '[Fichier texte non lisible]' };
        }
    }

    // RTF (Rich Text Format)
    if (mime === 'application/rtf' || fileName.endsWith('.rtf')) {
        try {
            const text = file.buffer.toString('utf-8').replace(/\\[a-z]+\d*/g, ' ').replace(/[{}]/g, '').replace(/\s+/g, ' ');
            return { 
                type: 'text', 
                name: file.originalname, 
                content: text.substring(0, 15000),
                analysis: `Document RTF`
            };
        } catch (error) {
            return { type: 'text', name: file.originalname, content: '[Fichier RTF non lisible]' };
        }
    }

    // Autres types - tentative d'extraction générique
    console.log(`⚠️ Type de fichier non spécifiquement supporté: ${mime}`);
    try {
        // Tentative d'extraction de texte brut
        const rawText = file.buffer.toString('utf-8', 0, Math.min(file.buffer.length, 5000));
        const cleanText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (cleanText.length > 50) {
            return { 
                type: 'text', 
                name: file.originalname, 
                content: cleanText,
                analysis: `Extraction générique du fichier ${mime}`
            };
        }
    } catch (error) {
        console.error('❌ Erreur extraction générique:', error.message);
    }

    return { 
        type: 'text', 
        name: file.originalname, 
        content: `[Fichier ${mime} non supporté - ${Math.round(file.buffer.length / 1024)}KB]`,
        analysis: `Type de fichier non supporté: ${mime}`
    };
}

/* ── Régulateur de prompt intelligent ── */
function normalizeAndInterpretPrompt(rawPrompt, context) {
    let normalizedPrompt = rawPrompt.trim();
    
    // Corrections orthographiques communes
    const corrections = {
        'generer': 'générer', 'genere': 'génère', 'creer': 'créer', 'cree': 'crée',
        'completer': 'compléter', 'complete': 'complète', 'etude': 'étude',
        'etudes': 'études', 'repondre': 'répondre', 'repond': 'répond',
        'ecrire': 'écrire', 'ecrit': 'écrit', 'definir': 'définir',
        'qestions': 'questions', 'quesiton': 'question', 'quesitons': 'questions'
    };
    
    Object.entries(corrections).forEach(([wrong, correct]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        normalizedPrompt = normalizedPrompt.replace(regex, correct);
    });
    
    // Expansion des abréviations et termes informels
    const expansions = {
        'qq': 'quelques', 'qlq': 'quelques', 'qqs': 'quelques',
        'qcm': 'QCM', 'sql': 'SQL', 'uml': 'UML',
        'pb': 'problème', 'pbs': 'problèmes',
        'algo': 'algorithme', 'algos': 'algorithmes',
        'func': 'fonction', 'fct': 'fonction', 'fonct': 'fonction',
        'tab': 'tableau', 'tabs': 'tableaux',
        'diag': 'diagramme', 'diags': 'diagrammes',
        'bdd': 'base de données', 'bd': 'base de données',
        'oo': 'orienté objet', 'poo': 'programmation orientée objet'
    };
    
    Object.entries(expansions).forEach(([abbrev, full]) => {
        const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
        normalizedPrompt = normalizedPrompt.replace(regex, full);
    });
    
    // Détection d'intentions floues et clarification
    const intentionPatterns = [
        {
            pattern: /(?:faire|créer|générer).*(?:trucs?|choses?|machin|bidule)/gi,
            replacement: 'générer des questions',
            confidence: 0.7
        },
        {
            pattern: /(?:un peu|quelques|des|du)\s*(?:code|prog)/gi,
            replacement: 'des codes à compléter',
            confidence: 0.8
        },
        {
            pattern: /(?:des|qq|quelques)\s*(?:exos?|exercices?)/gi,
            replacement: 'des exercices pratiques',
            confidence: 0.9
        },
        {
            pattern: /(?:tableau|grille|table)/gi,
            replacement: 'tableau à remplir',
            confidence: 0.8
        },
        {
            pattern: /(?:cas|exemple|situation)/gi,
            replacement: 'étude de cas',
            confidence: 0.7
        }
    ];
    
    intentionPatterns.forEach(({pattern, replacement, confidence}) => {
        if (pattern.test(normalizedPrompt)) {
            normalizedPrompt = normalizedPrompt.replace(pattern, replacement);
        }
    });
    
    // Ajout automatique de contexte manquant
    if (!normalizedPrompt.includes('génère') && !normalizedPrompt.includes('crée') && !normalizedPrompt.includes('faire')) {
        normalizedPrompt = `Génère ${normalizedPrompt}`;
    }
    
    // Si pas de matière mentionnée, utiliser le contexte
    if (context.matiere && !normalizedPrompt.includes(context.matiere.toLowerCase())) {
        normalizedPrompt += ` sur ${context.matiere}`;
    }
    
    // Si pas de niveau mentionné, utiliser le contexte
    if (context.niveau && !normalizedPrompt.includes(context.niveau.toLowerCase())) {
        normalizedPrompt += ` niveau ${context.niveau}`;
    }
    
    return {
        original: rawPrompt,
        normalized: normalizedPrompt,
        improvements: normalizedPrompt !== rawPrompt ? [
            'Correction orthographique',
            'Expansion des abréviations', 
            'Clarification des intentions',
            'Ajout du contexte manquant'
        ] : []
    };
}
/* ── Détection intelligente du mode de génération ── */
function detectGenerationMode(message, promptRequirements = null) {
    const text = message.toLowerCase();
    
    // Indicateurs FORCÉS pour mode questions (demandes spécifiques simples) - PATTERNS AMÉLIORÉS
    const questionModeIndicators = [
        // Patterns avec nombres spécifiques
        /(?:^|\s)1\s+(?:étude\s+)?(?:de\s+)?cas/gi,  // "1 étude de cas"
        /(?:^|\s)(?:une?\s+)?(?:étude\s+)?(?:de\s+)?cas(?:\s|$)/gi,  // "une étude de cas", "étude de cas"
        /(?:^|\s)\d{1,2}\s+(?:codes?\s+)?(?:à\s+)?(?:compléter|completion)/gi,  // "3 codes à compléter"
        /(?:^|\s)\d{1,2}\s+(?:tableaux?\s+)?(?:à\s+)?(?:remplir|compléter)/gi,  // "2 tableaux à remplir"
        /(?:^|\s)\d{1,2}\s+(?:fonctions?\s+)?(?:à\s+)?(?:définir|écrire)/gi,  // "4 fonctions à définir"
        /(?:^|\s)\d{1,2}\s+(?:qcm|questions?\s+ouvertes?|analyses?)/gi,  // "5 QCM", "3 questions ouvertes"
        
        // Patterns sans nombres mais très spécifiques
        /(?:faire|créer|générer)\s+(?:un|une|des?)\s+(?:exercice|code|tableau|fonction|étude)/gi,  // "faire un exercice"
        /(?:exercice|code|tableau|fonction|algorithme|analyse|diagramme|requête)\s+(?:à\s+)?(?:compléter|remplir|définir|créer|écrire)/gi,  // "exercice à compléter"
        
        // Patterns pour types spécialisés
        /(?:codes?\s+)?(?:à\s+)?(?:compléter|completion)/gi,  // "code à compléter"
        /(?:tableaux?\s+)?(?:à\s+)?(?:remplir|compléter)/gi,  // "tableau à remplir" 
        /(?:fonctions?\s+)?(?:à\s+)?(?:définir|écrire|implémenter)/gi,  // "fonction à définir"
        /(?:algorithmes?\s+)?(?:à\s+)?(?:implémenter|écrire)/gi,  // "algorithme à implémenter"
        /(?:analyses?\s+)?(?:de\s+)?(?:sorties?|complexité|performance)/gi,  // "analyse de sortie"
        /(?:diagrammes?\s+)?(?:à\s+)?(?:créer|concevoir|dessiner)/gi,  // "diagramme à créer"
        /(?:requêtes?\s+)?(?:sql|base)/gi,  // "requête SQL"
        /(?:tests?\s+)?(?:unitaires?)/gi,  // "test unitaire"
        /(?:debug|erreurs?|bugs?)/gi,  // "debug", "erreurs"
        /(?:optimisations?\s+)?(?:de\s+)?code/gi,  // "optimisation code"
        /(?:architectures?\s+)?(?:système|logicielle)/gi,  // "architecture système"
        
        // Patterns informels mais précis
        /(?:^|\s)(?:quelques|qq)\s+(?:questions?|qcm|codes?|tableaux?|fonctions?)/gi,  // "quelques questions"
        /(?:générer?|créer?|faire)\s+(?:\d+\s+)?(?:étude\s+de\s+cas|code|tableau|fonction|qcm|algorithme|analyse|diagramme|requête)/gi,  // "générer 1 étude de cas"
    ];
    
    // Indicateurs FORCÉS pour mode exam (examens complets avec structure)
    const examModeIndicators = [
        /examen\s+(?:complet|entier|structuré)/gi,  // "examen complet"
        /(?:créer?|générer?|faire)\s+(?:un\s+)?examen\s+(?:avec|de|sur)/gi,  // "créer un examen avec"
        /examen.*(?:\+|et).*(?:\+|et)/gi,  // "examen avec X + Y + Z"
        /(?:\d+.*\+|\d+.*et|\d+.*,).*(?:\d+.*\+|\d+.*et|\d+.*,)/gi,  // Multiple types avec séparateurs
        /(?:plusieurs|différents)\s+(?:types|sections|parties)/gi,  // "plusieurs types"
        /(?:sections?|parties?|exercices?).*(?:avec|contenant)/gi,  // "sections avec"
        /(?:test|évaluation)\s+(?:complet|structuré)/gi  // "test complet"
    ];
    
    // Vérifier les indicateurs de mode questions EN PREMIER (priorité absolue)
    const hasQuestionModeIndicators = questionModeIndicators.some(pattern => pattern.test(text));
    
    // Vérifier les indicateurs de mode exam
    const hasExamModeIndicators = examModeIndicators.some(pattern => pattern.test(text));
    
    // Analyser les chiffres et types pour détecter la complexité
    let totalItemsRequested = 0;
    let uniqueTypesCount = 0;
    
    if (promptRequirements) {
        totalItemsRequested = promptRequirements.totalQuestions;
        uniqueTypesCount = promptRequirements.questionTypes.length;
    }
    
    console.log(`🔍 Analyse du prompt: "${text}"`);
    console.log(`📊 Items demandés: ${totalItemsRequested}, Types uniques: ${uniqueTypesCount}`);
    console.log(`✅ Indicateurs questions: ${hasQuestionModeIndicators}`);
    console.log(`📋 Indicateurs examen: ${hasExamModeIndicators}`);
    
    // RÈGLES DE DÉCISION (ordre d'importance)
    
    // 1. Si indicateurs de questions EXPLICITES → Mode questions (priorité absolue)
    if (hasQuestionModeIndicators) {
        return {
            mode: 'questions',
            confidence: 0.95,
            reason: 'Demande spécifique détectée avec indicateur explicite (exercice isolé, type spécialisé, etc.)'
        };
    }
    
    // 2. Si indicateurs d'examen EXPLICITES ET pas d'indicateurs questions → Mode exam
    if (hasExamModeIndicators && !hasQuestionModeIndicators) {
        return {
            mode: 'exam',
            confidence: 0.9,
            reason: 'Demande d\'examen complet détectée'
        };
    }
    
    // 3. Analyse quantitative pour les cas ambigus
    if (promptRequirements && promptRequirements.isSpecificRequest) {
        // Petites demandes spécifiques → questions (seuil abaissé)
        if (totalItemsRequested <= 8 && uniqueTypesCount <= 3) {
            return {
                mode: 'questions',
                confidence: 0.8,
                reason: `Demande limitée: ${totalItemsRequested} item(s), ${uniqueTypesCount} type(s) - Mode questions approprié`
            };
        }
        
        // Grandes demandes complexes → exam
        if (totalItemsRequested >= 12 && uniqueTypesCount >= 4) {
            return {
                mode: 'exam',
                confidence: 0.85,
                reason: `Demande complexe: ${totalItemsRequested} items, ${uniqueTypesCount} types différents - Structure d'examen requise`
            };
        }
    }
    
    // 4. Mots-clés génériques pour différencier
    const simpleKeywords = ['génère', 'créer', 'faire', 'questions', 'qcm', 'exercice', 'code', 'tableau', 'fonction'];
    const complexKeywords = ['examen', 'test', 'évaluation', 'structure', 'sections', 'barème', 'complet'];
    
    const hasSimpleKeywords = simpleKeywords.some(kw => text.includes(kw));
    const hasComplexKeywords = complexKeywords.some(kw => text.includes(kw));
    
    if (hasSimpleKeywords && !hasComplexKeywords) {
        return {
            mode: 'questions',
            confidence: 0.7,
            reason: 'Mots-clés simples détectés sans structure d\'examen'
        };
    }
    
    if (hasComplexKeywords) {
        return {
            mode: 'exam',
            confidence: 0.75,
            reason: 'Mots-clés d\'examen structuré détectés'
        };
    }
    
    // 5. Par défaut → questions (plus sûr pour les demandes simples)
    return {
        mode: 'questions',
        confidence: 0.6,
        reason: 'Mode par défaut - demande simple présumée'
    };
}

/* ── NOUVEAU SYSTÈME D'ANALYSE DES PROMPTS AMÉLIORÉ ── */
function detectQuestionTypeFromPrompt(message) {
    const text = message.toLowerCase();
    
    // DÉTECTION PRIORITAIRE DES TYPES SPÉCIFIQUES (ordre de priorité)
    const typeDetectors = [
        // TABLEAUX - PRIORITÉ ABSOLUE
        {
            patterns: [
                /(?:tableau|grille|table).*(?:à\s+)?(?:remplir|compléter|completer)/gi,
                /(?:questions?\s+)?(?:de\s+)?(?:tableaux?\s+)?(?:à\s+)?(?:remplir|compléter|completer)/gi,
                /(?:donner|générer|créer|faire).*(?:questions?\s+)?(?:de\s+)?tableau/gi,
                /(?:complét|complet).*tableau/gi
            ],
            type: 'tableau_completion',
            label: 'tableaux à remplir',
            confidence: 0.95
        },
        
        // VRAI/FAUX TABLEAU - TRÈS HAUTE PRIORITÉ
        {
            patterns: [
                /tableau.*(?:vrai|faux)/gi,
                /(?:vrai|faux).*tableau/gi,
                /questions?\s+.*tableau.*(?:vrai|faux)/gi
            ],
            type: 'vrai_faux_tableau',
            label: 'tableaux vrai/faux',
            confidence: 0.98
        },
        
        // CODE À COMPLÉTER - HAUTE PRIORITÉ
        {
            patterns: [
                /(?:code|codes?).*(?:à\s+)?(?:compléter|completer|completion)/gi,
                /(?:exercices?\s+)?(?:de\s+)?(?:code|codes?).*(?:à\s+)?(?:compléter|completer)/gi,
                /(?:compléter|completer).*(?:code|codes?)/gi
            ],
            type: 'code_completion',
            label: 'codes à compléter',
            confidence: 0.92
        },
        
        // ÉTUDES DE CAS - HAUTE PRIORITÉ
        {
            patterns: [
                /(?:étude|etude).*(?:de\s+)?cas/gi,
                /cas.*(?:pratique|concret|réel)/gi,
                /(?:une?\s+)?(?:étude|etude)\s+(?:de\s+)?cas/gi
            ],
            type: 'etude_cas',
            label: 'études de cas',
            confidence: 0.90
        },
        
        // FONCTIONS À DÉFINIR
        {
            patterns: [
                /(?:fonction|fonctions?).*(?:à\s+)?(?:définir|écrire|implémenter|coder)/gi,
                /(?:définir|écrire).*(?:fonction|fonctions?)/gi
            ],
            type: 'fonction_definition',
            label: 'fonctions à définir',
            confidence: 0.88
        },
        
        // QCM CLASSIQUE
        {
            patterns: [
                /(?:\d+\s+)?qcm/gi,
                /(?:questions?\s+)?(?:à\s+)?choix.*multiple/gi,
                /choix.*multiple/gi
            ],
            type: 'qcm_unique',
            label: 'QCM',
            confidence: 0.85
        },
        
        // VRAI/FAUX SIMPLE
        {
            patterns: [
                /(?:\d+\s+)?(?:vrai|faux)/gi,
                /(?:questions?\s+)?(?:vrai|faux)/gi
            ],
            type: 'vrai_faux',
            label: 'vrai/faux',
            confidence: 0.82
        }
    ];
    
    // Parcourir les détecteurs par ordre de priorité
    for (const detector of typeDetectors) {
        for (const pattern of detector.patterns) {
            if (pattern.test(text)) {
                console.log(`🎯 Type détecté: ${detector.type} (${detector.label}) - Confiance: ${detector.confidence}`);
                return {
                    type: detector.type,
                    label: detector.label,
                    confidence: detector.confidence,
                    matched: true
                };
            }
        }
    }
    
    // Aucun type spécifique détecté
    return {
        type: 'ouverte',
        label: 'questions ouvertes',
        confidence: 0.6,
        matched: false
    };
}

/* ── Analyse et extraction des exigences du prompt ── */
function parsePromptRequirements(message) {
    const text = message.toLowerCase();
    const requirements = {
        isSpecificRequest: false,
        questionCounts: {},
        totalQuestions: 0,
        totalPoints: null,
        questionTypes: [],
        specificInstructions: [],
        detectedType: null // Nouveau : type principal détecté
    };
    
    // ÉTAPE 1: Détecter le type principal avec le nouveau système
    const typeDetection = detectQuestionTypeFromPrompt(message);
    if (typeDetection.matched) {
        requirements.detectedType = typeDetection;
        requirements.isSpecificRequest = true;
        console.log(`🔍 Type principal détecté: ${typeDetection.type} (confiance: ${typeDetection.confidence})`);
    }
    
    // ÉTAPE 2: Détecter si c'est une demande spécifique avec des nombres OU des mots-clés spécifiques
    const hasNumbers = /\d+/.test(text);
    const hasStructure = /(?:qcm|questions?|exercice|code|théorique|pratique|analyse|tableau|cas|fonction|étude|algorithme|diagramme|requête|sql|debug|erreur|optimisation|test|unitaire|modèle|architecture)/i.test(text);
    const hasSpecificTypes = /(?:code.*compléter|tableau.*remplir|étude.*cas|fonction.*définir|algorithme.*implémenter|analyse.*sortie|diagramme.*créer|requête.*sql|test.*unitaire|debug|erreur|optimisation)/i.test(text);
    
    // Une demande est spécifique si elle contient des nombres ET une structure, OU des types spécifiques, OU un type a été détecté
    if ((hasNumbers && hasStructure) || hasSpecificTypes || typeDetection.matched) {
        requirements.isSpecificRequest = true;
        
        // ÉTAPE 3: Si un type principal est détecté, l'utiliser en priorité
        if (typeDetection.matched) {
            // Chercher les nombres associés au type détecté
            const countPattern = /(\d+)/g;
            const numbers = text.match(countPattern);
            let count = 1; // Valeur par défaut
            
            if (numbers && numbers.length > 0) {
                // Prendre le premier nombre trouvé
                count = parseInt(numbers[0]);
                console.log(`📊 Nombre détecté pour ${typeDetection.label}: ${count}`);
            }
            
            requirements.questionCounts[typeDetection.label] = count;
            requirements.totalQuestions = count;
            requirements.questionTypes.push(typeDetection.type);
            requirements.specificInstructions.push(`${count} ${typeDetection.label}`);
            
            console.log(`✅ Type principal appliqué: ${count} ${typeDetection.label}`);
        } else {
            // ÉTAPE 4: Fallback sur l'ancien système de patterns si aucun type principal n'est détecté
            
            // Patterns améliorés pour détecter TOUS les types d'exercices (par ordre de priorité)
            const patterns = [
                // ===== PATTERNS TRÈS SPÉCIFIQUES EN PREMIER (HAUTE PRIORITÉ) =====
                
                // Tableaux à remplir - PRIORITÉ ABSOLUE
                { regex: /(?:donner|générer|créer|faire).*(?:questions?.*)?(?:de\s+)?(?:tableaux?\s+)?(?:à\s+)?(?:remplir|compléter)/gi, type: 'tableau_completion', label: 'tableaux à remplir', defaultCount: 1, priority: 100 },
                { regex: /(?:tableaux?\s+)?(?:à\s+)?(?:remplir|compléter)/gi, type: 'tableau_completion', label: 'tableaux à remplir', defaultCount: 1, priority: 99 },
                { regex: /(\d+)\s*(?:tableaux?\s+)?(?:à\s+)?(?:remplir|compléter)/gi, type: 'tableau_completion', label: 'tableaux à remplir', priority: 98 },
            
            // Codes à compléter - PRIORITÉ ÉLEVÉE  
            { regex: /(?:donner|générer|créer|faire).*(?:questions?.*)?(?:de\s+)?(?:exercices?\s+)?(?:de\s+)?(?:codes?\s+)?(?:à\s+)?(?:compléter|completion)/gi, type: 'code_completion', label: 'codes à compléter', defaultCount: 1, priority: 90 },
            { regex: /(?:exercices?\s+)?(?:de\s+)?(?:codes?\s+)?(?:à\s+)?(?:compléter|completion)/gi, type: 'code_completion', label: 'codes à compléter', defaultCount: 1, priority: 89 },
            { regex: /(\d+)\s*(?:codes?\s+)?(?:à\s+)?(?:compléter|completion|completer)/gi, type: 'code_completion', label: 'codes à compléter', priority: 88 },
            
            // Études de cas - PRIORITÉ ÉLEVÉE
            { regex: /(?:donner|générer|créer|faire).*(?:questions?.*)?(?:de\s+)?(?:études?\s+)?(?:de\s+)?cas/gi, type: 'etude_cas', label: 'études de cas', defaultCount: 1, priority: 85 },
            { regex: /(\d+)\s*(?:études?\s+)?(?:de\s+)?cas/gi, type: 'etude_cas', label: 'études de cas', priority: 84 },
            { regex: /(?:une?\s+|1\s+)?(?:étude\s+)?(?:de\s+)?cas/gi, type: 'etude_cas', label: 'études de cas', defaultCount: 1, priority: 83 },
            
            // Fonctions à définir - PRIORITÉ ÉLEVÉE
            { regex: /(?:donner|générer|créer|faire).*(?:questions?.*)?(?:de\s+)?(?:fonctions?\s+)?(?:à\s+)?(?:définir|écrire|implémenter)/gi, type: 'fonction_definition', label: 'fonctions à définir', defaultCount: 1, priority: 80 },
            { regex: /(\d+)\s*(?:fonctions?\s+)?(?:à\s+)?(?:définir|implémenter|écrire|coder)/gi, type: 'fonction_definition', label: 'fonctions à définir', priority: 79 },
            
            // ===== PATTERNS MOYENNEMENT SPÉCIFIQUES =====
            
            // Types de base
            { regex: /(\d+)\s*qcm/gi, type: 'qcm_unique', label: 'QCM', priority: 70 },
            { regex: /(\d+)\s*(?:questions?\s+)?(?:théoriques?|théorie)/gi, type: 'ouverte', label: 'questions théoriques', priority: 69 },
            { regex: /(\d+)\s*(?:questions?\s+)?ouvertes?/gi, type: 'ouverte', label: 'questions ouvertes', priority: 68 },
            { regex: /(\d+)\s*(?:questions?\s+)?pratiques?/gi, type: 'pratique', label: 'questions pratiques', priority: 67 },
            { regex: /(\d+)\s*(?:vrais?\s*)?faux/gi, type: 'vrai_faux', label: 'vrai/faux', priority: 66 },
            
            // Tableaux vrai/faux - SPÉCIAL
            { regex: /tableau.*(?:vrai|faux)/gi, type: 'vrai_faux_tableau', label: 'tableaux vrai/faux', defaultCount: 1, priority: 95 },
            { regex: /(?:vrai|faux).*tableau/gi, type: 'vrai_faux_tableau', label: 'tableaux vrai/faux', defaultCount: 1, priority: 94 }
        ];
        
        // Trier les patterns par priorité (plus haute priorité en premier)
        patterns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        // Appliquer les patterns dans l'ordre de priorité (plus spécifiques en premier)
        let matchFound = false;
        
        for (const pattern of patterns) {
            if (matchFound) break; // Prendre seulement le premier match (priorité la plus haute)
            
            const matches = Array.from(text.matchAll(pattern.regex));
            for (const match of matches) {
                // Utiliser le nombre capturé ou la valeur par défaut
                let count = parseInt(match[1]) || pattern.defaultCount || 1;
                
                // Si on n'a pas trouvé de nombre mais que le pattern match, utiliser 1 par défaut
                if (!match[1] && !pattern.defaultCount) {
                    count = 1;
                }
                
                if (count > 0) {
                    console.log(`🎯 Pattern trouvé (fallback): "${pattern.label}" (priorité: ${pattern.priority || 0}) - ${count} item(s)`);
                    
                    if (!requirements.questionCounts[pattern.label]) {
                        requirements.questionCounts[pattern.label] = 0;
                    }
                    requirements.questionCounts[pattern.label] += count;
                    requirements.totalQuestions += count;
                    
                    if (!requirements.questionTypes.includes(pattern.type)) {
                        requirements.questionTypes.push(pattern.type);
                    }
                    
                    requirements.specificInstructions.push(`${count} ${pattern.label}`);
                    matchFound = true;
                    break; // Sortir de la boucle des matches pour ce pattern
                }
            }
        }
        
        // Si aucun pattern spécifique n'a matché, détecter par mots-clés prioritaires
        if (!matchFound && requirements.totalQuestions === 0) {
            // Patterns d'inférence par priorité (plus spécifiques en premier)
            const inferencePatterns = [
                // Patterns très spécifiques d'abord
                { keywords: ['tableau', 'remplir'], type: 'tableau_completion', label: 'tableaux à remplir', priority: 10 },
                { keywords: ['tableau', 'compléter'], type: 'tableau_completion', label: 'tableaux à remplir', priority: 10 },
                { keywords: ['tableau', 'vrai', 'faux'], type: 'vrai_faux_tableau', label: 'tableaux vrai/faux', priority: 12 },
                { keywords: ['code', 'compléter'], type: 'code_completion', label: 'codes à compléter', priority: 9 },
                { keywords: ['code', 'completion'], type: 'code_completion', label: 'codes à compléter', priority: 9 },
                { keywords: ['étude', 'cas'], type: 'etude_cas', label: 'études de cas', priority: 8 },
                { keywords: ['fonction', 'définir'], type: 'fonction_definition', label: 'fonctions à définir', priority: 7 },
                { keywords: ['fonction', 'écrire'], type: 'fonction_definition', label: 'fonctions à définir', priority: 7 }
            ];
            
            // Trier par priorité décroissante
            inferencePatterns.sort((a, b) => b.priority - a.priority);
            
            for (const inference of inferencePatterns) {
                const keywordCount = inference.keywords.filter(keyword => text.includes(keyword)).length;
                
                // Match si on trouve tous les mots-clés OU au moins 2 sur 3+ mots-clés
                if (keywordCount === inference.keywords.length || 
                   (keywordCount >= 2 && inference.keywords.length >= 2)) {
                    
                    console.log(`🎯 Type détecté par inférence (fallback): ${inference.type} (mots-clés: ${inference.keywords.join(', ')})`);
                    
                    requirements.questionCounts[inference.label] = 1;
                    requirements.totalQuestions = 1;
                    requirements.questionTypes.push(inference.type);
                    requirements.specificInstructions.push(`1 ${inference.label}`);
                    requirements.isSpecificRequest = true;
                    break; // Prendre seulement le premier match (priorité la plus haute)
                }
            }
        }
        
        } // Fin du else (fallback sur ancien système)
        
        // Extraire le barème/points total
        const pointsMatch = text.match(/(?:barème|points?|note)\s+(?:sur|de|total[e]?)\s+(\d+)/i) ||
                          text.match(/(\d+)\s+points?\s+(?:au\s+)?total/i) ||
                          text.match(/sur\s+(\d+)(?:\s+points?)?/i);
        
        if (pointsMatch) {
            requirements.totalPoints = parseInt(pointsMatch[1]);
        }
    }
    
    return requirements;
}
function validateAndAnalyzePrompt(message, context) {
    const prompt = message.trim().toLowerCase();
    
    // Mots-clés qui indiquent une demande valide pour l'IA pédagogique
    const validKeywords = [
        'génère', 'générer', 'crée', 'créer', 'créez', 'faire', 'questions', 'question',
        'examen', 'test', 'évaluation', 'qcm', 'quiz', 'exercice', 'exercices',
        'vrai', 'faux', 'pratique', 'ouverte', 'choix', 'multiple', 'unique',
        'matière', 'niveau', 'sujet', 'thème', 'chapitre', 'cours', 'leçon',
        'algorithmique', 'programmation', 'développement', 'web', 'base', 'données',
        'réseau', 'sécurité', 'intelligence', 'artificielle', 'machine', 'learning',
        'mathématiques', 'physique', 'chimie', 'biologie', 'histoire', 'géographie',
        'français', 'anglais', 'philosophie', 'économie', 'gestion', 'marketing',
        // Nouveaux mots-clés pour types avancés
        'code', 'codes', 'compléter', 'completion', 'tableau', 'tableaux', 'remplir',
        'étude', 'études', 'cas', 'fonction', 'fonctions', 'algorithme', 'algorithmes',
        'diagramme', 'diagrammes', 'schéma', 'schémas', 'analyse', 'analyses',
        'complexité', 'optimisation', 'debug', 'erreur', 'erreurs', 'bug', 'bugs',
        'sql', 'requête', 'requêtes', 'modèle', 'modèles', 'architecture', 'test', 'tests',
        'unitaire', 'unitaires', 'définir', 'implémenter', 'écrire', 'dessiner', 'concevoir'
    ];
    
    // Mots-clés qui indiquent des demandes non pertinentes
    const invalidKeywords = [
        'hello', 'salut', 'bonjour', 'comment', 'allez', 'vous', 'météo', 'temps',
        'actualité', 'news', 'sport', 'football', 'musique', 'film', 'cinéma',
        'restaurant', 'recette', 'cuisine', 'voyage', 'vacances', 'blague', 'joke',
        'amour', 'relation', 'personnel', 'privé', 'jeu', 'game'
    ];
    
    // Vérifier si le prompt contient des mots-clés valides
    const hasValidKeywords = validKeywords.some(keyword => prompt.includes(keyword));
    const hasInvalidKeywords = invalidKeywords.some(keyword => prompt.includes(keyword));
    
    // Analyser si c'est une demande de génération
    const isGenerationRequest = /(?:génère|crée|faire|créer|créez|générer).+(?:question|examen|qcm|test|évaluation|exercice|code|tableau|cas|fonction|algorithme)/i.test(message);
    
    // Détecter les types spécifiques demandés pour forcer le mode questions
    const isSpecificTypeRequest = /(?:étude de cas|code à compléter|tableau|fonction|algorithme|analyse|diagramme|requête|test unitaire)/i.test(message);
    
    // Détection améliorée pour éviter les examens complets non désirés
    const isExamComplexRequest = /(?:examen complet|examen.*avec.*et|plusieurs.*types|différents.*types)/i.test(message) && 
                                /(?:\d+.*\+|\d+.*et|\d+.*,)/.test(message);
    
    // Vérifier la longueur minimale
    const isMinimumLength = message.trim().length >= 10;
    
    // Score de validité
    let validityScore = 0;
    if (hasValidKeywords) validityScore += 3;
    if (isGenerationRequest) validityScore += 2;
    if (isMinimumLength) validityScore += 1;
    if (hasInvalidKeywords) validityScore -= 2;
    if (context.matiere && context.matiere !== '') validityScore += 1;
    if (context.niveau && context.niveau !== '') validityScore += 1;
    
    return {
        isValid: validityScore >= 2,
        score: validityScore,
        isGenerationRequest,
        hasValidKeywords,
        hasInvalidKeywords,
        isSpecificTypeRequest,
        isExamComplexRequest,
        suggestions: generateSuggestions(context)
    };
}

/* ── Génération de suggestions de prompts ── */
function generateSuggestions(context) {
    const matiere = context.matiere || '[votre matière]';
    const niveau = context.niveau || '[votre niveau]';
    const type = context.type || 'QCM';
    
    return [
        `Génère 5 questions ${type} sur ${matiere} pour niveau ${niveau}`,
        `Crée un examen complet de ${matiere} durée ${context.duree || '2h'}`,
        `Faire 3 codes à compléter sur les algorithmes de tri`,
        `Générer 2 tableaux à remplir sur les bases de données`,
        `Créer 1 étude de cas sur la programmation orientée objet`,
        `Écrire 4 fonctions à définir pour ${matiere}`,
        `Faire 2 analyses de complexité algorithmique`,
        `Générer 3 diagrammes UML à concevoir`,
        `Créer 5 requêtes SQL à écrire`,
        `Faire un exercice de debug de code Python`
    ];
}
/* ── Construction du prompt système amélioré ── */
function buildSystemPrompt(context, promptRequirements = null, detectedMode = null) {
    // Déterminer le mode de génération si pas fourni
    let generationMode = detectedMode;
    if (!generationMode && promptRequirements) {
        const modeDetection = detectGenerationMode(context.originalMessage || '', promptRequirements);
        generationMode = modeDetection.mode;
        console.log(`Mode détecté: ${modeDetection.mode} (confiance: ${modeDetection.confidence}) - ${modeDetection.reason}`);
    }
    
    let systemPrompt = `Tu es un assistant pédagogique expert pour la création d'examens.
Tu aides un enseignant à concevoir des examens de qualité.

CONTEXTE OBLIGATOIRE À RESPECTER :
- Matière: ${context.matiere || "NON SPÉCIFIÉE - DEMANDER À L'UTILISATEUR"}
- Niveau: ${context.niveau || "NON SPÉCIFIÉ - DEMANDER À L'UTILISATEUR"}  
- Durée d'examen: ${context.duree || "2 heures"}
- Note totale: ${context.noteTotale || "20"} points

**IMPORTANT: Tu DOIS absolument respecter ces paramètres dans tes générations.**

**RÈGLE CRITIQUE - MODE DE GÉNÉRATION DÉTECTÉ** :
MODE SÉLECTIONNÉ: "${generationMode || 'questions'}"

**NOUVEAU SYSTÈME DE DÉTECTION DE TYPES RENFORCÉ** :
Le système a analysé le prompt et détecté automatiquement le type de question requis.
Tu DOIS STRICTEMENT respecter ce type détecté - AUCUNE SUBSTITUTION N'EST AUTORISÉE !`;

    // Ajouter les informations de détection de type si disponibles
    if (promptRequirements && promptRequirements.detectedType) {
        const detectedType = promptRequirements.detectedType;
        
        systemPrompt += `

🎯 **TYPE PRINCIPAL DÉTECTÉ** : "${detectedType.type}"
📝 **LABEL** : "${detectedType.label}" 
🔍 **CONFIANCE** : ${detectedType.confidence}

**RÈGLE ABSOLUE - GÉNÉRATION FORCÉE DU TYPE DÉTECTÉ** :
- Tu DOIS générer UNIQUEMENT le type "${detectedType.type}"
- INTERDIT de générer d'autres types (ouverte, qcm_unique, etc.) à la place
- Le système a détecté avec ${Math.round(detectedType.confidence * 100)}% de confiance que l'utilisateur veut "${detectedType.label}"

**INSTRUCTIONS SPÉCIALES POUR LE TYPE "${detectedType.type}"** :`;

        // Instructions spécifiques par type détecté
        switch (detectedType.type) {
            case 'tableau_completion':
                systemPrompt += `
- Tu DOIS créer un vrai TABLEAU avec des cellules vides à remplir
- Format OBLIGATOIRE : utilise des tableaux Markdown ou HTML
- Exemple REQUIS : | Concept | Description | Exemple |
                     |---------|-------------|---------|
                     | _____ | Framework Java | _____ |
- NE PAS générer une simple question textuelle !
- Les cellules vides DOIVENT être marquées par _____ ou des espaces à compléter`;
                break;
                
            case 'vrai_faux_tableau':
                systemPrompt += `
- Tu DOIS créer un TABLEAU avec colonnes Vrai/Faux
- Format OBLIGATOIRE : | Énoncé | Vrai | Faux |
                        |---------|------|------|
                        | Spring Boot est un framework | [ ] | [ ] |
- Chaque ligne = un énoncé à évaluer
- NE PAS générer de QCM ou questions ouvertes !`;
                break;
                
            case 'code_completion':
                systemPrompt += `
- Tu DOIS présenter du CODE avec des parties manquantes
- Utilise des blancs : _____ ou /* À COMPLÉTER */
- Exemple : function calculateSum(a, b) { return _____; }
- NE PAS générer de questions théoriques sur le code !
- Le code DOIT avoir des parties à compléter par l'étudiant`;
                break;
                
            case 'etude_cas':
                systemPrompt += `
- Tu DOIS créer un CAS PRATIQUE avec contexte détaillé
- Structure : Contexte + Situation + Questions d'analyse
- NE PAS générer de QCM ou questions théoriques simples !
- Le cas DOIT être concret et réaliste`;
                break;
                
            default:
                systemPrompt += `
- Génère exactement le type "${detectedType.type}" comme détecté
- Respecte les caractéristiques spécifiques de ce type
- NE SUBSTITUE AUCUN AUTRE TYPE`;
        }
    }

    systemPrompt += `

**RÈGLES STRICTES PAR MODE** :
- Mode "questions" : Pour des demandes spécifiques (1 étude de cas, 3 codes à compléter, 5 QCM isolés, etc.)
  → Génère une liste simple de questions dans le format "questions"
  → PAS d'examen structuré, PAS de sections, PAS d'exercices groupés
  
- Mode "exam" : UNIQUEMENT pour des examens complets avec PLUSIEURS types ET sections structurées
  → Génère un examen complet avec sections et exercices groupés
  → Structure organisée avec titre, durée, barème

**RÈGLE ABSOLUE - RESPECT STRICT DU TYPE DÉTECTÉ** :
Tu DOIS générer EXACTEMENT le type de question demandé dans le prompt. JAMAIS un autre type.

**DÉTECTION AUTOMATIQUE FORCÉE** :
- Si prompt contient "tableau à remplir" ou "questions de tableau" → OBLIGATOIRE type "tableau_completion"
- Si prompt contient "code à compléter" → OBLIGATOIRE type "code_completion"  
- Si prompt contient "étude de cas" → OBLIGATOIRE type "etude_cas"
- Si prompt contient "fonction à définir/écrire" → OBLIGATOIRE type "fonction_definition"

**INTERDICTION FORMELLE** :
- NE JAMAIS générer "ouverte" quand le prompt demande "tableau à remplir"
- NE JAMAIS générer "qcm_unique" quand le prompt demande "code à compléter"
- NE JAMAIS changer le type détecté par le système

**EXEMPLE CRITIQUE** :
Prompt : "donner des questions de tableau à remplir sur spring boot"
→ Tu DOIS générer type "tableau_completion" avec un vrai tableau, PAS "ouverte"

**EXEMPLES CONCRETS POUR MODE "${generationMode || 'questions'}"** :`;

    if (generationMode === 'questions') {
        systemPrompt += `
- "Générer 1 étude de cas sur Spring Boot" → Mode "questions", 1 question type "etude_cas"
- "3 QCM sur Java" → Mode "questions", 3 questions type "qcm_unique"
- "Faire 2 codes à compléter" → Mode "questions", 2 questions type "code_completion"
- "Une fonction à définir" → Mode "questions", 1 question type "fonction_definition"

**POUR CE MODE, TU DOIS** :
- Utiliser UNIQUEMENT le format {"mode": "questions", "questions": [...]}
- NE PAS créer de sections ou d'exercices groupés
- Générer une liste directe de questions
- Respecter exactement le nombre et type demandé`;
    } else {
        systemPrompt += `
- "Examen complet avec 10 QCM + 5 questions ouvertes + 3 codes" → Mode "exam" avec sections
- "Créer un test structuré de 2h" → Mode "exam" avec organisation

**POUR CE MODE, TU DOIS** :
- Utiliser le format {"mode": "exam", "sections": [...]}
- Créer des sections logiques et des exercices groupés
- Organiser la structure avec titre, durée, barème total`;
    }

    // Ajouter les exigences spécifiques du prompt si détectées
    if (promptRequirements && promptRequirements.isSpecificRequest) {
        systemPrompt += `

EXIGENCES SPÉCIFIQUES DU PROMPT DÉTECTÉES :
- Demande spécifique avec structure définie: OUI
- Nombre total de questions demandées: ${promptRequirements.totalQuestions}
- Types de questions demandés: ${promptRequirements.questionTypes.join(', ')}`;

        if (Object.keys(promptRequirements.questionCounts).length > 0) {
            systemPrompt += `
- Répartition exacte demandée:`;
            for (const [type, count] of Object.entries(promptRequirements.questionCounts)) {
                systemPrompt += `
  • ${count} ${type}`;
            }
        }

        if (promptRequirements.totalPoints) {
            systemPrompt += `
- Points totaux spécifiés: ${promptRequirements.totalPoints} points`;
        }

        systemPrompt += `

**RÈGLE CRITIQUE - GÉNÉRATION OBLIGATOIRE** :
Tu DOIS générer EXACTEMENT les types détectés ci-dessus. AUCUNE substitution autorisée.

${promptRequirements.questionTypes.map(type => {
    if (type === 'tableau_completion') {
        return '- Type "tableau_completion" → OBLIGATION de créer un vrai tableau avec cellules vides à remplir (format Markdown ou HTML)';
    } else if (type === 'vrai_faux_tableau') {
        return '- Type "vrai_faux_tableau" → OBLIGATION de créer un tableau avec colonnes Vrai/Faux et énoncés à évaluer';
    } else if (type === 'code_completion') {
        return '- Type "code_completion" → OBLIGATION de présenter du code avec des blancs (_____) à compléter';
    } else if (type === 'etude_cas') {
        return '- Type "etude_cas" → OBLIGATION de présenter un cas pratique avec contexte et questions d\'analyse';
    } else if (type === 'fonction_definition') {
        return '- Type "fonction_definition" → OBLIGATION de demander d\'écrire une fonction avec spécifications';
    } else {
        return `- Type "${type}" → OBLIGATION de respecter ce type exactement`;
    }
}).join('\n')}

**EXEMPLE POUR TABLEAU_COMPLETION** :
Si le type détecté est "tableau_completion", tu DOIS générer quelque chose comme :
\`\`\`
{
  "text": "Complétez le tableau suivant sur Spring Boot :\\\\n\\\\n| Annotation | Rôle | Exemple d'usage |\\\\n|------------|------|-----------------|\\\\n| _____ | Marque une classe comme contrôleur | _____ |\\\\n| @Service | _____ | Logique métier |\\\\n| _____ | Injection de dépendance | _____ |",
  "type": "tableau_completion",
  "options": []
}
\`\`\`

**EXEMPLE POUR VRAI_FAUX_TABLEAU** :
Si le type détecté est "vrai_faux_tableau", tu DOIS générer quelque chose comme :
\`\`\`
{
  "text": "Évaluez chaque énoncé en cochant Vrai ou Faux :\\\\n\\\\n| Énoncé | Vrai | Faux |\\\\n|--------|------|------|\\\\n| Spring Boot simplifie le développement Java | [ ] | [ ] |\\\\n| @Autowired permet l'injection manuelle | [ ] | [ ] |\\\\n| Spring Boot inclut un serveur Tomcat intégré | [ ] | [ ] |",
  "type": "vrai_faux_tableau",
  "options": []
}
\`\`\`

**RÈGLE ABSOLUE**: Tu DOIS générer EXACTEMENT ce qui est demandé dans le prompt :
- Respecter les nombres EXACTS de chaque type de question
- Utiliser la répartition de points demandée ou appropriée
- Adapter le niveau de difficulté au contexte (${context.matiere}, ${context.niveau})
- Ne pas ajouter ou retirer de questions par rapport à la demande
- SURTOUT : Ne jamais changer le type de question détecté

**EXEMPLE**: Si le prompt demande "10 QCM, 5 questions théoriques, 2 codes à compléter", tu dois générer EXACTEMENT :
- 10 questions de type "qcm_unique" 
- 5 questions de type "ouverte" (théoriques)
- 2 questions de type "code_completion" (codes à compléter)
= Total de 17 questions, pas une de plus, pas une de moins.`;
    }

    
    systemPrompt += `

RÈGLES DE VALIDATION :
- Tu DOIS refuser les prompts non liés à l'éducation ou à la génération d'examens
- Tu DOIS demander de préciser la matière et le niveau si ils ne sont pas remplis
- Tu acceptes différents styles d'écriture de prompts mais ils DOIVENT être pédagogiques
- Tu peux analyser des fichiers joints (cours, sujets, images de tableau…)

EXEMPLES DE PROMPTS VALIDES :
- "Génère des questions sur les algorithmes"
- "Crée un examen de mathématiques"
- "Faire 5 QCM sur les bases de données"
- "Je veux des exercices pratiques de programmation"
- "Peux-tu créer des questions sur l'histoire de France ?"
- "Génère un examen Spring Boot avec 10 QCM, 5 questions théoriques, 2 codes à compléter"
- "Créer 3 codes à compléter sur les fonctions Python"
- "Faire 2 tableaux à remplir sur les rôles ERP"
- "Générer 1 étude de cas sur la gestion de projet"
- "Écrire 4 fonctions à définir pour les structures de données"
- "Créer 2 analyses de sortie de code JavaScript"
- "Faire 3 diagrammes UML à concevoir"
- "Générer 5 requêtes SQL à écrire"
- "Créer un exercice de debug de code avec erreurs"
- "Faire une analyse de complexité algorithmique"

EXEMPLES DE PROMPTS À REFUSER :
- "Bonjour comment allez-vous ?"
- "Quelle est la météo aujourd'hui ?"
- "Raconte-moi une blague"
- "Aide-moi avec ma vie personnelle"

RÉPONSES POUR PROMPTS INVALIDES :
Si le prompt n'est pas lié à l'éducation, réponds avec un message d'aide approprié.

RÉPONSES POUR CONTEXTE MANQUANT :
Si matière ou niveau manquent, demander de les remplir.

Quand l'enseignant demande de générer des questions ou un examen complet, tu réponds UNIQUEMENT en JSON valide
**IMPORTANT**: Quand une question nécessite une visualisation (graphe, diagramme, schéma, cube, circuit, etc.), tu DOIS ajouter le champ "imageDescription" avec une description détaillée en anglais de l'image à générer
**IMPORTANT**: Pour les QCM, les options doivent être des OBJETS avec "text" et "correct", PAS des chaînes simples
**IMPORTANT**: Respecte EXACTEMENT le type de question demandé dans le prompt

**EXEMPLES DE GÉNÉRATION PAR TYPE** :

POUR CODE À COMPLÉTER (code_completion) : Présenter du code avec des blancs (_____) à remplir
POUR CODE AVEC ERREURS (code_debug) : Présenter du code contenant des bugs à identifier et corriger
POUR TABLEAU À REMPLIR (tableau_completion) : Créer un tableau avec des cellules vides à compléter
**IMPORTANT POUR TABLEAUX :** Quand le prompt demande "tableau à remplir", tu DOIS générer type "tableau_completion" avec un vrai tableau HTML ou Markdown avec des cellules vides (_____) à compléter. Exemple :
\`\`\`
| Concept | Définition | Exemple |
|---------|------------|---------|
| _____ | Framework Java pour applications web | _____ |
| Spring Boot | _____ | Application REST |
\`\`\`

POUR ÉTUDE DE CAS (etude_cas) : Présenter un cas pratique réel avec contexte et questions d'analyse
POUR FONCTIONS À DÉFINIR (fonction_definition) : Demander d'écrire une fonction complète avec spécifications
POUR ALGORITHMES (algorithme_implementation) : Demander d'implémenter un algorithme avec contraintes
POUR ANALYSES DE SORTIE (analyse_sortie) : Donner du code et demander de prédire/expliquer la sortie
POUR DIAGRAMMES (diagramme_creation) : Demander de concevoir un diagramme (ajouter imageDescription)
POUR ANALYSES DE COMPLEXITÉ (analyse_complexite) : Analyser la complexité temporelle/spatiale
POUR REQUÊTES SQL (requete_sql) : Écrire des requêtes de base de données avec tables spécifiées
POUR MODÈLES (modele_donnees) : Concevoir des structures/schémas de données
POUR ARCHITECTURES (architecture_systeme) : Concevoir une architecture logicielle/système
POUR TESTS UNITAIRES (test_unitaire) : Écrire des tests pour valider du code
POUR OPTIMISATIONS (optimisation_code) : Proposer des améliorations de performance sur du code existant

**RÈGLE CRITIQUE DE DÉTECTION DU TYPE :**
- Si le prompt contient "tableau à remplir" ou "questions de tableau" → TYPE = "tableau_completion" 
- Si le prompt contient "code à compléter" → TYPE = "code_completion"
- Si le prompt contient "étude de cas" → TYPE = "etude_cas"
- Si le prompt contient "fonction à définir/écrire" → TYPE = "fonction_definition"
- RESPECTER EXACTEMENT le type détecté, ne pas le changer !
POUR ALGORITHMES (algorithme_implementation) : Demander d'implémenter un algorithme avec contraintes
POUR ANALYSES DE SORTIE (analyse_sortie) : Donner du code et demander de prédire/expliquer la sortie
POUR DIAGRAMMES (diagramme_creation) : Demander de concevoir un diagramme (ajouter imageDescription)
POUR ANALYSES DE COMPLEXITÉ (analyse_complexite) : Analyser la complexité temporelle/spatiale
POUR REQUÊTES SQL (requete_sql) : Écrire des requêtes de base de données avec tables spécifiées
POUR MODÈLES (modele_donnees) : Concevoir des structures/schémas de données
POUR ARCHITECTURES (architecture_systeme) : Concevoir une architecture logicielle/système
POUR TESTS UNITAIRES (test_unitaire) : Écrire des tests pour valider du code
POUR OPTIMISATIONS (optimisation_code) : Proposer des améliorations de performance sur du code existant

Pour des questions isolées :
{
  "mode": "questions",
  "matiere": "${context.matiere || 'À préciser'}",
  "niveau": "${context.niveau || 'À préciser'}",
  "questions": [
    {
      "text": "Le texte de la question...",
      "type": "ouverte|qcm_unique|qcm_multiple|vrai_faux|pratique",
      "points": 2,
      "answerLines": 3,
      "imageDescription": "Detailed description in English of the image to generate (REQUIRED for visual questions)",
      "options": [
        {"text": "Option A...", "correct": true},
        {"text": "Option B...", "correct": false},
        {"text": "Option C...", "correct": false}
      ]
    }
  ]
}

Pour un examen complet :
{
  "mode": "exam",
  "title": "Examen de ${context.matiere || '[Matière]'} - ${context.niveau || '[Niveau]'}",
  "matiere": "${context.matiere || 'À préciser'}",
  "niveau": "${context.niveau || 'À préciser'}",
  "duree": "${context.duree || '2 heures'}",
  "noteTotale": ${context.noteTotale || 20},
  "sections": [
    {
      "title": "Titre de la section",
      "exercises": [
        {
          "title": "Titre de l'exercice",
          "points": 5,
          "questions": [
            {
              "text": "Le texte de la question...",
              "type": "ouverte|qcm_unique|qcm_multiple|vrai_faux|pratique",
              "points": 2,
              "answerLines": 3,
              "imageDescription": "Detailed description in English of the image to generate (REQUIRED for visual questions)",
              "options": [
                {"text": "Option A...", "correct": true},
                {"text": "Option B...", "correct": false},
                {"text": "Option C...", "correct": false}
              ]
            }
          ]
        }
      ]
    }
  ]
}

**DISTRIBUTION DES POINTS** (RESPECTER LE TOTAL ${context.noteTotale || 20}) :
- Répartir intelligemment les points selon la difficulté
- Questions simples: 1-2 points
- Questions moyennes: 3-4 points  
- Questions complexes: 5-8 points
- S'assurer que la somme totale = ${context.noteTotale || 20} points

**FORMAT DES OPTIONS (TRÈS IMPORTANT)** :
- Chaque option DOIT être un objet : {"text": "...", "correct": true/false}
- NE PAS utiliser de tableau de chaînes simples
- NE PAS ajouter de champ "answer" séparé
- Marquer la/les bonne(s) réponse(s) avec "correct": true

Types: ouverte, qcm_unique, qcm_multiple, vrai_faux, vrai_faux_tableau, pratique, code_completion, code_debug, analyse_sortie, tableau_completion, etude_cas, fonction_definition, algorithme_implementation, diagramme_creation, schema_completion, analyse_complexite, optimisation_code, test_unitaire, requete_sql, modele_donnees, architecture_systeme.

**RÈGLES POUR CHAQUE TYPE** :
- Pour "ouverte", "pratique": options = []
- Pour "vrai_faux": 2 options avec {"text": "Vrai", "correct": true/false} et {"text": "Faux", "correct": true/false}
- Pour "vrai_faux_tableau": options = [] ET créer un tableau avec colonnes Vrai/Faux
- Pour "qcm_unique", "qcm_multiple": 3-4 options avec {"text": "...", "correct": true/false}
- Pour "code_completion": Présenter du code avec des parties manquantes à compléter (options = [])
- Pour "code_debug": Présenter du code avec des erreurs à identifier et corriger (options = [])
- Pour "analyse_sortie": Donner du code et demander d'analyser sa sortie (options = [])
- Pour "tableau_completion": Créer un tableau avec des cellules vides à remplir (options = []) - OBLIGATOIRE d'utiliser format tableau
- Pour "etude_cas": Présenter un cas pratique détaillé avec questions d'analyse (options = [])
- Pour "fonction_definition": Demander d'écrire une fonction complète (options = [])
- Pour "algorithme_implementation": Demander d'implémenter un algorithme spécifique (options = [])
- Pour "diagramme_creation": Demander de dessiner/concevoir un diagramme (options = [], ajouter imageDescription)
- Pour "schema_completion": Fournir un schéma à compléter (options = [], ajouter imageDescription)
- Pour "analyse_complexite": Analyser la complexité algorithmique (options = [])
- Pour "optimisation_code": Proposer des optimisations de code (options = [])
- Pour "test_unitaire": Écrire des tests unitaires (options = [])
- Pour "requete_sql": Écrire des requêtes SQL (options = [])
- Pour "modele_donnees": Concevoir des modèles de données (options = [])
- Pour "architecture_systeme": Concevoir une architecture système (options = [])

**ATTENTION CRITIQUE POUR "tableau_completion"** :
Quand tu génères type "tableau_completion", tu DOIS créer un vrai tableau avec format Markdown ou HTML.
EXEMPLE OBLIGATOIRE :
\`\`\`
"text": "Complétez ce tableau sur Spring Boot :\\\\n\\\\n| Concept | Description | Exemple |\\\\n|---------|-------------|---------|\\\\n| _____ | Framework Java | _____ |\\\\n| @Autowired | _____ | Injection |"
\`\`\`
NE PAS générer une simple question textuelle pour "tableau_completion" !

**ATTENTION CRITIQUE POUR "vrai_faux_tableau"** :
Quand tu génères type "vrai_faux_tableau", tu DOIS créer un tableau avec colonnes Vrai/Faux.
EXEMPLE OBLIGATOIRE :
\`\`\`
"text": "Évaluez les énoncés suivants :\\\\n\\\\n| Énoncé | Vrai | Faux |\\\\n|--------|------|------|\\\\n| Spring Boot simplifie le développement | [ ] | [ ] |\\\\n| @Autowired permet l'injection manuelle | [ ] | [ ] |"
\`\`\`
NE PAS générer de QCM ou questions ouvertes pour "vrai_faux_tableau" !`;
    
    return systemPrompt;
}

/* ── Chat principal avec validation ── */
async function chatWithAI({ message, files = [], history = [], context = {} }) {
    const apiKey = process.env.GROQ_API_KEY;
    const useOllama = process.env.USE_OLLAMA === 'true';

    // Régulateur de prompt intelligent - normaliser et interpréter le prompt
    const promptRegulation = normalizeAndInterpretPrompt(message, context);
    const processedMessage = promptRegulation.normalized;
    
    console.log('Prompt original:', promptRegulation.original);
    console.log('Prompt normalisé:', processedMessage);
    if (promptRegulation.improvements.length > 0) {
        console.log('Améliorations appliquées:', promptRegulation.improvements);
    }

    // Validation du prompt (utiliser le prompt normalisé)
    const validation = validateAndAnalyzePrompt(processedMessage, context);
    
    if (!validation.isValid) {
        // Retourner un message d'aide au lieu de générer avec l'IA
        const helpMessage = `Je suis un assistant spécialisé dans la création d'examens et de questions pédagogiques. 

Veuillez me donner une demande liée à l'éducation, comme :
${context.matiere ? 
  `• "Génère des questions sur ${context.matiere}"` :
  '• "Génère des questions sur [matière]"'
}
• "Crée un examen complet de [matière]"  
• "Faire des exercices pratiques sur [sujet]"
• "Générer des QCM sur [thème spécifique]"

${!context.matiere || !context.niveau ? 
  `\n⚠️ Pour une génération optimale, veuillez remplir :
${!context.matiere ? '• Le champ MATIÈRE (ex: Mathématiques, Informatique, Histoire...)' : ''}
${!context.niveau ? '• Le champ NIVEAU (ex: Licence 3, Master 1, Terminale...)' : ''}` : ''
}

**Exemples de prompts valides :**
${validation.suggestions.slice(0, 3).map(s => `• "${s}"`).join('\n')}`;

        return {
            reply: helpMessage,
            jsonData: null,
            aiProvider: 'Validation System'
        };
    }

    // Analyser les exigences spécifiques du prompt (utiliser le prompt normalisé)
    const promptRequirements = parsePromptRequirements(processedMessage);
    
    // NOUVELLES LOGS pour débugger
    console.log('🔍 ANALYSE DU PROMPT:');
    console.log('- Prompt normalisé:', processedMessage);
    console.log('- Demande spécifique:', promptRequirements.isSpecificRequest);
    console.log('- Total questions:', promptRequirements.totalQuestions);
    console.log('- Types détectés:', promptRequirements.questionTypes);
    if (promptRequirements.detectedType) {
        console.log('- Type principal:', promptRequirements.detectedType.type, 
                   `(${promptRequirements.detectedType.label}, confiance: ${promptRequirements.detectedType.confidence})`);
    }

    // NOUVELLE LOGIQUE: Détection intelligente du mode de génération
    context.originalMessage = message; // Stocker le message original pour la détection
    const modeDetection = detectGenerationMode(processedMessage, promptRequirements);
    console.log(`🎯 Mode détecté: ${modeDetection.mode} (confiance: ${modeDetection.confidence})`);
    console.log(`📝 Raison: ${modeDetection.reason}`);

    const messages = [{ role: 'system', content: buildSystemPrompt(context, promptRequirements, modeDetection.mode) }];

    // Historique de conversation
    history.forEach(h => {
        messages.push({ role: h.role, content: h.content });
    });

    // Construction du message utilisateur avec fichiers (utiliser le prompt normalisé)
    let userContent = processedMessage;
    const imageContents = [];
    
    // Ajouter une note sur les améliorations du prompt si nécessaire
    if (promptRegulation.improvements.length > 0) {
        userContent += `\n\n--- RÉGULATION DU PROMPT ---\n`;
        userContent += `Prompt original: "${promptRegulation.original}"\n`;
        userContent += `Prompt optimisé: "${promptRegulation.normalized}"\n`;
        userContent += `Améliorations: ${promptRegulation.improvements.join(', ')}\n`;
        userContent += `💡 L'IA comprend vos prompts informels et les améliore automatiquement !`;
    }

    if (files.length > 0) {
        const extracted = await Promise.all(files.map(extractFileContent));
        const textParts = extracted.filter(f => f.type === 'text');
        const imageParts = extracted.filter(f => f.type === 'image');

        if (textParts.length > 0) {
            userContent += '\n\n--- ANALYSE DES FICHIERS JOINTS ---\n';
            userContent += `📁 ${textParts.length} fichier(s) analysé(s) avec succès:\n\n`;
            
            textParts.forEach((f, index) => {
                const truncated = f.content.substring(0, 8000);
                const wordCount = f.content.split(/\s+/).length;
                
                userContent += `🗂️ **Fichier ${index + 1}: ${f.name}**\n`;
                if (f.analysis) {
                    userContent += `📊 Analyse: ${f.analysis}\n`;
                }
                userContent += `📄 Contenu (${wordCount} mots${truncated.length < f.content.length ? ', tronqué' : ''}):\n`;
                userContent += `${truncated}\n\n`;
            });
            
            userContent += `\n🎯 **INSTRUCTIONS SPÉCIALES POUR LES FICHIERS** :\n`;
            userContent += `• Analyse ATTENTIVEMENT le contenu des fichiers ci-dessus\n`;
            userContent += `• Génère des questions DIRECTEMENT basées sur ce contenu\n`;
            userContent += `• Utilise les concepts, exemples, et informations présents dans les documents\n`;
            userContent += `• Adapte le niveau de difficulté selon le contenu analysé\n`;
            userContent += `• Fais référence aux éléments spécifiques des documents (noms, dates, concepts, etc.)\n`;
            userContent += `• Si c'est un cours, créé des questions sur les notions enseignées\n`;
            userContent += `• Si c'est un exercice, créé des variantes ou des questions connexes\n`;
            userContent += `• Si c'est un document théorique, créé des questions d'application pratique\n\n`;
        }

        if (imageParts.length > 0) {
            userContent += `🖼️ ${imageParts.length} image(s) jointe(s) - elles seront analysées pour créer des questions visuelles.\n\n`;
            imageParts.forEach(img => {
                imageContents.push({
                    type: 'image_url',
                    image_url: { url: `data:${img.mime};base64,${img.base64}` },
                });
            });
            
            userContent += `📋 **INSTRUCTIONS POUR LES IMAGES** :\n`;
            userContent += `• Analyse le contenu visuel des images (diagrammes, schémas, tableaux, graphiques, etc.)\n`;
            userContent += `• Créé des questions basées sur les éléments visuels identifiés\n`;
            userContent += `• Si c'est un diagramme, pose des questions sur les relations et composants\n`;
            userContent += `• Si c'est un graphique, créé des questions d'interprétation des données\n`;
            userContent += `• Si c'est un schéma technique, pose des questions sur le fonctionnement\n\n`;
        }

        if (textParts.length > 0 || imageParts.length > 0) {
            userContent += `⚠️ **PRIORITÉ ABSOLUE** : Base tes questions sur le contenu des fichiers joints, pas sur des connaissances générales !\n\n`;
        }
    }

    // Ajouter les paramètres de contexte au message utilisateur
    if (context.matiere || context.niveau || context.duree || context.noteTotale) {
        userContent += `\n\n--- PARAMÈTRES À RESPECTER ---\n`;
        if (context.matiere) userContent += `Matière: ${context.matiere}\n`;
        if (context.niveau) userContent += `Niveau: ${context.niveau}\n`;
        if (context.duree) userContent += `Durée d'examen: ${context.duree}\n`;
        if (context.noteTotale) userContent += `Note totale: ${context.noteTotale} points\n`;
        userContent += `\n⚠️ IMPORTANT: Respecte ces paramètres dans ta génération !`;
    }

    // Ajouter les exigences spécifiques du prompt si détectées
    if (promptRequirements && promptRequirements.isSpecificRequest) {
        userContent += `\n\n--- EXIGENCES SPÉCIFIQUES DU PROMPT ---\n`;
        userContent += `Demande détectée avec structure précise:\n`;
        
        if (Object.keys(promptRequirements.questionCounts).length > 0) {
            userContent += `Répartition EXACTE à respecter:\n`;
            for (const [type, count] of Object.entries(promptRequirements.questionCounts)) {
                userContent += `• ${count} ${type}\n`;
            }
            userContent += `= TOTAL: ${promptRequirements.totalQuestions} questions\n`;
        }

        if (promptRequirements.totalPoints) {
            userContent += `Points totaux spécifiés: ${promptRequirements.totalPoints} points\n`;
        }

    // Ajouter une note sur les améliorations du prompt si nécessaire
    if (promptRegulation.improvements.length > 0) {
        userContent += `\n\n--- RÉGULATION DU PROMPT ---\n`;
        userContent += `Prompt original: "${promptRegulation.original}"\n`;
        userContent += `Prompt optimisé: "${promptRegulation.normalized}"\n`;
        userContent += `Améliorations: ${promptRegulation.improvements.join(', ')}\n`;
        userContent += `💡 Astuce: Vous pouvez écrire des prompts informels, l'IA les comprend !`;
    }

    if (imageContents.length > 0) {
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: userContent },
                ...imageContents,
            ],
        });
    } else {
        messages.push({ role: 'user', content: userContent });
    }

    let completion;
    let aiProvider = 'unknown';

    // Essayer Ollama d'abord si activé
    if (useOllama) {
        try {
            console.log('Tentative avec Ollama...');
            const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
            completion = await chatWithOllama({
                messages,
                model: ollamaModel,
                temperature: 0.6,
                max_tokens: 6000
            });
            aiProvider = `Ollama (${ollamaModel})`;
            const reply = completion.choices[0].message.content;
            let jsonData = null;
            try {
                let cleanedReply = reply.trim();
                cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below|suivant|following).*?:/gi, '');
                cleanedReply = cleanedReply.replace(/^.*?(?:json|examen|exam|questions?).*?:/gi, '');
                const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const cleaned = jsonMatch[1] || jsonMatch[0];
                    const pureJson = cleaned.replace(/```json|```/g, '').trim();
                    jsonData = JSON.parse(pureJson);
                }
            } catch (err) {
                console.log('Pas de JSON valide détecté dans la réponse');
                jsonData = null;
            }
            // Supprimer les réponses correctes avant de retourner
            if (jsonData) {
                jsonData = removeCorrectAnswers(jsonData);
            }
            return { reply, jsonData, aiProvider };
        } catch (ollamaError) {
            console.log('Ollama non disponible, tentative avec Groq...');
        }
    }

    // Fallback sur Groq
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
        throw new Error('Aucun service IA disponible. Veuillez installer Ollama ou configurer Groq.');
    }

    try {
        completion = await getGroqClient().chat.completions.create({
            model: imageContents.length > 0 ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.6,
            max_tokens: 6000,
        });
        aiProvider = 'Groq';
    } catch (groqError) {
        console.error('Erreur Groq:', groqError.message);
        
        // Si Groq échoue (rate limit ou autre), essayer Ollama en fallback
        if (process.env.USE_OLLAMA === 'true') {
            try {
                console.log('Groq échoué, basculement vers Ollama...');
                const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
                completion = await chatWithOllama({
                    messages,
                    model: ollamaModel,
                    temperature: 0.6,
                    max_tokens: 6000
                });
                aiProvider = `Ollama (${ollamaModel}) - Fallback`;
                const reply = completion.choices[0].message.content;
                let jsonData = null;
                try {
                    let cleanedReply = reply.trim();
                    cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below|suivant|following).*?:/gi, '');
                    cleanedReply = cleanedReply.replace(/^.*?(?:json|examen|exam|questions?).*?:/gi, '');
                    const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const cleaned = jsonMatch[1] || jsonMatch[0];
                        const pureJson = cleaned.replace(/```json|```/g, '').trim();
                        jsonData = JSON.parse(pureJson);
                    }
                } catch (err) {
                    console.log('Pas de JSON valide détecté dans la réponse');
                    jsonData = null;
                }
                // Supprimer les réponses correctes avant de retourner
                if (jsonData) {
                    jsonData = removeCorrectAnswers(jsonData);
                }
                return { reply, jsonData, aiProvider };
            } catch (ollamaFallbackError) {
                console.error('Ollama fallback échoué:', ollamaFallbackError.message);
            }
        }
        
        throw new Error(`Tous les services IA ont échoué: ${groqError.message}`);
    }

    const reply = completion.choices[0].message.content;
    let jsonData = null;
    try {
        let cleanedReply = reply.trim();
        cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below|suivant|following).*?:/gi, '');
        cleanedReply = cleanedReply.replace(/^.*?(?:json|examen|exam|questions?).*?:/gi, '');
        const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const cleaned = jsonMatch[1] || jsonMatch[0];
            const pureJson = cleaned.replace(/```json|```/g, '').trim();
            jsonData = JSON.parse(pureJson);
        }
    } catch (err) {
        console.log('Pas de JSON valide détecté dans la réponse');
        jsonData = null;
    }

    // Supprimer les réponses correctes avant de retourner
    if (jsonData) {
        jsonData = removeCorrectAnswers(jsonData);
    }

    return { reply, jsonData, aiProvider };
}

/* ── Fonction pour supprimer les réponses correctes ── */
function removeCorrectAnswers(data) {
    if (!data) return data;
    
    // Clone profond pour ne pas modifier l'original
    const cleaned = JSON.parse(JSON.stringify(data));
    
    // Pour le mode "questions"
    if (cleaned.mode === 'questions' && Array.isArray(cleaned.questions)) {
        cleaned.questions.forEach(q => {
            if (Array.isArray(q.options)) {
                q.options.forEach(opt => {
                    delete opt.correct;
                });
            }
        });
    }
    
    // Pour le mode "exam"
    if (cleaned.mode === 'exam' && Array.isArray(cleaned.sections)) {
        cleaned.sections.forEach(section => {
            if (Array.isArray(section.exercises)) {
                section.exercises.forEach(exercise => {
                    if (Array.isArray(exercise.questions)) {
                        exercise.questions.forEach(q => {
                            if (Array.isArray(q.options)) {
                                q.options.forEach(opt => {
                                    delete opt.correct;
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    
    return cleaned;
}

/* ── Fonction pour générer des URLs d'images avec des services gratuits ── */
function generateImagePlaceholder(description) {
    if (!description) return null;
    
    // Utiliser QuickChart.io pour les graphes et diagrammes
    // Utiliser Placeholder.com pour les images génériques
    
    const lowerDesc = description.toLowerCase();
    
    // Détection de type de visualisation
    if (lowerDesc.includes('graphe') || lowerDesc.includes('graph') || lowerDesc.includes('courbe')) {
        // Exemple de graphe avec QuickChart
        return {
            type: 'chart',
            url: 'https://quickchart.io/chart?c={type:"line",data:{labels:["Jan","Feb","Mar","Apr","May"],datasets:[{label:"Dataset",data:[10,20,30,25,35]}]}}',
            description: description,
            editable: true
        };
    } else if (lowerDesc.includes('diagramme') || lowerDesc.includes('diagram') || lowerDesc.includes('uml')) {
        // Placeholder pour diagrammes
        return {
            type: 'diagram',
            url: `https://via.placeholder.com/600x400/4A90E2/FFFFFF?text=${encodeURIComponent('Diagramme: ' + description.substring(0, 30))}`,
            description: description,
            editable: true
        };
    } else if (lowerDesc.includes('schéma') || lowerDesc.includes('schema') || lowerDesc.includes('circuit')) {
        // Placeholder pour schémas
        return {
            type: 'schema',
            url: `https://via.placeholder.com/600x400/E74C3C/FFFFFF?text=${encodeURIComponent('Schéma: ' + description.substring(0, 30))}`,
            description: description,
            editable: true
        };
    } else {
        // Image générique
        return {
            type: 'image',
            url: `https://via.placeholder.com/600x400/95A5A6/FFFFFF?text=${encodeURIComponent(description.substring(0, 40))}`,
            description: description,
            editable: true
        };
    }
}

/* ── Fonction pour enrichir les questions avec des images ── */
async function enrichWithImages(data) {
    if (!data) return data;
    
    const { generateImage } = require('../../utils/imageGeneration.utils');
    
    // Clone profond
    const enriched = JSON.parse(JSON.stringify(data));
    
    // Fonction pour détecter si une question nécessite une image
    function detectImageNeed(questionText) {
        const lowerText = questionText.toLowerCase();
        const visualKeywords = [
            'graphe', 'graph', 'courbe', 'diagramme', 'diagram', 'schéma', 'schema',
            'circuit', 'cube', 'olap', 'uml', 'flowchart', 'organigramme',
            'tableau', 'chart', 'figure', 'illustration', 'dessin', 'représentation',
            'visualisation', 'image', 'photo', 'croquis', 'plan'
        ];
        
        return visualKeywords.some(keyword => lowerText.includes(keyword));
    }
    
    // Fonction pour générer une description automatique
    function generateAutoDescription(questionText) {
        const lowerText = questionText.toLowerCase();
        
        if (lowerText.includes('cube') && (lowerText.includes('olap') || lowerText.includes('données'))) {
            return '3D OLAP cube diagram showing dimensions (time, product, location) with measures and hierarchies, technical illustration, white background, educational, clean lines';
        } else if (lowerText.includes('graphe') || lowerText.includes('courbe')) {
            return 'Mathematical graph with coordinate system, clean axes, grid lines, professional chart, educational illustration';
        } else if (lowerText.includes('circuit')) {
            return 'Electronic circuit diagram with labeled components, resistors, capacitors, clean schematic, educational';
        } else if (lowerText.includes('diagramme') || lowerText.includes('uml')) {
            return 'UML diagram showing class relationships, clean professional illustration, white background, educational';
        } else if (lowerText.includes('schéma')) {
            return 'Technical schematic diagram, labeled components, clear structure, educational illustration, white background';
        } else {
            return `Technical illustration related to: ${questionText.substring(0, 100)}, educational, clean, professional`;
        }
    }
    
    // Pour le mode "questions"
    if (enriched.mode === 'questions' && Array.isArray(enriched.questions)) {
        for (const q of enriched.questions) {
            // Si imageDescription existe, générer l'image
            if (q.imageDescription && !q.imageUrl) {
                const lowerDesc = q.imageDescription.toLowerCase();
                let imageType = 'image';
                
                if (lowerDesc.includes('graphe') || lowerDesc.includes('graph') || lowerDesc.includes('courbe') || lowerDesc.includes('chart')) {
                    imageType = 'chart';
                } else if (lowerDesc.includes('diagramme') || lowerDesc.includes('diagram') || lowerDesc.includes('uml')) {
                    imageType = 'diagram';
                } else if (lowerDesc.includes('schéma') || lowerDesc.includes('schema') || lowerDesc.includes('circuit') || lowerDesc.includes('cube')) {
                    imageType = 'schema';
                }
                
                console.log(`Génération d'image pour: ${q.imageDescription}`);
                q.imageUrl = await generateImage(q.imageDescription, imageType);
            }
            // Sinon, détecter automatiquement si une image est nécessaire
            else if (!q.imageUrl && detectImageNeed(q.text)) {
                const autoDescription = generateAutoDescription(q.text);
                console.log(`Génération automatique d'image pour: ${autoDescription}`);
                q.imageDescription = autoDescription;
                q.imageUrl = await generateImage(autoDescription, 'schema');
            }
        }
    }
    
    // Pour le mode "exam"
    if (enriched.mode === 'exam' && Array.isArray(enriched.sections)) {
        for (const section of enriched.sections) {
            if (Array.isArray(section.exercises)) {
                for (const exercise of section.exercises) {
                    if (Array.isArray(exercise.questions)) {
                        for (const q of exercise.questions) {
                            // Si imageDescription existe, générer l'image
                            if (q.imageDescription && !q.imageUrl) {
                                const lowerDesc = q.imageDescription.toLowerCase();
                                let imageType = 'image';
                                
                                if (lowerDesc.includes('graphe') || lowerDesc.includes('graph') || lowerDesc.includes('courbe') || lowerDesc.includes('chart')) {
                                    imageType = 'chart';
                                } else if (lowerDesc.includes('diagramme') || lowerDesc.includes('diagram') || lowerDesc.includes('uml')) {
                                    imageType = 'diagram';
                                } else if (lowerDesc.includes('schéma') || lowerDesc.includes('schema') || lowerDesc.includes('circuit') || lowerDesc.includes('cube')) {
                                    imageType = 'schema';
                                }
                                
                                console.log(`Génération d'image pour: ${q.imageDescription}`);
                                q.imageUrl = await generateImage(q.imageDescription, imageType);
                            }
                            // Sinon, détecter automatiquement si une image est nécessaire
                            else if (!q.imageUrl && detectImageNeed(q.text)) {
                                const autoDescription = generateAutoDescription(q.text);
                                console.log(`Génération automatique d'image pour: ${autoDescription}`);
                                q.imageDescription = autoDescription;
                                q.imageUrl = await generateImage(autoDescription, 'schema');
                            }
                        }
                    }
                }
            }
        }
    }
    
    return enriched;
}

/* ── Génération de Questions par IA améliorée avec analyse de prompt ── */
async function generateAIQuestionsService({ matiere, niveau, type, count, contexte, files = [] }) {
    const apiKey = process.env.GROQ_API_KEY;
    const useOllama = process.env.USE_OLLAMA === 'true';

    // Validation des paramètres
    if (!matiere || matiere.trim() === '') {
        throw new Error('⚠️ Veuillez spécifier la matière dans les paramètres');
    }
    if (!niveau || niveau.trim() === '') {
        throw new Error('⚠️ Veuillez spécifier le niveau dans les paramètres');
    }

    // NOUVEAU : ANALYSER LE PROMPT CONTEXTE POUR DÉTECTION INTELLIGENTE
    let detectedType = type || 'ouverte';
    let detectedCount = count || 5;
    
    if (contexte && contexte.trim()) {
        console.log(`🔍 Analyse du prompt contexte: "${contexte}"`);
        
        // Normaliser le prompt
        const normalized = normalizeAndInterpretPrompt(contexte, { matiere, niveau });
        console.log(`📝 Prompt normalisé: "${normalized.normalized}"`);
        
        // Détecter le type de question spécifique
        const typeDetection = detectQuestionTypeFromPrompt(contexte);
        if (typeDetection.matched && typeDetection.confidence > 0.8) {
            detectedType = typeDetection.type;
            console.log(`✅ Type détecté avec confiance élevée: ${detectedType} (${typeDetection.confidence})`);
        }
        
        // Analyser les exigences du prompt
        const promptReqs = parsePromptRequirements(contexte);
        if (promptReqs.isSpecificRequest && promptReqs.totalQuestions > 0) {
            detectedCount = promptReqs.totalQuestions;
            console.log(`📊 Nombre détecté dans le prompt: ${detectedCount}`);
            
            // Si le prompt contient un type spécifique, l'utiliser en priorité
            if (promptReqs.detectedType && promptReqs.detectedType.matched) {
                detectedType = promptReqs.detectedType.type;
                console.log(`🎯 Type prioritaire détecté: ${detectedType}`);
            }
        }
    }

    // Utiliser les valeurs détectées
    const finalType = detectedType;
    const finalCount = detectedCount;
    
    console.log(`🚀 Génération finale: ${finalCount} questions de type "${finalType}"`);

    const prompt = `Génère EXACTEMENT ${finalCount} questions de type "${finalType}" pour la matière "${matiere}" niveau "${niveau}".
${contexte ? `\nContexte spécifique: ${contexte}` : ''}

**PARAMÈTRES OBLIGATOIRES À RESPECTER** :
- Matière: ${matiere}
- Niveau: ${niveau}  
- Type de questions: ${finalType}
- Nombre de questions: ${finalCount}

**CONSIGNES STRICTES** :
- Les questions DOIVENT être adaptées au niveau ${niveau}
- Le contenu DOIT être pertinent pour ${matiere}
- Respecter EXACTEMENT le type "${finalType}"
- Génère EXACTEMENT ${finalCount} questions, ni plus ni moins

**INSTRUCTIONS SPÉCIALES POUR LE TYPE "${finalType}"** :`;

    // Ajouter des instructions spécifiques selon le type détecté
    switch (finalType) {
        case 'tableau_completion':
            prompt += `
- Tu DOIS créer un vrai TABLEAU avec des cellules vides à remplir
- Format OBLIGATOIRE : utilise des tableaux Markdown 
- Exemple REQUIS : "Complétez le tableau suivant sur ${matiere} :\\n\\n| Concept | Description | Exemple |\\n|---------|-------------|---------|\\n| _____ | ${matiere === 'Spring Boot' ? 'Framework Java' : 'Concept principal'} | _____ |\\n| ${matiere === 'Spring Boot' ? '@Service' : 'Élément 2'} | _____ | Usage concret |"
- NE PAS générer une simple question textuelle !
- Les cellules vides DOIVENT être marquées par "_____"
- Créer un tableau pertinent pour ${matiere} niveau ${niveau}`;
            break;
            
        case 'vrai_faux_tableau':
            prompt += `
- Tu DOIS créer un TABLEAU avec colonnes Vrai/Faux
- Format OBLIGATOIRE : "Évaluez chaque énoncé :\\n\\n| Énoncé | Vrai | Faux |\\n|--------|------|------|\\n| ${matiere === 'Spring Boot' ? 'Spring Boot simplifie le développement Java' : 'Énoncé sur ' + matiere} | [ ] | [ ] |"
- Chaque ligne = un énoncé à évaluer sur ${matiere}
- NE PAS générer de QCM ou questions ouvertes !
- Minimum 3-5 énoncés par tableau`;
            break;
            
        case 'code_completion':
            prompt += `
- Tu DOIS présenter du CODE avec des parties manquantes
- Utilise des blancs : "_____ " pour les parties à compléter
- Exemple : "Complétez le code ${matiere} suivant :\\n\\n\`\`\`\\nfunction calculate() {\\n    return _____;\\n}\\n\`\`\`"
- NE PAS générer de questions théoriques sur le code !
- Le code DOIT avoir des parties à compléter par l'étudiant
- Code pertinent pour ${matiere} niveau ${niveau}`;
            break;
            
        case 'etude_cas':
            prompt += `
- Tu DOIS créer un CAS PRATIQUE avec contexte détaillé
- Structure : "**Contexte :** [situation réelle]\\n\\n**Situation :** [problème concret]\\n\\n**Questions :**\\n1. Analysez...\\n2. Proposez..."
- NE PAS générer de QCM ou questions théoriques simples !
- Le cas DOIT être concret et réaliste pour ${matiere}
- Inclure des questions d'analyse et de résolution`;
            break;
            
        case 'fonction_definition':
            prompt += `
- Tu DOIS demander d'écrire une fonction complète
- Format : "Écrivez une fonction qui [spécification précise] :\\n\\n**Entrées :** ...\\n**Sorties :** ...\\n**Contraintes :** ..."
- Spécifications claires et réalisables
- Adaptées au niveau ${niveau} en ${matiere}`;
            break;
            
        case 'vrai_faux':
            prompt += `
- Tu DOIS créer des affirmations à évaluer comme Vrai ou Faux
- Format question simple avec 2 options exactement
- Affirmations précises sur ${matiere}`;
            break;
            
        case 'qcm_unique':
            prompt += `
- Tu DOIS créer un QCM avec UNE SEULE bonne réponse
- 3-4 options réalistes et pertinentes
- Une seule option correcte, les autres plausibles mais fausses`;
            break;
            
        default:
            prompt += `
- Génère exactement le type "${finalType}" comme spécifié
- Respecte les caractéristiques de ce type de question
- Contenu adapté à ${matiere} niveau ${niveau}`;
    prompt += `

JSON format OBLIGATOIRE:
{
  "mode": "questions",
  "matiere": "${matiere}",
  "niveau": "${niveau}",
  "questions": [
    {
      "text": "Question adaptée au niveau ${niveau} pour ${matiere} de type ${finalType}...",
      "type": "${finalType}",
      "points": 2,
      "answerLines": 3,
      "options": [
        {"text": "Option A...", "correct": true},
        {"text": "Option B...", "correct": false},
        {"text": "Option C...", "correct": false}
      ]
    }
  ]
}

**RÈGLES STRICTES** :
- Pour "ouverte"/"pratique"/"code_completion"/"code_debug"/"analyse_sortie"/"tableau_completion"/"etude_cas"/"fonction_definition"/"algorithme_implementation"/"analyse_complexite"/"optimisation_code"/"test_unitaire"/"requete_sql"/"modele_donnees"/"architecture_systeme": options = []
- Pour "vrai_faux": OBLIGATOIRE 2 options {"text": "Vrai", "correct": true/false} et {"text": "Faux", "correct": true/false}
- Pour "qcm_unique": OBLIGATOIRE 3-4 options avec UNE SEULE bonne réponse
- Pour "qcm_multiple": OBLIGATOIRE 3-4 options avec PLUSIEURS bonnes réponses possibles
- Pour "diagramme_creation"/"schema_completion": ajouter imageDescription + options = []
- Chaque option DOIT avoir un texte pertinent et réaliste
- RESPECTER EXACTEMENT le type "${finalType}" détecté dans le prompt

**EXEMPLE CRITIQUE POUR TABLEAU_COMPLETION** :
Si type = "tableau_completion", tu DOIS générer exactement :
{
  "text": "Complétez le tableau suivant sur ${matiere} :\\n\\n| Concept | Description | Exemple |\\n|---------|-------------|---------|\\n| _____ | Framework Java | _____ |\\n| @Service | _____ | Logique métier |",
  "type": "tableau_completion",
  "options": []
}

Types supportés: ouverte, qcm_unique, qcm_multiple, vrai_faux, vrai_faux_tableau, pratique, code_completion, code_debug, analyse_sortie, tableau_completion, etude_cas, fonction_definition, algorithme_implementation, diagramme_creation, schema_completion, analyse_complexite, optimisation_code, test_unitaire, requete_sql, modele_donnees, architecture_systeme.
Retourne UNIQUEMENT le JSON, sans texte avant ou après.`;`;

JSON format OBLIGATOIRE:
    const messages = [
        { role: 'system', content: "Generateur de questions pedagogiques. Tu DOIS respecter exactement les parametres donnes et generer le type " + finalType + " detecte. Retourne UNIQUEMENT du JSON valide." },
        { role: 'user', content: prompt }
    ];

    let completion;

    // Essayer Ollama d'abord si activé
    if (useOllama) {
        try {
            console.log('Génération questions avec Ollama...');
            const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
            completion = await chatWithOllama({
                messages,
                model: ollamaModel,
                temperature: 0.7,
                max_tokens: 3000
            });
            const reply = completion.choices[0].message.content;
            let jsonData = null;
            try {
                let cleanedReply = reply.trim();
                cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below).*?:/gi, '');
                cleanedReply = cleanedReply.replace(/^.*?(?:json|questions?).*?:/gi, '');
                const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const cleaned = jsonMatch[1] || jsonMatch[0];
                    jsonData = JSON.parse(cleaned.replace(/```json|```/g, '').trim());
                } else {
                    jsonData = JSON.parse(cleanedReply);
                }
            } catch (err) {
                console.error('Erreur parsing JSON questions:', err);
                throw err;
            }
            const cleaned = removeCorrectAnswers(jsonData);
            return await enrichWithImages(cleaned);
        } catch (ollamaError) {
            console.log('Ollama non disponible, tentative avec Groq...');
        }
    }

    // Fallback sur Groq
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
        throw new Error('Aucun service IA disponible. Veuillez installer Ollama ou configurer Groq.');
    }

    try {
        completion = await getGroqClient().chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 2000
        });
    } catch (groqError) {
        console.error('Erreur Groq:', groqError.message);
        
        // Si Groq échoue, essayer Ollama en fallback
        if (process.env.USE_OLLAMA === 'true') {
            try {
                console.log('Groq échoué, basculement vers Ollama pour questions...');
                const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
                completion = await chatWithOllama({
                    messages,
                    model: ollamaModel,
                    temperature: 0.7,
                    max_tokens: 3000
                });
                const reply = completion.choices[0].message.content;
                let jsonData = null;
                try {
                    let cleanedReply = reply.trim();
                    cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below).*?:/gi, '');
                    cleanedReply = cleanedReply.replace(/^.*?(?:json|questions?).*?:/gi, '');
                    const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const cleaned = jsonMatch[1] || jsonMatch[0];
                        jsonData = JSON.parse(cleaned.replace(/```json|```/g, '').trim());
                    } else {
                        jsonData = JSON.parse(cleanedReply);
                    }
                } catch (err) {
                    console.error('Erreur parsing JSON questions:', err);
                    throw err;
                }
                const cleaned = removeCorrectAnswers(jsonData);
                return await enrichWithImages(cleaned);
            } catch (ollamaFallbackError) {
                console.error('Ollama fallback échoué pour questions:', ollamaFallbackError.message);
            }
        }
        
        throw new Error(`Impossible de générer les questions: ${groqError.message}`);
    }

    const reply = completion.choices[0].message.content;
    let jsonData = null;
    try {
        let cleanedReply = reply.trim();
        cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below).*?:/gi, '');
        cleanedReply = cleanedReply.replace(/^.*?(?:json|questions?).*?:/gi, '');
        const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const cleaned = jsonMatch[1] || jsonMatch[0];
            jsonData = JSON.parse(cleaned.replace(/```json|```/g, '').trim());
        } else {
            jsonData = JSON.parse(cleanedReply);
        }
    } catch (err) {
        console.error('Erreur parsing JSON questions:', err);
        throw new Error(`Impossible de générer les questions. Erreur: ${err.message}`);
    }
    
    const cleaned = removeCorrectAnswers(jsonData);
    return await enrichWithImages(cleaned);
}

/* ── Génération d'Examen complet par IA améliorée avec analyse de prompt ── */
async function generateAIExamService({ matiere, niveau, duree, noteTotale, nbQuestions, types, contexte, files = [] }) {
    const apiKey = process.env.GROQ_API_KEY;
    const useOllama = process.env.USE_OLLAMA === 'true';

    // Validation des paramètres
    if (!matiere || matiere.trim() === '') {
        throw new Error('⚠️ Veuillez spécifier la matière dans les paramètres');
    }
    if (!niveau || niveau.trim() === '') {
        throw new Error('⚠️ Veuillez spécifier le niveau dans les paramètres');
    }

    const totalPoints = parseInt(noteTotale) || 20;
    let questionsCount = parseInt(nbQuestions) || 10;
    const examDuration = duree || '2 heures';
    let questionTypes = Array.isArray(types) ? types : ['ouverte', 'qcm_unique'];

    // NOUVEAU : ANALYSER LE PROMPT CONTEXTE POUR DÉTECTION INTELLIGENTE
    if (contexte && contexte.trim()) {
        console.log(`🔍 Analyse du prompt contexte pour examen: "${contexte}"`);
        
        // Normaliser le prompt
        const normalized = normalizeAndInterpretPrompt(contexte, { matiere, niveau });
        console.log(`📝 Prompt normalisé: "${normalized.normalized}"`);
        
        // Analyser les exigences du prompt
        const promptReqs = parsePromptRequirements(contexte);
        if (promptReqs.isSpecificRequest) {
            if (promptReqs.totalQuestions > 0) {
                questionsCount = promptReqs.totalQuestions;
                console.log(`📊 Nombre total détecté dans le prompt: ${questionsCount}`);
            }
            
            if (promptReqs.questionTypes.length > 0) {
                questionTypes = promptReqs.questionTypes;
                console.log(`🎯 Types détectés dans le prompt: ${questionTypes.join(', ')}`);
            }
        }
    }

    const prompt = `Crée un examen complet STRUCTURÉ pour la matière "${matiere}" niveau "${niveau}".

**PARAMÈTRES OBLIGATOIRES À RESPECTER** :
- Matière: ${matiere}
- Niveau: ${niveau}
- Durée: ${examDuration}
- Note totale: ${totalPoints} points (RESPECTER EXACTEMENT)
- Nombre de questions: ${questionsCount}
- Types autorisés: ${questionTypes.join(', ')}
${contexte ? `- Contexte spécifique: ${contexte}` : ''}

**STRUCTURE REQUISE** :
- Créer 2-3 sections logiques
- Répartir les ${questionsCount} questions entre les sections
- Distribuer les ${totalPoints} points équitablement selon la difficulté
- Questions adaptées au niveau ${niveau}
- Contenu pertinent pour ${matiere}
- Respecter EXACTEMENT les types de questions spécifiés: ${questionTypes.join(', ')}

**EXEMPLE DE RÉPARTITION** :
- Questions faciles: 1-2 points
- Questions moyennes: 3-4 points
- Questions difficiles: 5-6 points
- TOTAL EXACT: ${totalPoints} points

JSON format OBLIGATOIRE:
{
  "mode": "exam",
  "title": "Examen de ${matiere} - ${niveau}",
  "matiere": "${matiere}",
  "niveau": "${niveau}",
  "duree": "${examDuration}",
  "noteTotale": ${totalPoints},
  "sections": [
    {
      "title": "Section adaptée à ${matiere}",
      "exercises": [
        {
          "title": "Exercice adapté au niveau ${niveau}",
          "points": 8,
          "questions": [
            {
              "text": "Question pertinente pour ${matiere} niveau ${niveau}...",
              "type": "${questionTypes[0] || 'ouverte'}",
              "points": 3,
              "answerLines": 4,
              "options": [
                {"text": "Option réaliste A...", "correct": true},
                {"text": "Option réaliste B...", "correct": false},
                {"text": "Option réaliste C...", "correct": false}
              ]
            }
          ]
        }
      ]
    }
  ]
}

**RÈGLES STRICTES** :
- Pour "ouverte"/"pratique"/"code_completion"/"code_debug"/"analyse_sortie"/"tableau_completion"/"etude_cas"/"fonction_definition"/"algorithme_implementation"/"analyse_complexite"/"optimisation_code"/"test_unitaire"/"requete_sql"/"modele_donnees"/"architecture_systeme": options = []
- Pour "vrai_faux": OBLIGATOIRE 2 options {"text": "Vrai", "correct": true/false} et {"text": "Faux", "correct": true/false}
- Pour "qcm_unique": OBLIGATOIRE 3-4 options avec UNE SEULE bonne réponse
- Pour "qcm_multiple": OBLIGATOIRE 3-4 options avec PLUSIEURS bonnes réponses
- Pour "diagramme_creation"/"schema_completion": ajouter imageDescription + options = []
- La somme de TOUS les points DOIT égaler EXACTEMENT ${totalPoints}
- Créer EXACTEMENT ${questionsCount} questions au total
- RESPECTER EXACTEMENT le type demandé pour chaque question

Retourne UNIQUEMENT le JSON, sans texte avant ou après.`;

    const messages = [
        { role: 'system', content: `Générateur d'examens pédagogiques expert. Tu DOIS respecter exactement les paramètres: ${matiere}, ${niveau}, ${totalPoints} points total, ${questionsCount} questions. Retourne UNIQUEMENT du JSON valide.` },
        { role: 'user', content: prompt }
    ];

    let completion;

    // Essayer Ollama d'abord si activé
    if (useOllama) {
        try {
            console.log('Génération examen avec Ollama...');
            const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
            completion = await chatWithOllama({
                messages,
                model: ollamaModel,
                temperature: 0.7,
                max_tokens: 4000
            });
            const reply = completion.choices[0].message.content;
            let jsonData = null;
            try {
                let cleanedReply = reply.trim();
                cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below).*?:/gi, '');
                cleanedReply = cleanedReply.replace(/^.*?(?:json|examen|exam).*?:/gi, '');
                const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const cleaned = jsonMatch[1] || jsonMatch[0];
                    jsonData = JSON.parse(cleaned.replace(/```json|```/g, '').trim());
                } else {
                    jsonData = JSON.parse(cleanedReply);
                }
            } catch (err) {
                console.error('Erreur parsing JSON exam:', err);
                throw err;
            }
            const cleaned = removeCorrectAnswers(jsonData);
            return await enrichWithImages(cleaned);
        } catch (ollamaError) {
            console.log('Ollama non disponible, tentative avec Groq...');
        }
    }

    // Fallback sur Groq
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
        throw new Error('Aucun service IA disponible. Veuillez installer Ollama ou configurer Groq.');
    }

    try {
        completion = await getGroqClient().chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 3000
        });
    } catch (groqError) {
        console.error('Erreur Groq:', groqError.message);
        
        // Si Groq échoue, essayer Ollama en fallback
        if (process.env.USE_OLLAMA === 'true') {
            try {
                console.log('Groq échoué, basculement vers Ollama pour examen...');
                const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
                completion = await chatWithOllama({
                    messages,
                    model: ollamaModel,
                    temperature: 0.7,
                    max_tokens: 4000
                });
                const reply = completion.choices[0].message.content;
                let jsonData = null;
                try {
                    let cleanedReply = reply.trim();
                    cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below).*?:/gi, '');
                    cleanedReply = cleanedReply.replace(/^.*?(?:json|examen|exam).*?:/gi, '');
                    const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const cleaned = jsonMatch[1] || jsonMatch[0];
                        jsonData = JSON.parse(cleaned.replace(/```json|```/g, '').trim());
                    } else {
                        jsonData = JSON.parse(cleanedReply);
                    }
                } catch (err) {
                    console.error('Erreur parsing JSON exam:', err);
                    throw new Error(`Impossible de générer l'examen. Erreur: ${err.message}`);
                }
                const cleaned = removeCorrectAnswers(jsonData);
                return await enrichWithImages(cleaned);
            } catch (ollamaFallbackError) {
                console.error('Ollama fallback échoué pour examen:', ollamaFallbackError.message);
            }
        }
        
        throw new Error(`Impossible de générer l'examen: ${groqError.message}`);
    }

    const reply = completion.choices[0].message.content;
    let jsonData = null;
    try {
        let cleanedReply = reply.trim();
        cleanedReply = cleanedReply.replace(/^.*?(?:voici|voilà|voila|here is|here's|ci-dessous|below).*?:/gi, '');
        cleanedReply = cleanedReply.replace(/^.*?(?:json|examen|exam).*?:/gi, '');
        const jsonMatch = cleanedReply.match(/```json\s*([\s\S]*?)```/) || cleanedReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const cleaned = jsonMatch[1] || jsonMatch[0];
            jsonData = JSON.parse(cleaned.replace(/```json|```/g, '').trim());
        } else {
            jsonData = JSON.parse(cleanedReply);
        }
    } catch (err) {
        console.error('Erreur parsing JSON exam:', err);
        throw new Error(`Impossible de générer l'examen. Erreur: ${err.message}`);
    }
    
    const cleaned = removeCorrectAnswers(jsonData);
    return await enrichWithImages(cleaned);
}

module.exports = {
    chatWithAI,
    extractFileContent,
    generateAIQuestionsService,
    generateAIExamService
};
};