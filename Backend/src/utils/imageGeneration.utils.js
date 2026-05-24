const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Génère du code Mermaid via LLM pour créer un diagramme technique précis
 * @param {string} description - Description du diagramme
 * @param {string} style - Style (diagram, schema, graph)
 * @returns {Promise<string>} - Code Mermaid généré
 */
async function generateMermaidCodeWithLLM(description, style) {
    try {
        console.log('→ Generating Mermaid code with LLM for technical diagram');
        
        // Prompt amélioré pour générer des diagrammes détaillés
        const prompt = 'Generate ONLY valid Mermaid diagram code for: "' + description + '".\n\n' +
'Create a DETAILED technical diagram showing:\n' +
'- All major components and layers\n' +
'- Clear data flow with arrows\n' +
'- Proper labels in French if description is in French\n' +
'- Professional structure\n\n' +
'For neural network architectures (ResNet, VGG, etc.):\n' +
'- Show input layer, hidden layers, output layer\n' +
'- Include layer types (Conv, Pool, Dense, etc.)\n' +
'- Show connections between layers\n' +
'- Add dimensions/sizes if relevant\n\n' +
'For fine-tuning diagrams:\n' +
'- Show pre-trained model\n' +
'- Show new layers added\n' +
'- Show training process\n' +
'- Show final fine-tuned model\n\n' +
'Use this Mermaid syntax:\n' +
'graph TD\n' +
'    A[Component 1] --> B[Component 2]\n' +
'    B --> C{Decision?}\n' +
'    C -->|Yes| D[Result 1]\n' +
'    C -->|No| E[Result 2]\n\n' +
'Style the diagram:\n' +
'    style A fill:#e1f5ff\n' +
'    style D fill:#d4f4dd\n\n' +
'Output ONLY the Mermaid code, no explanations, no markdown blocks.';

        // Essayer Ollama en premier (local, gratuit)
        if (process.env.USE_OLLAMA === 'true') {
            try {
                const ollamaResponse = await axios.post(
                    process.env.OLLAMA_URL || 'http://localhost:11434' + '/api/generate',
                    {
                        model: process.env.OLLAMA_MODEL || 'mistral',
                        prompt: prompt,
                        stream: false,
                        options: {
                            temperature: 0.3,
                            num_predict: 2000
                        }
                    },
                    { timeout: 45000 }
                );
                
                if (ollamaResponse.data && ollamaResponse.data.response) {
                    let mermaidCode = ollamaResponse.data.response.trim();
                    // Nettoyer le code
                    mermaidCode = mermaidCode.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();
                    console.log('✓ Mermaid code generated with Ollama');
                    return mermaidCode;
                }
            } catch (ollamaError) {
                console.log('Ollama not available, trying Groq...');
            }
        }
        
        // Fallback vers Groq
        if (process.env.GROQ_API_KEY) {
            try {
                const groqResponse = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: 'mixtral-8x7b-32768',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.3,
                        max_tokens: 2000
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
                
                if (groqResponse.data && groqResponse.data.choices && groqResponse.data.choices[0]) {
                    let mermaidCode = groqResponse.data.choices[0].message.content.trim();
                    // Nettoyer le code
                    mermaidCode = mermaidCode.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();
                    console.log('✓ Mermaid code generated with Groq');
                    return mermaidCode;
                }
            } catch (groqError) {
                console.error('Groq error:', groqError.message);
            }
        }
        
        // Si aucun LLM disponible, générer un diagramme détaillé basique
        console.log('⚠️  No LLM available, generating detailed basic diagram');
        return generateDetailedMermaidCode(description);
        
    } catch (error) {
        console.error('Error generating Mermaid code:', error.message);
        return generateDetailedMermaidCode(description);
    }
}

/**
 * Génère un code Mermaid détaillé si le LLM n'est pas disponible
 * @param {string} description - Description
 * @returns {string} - Code Mermaid détaillé
 */
function generateDetailedMermaidCode(description) {
    // Détecter si c'est un réseau de neurones
    if (/resnet|vgg|alexnet|neural|network|cnn/i.test(description)) {
        return `graph TD
    A[Input Image<br/>224x224x3] --> B[Conv Layer 1<br/>64 filters]
    B --> C[Batch Norm]
    C --> D[ReLU Activation]
    D --> E[Max Pooling<br/>2x2]
    E --> F[Residual Block 1]
    F --> G[Residual Block 2]
    G --> H[Residual Block 3]
    H --> I[Global Avg Pool]
    I --> J[Dense Layer<br/>1000 classes]
    J --> K[Softmax]
    K --> L[Output<br/>Predictions]
    
    style A fill:#e1f5ff
    style L fill:#d4f4dd
    style F fill:#fff4e1
    style G fill:#fff4e1
    style H fill:#fff4e1`;
    }
    
    // Diagramme générique détaillé
    const shortDesc = description.substring(0, 40);
    return `graph TD
    A[Début:<br/>${shortDesc}] --> B[Étape 1:<br/>Préparation]
    B --> C[Étape 2:<br/>Traitement]
    C --> D{Validation?}
    D -->|Oui| E[Étape 3:<br/>Finalisation]
    D -->|Non| F[Correction]
    F --> C
    E --> G[Résultat Final]
    
    style A fill:#e1f5ff
    style G fill:#d4f4dd
    style D fill:#fff4e1`;
}

/**
 * Rend le code Mermaid en image via QuickChart
 * @param {string} mermaidCode - Code Mermaid
 * @returns {Promise<string>} - URL de l'image générée
 */
async function renderMermaidToImage(mermaidCode) {
    try {
        console.log('→ Rendering Mermaid diagram to image');
        
        const encodedMermaid = encodeURIComponent(mermaidCode);
        const quickChartUrl = `https://quickchart.io/mermaid?c=${encodedMermaid}&w=1200&h=800&bgColor=white`;
        
        const response = await axios.get(quickChartUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        if (response.data) {
            const uploadsDir = path.join(__dirname, '../../uploads/generated-images');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filename = `diagram_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.png`;
            const filepath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filepath, response.data);
            
            console.log('✓ Technical diagram rendered successfully:', filename);
            
            return `/uploads/generated-images/${filename}`;
        }
        
        throw new Error('Failed to render diagram');
        
    } catch (error) {
        console.error('Error rendering Mermaid diagram:', error.message);
        return null;
    }
}

/**
 * Génère une image avec FLUX Dev via Fal.ai
 * @param {string} description - Description de l'image à générer
 * @param {string} style - Style de l'image
 * @returns {Promise<string>} - URL de l'image générée
 */
async function generateImageWithFalAI(description, style = 'technical') {
    try {
        const apiKey = process.env.FAL_API_KEY;
        
        if (!apiKey) {
            console.log('FAL_API_KEY not configured, falling back to Pollinations');
            return null;
        }
        
        // Améliorer le prompt pour être plus explicite sur le contexte technique/éducatif
        let enhancedPrompt = description;
        let negativePrompt = 'blurry, low quality, dark, unclear, distorted';
        
        // Détecter si c'est un diagramme technique/réseau de neurones/ML
        const isTechnicalDiagram = /\b(architecture|modele|model|resnet|neural|network|réseau|neurones|cnn|rnn|lstm|transformer|layer|couche|diagram|diagramme|schema|flowchart)\b/i.test(description);
        
        if (isTechnicalDiagram) {
            // Pour les diagrammes techniques: être TRÈS explicite
            enhancedPrompt = `Technical diagram illustration: ${description}. Simple flowchart style, boxes and arrows, labeled components, white background, clean lines, educational diagram, NOT a photograph, NOT a building, NOT architecture of houses, computer science diagram, machine learning architecture visualization`;
            negativePrompt = 'photograph, photo, realistic image, building, house, construction, real estate, modern architecture, pool, swimming pool, villa, mansion, 3d render, photorealistic, camera, bokeh, depth of field';
        } else {
            // Pour les images générales
            enhancedPrompt = `${description}, educational context, high quality, clear, professional`;
        }

        console.log('Generating with FLUX Dev via Fal.ai');
        console.log('Prompt:', enhancedPrompt);
        console.log('Negative:', negativePrompt);

        // Fal.ai API avec FLUX Dev
        const response = await axios.post(
            'https://fal.run/fal-ai/flux/dev',
            {
                prompt: enhancedPrompt,
                negative_prompt: negativePrompt,
                image_size: 'square_hd',
                num_inference_steps: 28,
                num_images: 1,
                enable_safety_checker: false,
                guidance_scale: 3.5
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Key ${apiKey}`
                },
                timeout: 120000
            }
        );

        if (response.data && response.data.images && response.data.images.length > 0) {
            const imageUrl = response.data.images[0].url;
            
            // Télécharger l'image et la sauvegarder localement
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            const uploadsDir = path.join(__dirname, '../../uploads/generated-images');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.png`;
            const filepath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filepath, imageResponse.data);
            
            console.log('✓ AI-generated image saved successfully from FLUX Dev:', filename);
            
            return `/uploads/generated-images/${filename}`;
        }
        
        throw new Error('No image generated by FLUX Dev');
        
    } catch (error) {
        console.error('✗ Error generating image with FLUX Dev:', error.message);
        if (error.response) {
            console.error('Fal.ai API Error:', error.response.status, error.response.data);
            // Détecter erreur de balance épuisée
            if (error.response.status === 402 || error.response.status === 429 || 
                (error.response.data && typeof error.response.data === 'string' && 
                 error.response.data.toLowerCase().includes('balance'))) {
                console.error('⚠️  Balance API Fal.ai épuisée. Rechargez sur fal.ai/dashboard/billing');
            }
        }
        return null;
    }
}

/**
 * Génère une image avec Pollinations.ai (fallback gratuit)
 * @param {string} description - Description de l'image à générer
 * @param {string} style - Style de l'image
 * @returns {Promise<string>} - URL de l'image générée
 */
async function generateImageWithSDXL(description, style = 'technical') {
    try {
        // Améliorer le prompt pour être plus explicite
        let enhancedPrompt = description;
        
        // Détecter si c'est un diagramme technique/réseau de neurones/ML
        const isTechnicalDiagram = /\b(architecture|modele|model|resnet|neural|network|réseau|neurones|cnn|rnn|lstm|transformer|layer|couche|diagram|diagramme|schema|flowchart)\b/i.test(description);
        
        if (isTechnicalDiagram) {
            // Pour les diagrammes techniques: être TRÈS explicite
            enhancedPrompt = `Technical diagram illustration: ${description}. Simple flowchart style, boxes and arrows, labeled components, white background, clean lines, educational diagram, NOT a photograph, NOT a building, NOT architecture of houses, computer science diagram, machine learning architecture visualization, avoid realistic photos`;
        } else {
            // Pour les images générales
            enhancedPrompt = `${description}, educational, high quality, clear, professional`;
        }

        console.log('Generating with Pollinations.ai (free, no API key needed)');
        console.log('Prompt:', enhancedPrompt);

        // Pollinations.ai - Gratuit, sans clé API, utilise FLUX
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&enhance=false&seed=${Date.now()}`;
        
        // Télécharger l'image générée
        const response = await axios.get(pollinationsUrl, {
            responseType: 'arraybuffer',
            timeout: 120000 // 2 minutes
        });

        if (response.data) {
            // Sauvegarder l'image localement
            const uploadsDir = path.join(__dirname, '../../uploads/generated-images');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.png`;
            const filepath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filepath, response.data);
            
            console.log('✓ AI-generated image saved successfully from Pollinations.ai:', filename);
            
            return `/uploads/generated-images/${filename}`;
        }
        
        throw new Error('No image generated by Pollinations.ai');
        
    } catch (error) {
        console.error('✗ Error generating image with Pollinations.ai:', error.message);
        return null;
    }
}

/**
 * Génère une image avec DALL-E (OpenAI) - Alternative
 * @param {string} description - Description de l'image
 * @returns {Promise<string>} - URL de l'image
 */
async function generateImageWithDALLE(description) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
        console.log('OpenAI API key not configured, using placeholder');
        return generatePlaceholderImage(description);
    }

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/images/generations',
            {
                model: 'dall-e-3',
                prompt: `Educational diagram: ${description}. Clean, professional, technical illustration with white background.`,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                style: 'natural'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        if (response.data.data && response.data.data.length > 0) {
            return response.data.data[0].url;
        }
        
        throw new Error('No image generated');
        
    } catch (error) {
        console.error('Error generating image with DALL-E:', error.response?.data || error.message);
        return generatePlaceholderImage(description);
    }
}

/**
 * Génère une image placeholder
 * @param {string} description - Description
 * @returns {string} - URL du placeholder
 */
function generatePlaceholderImage(description) {
    const shortDesc = description.substring(0, 50);
    return `https://via.placeholder.com/600x400/4A90E2/FFFFFF?text=${encodeURIComponent(shortDesc)}`;
}

/**
 * Fonction principale de génération d'image - Approche hybride intelligente
 * @param {string} description - Description de l'image
 * @param {string} type - Type (chart, diagram, schema, image, graphe, illustration)
 * @returns {Promise<string>} - URL de l'image générée
 */
async function generateImage(description, type = 'image') {
    try {
        console.log(`\n=== SMART IMAGE GENERATION ===`);
        console.log(`Type: ${type}`);
        console.log(`Description: ${description}`);
        
        // Détection TRÈS agressive des diagrammes techniques
        const technicalKeywords = /\b(architecture|modele|model|resnet|vgg|alexnet|inception|neural|network|réseau|neurones|cnn|rnn|lstm|gru|transformer|bert|gpt|layer|couche|flowchart|processus|fine-?tuning|training|apprentissage|convolution|pooling|dense|dropout|batch|epoch|gradient|backprop|forward|pass)\b/i;
        
        const isTechnicalDiagram = type === 'diagramme' || type === 'diagram' || type === 'schema' || type === 'graphe' || 
                                   technicalKeywords.test(description);
        
        if (isTechnicalDiagram) {
            console.log('✓ DETECTED TECHNICAL DIAGRAM - Using LLM + Mermaid for maximum precision');
            
            // Générer le code Mermaid via LLM
            const mermaidCode = await generateMermaidCodeWithLLM(description, type);
            
            if (mermaidCode) {
                console.log('Mermaid code generated:', mermaidCode.substring(0, 100) + '...');
                
                // Rendre le diagramme en image
                const diagramUrl = await renderMermaidToImage(mermaidCode);
                
                if (diagramUrl) {
                    console.log('✓✓✓ Successfully generated PRECISE technical diagram with LLM + Mermaid');
                    return diagramUrl;
                }
            }
            
            console.log('⚠️  Mermaid generation failed, falling back to AI image generation');
        } else {
            console.log('→ Regular image/illustration - Using AI generation');
        }
        
        // Pour les images réalistes/illustrations OU si Mermaid a échoué
        console.log('→ Using AI image generation (FLUX/Pollinations)');
        
        // Essayer FLUX Dev via Fal.ai en premier
        const falUrl = await generateImageWithFalAI(description, type);
        
        if (falUrl) {
            console.log('✓ Successfully generated with FLUX Dev');
            return falUrl;
        }
        
        // Fallback vers Pollinations si Fal.ai échoue
        console.log('→ Fal.ai failed, falling back to Pollinations.ai');
        const pollinationsUrl = await generateImageWithSDXL(description, type);
        
        if (pollinationsUrl) {
            console.log('✓ Successfully generated with Pollinations.ai');
            return pollinationsUrl;
        }
        
        // Dernier fallback : placeholder
        console.log('→ All methods failed, using placeholder');
        return generatePlaceholderImage(description);
        
    } catch (error) {
        console.error('✗ Error in generateImage:', error);
        return generatePlaceholderImage(description);
    }
}

module.exports = {
    generateImage,
    generateMermaidCodeWithLLM,
    renderMermaidToImage,
    generateImageWithFalAI,
    generateImageWithSDXL,
    generateImageWithDALLE,
    generatePlaceholderImage
};
