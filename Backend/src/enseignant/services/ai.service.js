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

    // PDF
    if (mime === 'application/pdf') {
        try {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(file.buffer);
            return { type: 'text', name: file.originalname, content: data.text };
        } catch {
            return { type: 'text', name: file.originalname, content: '[PDF non lisible]' };
        }
    }

    // Images → on retourne en base64 pour vision Groq
    if (mime.startsWith('image/')) {
        return {
            type: 'image',
            name: file.originalname,
            mime: mime,
            base64: file.buffer.toString('base64'),
        };
    }

    // Texte brut (txt, csv, json, md, code…)
    if (mime.startsWith('text/') || mime === 'application/json') {
        return { type: 'text', name: file.originalname, content: file.buffer.toString('utf-8') };
    }

    // Word (simple extraction texte)
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const text = file.buffer.toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        return { type: 'text', name: file.originalname, content: text.substring(0, 15000) };
    }

    return { type: 'text', name: file.originalname, content: '[Fichier non supporté]' };
}

/* ── Construction du prompt système ── */
function buildSystemPrompt(context) {
    return `Tu es un assistant pédagogique expert pour la création d'examens.
Tu aides un enseignant à concevoir des examens de qualité.

RÈGLES :
- Tu peux analyser des fichiers joints (cours, sujets, images de tableau…)
- Quand l'enseignant demande de générer des questions ou un examen complet, tu réponds UNIQUEMENT en JSON valide
- **IMPORTANT**: Quand une question nécessite une visualisation (graphe, diagramme, schéma, cube, circuit, etc.), tu DOIS ajouter le champ "imageDescription" avec une description détaillée en anglais de l'image à générer
- **IMPORTANT**: Pour les QCM, les options doivent être des OBJETS avec "text" et "correct", PAS des chaînes simples

Pour des questions isolées :
{
  "mode": "questions",
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
  "title": "Titre de l'examen",
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

**FORMAT DES OPTIONS (TRÈS IMPORTANT)** :
- Chaque option DOIT être un objet : {"text": "...", "correct": true/false}
- NE PAS utiliser de tableau de chaînes simples
- NE PAS ajouter de champ "answer" séparé
- Marquer la/les bonne(s) réponse(s) avec "correct": true

**EXEMPLES de imageDescription** :
- Pour un cube OLAP: "3D OLAP cube diagram showing dimensions (time, product, location) with measures and hierarchies, technical illustration, white background"
- Pour un graphe: "Line graph showing temperature evolution over time with x-axis (months) and y-axis (temperature in Celsius)"
- Pour un circuit: "Electronic circuit diagram with resistors, capacitors, and voltage source, labeled components"
- Pour un diagramme UML: "UML class diagram showing inheritance relationships between classes with attributes and methods"

Types: ouverte, qcm_unique, qcm_multiple, vrai_faux, pratique.
- Pour "ouverte" ou "pratique": options = []
- Pour "vrai_faux": 2 options avec {"text": "Vrai", "correct": true/false} et {"text": "Faux", "correct": true/false}
- Pour QCM: 3-4 options avec {"text": "...", "correct": true/false}

Contexte: matière=${context.matiere || 'non précisée'}, niveau=${context.niveau || 'non précisé'}, durée=${context.duree || 'non précisée'}.`;
}

/* ── Chat principal ── */
async function chatWithAI({ message, files = [], history = [], context = {} }) {
    const apiKey = process.env.GROQ_API_KEY;
    const useOllama = process.env.USE_OLLAMA === 'true';

    const messages = [{ role: 'system', content: buildSystemPrompt(context) }];

    // Historique de conversation
    history.forEach(h => {
        messages.push({ role: h.role, content: h.content });
    });

    // Construction du message utilisateur avec fichiers
    let userContent = message;
    const imageContents = [];

    if (files.length > 0) {
        const extracted = await Promise.all(files.map(extractFileContent));
        const textParts = extracted.filter(f => f.type === 'text');
        const imageParts = extracted.filter(f => f.type === 'image');

        if (textParts.length > 0) {
            userContent += '--- CONTENU DES FICHIERS JOINTS ---';
            textParts.forEach(f => {
                const truncated = f.content.substring(0, 10000);
                userContent += `[${f.name}]:${truncated}`;
            });
        }

        imageParts.forEach(img => {
            imageContents.push({
                type: 'image_url',
                image_url: { url: `data:${img.mime};base64,${img.base64}` },
            });
        });
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
    
    const { generateImage } = require('../utils/imageGeneration.utils');
    
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

/* ── Génération de Questions par IA ── */
async function generateAIQuestionsService({ matiere, niveau, type, count, contexte }) {
    const apiKey = process.env.GROQ_API_KEY;
    const useOllama = process.env.USE_OLLAMA === 'true';

    const prompt = `Génère ${count || 5} questions de type "${type || 'ouverte'}" pour "${matiere || 'non spécifiée'}" niveau "${niveau || 'non spécifié'}".
${contexte ? `Contexte: ${contexte}` : ''}

JSON format:
{
  "mode": "questions",
  "questions": [
    {
      "text": "Question...",
      "type": "${type || 'ouverte'}",
      "points": 2,
      "answerLines": 3,
      "options": []
    }
  ]
}

Types: ouverte, qcm_unique, qcm_multiple, vrai_faux, pratique.
Retourne UNIQUEMENT le JSON, sans texte avant ou après.`;

    const messages = [
        { role: 'system', content: "Générateur de questions. Retourne UNIQUEMENT du JSON valide." },
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

/* ── Génération d'Examen complet par IA ── */
async function generateAIExamService({ matiere, niveau, duree, noteTotale, nbQuestions, types }) {
    const apiKey = process.env.GROQ_API_KEY;
    const useOllama = process.env.USE_OLLAMA === 'true';

    const prompt = `Examen pour "${matiere || 'non spécifiée'}" niveau "${niveau || 'non spécifié'}".
Durée: ${duree || '2h'}, Points: ${noteTotale || 20}, Questions: ${nbQuestions || 10}
Types: ${Array.isArray(types) ? types.join(', ') : 'ouverte, qcm'}

JSON format:
{
  "mode": "exam",
  "title": "Examen de ${matiere || 'Matière'}",
  "sections": [
    {
      "title": "Section I",
      "exercises": [
        {
          "title": "Exercice 1",
          "points": 5,
          "questions": [
            {
              "text": "Question...",
              "type": "ouverte|qcm_unique|qcm_multiple|vrai_faux|pratique",
              "points": 2,
              "answerLines": 3,
              "options": []
            }
          ]
        }
      ]
    }
  ]
}

Types: ouverte, qcm_unique, qcm_multiple, vrai_faux, pratique.
- "ouverte"/"pratique": options = []
- "vrai_faux": 2 options "Vrai" et "Faux"
- QCM: 3-4 options
Points total doit égaler ${noteTotale || 20}.
Retourne UNIQUEMENT le JSON.`;

    const messages = [
        { role: 'system', content: "Générateur d'examens. Retourne UNIQUEMENT du JSON valide." },
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