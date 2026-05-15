// controllers/ai.controller.js
const AIChat = require('../models/AIChat');

// ══════════════════════════════════════════════════
// MODÈLES disponibles
// ══════════════════════════════════════════════════
const HF_MODELS = [
  'stabilityai/stable-diffusion-xl-base-1.0',
  'runwayml/stable-diffusion-v1-5',
  'stabilityai/stable-diffusion-2',
  'prompthero/openjourney'
];

// ══════════════════════════════════════════════════
// SVG Templates par défaut
// ══════════════════════════════════════════════════
const generateDefaultSVG = (prompt) => {
  const svgTemplates = {
    triangle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><polygon points="256,100 450,400 62,400" fill="none" stroke="#1e293b" stroke-width="3"/><circle cx="256" cy="100" r="4" fill="#dc2626"/><circle cx="450" cy="400" r="4" fill="#dc2626"/><circle cx="62" cy="400" r="4" fill="#dc2626"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Triangle</text></svg>`,
    'right triangle': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><polygon points="100,350 100,150 350,350" fill="none" stroke="#1e293b" stroke-width="3"/><rect x="100" y="330" width="20" height="20" fill="none" stroke="#dc2626" stroke-width="2"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Triangle Rectangle</text></svg>`,
    'triangle rectangle': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><polygon points="100,350 100,150 350,350" fill="none" stroke="#1e293b" stroke-width="3"/><rect x="100" y="330" width="20" height="20" fill="none" stroke="#dc2626" stroke-width="2"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Triangle Rectangle</text></svg>`,
    rectangle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><rect x="100" y="200" width="300" height="150" fill="none" stroke="#1e293b" stroke-width="3"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Rectangle</text></svg>`,
    circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><circle cx="256" cy="256" r="120" fill="none" stroke="#1e293b" stroke-width="3"/><circle cx="256" cy="256" r="4" fill="#dc2626"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Cercle</text></svg>`,
    cercle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><circle cx="256" cy="256" r="120" fill="none" stroke="#1e293b" stroke-width="3"/><circle cx="256" cy="256" r="4" fill="#dc2626"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Cercle</text></svg>`,
    parabole: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><line x1="50" y1="256" x2="462" y2="256" stroke="#cbd5e1" stroke-width="2"/><line x1="256" y1="50" x2="256" y2="462" stroke="#cbd5e1" stroke-width="2"/><path d="M 100,100 Q 256,450 412,100" fill="none" stroke="#1e293b" stroke-width="3"/><text x="256" y="480" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Parabole (y = x²)</text></svg>`,
    parabola: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><line x1="50" y1="256" x2="462" y2="256" stroke="#cbd5e1" stroke-width="2"/><line x1="256" y1="50" x2="256" y2="462" stroke="#cbd5e1" stroke-width="2"/><path d="M 100,100 Q 256,450 412,100" fill="none" stroke="#1e293b" stroke-width="3"/><text x="256" y="480" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Parabole (y = x²)</text></svg>`,
    hyperbole: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><line x1="50" y1="256" x2="462" y2="256" stroke="#cbd5e1" stroke-width="2"/><line x1="256" y1="50" x2="256" y2="462" stroke="#cbd5e1" stroke-width="2"/><path d="M 280,50 Q 280,230 462,230 M 50,282 Q 232,282 232,462" fill="none" stroke="#1e293b" stroke-width="3"/><text x="256" y="480" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Hyperbole (y = 1/x)</text></svg>`,
    hyperbola: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><line x1="50" y1="256" x2="462" y2="256" stroke="#cbd5e1" stroke-width="2"/><line x1="256" y1="50" x2="256" y2="462" stroke="#cbd5e1" stroke-width="2"/><path d="M 280,50 Q 280,230 462,230 M 50,282 Q 232,282 232,462" fill="none" stroke="#1e293b" stroke-width="3"/><text x="256" y="480" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Hyperbole (y = 1/x)</text></svg>`,
    square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><rect x="156" y="156" width="200" height="200" fill="none" stroke="#1e293b" stroke-width="3"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Carré</text></svg>`,
    carre: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><rect x="156" y="156" width="200" height="200" fill="none" stroke="#1e293b" stroke-width="3"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Carré</text></svg>`,
    angle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#ffffff" width="512" height="512"/><line x1="100" y1="350" x2="400" y2="350" stroke="#1e293b" stroke-width="3"/><line x1="100" y1="350" x2="300" y2="150" stroke="#1e293b" stroke-width="3"/><path d="M 150,350 Q 150,320 180,300" fill="none" stroke="#dc2626" stroke-width="2"/><text x="256" y="450" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial">Angle</text></svg>`,
  };

  const lowerPrompt = (prompt || '').toLowerCase();

  // Trier les clés par longueur (la plus longue d'abord) pour que 'right triangle' match avant 'triangle'
  const sortedKeys = Object.keys(svgTemplates).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (lowerPrompt.includes(key)) {
      return `data:image/svg+xml;base64,${Buffer.from(svgTemplates[key]).toString('base64')}`;
    }
  }

  const isMechanical = /roulement|embrayage|moteur|mécanique|pignon|engrenage|clutch|bearing|engine|mechanical/i.test(lowerPrompt);

  const icon = isMechanical ? '⚙️' : '📐';
  const label = isMechanical ? 'Schéma Technique' : 'Diagramme Mathématique';

  const defaultSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#f8fafc" width="512" height="512"/><text x="256" y="256" text-anchor="middle" font-size="64" fill="#64748b" font-family="Arial">${icon}</text><text x="256" y="320" text-anchor="middle" font-size="20" fill="#94a3b8" font-family="Arial">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(defaultSVG).toString('base64')}`;
};

// ══════════════════════════════════════════════════
// Essayer un modèle Hugging Face
// ══════════════════════════════════════════════════
const tryHFModel = async (model, prompt) => {
  const HF_KEY = process.env.HF_API_KEY;
  if (!HF_KEY) throw new Error('HF_API_KEY manquante');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s au lieu de 30s

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            wait_for_model: true,
            width: 512,
            height: 512,
            num_inference_steps: model.includes('schnell') ? 4 : 20,
            guidance_scale: model.includes('schnell') ? 0 : 7.5,
          },
          options: {
            wait_for_model: true,
            use_cache: false,
          }
        }),
      }
    );

    clearTimeout(timeout);

    if (response.status === 503) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`MODEL_LOADING:${err.estimated_time || 20}`);
    }

    if (response.status === 401) throw new Error('HF_AUTH_ERROR');
    if (response.status === 403) throw new Error(`LICENSE_ERROR`);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength < 5000) {
      throw new Error(`IMAGE_TOO_SMALL`);
    }

    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;

  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};

// ══════════════════════════════════════════════════
// Convertir une URL en Base64 (Proxy)
// ══════════════════════════════════════════════════
const urlToBase64 = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    clearTimeout(timeout);
    console.error(`  ❌ Erreur Proxy Base64 (${url.substring(0, 50)}...):`, error.message);
    return null;
  }
};

// ══════════════════════════════════════════════════
// Essayer Pollinations (Retourne Base64)
// ══════════════════════════════════════════════════
const tryLoremFlickr = async (prompt) => {
  // Extraire les mots clés les plus pertinents (mots longs)
  const keywords = prompt.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['educational', 'diagram', 'illustration', 'technical', 'detailed', 'high', 'quality', 'white', 'background', 'labeled'].includes(w));
  
  // Sujet principal + tags de contexte éducatif
  const subject = keywords[0] || 'physics';
  const url = `https://loremflickr.com/512/512/physics,engineering,${encodeURIComponent(subject)}/all`;
  
  try {
    console.log(`  📸 LoremFlickr: ${subject}`);
    const base64 = await urlToBase64(url);
    if (base64 && base64.startsWith('data:image')) return base64;
  } catch (err) {
    console.warn(`  ⚠️ LoremFlickr échoué:`, err.message);
  }
  return null;
};

const tryPollinations = async (prompt) => {
  // Utiliser le modèle 'flux' pour une précision maximale sur les détails techniques
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
  
  try {
    console.log(`  🎨 Pollinations: ${prompt.substring(0, 50)}...`);
    const base64 = await urlToBase64(url);
    if (base64 && base64.startsWith('data:image')) return base64;
  } catch (err) {
    console.warn(`  ⚠️ Pollinations échoué:`, err.message);
  }
  throw new Error('Pollinations failed');
};

// ══════════════════════════════════════════════════
// Générer image (Priorité SVG pour formes simples)
// ══════════════════════════════════════════════════
const generateImage = async (imagePrompt) => {
  const lowerPrompt = imagePrompt.toLowerCase();

  // 1. PRIORITÉ : Formes géométriques simples en SVG
  const simpleShapes = ['triangle', 'cercle', 'circle', 'carre', 'square', 'rectangle', 'angle', 'parabole', 'hyperbole'];
  if (simpleShapes.some(shape => lowerPrompt.includes(shape))) {
    return generateDefaultSVG(imagePrompt);
  }

  console.log(`\n🎨 Génération image: "${imagePrompt.substring(0, 60)}..."`);

  // 2. ESSAYER HF (Demande spécifique de l'utilisateur)
  const HF_KEY = process.env.HF_API_KEY;
  if (HF_KEY) {
    for (const model of HF_MODELS) {
      try {
        console.log(`  🔄 Essai HF: ${model}`);
        const base64Image = await tryHFModel(model, imagePrompt.substring(0, 200));
        if (base64Image) {
          console.log(`  ✅ Succès HF (${model})`);
          return base64Image;
        }
      } catch (error) {
        console.warn(`  ⚠️ HF ${model} échoué`);
      }
    }
  }

  // 3. ESSAYER POLLINATIONS (Fallback IA)
  try {
    const img = await tryPollinations(imagePrompt);
    if (img) return img;
  } catch (err) {}

  // 4. ESSAYER LOREMFLICKR (Images réelles garanties)
  try {
    const flickrImg = await tryLoremFlickr(imagePrompt);
    if (flickrImg) return flickrImg;
  } catch (err) {}

  // 5. FALLBACK FINAL
  return generateDefaultSVG(imagePrompt);
};

// ══════════════════════════════════════════════════
// CONTROLLER PRINCIPAL
// ══════════════════════════════════════════════════
exports.generateAIQuestions = async (req, res) => {
  try {
    const { prompt, type, matiere, niveau } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_KEY) {
      return res.status(500).json({
        message: "Clé API Groq non configurée"
      });
    }

    // Détecter si l'utilisateur demande explicitement une image
    const cleanPrompt = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const imageKeywords = ['image', 'illustre', 'schema', 'dessin', 'photo', 'visuel', 'diagramme', 'figure', 'voir'];
    const userWantsImage = imageKeywords.some(keyword => cleanPrompt.includes(keyword));

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🤖 Requête: "${prompt}"`);
    console.log(`📊 Image demandée: ${userWantsImage ? 'OUI ✅' : 'NON ❌'}`);
    console.log('═'.repeat(50));

    // ════════════════════════════════════
    // ÉTAPE 1 : LLaMA génère les questions
    // ════════════════════════════════════
    const systemPrompt = `Tu es un expert en pédagogie universitaire.
Génère EXACTEMENT 3 questions d'examen de haute qualité en français (NI PLUS, NI MOINS). 3 QUESTIONS OBLIGATOIREMENT.

Format JSON STRICT:
{
  "questions": [
    {
      "text": "texte complet de la question",
      "type": "qcm",
      "points": 2,
      "options": [
        {"id": "a", "text": "option A", "correct": false},
        {"id": "b", "text": "option B", "correct": true},
        {"id": "c", "text": "option C", "correct": false},
        {"id": "d", "text": "option D", "correct": false}
      ],
      "answerLines": 0,
      "generateImagePrompt": "right triangle geometry diagram"
    }
  ]
}

RÈGLES:
1. qcm → 4 options, vrai_faux → 2 options
2. ouverte/pratique → options: [], answerLines: 3-6
3. generateImagePrompt:
   - OBLIGATOIRE pour chaque question
   - EN ANGLAIS ultra-spécifique (ex: "A schematic of a block on an inclined plane with force vectors", "A cross-section of a 4-stroke engine cylinder", "A diagram showing a coil spring under tension")
   - INTERDIT: Ne pas utiliser de mots vagues comme "exercise", "physics", "education", "mechanics" seuls.
   - STYLE: "Line art diagram, engineering schematic, academic textbook illustration, white background, no people, no buildings"
   - Doit illustrer l'objet PHYSIQUE exact mentionné dans l'énoncé.
4. Réponds UNIQUEMENT avec le JSON`;

    const userPrompt = `Génère exactement 3 questions de type "${type}" sur: "${prompt}"
Matière: ${matiere || 'Général'} | Niveau: ${niveau || 'Universitaire'}
${userWantsImage ? '⚠️ IMPORTANT: Fournis un "generateImagePrompt" technique et détaillé pour CHAQUE question (OBLIGATOIRE).' : '⚠️ NE PAS générer de "generateImagePrompt", laisse le champ vide ou omis.'}`;

    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
          max_tokens: 2000,
        })
      }
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      throw new Error(groqData.error?.message || 'Erreur Groq API');
    }

    // ════════════════════════════════════
    // ÉTAPE 2 : Parser les questions
    // ════════════════════════════════════
    let questions = [];
    try {
      const content = groqData.choices[0].message.content;
      console.log('🤖 IA Content:', content.substring(0, 200) + '...');
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      console.log(`\n✅ ${questions.length} questions générées`);
    } catch (e) {
      console.error('❌ JSON invalide');
      return res.status(500).json({ message: 'Format IA invalide' });
    }

    if (!questions.length) {
      return res.status(500).json({ message: 'Aucune question générée' });
    }

    // ════════════════════════════════════
    // ÉTAPE 3 : Générer images (Seulement si demandé)
    // ════════════════════════════════════
    if (userWantsImage) {
      console.log(`\n🖼️ Génération des images...`);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        // Délai entre chaque question
        await new Promise(r => setTimeout(r, 1000));

        console.log(`  📸 Image Q${i + 1}: ${q.generateImagePrompt?.substring(0, 30)}...`);

        const imagePrompt = q.generateImagePrompt?.trim();
        if (imagePrompt && imagePrompt.length > 3) {
          q.imageUrl = await generateImage(imagePrompt);
        } else {
          const fallbackPrompt = q.text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .trim()
            .substring(0, 80);

          q.imageUrl = await generateImage(fallbackPrompt || "educational diagram");
        }
        delete q.generateImagePrompt;
      }
    } else {
      console.log(`\n⏭️ Images non demandées, skip...`);
      questions.forEach(q => {
        q.imageUrl = null;
        delete q.generateImagePrompt;
      });
    }

    // ════════════════════════════════════
    // ÉTAPE 4 : Réponse finale
    // ════════════════════════════════════
    const nbImages = questions.filter(q => q.imageUrl).length;
    console.log(`\n✅ RÉSULTAT:`);
    console.log(`   📝 Questions: ${questions.length}`);
    console.log(`   🖼️ Images: ${nbImages}`);
    console.log('═'.repeat(50) + '\n');

    res.json({ questions });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      message: error.message || 'Erreur génération'
    });
  }
};

// ══════════════════════════════════════════════════
// CONTROLLERS CHAT
// ══════════════════════════════════════════════════
exports.saveChat = async (req, res) => {
  try {
    const { chatId, messages, title } = req.body;
    const enseignantId = req.user.id;
    let chat;

    if (chatId) {
      chat = await AIChat.findOneAndUpdate(
        { _id: chatId, enseignant: enseignantId },
        { messages, title, lastUpdate: Date.now() },
        { new: true }
      );
    } else {
      chat = new AIChat({
        enseignant: enseignantId,
        title: title || messages[0]?.content?.substring(0, 30) + '...' || 'Nouvelle conversation',
        messages
      });
      await chat.save();
    }

    res.json(chat);
  } catch (error) {
    console.error('❌ Erreur saveChat:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getChats = async (req, res) => {
  try {
    const chats = await AIChat.find({ enseignant: req.user.id })
      .select('title lastUpdate createdAt')
      .sort({ lastUpdate: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getChatById = async (req, res) => {
  try {
    const chat = await AIChat.findOne({
      _id: req.params.id,
      enseignant: req.user.id
    });
    if (!chat) return res.status(404).json({ message: 'Chat non trouvé' });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    await AIChat.findOneAndDelete({
      _id: req.params.id,
      enseignant: req.user.id
    });
    res.json({ message: 'Chat supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};