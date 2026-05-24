import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/sidebar/Sidebar';
import useAuth from '../../context/useAuth';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  chatWithAI,
  generateAIQuestions,
  generateAIExam,
  addQuestionToBank,
  createExercise,
  saveExamDraft,
  getDepartements,
  saveChatHistory,
  getChatHistories,
  getChatHistoryById,
  deleteChatHistory,
  updateChatTitle
} from '../../api/enseignant/Enseignant.api';
import {
  FiSend,
  FiPaperclip,
  FiX,
  FiTrash2,
  FiEdit,
  FiCheckCircle,
  FiCpu,
  FiFileText,
  FiLayers,
  FiPlus,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiBookOpen,
  FiSave,
  FiCopy,
  FiZap,
  FiClock,
  FiCheck,
  FiMessageSquare,
  FiMenu
} from 'react-icons/fi';
import '../../styles/AIGenerator.css';

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const GENERATION_MODES = [
  { value: 'questions', label: '📝 Questions individuelles' },
  { value: 'exam', label: '📋 Examen complet' }
];

const QUESTION_TYPES = [
  { value: 'ouverte', label: 'Question Ouverte' },
  { value: 'qcm_unique', label: 'QCM (Choix Unique)' },
  { value: 'qcm_multiple', label: 'QCM (Choix Multiple)' },
  { value: 'vrai_faux', label: 'Vrai/Faux' },
  { value: 'pratique', label: 'Question Pratique' }
];

const CONTENT_TYPES = [
  { value: 'text', label: '📝 Texte (Questions/Examen)' },
  { value: 'image', label: '🖼️ Image' }
];

export default function AIGenerator() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation Sidebar
  const seDeconnecter = useCallback(() => {
    logout();
    navigate('/enseignant/login', { replace: true });
  }, [logout, navigate]);

  // Context seeding
  const [context, setContext] = useState({
    matiere: '',
    niveau: '',
    duree: '2 heures',
    noteTotale: '20'
  });
  const [showConfig, setShowConfig] = useState(true);

  // Chat States
  const [messages, setMessages] = useState([]);
  const [promptInput, setPromptInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  // Sandbox States (holds active generated JSON data)
  const [sandboxData, setSandboxData] = useState(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editedQuestion, setEditedQuestion] = useState(null);
  
  // Chat history states
  const [chatHistories, setChatHistories] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Question type selector
  const [selectedQuestionType, setSelectedQuestionType] = useState('ouverte');
  const [generationMode, setGenerationMode] = useState('questions');
  const [contentType, setContentType] = useState('text');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  
  // Popup states
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);

  // Auto-fill context from user profile
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: uid(),
          role: 'assistant',
          content: `Bonjour ${user?.Prenom || 'Enseignant'} ! Je suis votre concepteur d'examen intelligent.\n\nPosez-moi vos questions ou donnez-moi vos directives pour concevoir des exercices, des QCM ou des examens structurés complets.\n\n💡 **Astuce** : Complétez les paramètres de contexte ci-dessus (Matière, Niveau, etc.) pour guider précisément la génération !`,
          timestamp: new Date()
        }
      ]);
    }
  }, [user]);

  // Load chat histories on mount
  useEffect(() => {
    loadChatHistories();
  }, []);

  // Auto-save conversation after each message
  useEffect(() => {
    if (messages.length > 1) { // Don't save initial welcome message
      autoSaveConversation();
    }
  }, [messages]);

  // Scroll to bottom of chat
  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  // Handle files select
  const fileInputRef = useRef(null);
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setAttachedFiles(prev => [...prev, ...selected].slice(0, 5));
  };

  const removeAttachedFile = (idx) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Chat History Functions
  const loadChatHistories = async () => {
    try {
      const result = await getChatHistories();
      setChatHistories(result.chats || []);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    }
  };

  const autoSaveConversation = async () => {
    try {
      const payload = {
        id: currentChatId,
        messages,
        context,
      };
      const result = await saveChatHistory(payload);
      if (result.chat && !currentChatId) {
        setCurrentChatId(result.chat.id);
      }
      await loadChatHistories();
    } catch (err) {
      console.error('Erreur sauvegarde auto:', err);
    }
  };

  const loadConversation = async (chatId) => {
    try {
      setLoadingHistory(true);
      const result = await getChatHistoryById(chatId);
      if (result.chat) {
        const loadedMessages = result.chat.messages || [];
        setMessages(loadedMessages);
        setContext(result.chat.context || { matiere: '', niveau: '', duree: '2 heures', noteTotale: '20' });
        setCurrentChatId(result.chat.id);
        
        // Restaurer le dernier contenu généré (jsonData) du dernier message assistant
        let lastJsonData = null;
        for (let i = loadedMessages.length - 1; i >= 0; i--) {
          if (loadedMessages[i].role === 'assistant' && loadedMessages[i].jsonData) {
            lastJsonData = loadedMessages[i].jsonData;
            break;
          }
        }
        
        if (lastJsonData) {
          setSandboxData(lastJsonData);
          // Si c'est des questions, sélectionner toutes par défaut
          if (lastJsonData.mode === 'questions' && Array.isArray(lastJsonData.questions)) {
            const ids = lastJsonData.questions.map((_, idx) => idx);
            setSelectedQuestionIds(new Set(ids));
          }
        } else {
          setSandboxData(null);
        }
        
        setShowHistorySidebar(false);
      }
    } catch (err) {
      console.error('Erreur chargement conversation:', err);
      setErrorText('Impossible de charger la conversation');
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewConversation = () => {
    setMessages([
      {
        id: uid(),
        role: 'assistant',
        content: `Bonjour ${user?.Prenom || 'Enseignant'} ! Je suis votre concepteur d'examen intelligent.\n\nPosez-moi vos questions ou donnez-moi vos directives pour concevoir des exercices, des QCM ou des examens structurés complets.\n\n💡 **Astuce** : Complétez les paramètres de contexte ci-dessus (Matière, Niveau, etc.) pour guider précisément la génération !`,
        timestamp: new Date()
      }
    ]);
    setCurrentChatId(null);
    setSandboxData(null);
    setContext({ matiere: '', niveau: '', duree: '2 heures', noteTotale: '20' });
  };

  const deleteConversation = async (chatId) => {
    setDeleteAction(() => async () => {
      try {
        await deleteChatHistory(chatId);
        await loadChatHistories();
        if (currentChatId === chatId) {
          startNewConversation();
        }
        setShowDeleteConfirm(false);
      } catch (err) {
        console.error('Erreur suppression:', err);
        setErrorText('Impossible de supprimer la conversation');
        setShowDeleteConfirm(false);
      }
    });
    setShowDeleteConfirm(true);
  };

  // Submit Prompt to AI
  const handleSendPrompt = async () => {
    if ((!promptInput.trim() && attachedFiles.length === 0) || aiLoading) return;

    setErrorText('');
    setSuccessText('');
    
    // Si le type de contenu est une image, générer l'image
    if (contentType !== 'text') {
      await handleGenerateImage();
      return;
    }
    
    const userMessageText = promptInput.trim();
    const userMsg = {
      id: uid(),
      role: 'user',
      content: userMessageText || 'Analyse les fichiers joints',
      files: attachedFiles.map(f => f.name),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setPromptInput('');
    setAiLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      // Inject context seeds into user inputs if they exist
      let enhancedMessage = userMessageText;
      
      // Ajouter le mode et le type de génération au message
      if (generationMode === 'exam') {
        enhancedMessage = `Génère un examen complet structuré. ${enhancedMessage}`;
      } else {
        enhancedMessage = `Génère des questions de type "${selectedQuestionType}". ${enhancedMessage}`;
      }
      
      if (context.matiere || context.niveau) {
        enhancedMessage += `\n[Contexte: Matière: ${context.matiere || 'non spécifiée'}, Niveau: ${context.niveau || 'non spécifié'}, Durée: ${context.duree || 'non spécifiée'}, Barème: ${context.noteTotale || '20'} pts]`;
      }

      const response = await chatWithAI({
        message: enhancedMessage,
        files: attachedFiles,
        history,
        context
      });

      setAttachedFiles([]);

      const assistantMsg = {
        id: uid(),
        role: 'assistant',
        content: response.reply,
        jsonData: response.jsonData,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If valid structured JSON received, load it in the interactive sandbox
      if (response.jsonData) {
        setSandboxData(response.jsonData);
        setSelectedQuestionIds(new Set());
        // Select all by default
        if (response.jsonData.mode === 'questions' && Array.isArray(response.jsonData.questions)) {
          const ids = response.jsonData.questions.map((_, idx) => idx);
          setSelectedQuestionIds(new Set(ids));
        }
        setSuccessText('Nouveau contenu généré par l\'IA disponible dans le bac à sable !');
      }

    } catch (err) {
      console.error(err);
      let errMsg = "Erreur de connexion avec le service d'IA.";
      if (err.response?.data?.message?.includes('GROQ_API_KEY')) {
        errMsg = "Clé GROQ_API_KEY manquante ou vide dans le fichier .env du Backend. Veuillez ajouter votre clé API pour utiliser les fonctionnalités d'IA.";
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      setErrorText(errMsg);
    } finally {
      setAiLoading(false);
    }
  };

  // Générer une image via AI
  const handleGenerateImage = async () => {
    const prompt = promptInput.trim() || imagePrompt.trim();
    if (!prompt) {
      setErrorText('Veuillez entrer un prompt pour générer l\'image');
      return;
    }

    setAiLoading(true);
    setErrorText('');
    setSuccessText('');

    const userMsg = {
      id: uid(),
      role: 'user',
      content: `Génération d'${contentType}: ${prompt}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setPromptInput('');
    setImagePrompt('');

    try {
      const response = await fetch('http://localhost:5000/api/enseignant/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          prompt: prompt,  // Envoyer le prompt pur sans préfixe
          type: contentType  // Envoyer le type séparément
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la génération de l\'image');
      }
      
      if (data.imageUrl) {
        // Construire l'URL complète de l'image
        const fullImageUrl = data.imageUrl.startsWith('http') 
          ? data.imageUrl 
          : `http://localhost:5000${data.imageUrl}`;
        
        setGeneratedImage(fullImageUrl);
        
        // Mettre l'image dans le sandbox pour l'afficher à droite
        setSandboxData({
          mode: 'image',
          imageUrl: fullImageUrl,
          prompt: prompt,
          contentType: contentType,
          timestamp: new Date().toISOString()
        });
        
        const assistantMsg = {
          id: uid(),
          role: 'assistant',
          content: `✅ ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} généré${contentType === 'image' ? 'e' : ''} avec succès !`,
          imageUrl: fullImageUrl,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMsg]);
        setSuccessText(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} généré${contentType === 'image' ? 'e' : ''} avec succès !`);
      } else {
        throw new Error('Aucune URL d\'image retournée');
      }

    } catch (err) {
      console.error('Erreur génération image:', err);
      setErrorText(err.message || 'Erreur lors de la génération de l\'image. Vérifiez que la clé STABILITY_API_KEY est configurée dans le Backend.');
      
      const errorMsg = {
        id: uid(),
        role: 'assistant',
        content: `❌ ${err.message || 'Erreur lors de la génération de l\'image'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  // Sandbox Handlers - Selection
  const toggleSelectQuestion = (idx) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedQuestionIds(next);
  };

  const toggleSelectAll = () => {
    if (!sandboxData || sandboxData.mode !== 'questions') return;
    if (selectedQuestionIds.size === sandboxData.questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      const all = sandboxData.questions.map((_, idx) => idx);
      setSelectedQuestionIds(new Set(all));
    }
  };

  // Sandbox Handlers - Question Editing
  const startEditQuestion = (idx, q) => {
    setEditingQuestionId(idx);
    setEditedQuestion({ ...q });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditedQuestion(null);
  };

  const saveEditedQuestion = (idx) => {
    if (!editedQuestion || !sandboxData) return;
    const nextQuestions = [...sandboxData.questions];
    nextQuestions[idx] = { ...editedQuestion };
    setSandboxData({
      ...sandboxData,
      questions: nextQuestions
    });
    setEditingQuestionId(null);
    setEditedQuestion(null);
    setSuccessText('Question mise à jour avec succès.');
  };

  const deleteQuestionFromSandbox = (idx) => {
    setDeleteAction(() => () => {
      if (!sandboxData) return;
      const nextQuestions = sandboxData.questions.filter((_, i) => i !== idx);
      setSandboxData({
        ...sandboxData,
        questions: nextQuestions
      });
      const nextSelect = new Set(selectedQuestionIds);
      nextSelect.delete(idx);
      setSelectedQuestionIds(nextSelect);
      setSuccessText('Question retirée du bac à sable.');
      setShowDeleteConfirm(false);
    });
    setShowDeleteConfirm(true);
  };

  // Sandbox Handlers - Adding questions to Database
  const handleSaveQuestionsToBank = async () => {
    if (!sandboxData || selectedQuestionIds.size === 0) return;
    setAiLoading(true);
    setErrorText('');
    setSuccessText('');

    let countSaved = 0;
    try {
      const listToSave = sandboxData.questions.filter((_, idx) => selectedQuestionIds.has(idx));
      
      // Créer un exercice pour chaque question sélectionnée
      for (const q of listToSave) {
        const exercisePayload = {
          title: q.text.substring(0, 100) + (q.text.length > 100 ? '...' : ''), // Titre = début de la question
          matiere: context.matiere || sandboxData.matiere || '',
          niveau: context.niveau || sandboxData.niveau || '',
          anneeUniversitaire: '2025-2026',
          questions: [
            {
              text: q.text,
              type: q.type || 'ouverte',
              answerLines: q.answerLines || 3,
              options: q.options || []
            }
          ],
          totalPoints: 1 // 1 point par défaut
        };
        
        await createExercise(exercisePayload);
        countSaved++;
      }
      
      setSuccessText(`${countSaved} exercice(s) sauvegardé(s) avec succès dans votre banque d'exercices !`);
      setSelectedQuestionIds(new Set());
    } catch (err) {
      console.error(err);
      setErrorText('Erreur lors de la sauvegarde des exercices en banque.');
    } finally {
      setAiLoading(false);
    }
  };

  // Sandbox Handlers - Saving exam draft to database
  const handleSaveExamDraft = async () => {
    if (!sandboxData || sandboxData.mode !== 'exam') return;
    setAiLoading(true);
    setErrorText('');
    setSuccessText('');

    try {
      const payload = {
        title: sandboxData.title || `Examen de ${context.matiere || 'Matière'}`,
        matiere: context.matiere || sandboxData.matiere || '',
        niveau: context.niveau || sandboxData.niveau || '',
        duree: context.duree || sandboxData.duree || '2 heures',
        noteTotale: Number(context.noteTotale || sandboxData.noteTotale || 20),
        sections: sandboxData.sections || [],
        examForm: {
          titre: sandboxData.title || `Examen de ${context.matiere || 'Matière'}`,
          departement: user?.Departement || '',
          matiere: context.matiere || sandboxData.matiere || '',
          niveau: context.niveau || sandboxData.niveau || '',
          duree: context.duree || sandboxData.duree || '2 heures',
          noteTotale: context.noteTotale || '20',
          type: 'Examen principal'
        },
        status: 'Brouillon',
        visibility: 'private'
      };

      const result = await saveExamDraft(payload);
      if (result) {
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorText('Impossible d\'enregistrer le brouillon de l\'examen.');
    } finally {
      setAiLoading(false);
    }
  };

  // Sandbox Handlers - Edit Exercise titles / Section title in Sandbox
  const handleSectionTitleChange = (secIdx, newTitle) => {
    if (!sandboxData) return;
    const nextSections = [...sandboxData.sections];
    nextSections[secIdx].title = newTitle;
    setSandboxData({
      ...sandboxData,
      sections: nextSections
    });
  };

  const handleExerciseTitleChange = (secIdx, exoIdx, newTitle) => {
    if (!sandboxData) return;
    const nextSections = [...sandboxData.sections];
    nextSections[secIdx].exercises[exoIdx].title = newTitle;
    setSandboxData({
      ...sandboxData,
      sections: nextSections
    });
  };

  // Sandbox Handlers - Edit Questions in Exam
  const startEditExamQuestion = (secIdx, exoIdx, qIdx, q) => {
    setEditingQuestionId(`${secIdx}-${exoIdx}-${qIdx}`);
    setEditedQuestion({ ...q });
  };

  const cancelEditExamQuestion = () => {
    setEditingQuestionId(null);
    setEditedQuestion(null);
  };

  const saveEditedExamQuestion = (secIdx, exoIdx, qIdx) => {
    if (!editedQuestion || !sandboxData) return;
    const nextSections = [...sandboxData.sections];
    nextSections[secIdx].exercises[exoIdx].questions[qIdx] = { ...editedQuestion };
    setSandboxData({
      ...sandboxData,
      sections: nextSections
    });
    setEditingQuestionId(null);
    setEditedQuestion(null);
    setSuccessText('Question mise à jour avec succès.');
  };

  const deleteExamQuestion = (secIdx, exoIdx, qIdx) => {
    setDeleteAction(() => () => {
      if (!sandboxData) return;
      const nextSections = [...sandboxData.sections];
      nextSections[secIdx].exercises[exoIdx].questions = nextSections[secIdx].exercises[exoIdx].questions.filter((_, i) => i !== qIdx);
      setSandboxData({
        ...sandboxData,
        sections: nextSections
      });
      setSuccessText('Question supprimée avec succès.');
      setShowDeleteConfirm(false);
    });
    setShowDeleteConfirm(true);
  };

  return (
    <div className="teacher-shell">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={seDeconnecter}
      />

      {/* Popup de succès d'enregistrement */}
      {showSuccessPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '2px solid #d4a843',
            textAlign: 'center',
            animation: 'slideUp 0.4s ease'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #d4a843 0%, #f4c563 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(212, 168, 67, 0.4)',
              animation: 'scaleIn 0.5s ease'
            }}>
              <FiCheckCircle size={40} color="#fff" />
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '12px'
            }}>
              Enregistrement Réussi !
            </h3>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              Votre examen a été enregistré en brouillon privé.<br />
              Vous pouvez le modifier lors de la création.
            </p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 32px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(29, 78, 216, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.3)';
              }}
            >
              Parfait !
            </button>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '2px solid #ef4444',
            textAlign: 'center',
            animation: 'slideUp 0.4s ease'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
              animation: 'scaleIn 0.5s ease'
            }}>
              <FiAlertCircle size={40} color="#fff" />
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '12px'
            }}>
              Confirmer la Suppression
            </h3>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              Êtes-vous sûr de vouloir supprimer cet élément ?<br />
              Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e2e8f0';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => deleteAction && deleteAction()}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="teacher-main" style={{ padding: '20px 24px' }}>
        {/* ── Bannières de Statut/Notification ── */}
        {errorText && (
          <div className="teacher-alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <FiAlertCircle size={18} /> {errorText}
          </div>
        )}

        {/* ── Panneau Historique à Droite ── */}
        {showHistorySidebar && (
          <>
            <div className="ai-history-backdrop" onClick={() => setShowHistorySidebar(false)} />
            <div className="ai-history-overlay">
              <div className="ai-history-header">
                <div className="ai-history-title">
                  <FiClock size={16} /> Historique
                </div>
                <button
                  className="ai-history-close-btn"
                  onClick={() => setShowHistorySidebar(false)}
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="ai-history-list">
                {loadingHistory ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                ) : chatHistories.length === 0 ? (
                  <div className="ai-history-empty">
                    <div className="ai-history-empty-icon">📭</div>
                    <div className="ai-history-empty-text">Aucune conversation sauvegardée</div>
                  </div>
                ) : (
                  chatHistories.map((chat) => (
                    <div
                      key={chat.id}
                      className="ai-history-item"
                      onClick={() => loadConversation(chat.id)}
                    >
                      <div className="ai-history-item-content">
                        <div className="ai-history-item-title">
                          {chat.title || 'Conversation sans titre'}
                        </div>
                        <div className="ai-history-item-meta">
                          <span>📅 {new Date(chat.createdAt).toLocaleDateString('fr-FR')}</span>
                          <span>💬 {chat.messages?.length || 0}</span>
                        </div>
                      </div>
                      <button
                        className="ai-history-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(chat.id);
                        }}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Conteneur Double Panneau (Chat & Sandbox) ── */}
        <div className={`ai-generator-container ${showHistorySidebar ? 'with-history' : ''}`}>
          
          {/* =========================================================
              PANNEAU GAUCHE : CHAT & FORMULAIRE CONTEXTE
              ========================================================= */}
          <section className="ai-panel-chat">
            {/* Header avec boutons d'action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--td-border)' }}>
              <button
                className="ai-sandbox-action-btn ai-sandbox-btn-secondary"
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <FiMessageSquare size={16} /> Historique
              </button>
              <button
                className="ai-sandbox-action-btn ai-sandbox-btn-primary"
                onClick={startNewConversation}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <FiPlus size={16} /> Nouvelle conversation
              </button>
            </div>

            {/* Formulaire Contexte Collapsible */}
            <div className="ai-chat-config-header" onClick={() => setShowConfig(!showConfig)}>
              <span className="ai-chat-config-title">
                <FiLayers size={14} /> Paramètres du contexte pédagogique
              </span>
              {showConfig ? <FiChevronUp /> : <FiChevronDown />}
            </div>

            {showConfig && (
              <div className="ai-config-grid">
                <div className="ai-config-field">
                  <label>Matière / Cours</label>
                  <input
                    type="text"
                    className="ai-config-input"
                    placeholder="ex: Développement Web, Algorithmes..."
                    value={context.matiere}
                    onChange={(e) => setContext({ ...context, matiere: e.target.value })}
                  />
                </div>
                <div className="ai-config-field">
                  <label>Niveau</label>
                  <input
                    type="text"
                    className="ai-config-input"
                    placeholder="ex: Licence 3, Master 1..."
                    value={context.niveau}
                    onChange={(e) => setContext({ ...context, niveau: e.target.value })}
                  />
                </div>
                <div className="ai-config-field">
                  <label>Durée de l'examen</label>
                  <input
                    type="text"
                    className="ai-config-input"
                    value={context.duree}
                    onChange={(e) => setContext({ ...context, duree: e.target.value })}
                  />
                </div>
                <div className="ai-config-field">
                  <label>Note Totale / Barème</label>
                  <input
                    type="number"
                    className="ai-config-input"
                    value={context.noteTotale}
                    onChange={(e) => setContext({ ...context, noteTotale: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Zone de Discussion */}
            <div className="ai-chat-messages-scroll messages-area">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} style={{ display: 'flex', gap: '10px', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
                    {!isUser && (
                      <div className="teacher-exam-icon-wrap" style={{ background: 'var(--td-gold-soft)', color: 'var(--td-gold)', border: '1px solid rgba(212,168,67,0.3)', width: 30, height: 30 }}>
                        <FiZap size={14} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '82%',
                      background: isUser ? '#1d4ed8' : '#fff',
                      color: isUser ? '#fff' : 'var(--td-text-primary)',
                      border: '1px solid var(--td-border)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      boxShadow: 'var(--td-shadow-sm)',
                      fontSize: '0.84rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.files && msg.files.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {msg.files.map((filename, i) => (
                            <span key={i} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.15)', color: isUser ? '#fff' : 'var(--td-text-label)', padding: '2px 6px', borderRadius: '4px' }}>
                              📎 {filename}
                            </span>
                          ))}
                        </div>
                      )}
                      <div>{msg.content}</div>
                      {msg.imageUrl && (
                        <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--td-border)' }}>
                          <img 
                            src={msg.imageUrl} 
                            alt="Image générée" 
                            style={{ width: '100%', maxWidth: '400px', display: 'block' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {aiLoading && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="teacher-exam-icon-wrap" style={{ width: 30, height: 30 }}>
                    <FiZap className="spin" size={14} />
                  </div>
                  <div className="typing-dots" style={{ background: '#e2e8f0', borderRadius: '12px', padding: '10px 16px' }}>
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Sélecteurs de génération */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--td-border)', background: '#f8f9fa' }}>
              {/* Type de contenu */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--td-text-label)', marginBottom: '6px' }}>
                  Type de contenu
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--td-border)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode de génération (seulement si type = text) */}
              {contentType === 'text' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--td-text-label)', marginBottom: '6px' }}>
                    Mode de génération
                  </label>
                  <select
                    value={generationMode}
                    onChange={(e) => setGenerationMode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--td-border)',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {GENERATION_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type de question (seulement si mode questions et type = text) */}
              {contentType === 'text' && generationMode === 'questions' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--td-text-label)', marginBottom: '6px' }}>
                    Type de question
                  </label>
                  <select
                    value={selectedQuestionType}
                    onChange={(e) => setSelectedQuestionType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--td-border)',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Barre d'entrée de Texte & Pièces Jointes */}
            <div className="ai-chat-input-bar">
              {attachedFiles.length > 0 && (
                <div className="ai-attachments-strip">
                  {attachedFiles.map((file, idx) => (
                    <span key={idx} className="ai-file-tag">
                      <FiPaperclip size={10} /> {file.name}
                      <button className="ai-file-tag-delete" onClick={() => removeAttachedFile(idx)}>
                        <FiX size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="ai-chat-input-row">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.md,.json"
                  onChange={handleFileChange}
                />
                <button
                  className="ai-chat-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Joindre des cours ou des images de sujet (PDF, Images, etc.)"
                >
                  <FiPaperclip size={18} />
                </button>
                <textarea
                  className="ai-textarea-prompt"
                  rows={1}
                  placeholder={
                    contentType !== 'text'
                      ? `Décrivez ${contentType === 'image' ? 'l\'image' : 'le ' + contentType} à générer... (ex: "un cube OLAP avec ses dimensions")`
                      : generationMode === 'exam' 
                        ? `Génère un examen complet sur... (ex: "Examen de Java avec QCM et exercices pratiques")`
                        : `Génère des questions de type "${QUESTION_TYPES.find(t => t.value === selectedQuestionType)?.label}" sur...`
                  }
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="ai-chat-action-btn ai-chat-send-btn"
                  disabled={(!promptInput.trim() && attachedFiles.length === 0) || aiLoading}
                  onClick={handleSendPrompt}
                >
                  <FiSend size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* =========================================================
              PANNEAU DROITE : BAC À SABLE INTERACTIF (SANDBOX)
              ========================================================= */}
          <section className="ai-panel-sandbox">
            {sandboxData ? (
              <>
                {/* Sandbox Header */}
                <div className="ai-sandbox-header">
                  <div className="ai-sandbox-header-left">
                    <div className="teacher-exam-icon-wrap" style={{ background: 'var(--td-blue-soft)', color: 'var(--td-blue)', width: 36, height: 36 }}>
                      <FiLayers size={18} />
                    </div>
                    <div className="ai-sandbox-title-group">
                      <h4>Bac à sable interactif</h4>
                      <span className="ai-sandbox-subtitle">
                        {sandboxData.mode === 'image' 
                          ? `${sandboxData.contentType || 'Image'} générée` 
                          : sandboxData.mode === 'questions' 
                            ? `${sandboxData.questions?.length || 0} questions chargées` 
                            : 'Examen structuré complet'}
                      </span>
                    </div>
                  </div>

                  <div className="ai-sandbox-header-actions">
                    {sandboxData.mode === 'questions' ? (
                      <>
                        <button
                          className="ai-sandbox-action-btn ai-sandbox-btn-secondary"
                          onClick={toggleSelectAll}
                        >
                          {selectedQuestionIds.size === sandboxData.questions.length ? 'Désélectionner' : 'Sélectionner tout'}
                        </button>
                        <button
                          className="ai-sandbox-action-btn ai-sandbox-btn-primary"
                          disabled={selectedQuestionIds.size === 0}
                          onClick={handleSaveQuestionsToBank}
                        >
                          <FiSave /> Ajouter à la Banque
                        </button>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>

                {/* Sandbox Scrollable Editor */}
                <div className="ai-sandbox-scroll">
                  {sandboxData.mode === 'image' ? (
                    /* Mode affichage d'image générée */
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '40px 20px',
                      gap: '20px'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '16px',
                        padding: '4px',
                        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
                        maxWidth: '100%'
                      }}>
                        <img 
                          src={sandboxData.imageUrl} 
                          alt={sandboxData.prompt || 'Image générée'} 
                          style={{ 
                            width: '100%',
                            maxWidth: '800px',
                            height: 'auto',
                            display: 'block',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </div>
                      
                      {sandboxData.prompt && (
                        <div style={{
                          background: '#f8f9fa',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          maxWidth: '800px',
                          width: '100%'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#64748b',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Prompt utilisé
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            color: '#1e293b',
                            lineHeight: '1.6'
                          }}>
                            {sandboxData.prompt}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <a
                          href={sandboxData.imageUrl}
                          download={`${sandboxData.contentType || 'image'}_${Date.now()}.png`}
                          style={{
                            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '12px 24px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <FiSave size={16} /> Télécharger l'image
                        </a>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sandboxData.imageUrl);
                            setSuccessText('URL copiée dans le presse-papiers !');
                          }}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '12px 24px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <FiCopy size={16} /> Copier l'URL
                        </button>
                      </div>
                    </div>
                  ) : sandboxData.mode === 'questions' ? (
                    /* Mode simple liste de questions */
                    <div className="ai-sandbox-questions-list">
                      {sandboxData.questions.map((q, idx) => {
                        const isEditing = editingQuestionId === idx;
                        const isSelected = selectedQuestionIds.has(idx);

                        return (
                          <div key={idx} className={`ai-question-card ${isSelected ? 'selected' : ''}`} style={isSelected ? { borderColor: 'var(--td-blue)', background: '#eff6ff' } : {}}>
                            <div className="ai-question-card-select">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectQuestion(idx)}
                              />
                            </div>

                            <div className="ai-question-card-body">
                              {isEditing ? (
                                /* Formulaire d'édition de la question */
                                <div className="ai-question-edit-form">
                                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Texte de la question</label>
                                  <textarea
                                    className="ai-config-input"
                                    style={{ resize: 'vertical', width: '100%', minHeight: '60px' }}
                                    value={editedQuestion.text}
                                    onChange={(e) => setEditedQuestion({ ...editedQuestion, text: e.target.value })}
                                  />
                                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Points</label>
                                      <input
                                        type="number"
                                        className="ai-config-input"
                                        value={editedQuestion.points || ''}
                                        onChange={(e) => setEditedQuestion({ ...editedQuestion, points: Number(e.target.value) })}
                                      />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Type de question</label>
                                      <select
                                        className="ai-config-input"
                                        value={editedQuestion.type}
                                        onChange={(e) => setEditedQuestion({ ...editedQuestion, type: e.target.value })}
                                      >
                                        <option value="ouverte">Ouverte</option>
                                        <option value="qcm_unique">QCM Choix Unique</option>
                                        <option value="qcm_multiple">QCM Choix Multiple</option>
                                        <option value="vrai_faux">Vrai / Faux</option>
                                        <option value="pratique">Pratique</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Édition des options de QCM si applicable */}
                                  {(editedQuestion.type?.startsWith('qcm') || editedQuestion.type === 'vrai_faux') && (
                                    <div style={{ marginTop: '8px' }}>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Options de réponse</label>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                        {editedQuestion.options?.map((opt, optIdx) => (
                                          <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                              type="checkbox"
                                              checked={opt.correct}
                                              onChange={(e) => {
                                                const nextOpts = [...editedQuestion.options];
                                                // If unique, reset others
                                                if (editedQuestion.type === 'qcm_unique' && e.target.checked) {
                                                  nextOpts.forEach(o => o.correct = false);
                                                }
                                                nextOpts[optIdx].correct = e.target.checked;
                                                setEditedQuestion({ ...editedQuestion, options: nextOpts });
                                              }}
                                            />
                                            <input
                                              type="text"
                                              className="ai-config-input"
                                              style={{ flex: 1, padding: '4px 8px' }}
                                              value={opt.text}
                                              onChange={(e) => {
                                                const nextOpts = [...editedQuestion.options];
                                                nextOpts[optIdx].text = e.target.value;
                                                setEditedQuestion({ ...editedQuestion, options: nextOpts });
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                                    <button className="ai-sandbox-action-btn ai-sandbox-btn-secondary" onClick={cancelEditQuestion}>Annuler</button>
                                    <button className="ai-sandbox-action-btn ai-sandbox-btn-primary" onClick={() => saveEditedQuestion(idx)}><FiCheck /> Valider</button>
                                  </div>
                                </div>
                              ) : (
                                /* Vue standard de la question */
                                <>
                                  <div className="ai-question-card-header">
                                    <span className={`ai-question-badge-type ${q.type || 'ouverte'}`}>
                                      {q.type || 'ouverte'}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={q.points || 0}
                                        onChange={(e) => {
                                          const nextQuestions = [...sandboxData.questions];
                                          nextQuestions[idx].points = Number(e.target.value);
                                          setSandboxData({ ...sandboxData, questions: nextQuestions });
                                        }}
                                        style={{
                                          width: '50px',
                                          padding: '4px 6px',
                                          border: '1px solid var(--td-border)',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          textAlign: 'center',
                                          fontWeight: 600
                                        }}
                                        title="Modifier le barème"
                                      />
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--td-text-muted)' }}>Pts</span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.86rem', color: 'var(--td-text-primary)', fontWeight: 500 }}>
                                    {q.text}
                                  </div>

                                  {/* Affichage de l'image/schéma si présent */}
                                  {q.imageUrl && (
                                    <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                                      <div style={{ 
                                        border: '2px dashed var(--td-border)', 
                                        borderRadius: '8px', 
                                        padding: '12px',
                                        background: '#f8f9fa'
                                      }}>
                                        {q.imageUrl.type && (
                                          <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: 'var(--td-text-muted)', 
                                            marginBottom: '8px',
                                            fontWeight: 600
                                          }}>
                                            📊 {q.imageUrl.type === 'chart' ? 'Graphe' : q.imageUrl.type === 'diagram' ? 'Diagramme' : q.imageUrl.type === 'schema' ? 'Schéma' : 'Image'}
                                          </div>
                                        )}
                                        <img 
                                          src={q.imageUrl.url || q.imageUrl} 
                                          alt={q.imageDescription || 'Image de la question'} 
                                          style={{ 
                                            maxWidth: '100%', 
                                            height: 'auto', 
                                            borderRadius: '4px',
                                            display: 'block'
                                          }} 
                                        />
                                        {q.imageDescription && (
                                          <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: 'var(--td-text-muted)', 
                                            marginTop: '8px',
                                            fontStyle: 'italic'
                                          }}>
                                            {q.imageDescription}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Affichage des options (QCM, etc.) */}
                                  {q.options && q.options.length > 0 && (
                                    <div className="ai-question-options-list">
                                      {q.options.map((opt, optIdx) => (
                                        <div key={optIdx} className={`ai-option-item ${opt.correct ? 'correct' : ''}`}>
                                          <span className="ai-option-letter">{String.fromCharCode(65 + optIdx)}.</span>
                                          <span>{opt.text}</span>
                                          {opt.correct && <FiCheckCircle style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="ai-question-card-footer">
                                    <button className="ai-question-card-btn" onClick={() => startEditQuestion(idx, q)}>
                                      <FiEdit /> Modifier
                                    </button>
                                    <button className="ai-question-card-btn danger" onClick={() => deleteQuestionFromSandbox(idx)}>
                                      <FiTrash2 /> Retirer
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Mode examen complet rendu sur modèle premium de feuille d'examen */
                    <div className="ai-exam-sheet-mockup" style={{ minHeight: 'auto', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)', border: '1px solid #cbd5e1' }}>
                      <div className="ai-mockup-watermark">PREVIEW</div>
                      
                      {/* Header Table */}
                      <table className="ai-mockup-header-table">
                        <tbody>
                          <tr>
                            <td style={{ width: '60%' }}>
                              <strong>INSTITUTION SUPÉRIEURE</strong><br />
                              <span style={{ fontSize: '0.64rem', fontWeight: 'normal', opacity: 0.8 }}>ExamGen-IA · Modèle Pédagogique</span>
                            </td>
                            <td style={{ width: '40%', textAlign: 'center' }}>
                              <strong>{sandboxData.title || `Examen de ${context.matiere || 'Matière'}`}</strong><br />
                              <span style={{ fontSize: '0.64rem', fontWeight: 'normal', opacity: 0.8 }}>Examen principal</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong>Cours :</strong> {context.matiere || sandboxData.matiere || '.............................................................'}
                            </td>
                            <td>
                              <strong>Classe :</strong> {context.niveau || sandboxData.niveau || '...................................'}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong>Enseignant :</strong> {user?.Prenom} {user?.Nom}
                            </td>
                            <td>
                              <strong>Durée :</strong> {context.duree || sandboxData.duree || '2 heures'}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Body of mockup */}
                      <div className="ai-mockup-body" style={{ fontFamily: 'inherit', color: 'inherit' }}>
                        {sandboxData.sections?.map((sec, secIdx) => (
                          <div key={secIdx} className="ai-mockup-section" style={{ marginBottom: '16px' }}>
                            <div className="ai-mockup-sec-title" style={{ borderBottom: '1.5px solid #0f172a', paddingBottom: '4px' }}>
                              <div style={{ fontWeight: 'bold', width: '100%', fontFamily: 'inherit', fontSize: '0.82rem', textTransform: 'uppercase', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                {sec.title || ''}
                              </div>
                            </div>

                            {sec.exercises?.map((exo, exoIdx) => (
                              <div key={exoIdx} style={{ marginTop: '12px' }}>
                                <div className="ai-mockup-exo-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ fontWeight: 'bold', fontStyle: 'italic', width: '70%', fontFamily: 'inherit', fontSize: '0.78rem', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                    {exo.title || ''}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={exo.points || 0}
                                      onChange={(e) => {
                                        const nextSections = [...sandboxData.sections];
                                        nextSections[secIdx].exercises[exoIdx].points = Number(e.target.value);
                                        setSandboxData({ ...sandboxData, sections: nextSections });
                                      }}
                                      style={{
                                        width: '50px',
                                        padding: '4px 6px',
                                        border: '1px solid var(--td-border)',
                                        borderRadius: '4px',
                                        fontSize: '0.68rem',
                                        textAlign: 'center',
                                        fontWeight: 600
                                      }}
                                      title="Modifier le barème de l'exercice"
                                    />
                                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--td-text-muted)' }}>Pts</span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '14px', borderLeft: '1.5px solid #0f172a', marginTop: '8px' }}>
                                  {exo.questions?.map((q, qIdx) => {
                                    const isEditingExamQ = editingQuestionId === `${secIdx}-${exoIdx}-${qIdx}`;
                                    
                                    return (
                                      <div key={qIdx} style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', borderRadius: '6px', background: isEditingExamQ ? '#eff6ff' : 'transparent', border: isEditingExamQ ? '1px solid var(--td-blue)' : 'none' }}>
                                        {isEditingExamQ ? (
                                          /* Formulaire d'édition */
                                          <div className="ai-question-edit-form">
                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Texte de la question</label>
                                            <textarea
                                              className="ai-config-input"
                                              style={{ resize: 'vertical', width: '100%', minHeight: '60px' }}
                                              value={editedQuestion.text}
                                              onChange={(e) => setEditedQuestion({ ...editedQuestion, text: e.target.value })}
                                            />
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                              <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Points</label>
                                                <input
                                                  type="number"
                                                  className="ai-config-input"
                                                  value={editedQuestion.points || ''}
                                                  onChange={(e) => setEditedQuestion({ ...editedQuestion, points: Number(e.target.value) })}
                                                />
                                              </div>
                                              <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Type</label>
                                                <select
                                                  className="ai-config-input"
                                                  value={editedQuestion.type}
                                                  onChange={(e) => setEditedQuestion({ ...editedQuestion, type: e.target.value })}
                                                >
                                                  <option value="ouverte">Ouverte</option>
                                                  <option value="qcm_unique">QCM Unique</option>
                                                  <option value="qcm_multiple">QCM Multiple</option>
                                                  <option value="vrai_faux">Vrai/Faux</option>
                                                  <option value="pratique">Pratique</option>
                                                </select>
                                              </div>
                                            </div>

                                            {/* Édition des options si applicable */}
                                            {(editedQuestion.type?.startsWith('qcm') || editedQuestion.type === 'vrai_faux') && (
                                              <div style={{ marginTop: '8px' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--td-text-label)' }}>Options de réponse</label>
                                                {editedQuestion.options?.map((opt, optIdx) => (
                                                  <div key={optIdx} style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                                                    <input
                                                      type="checkbox"
                                                      checked={opt.correct || false}
                                                      onChange={(e) => {
                                                        const nextOpts = [...editedQuestion.options];
                                                        nextOpts[optIdx].correct = e.target.checked;
                                                        setEditedQuestion({ ...editedQuestion, options: nextOpts });
                                                      }}
                                                      title="Marquer comme réponse correcte"
                                                    />
                                                    <input
                                                      type="text"
                                                      className="ai-config-input"
                                                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.72rem' }}
                                                      value={opt.text}
                                                      onChange={(e) => {
                                                        const nextOpts = [...editedQuestion.options];
                                                        nextOpts[optIdx].text = e.target.value;
                                                        setEditedQuestion({ ...editedQuestion, options: nextOpts });
                                                      }}
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                                              <button className="ai-sandbox-action-btn ai-sandbox-btn-secondary" onClick={cancelEditExamQuestion}>Annuler</button>
                                              <button className="ai-sandbox-action-btn ai-sandbox-btn-primary" onClick={() => saveEditedExamQuestion(secIdx, exoIdx, qIdx)}><FiCheck /> Valider</button>
                                            </div>
                                          </div>
                                        ) : (
                                          /* Affichage normal */
                                          <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                              <div style={{ fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span>{qIdx + 1}. {q.text}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={q.points || 0}
                                                    onChange={(e) => {
                                                      const nextSections = [...sandboxData.sections];
                                                      nextSections[secIdx].exercises[exoIdx].questions[qIdx].points = Number(e.target.value);
                                                      setSandboxData({ ...sandboxData, sections: nextSections });
                                                    }}
                                                    style={{
                                                      width: '45px',
                                                      padding: '2px 4px',
                                                      border: '1px solid var(--td-border)',
                                                      borderRadius: '3px',
                                                      fontSize: '0.7rem',
                                                      textAlign: 'center',
                                                      fontWeight: 600,
                                                      color: 'var(--td-blue)'
                                                    }}
                                                    title="Modifier le barème"
                                                  />
                                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--td-blue)' }}>pt</span>
                                                </div>
                                              </div>
                                              <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                  className="ai-question-card-btn"
                                                  onClick={() => startEditExamQuestion(secIdx, exoIdx, qIdx, q)}
                                                  title="Modifier cette question"
                                                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                >
                                                  <FiEdit size={12} />
                                                </button>
                                                <button
                                                  className="ai-question-card-btn"
                                                  onClick={() => deleteExamQuestion(secIdx, exoIdx, qIdx)}
                                                  title="Supprimer cette question"
                                                  style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#ef4444' }}
                                                >
                                                  <FiTrash2 size={12} />
                                                </button>
                                              </div>
                                            </div>
                                            {q.options && q.options.length > 0 && (
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginLeft: '12px', marginTop: '4px' }}>
                                                {q.options.map((opt, optIdx) => (
                                                  <span key={optIdx} style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {opt.correct ? '☑' : '☐'} {String.fromCharCode(65 + optIdx)}. {opt.text}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            {q.type === 'ouverte' && (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', opacity: 0.5 }}>
                                                {Array.from({ length: q.answerLines || 3 }).map((_, i) => (
                                                  <div key={i} style={{ borderBottom: '1px dotted #64748b', height: '18px', width: '100%' }}></div>
                                                ))}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer avec bouton Enregistrer - visible en mode examen */}
                {sandboxData && sandboxData.mode === 'exam' && (
                  <div style={{
                    padding: '16px',
                    borderTop: '1px solid var(--td-border)',
                    background: 'var(--td-bg-elevated)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                  }}>
                    <button
                      className="ai-sandbox-action-btn ai-sandbox-btn-primary"
                      onClick={handleSaveExamDraft}
                      disabled={aiLoading}
                      style={{ padding: '10px 20px' }}
                    >
                      <FiSave /> Enregistrer en brouillon
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Bac à sable état vide - Feuille d'examen premium */}
                <div className="ai-exam-sheet-mockup">
                  <div className="ai-mockup-watermark">PREVIEW</div>
                  
                  {/* Header Table */}
                  <table className="ai-mockup-header-table">
                  <tbody>
                    <tr>
                      <td style={{ width: '60%' }}>
                        <strong>INSTITUTION SUPÉRIEURE</strong><br />
                        <span style={{ fontSize: '0.64rem', fontWeight: 'normal', opacity: 0.8 }}>ExamGen-IA · Modèle Pédagogique</span>
                      </td>
                      <td style={{ width: '40%', textAlign: 'center' }}>
                        <strong>EXAMEN PRINCIPAL</strong><br />
                        <span style={{ fontSize: '0.64rem', fontWeight: 'normal', opacity: 0.8 }}>Semestre Académique</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Cours :</strong> {context.matiere || '.............................................................'}
                      </td>
                      <td>
                        <strong>Classe :</strong> {context.niveau || '...................................'}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Enseignant :</strong> {user?.Prenom} {user?.Nom}
                      </td>
                      <td>
                        <strong>Durée :</strong> {context.duree || '2 heures'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                  {/* Body of mockup */}
                  <div className="ai-mockup-body">
                    <div className="ai-mockup-section">
                      <div className="ai-mockup-sec-title">SECTION I - QUESTIONS DE THÉORIE (Barème : 8 pts)</div>
                      <div className="ai-mockup-exo-title">Exercice 1 : Concepts fondamentaux</div>
                      <div className="ai-mockup-question-skeleton">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>1.</span>
                          <div className="ai-mockup-pulse-line" style={{ width: '85%' }}></div>
                        </div>
                        <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px', opacity: 0.7 }}>
                          <div>☐ a) [Option de réponse inactive]</div>
                          <div>☐ b) [Option de réponse inactive]</div>
                        </div>
                      </div>
                    </div>

                    <div className="ai-mockup-section" style={{ marginTop: '12px' }}>
                      <div className="ai-mockup-sec-title">SECTION II - APPLICATION PRATIQUE (Barème : 12 pts)</div>
                      <div className="ai-mockup-exo-title">Exercice 2 : Résolution de problème et conception</div>
                      <div className="ai-mockup-question-skeleton" style={{ gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>1.</span>
                          <div className="ai-mockup-pulse-line" style={{ width: '92%' }}></div>
                        </div>
                        <div className="ai-mockup-pulse-line" style={{ width: '100%', height: '40px' }}></div>
                      </div>
                    </div>

                    {/* Visual Glow Status */}
                    <div style={{
                      marginTop: 'auto',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(29, 78, 216, 0.03), rgba(79, 70, 229, 0.05))',
                      border: '1px dashed rgba(29, 78, 216, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--td-blue)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        <FiZap className="spin" /> Prêt pour la génération
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--td-text-muted)', maxWidth: '340px' }}>
                        Renseignez votre prompt à gauche et cliquez sur envoyer. Les questions s'injecteront dynamiquement sur cette feuille d'examen.
                      </span>
                    </div>

                  </div>
                </div>
              </>
            )}
          </section>

        </div>

      </main>
    </div>
  );
}
