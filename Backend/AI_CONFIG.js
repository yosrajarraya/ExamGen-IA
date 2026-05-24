/**
 * Configuration centralisée pour les modèles IA
 * Permet de basculer facilement entre Ollama, Groq et Mock
 */

const aiConfig = {
    // Mode IA actif
    mode: process.env.USE_OLLAMA === 'true' ? 'ollama' : 'groq',
    
    // Configuration Ollama (Open Source, Sans Limite)
    ollama: {
        enabled: process.env.USE_OLLAMA === 'true',
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'mistral',
        timeout: 60000,
        description: 'Open Source, Gratuit, Sans Limite, Local'
    },
    
    // Configuration Groq (Cloud, Avec Limite)
    groq: {
        enabled: !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
        visionModel: 'llama-3.2-90b-vision-preview',
        timeout: 30000,
        description: 'Cloud, Limite: 100,000 tokens/jour'
    },
    
    // Configuration Mock (Fallback)
    mock: {
        enabled: true,
        description: 'Données pré-générées, Aucune limite'
    },
    
    // Modèles Ollama recommandés
    recommendedModels: [
        {
            name: 'mistral',
            size: '4.1GB',
            speed: '⚡⚡⚡ Rapide',
            quality: '⭐⭐⭐ Bon',
            recommended: true,
            description: 'Recommandé pour les examens et questions'
        },
        {
            name: 'neural-chat',
            size: '4.1GB',
            speed: '⚡⚡⚡ Rapide',
            quality: '⭐⭐⭐ Bon',
            recommended: false,
            description: 'Optimisé pour le chat et conversations'
        },
        {
            name: 'llama2',
            size: '3.8GB',
            speed: '⚡⚡ Moyen',
            quality: '⭐⭐⭐⭐ Excellent',
            recommended: false,
            description: 'Plus puissant pour tâches complexes'
        },
        {
            name: 'orca-mini',
            size: '1.3GB',
            speed: '⚡⚡⚡⚡ Très rapide',
            quality: '⭐⭐ Acceptable',
            recommended: false,
            description: 'Léger pour ressources limitées'
        }
    ],
    
    // Ordre de fallback
    fallbackOrder: ['ollama', 'groq', 'mock'],
    
    // Fonction pour obtenir le statut
    getStatus: function() {
        return {
            mode: this.mode,
            ollama: {
                enabled: this.ollama.enabled,
                url: this.ollama.url,
                model: this.ollama.model,
                description: this.ollama.description
            },
            groq: {
                enabled: this.groq.enabled,
                model: this.groq.model,
                description: this.groq.description
            },
            mock: {
                enabled: this.mock.enabled,
                description: this.mock.description
            },
            fallbackOrder: this.fallbackOrder
        };
    },
    
    // Fonction pour obtenir les instructions de configuration
    getSetupInstructions: function() {
        return `
╔════════════════════════════════════════════════════════════════╗
║           Configuration IA - ExamGen-IA                        ║
╚════════════════════════════════════════════════════════════════╝

📊 STATUT ACTUEL :
  Mode: ${this.mode.toUpperCase()}
  
🔧 CONFIGURATION :

1️⃣  OLLAMA (Recommandé - Open Source, Sans Limite)
  ${this.ollama.enabled ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}
  URL: ${this.ollama.url}
  Modèle: ${this.ollama.model}
  
  Installation:
    1. Télécharger: https://ollama.ai
    2. Installer et lancer Ollama
    3. ollama pull ${this.ollama.model}
    4. Redémarrer le backend

2️⃣  GROQ (Cloud, Limite: 100,000 tokens/jour)
  ${this.groq.enabled ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}
  Modèle: ${this.groq.model}
  
  Configuration:
    1. Créer un compte: https://console.groq.com
    2. Obtenir une clé API
    3. Ajouter à .env: GROQ_API_KEY=votre_clé
    4. Redémarrer le backend

3️⃣  MOCK (Fallback - Données pré-générées)
  ✅ TOUJOURS DISPONIBLE
  
  Utilisation:
    - Automatique si Ollama et Groq ne sont pas disponibles
    - Aucune limite, aucun coût

📋 ORDRE DE FALLBACK :
  ${this.fallbackOrder.map((m, i) => `${i + 1}. ${m.toUpperCase()}`).join('\n  ')}

💡 RECOMMANDATION :
  Utilisez Ollama pour une expérience optimale (gratuit, sans limite, local)

📚 MODÈLES OLLAMA RECOMMANDÉS :
${this.recommendedModels.map(m => `
  • ${m.name}
    Taille: ${m.size}
    Vitesse: ${m.speed}
    Qualité: ${m.quality}
    ${m.recommended ? '⭐ RECOMMANDÉ' : ''}
    ${m.description}
`).join('')}

🚀 POUR DÉMARRER :
  1. Installer Ollama: https://ollama.ai
  2. ollama pull mistral
  3. npm run dev
  4. Accédez à http://localhost:5173

📖 Pour plus d'informations, consultez OLLAMA_SETUP.md
`;
    }
};

module.exports = aiConfig;
