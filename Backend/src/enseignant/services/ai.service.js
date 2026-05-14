const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
- Tu poses des questions si le besoin n'est pas clair
- Quand l'enseignant demande de générer des questions, tu réponds UNIQUEMENT en JSON valide
- Le JSON doit respecter exactement ce format :

Pour des questions isolées :
{"mode":"questions","questions":[{"text":"...","type":"ouverte|qcm_unique|qcm_multiple|vrai_faux|pratique","points":2,"answerLines":3,"options":[{"id":"opt_1","text":"...","correct":false}]}]}

Pour un examen complet :
{"mode":"exam","sections":[{"title":"...","exercises":[{"title":"...","points":6,"questions":[...]}]}]}

Types acceptés : ouverte, qcm_unique, qcm_multiple, vrai_faux, pratique, enonce.
Contexte examen : matière=${context.matiere || 'non précisée'}, niveau=${context.niveau || 'non précisé'}, durée=${context.duree || 'non précisée'}.
Sois concis, professionnel et pédagogique.`;
}

/* ── Chat principal ── */
async function chatWithAI({ message, files = [], history = [], context = {} }) {
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
                const truncated = f.content.substring(0, 10000); // limite sécurité
                userContent += `[${f.name}]:${truncated}`;
            });
        }

        // Pour les images, on utilise le format vision de Groq
        imageParts.forEach(img => {
            imageContents.push({
                type: 'image_url',
                image_url: { url: `data:${img.mime};base64,${img.base64}` },
            });
        });
    }

    // Si images présentes, on utilise le format multimodal
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

    const completion = await groq.chat.completions.create({
        model: imageContents.length > 0 ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.6,
        max_tokens: 6000,
    });

    const reply = completion.choices[0].message.content;

    // Tentative d'extraction JSON
    let jsonData = null;
    try {
        const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/) || reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const cleaned = jsonMatch[1] || jsonMatch[0];
            jsonData = JSON.parse(cleaned.replace(/```json|```/g, '').trim());
        }
    } catch {
        jsonData = null;
    }

    return { reply, jsonData };
}

module.exports = { chatWithAI, extractFileContent };