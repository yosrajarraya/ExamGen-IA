import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiMessageSquare, FiTrash2, FiPlusCircle, FiArrowLeft, FiBook, FiLayers, FiAward, FiSettings, FiCpu, FiCheckCircle } from 'react-icons/fi';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import useAuth from '../../context/useAuth';
import './AIGenerator.css';

const AIGenerator = ({ onAddQuestion }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const seDeconnecter = () => {
    logout();
    navigate('/enseignant/login', { replace: true });
  };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addedQuestions, setAddedQuestions] = useState(new Set());

  // Configuration
  const [matiere, setMatiere] = useState('Mathématiques');
  const [niveau, setNiveau] = useState('L1');
  const [typeQuestion, setTypeQuestion] = useState('qcm');

  // Historique
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // ══════════════════════════════════════════════════
  // Scroll automatique
  // ══════════════════════════════════════════════════
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ══════════════════════════════════════════════════
  // Charger historique
  // ══════════════════════════════════════════════════
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/enseignant/ai/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const chats = await response.json();
        setChatHistory(chats);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // ══════════════════════════════════════════════════
  // Envoyer message
  // ══════════════════════════════════════════════════
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/enseignant/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          type: typeQuestion,
          matiere,
          niveau
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur serveur');
      }

      const data = await response.json();
      console.log('📦 Questions reçues:', data.questions);

      const assistantMessage = {
        role: 'assistant',
        content: `J'ai généré ${data.questions.length} question(s) pour vous :`,
        questions: data.questions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Sauvegarder le chat
      await saveChat([...messages, userMessage, assistantMessage]);

    } catch (error) {
      console.error('❌ Erreur:', error);
      setError(error.message);

      const errorMessage = {
        role: 'assistant',
        content: `Désolé, une erreur s'est produite : ${error.message}`
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════
  // Sauvegarder chat
  // ══════════════════════════════════════════════════
  const saveChat = async (messagesToSave) => {
    try {
      const token = localStorage.getItem('token');
      const title = messagesToSave[0]?.content.substring(0, 50) || 'Nouvelle conversation';

      const response = await fetch('/api/enseignant/ai/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: currentChatId,
          messages: messagesToSave,
          title
        })
      });

      if (response.ok) {
        const savedChat = await response.json();
        console.log('✅ Chat sauvegardé:', savedChat._id);
        if (!currentChatId) {
          setCurrentChatId(savedChat._id);
        }
        await loadChatHistory();
      } else {
        const err = await response.json();
        console.error('❌ Erreur serveur sauvegarde:', err);
      }
    } catch (error) {
      console.error('❌ Erreur réseau sauvegarde chat:', error);
    }
  };

  // ══════════════════════════════════════════════════
  // Ajouter question à l'examen
  // ══════════════════════════════════════════════════
  const handleAddQuestion = (question) => {
    const questionToAdd = {
      id: Date.now(),
      type: question.type,
      questionText: question.text,
      points: question.points || 2,
      options: question.options || [],
      answerLines: question.answerLines || 0,
      imageUrl: question.imageUrl || null
    };

    if (onAddQuestion) {
      onAddQuestion(questionToAdd);
    } else {
      // Si utilisé en page autonome, on redirige vers la création d'examen avec la question
      navigate('/enseignant/exams/create', { state: { importQuestion: questionToAdd } });
    }

    setAddedQuestions(prev => new Set([...prev, question.text]));

    setTimeout(() => {
      setAddedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(question.text);
        return newSet;
      });
    }, 2000);
  };

  // ══════════════════════════════════════════════════
  // Nouveau chat
  // ══════════════════════════════════════════════════
  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setError(null);
  };

  // ══════════════════════════════════════════════════
  // Charger chat
  // ══════════════════════════════════════════════════
  const handleLoadChat = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/enseignant/ai/chats/${chatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const chat = await response.json();
        setMessages(chat.messages);
        setCurrentChatId(chat._id);
      }
    } catch (error) {
      console.error('Erreur chargement chat:', error);
    }
  };

  // ══════════════════════════════════════════════════
  // Supprimer chat
  // ══════════════════════════════════════════════════
  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();

    if (!window.confirm('Supprimer cette conversation ?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/enseignant/ai/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (currentChatId === chatId) {
        handleNewChat();
      }

      loadChatHistory();
    } catch (error) {
      console.error('Erreur suppression chat:', error);
    }
  };

  // ══════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════
  return (
    <div className="teacher-shell">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={seDeconnecter}
      />

      <div className="ai-layout-container">
        {/* Zone principale */}
        <div className="ai-chat-main">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="header-info">
              <button className="back-btn" onClick={() => navigate('/enseignant/dashboard')}>
                <FiArrowLeft />
              </button>
              <h2>Assistant IA - Génération de Questions</h2>
            </div>

            <div className="ai-config-controls">
              <FiBook className="config-icon" />
              <input
                type="text"
                className="config-input"
                placeholder="Matière"
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
              />

              <FiLayers className="config-icon" />
              <select
                className="config-select"
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
              >
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="M1">M1</option>
                <option value="M2">M2</option>
              </select>

              <FiAward className="config-icon" />
              <select
                className="config-select"
                value={typeQuestion}
                onChange={(e) => setTypeQuestion(e.target.value)}
              >
                <option value="qcm">QCM</option>
                <option value="vrai_faux">Vrai/Faux</option>
                <option value="ouverte">Ouverte</option>
                <option value="pratique">Pratique</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-scroll-area" ref={scrollAreaRef}>
            <div className="ai-messages-container">
              {error && (
                <div className="ai-error-banner">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {messages.map((msg, index) => (
                <div key={index} className={`ai-message-row ${msg.role}`}>
                  <div className="ai-avatar">
                    {msg.role === 'assistant' ? '🤖' : '👤'}
                  </div>

                  <div className="ai-message-content">
                    <p className="ai-text">{msg.content}</p>

                    {msg.questions && (
                      <div className="ai-compact-questions">
                        {msg.questions.map((q, qIndex) => (
                          <div key={qIndex} className="compact-q-card">
                            <div className="compact-q-header">
                              <span className="q-badge">{q.type}</span>
                              <button
                                className={`q-add-btn ${addedQuestions.has(q.text) ? 'added' : ''}`}
                                onClick={() => handleAddQuestion(q)}
                                disabled={addedQuestions.has(q.text)}
                              >
                                {addedQuestions.has(q.text) ? (
                                  <>✓ Ajoutée</>
                                ) : (
                                  <>
                                    <FiPlusCircle /> Ajouter
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="compact-q-text">{q.text}</p>

                            {q.options && q.options.length > 0 && (
                              <div className="compact-q-options">
                                {q.options.map((opt, oIndex) => (
                                  <span
                                    key={oIndex}
                                    className={`opt-pill ${opt.correct ? 'correct' : ''}`}
                                  >
                                    {opt.id}) {opt.text}
                                  </span>
                                ))}
                              </div>
                            )}

                            {q.imageUrl && (
                              <div className="compact-q-image-wrap">
                                <img
                                  src={q.imageUrl}
                                  alt={`Illustration Q${qIndex + 1}`}
                                  className="compact-q-image"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    console.error('Erreur chargement image');
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="ai-message-row assistant">
                  <div className="ai-avatar">🤖</div>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Zone de saisie */}
          <div className="ai-input-container">
            <div className="ai-input-box">
              <input
                type="text"
                placeholder="Décrivez les questions que vous souhaitez générer..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={input.trim() && !isLoading ? 'active' : ''}
              >
                <FiSend />
              </button>
            </div>
            <p className="ai-footer-text">
              L'IA génère des questions basées sur vos critères. Vérifiez toujours le contenu.
            </p>
          </div>
        </div>

        {/* Sidebar historique */}
        <div className="ai-history-sidebar">
          <button className="ai-new-chat-btn" onClick={handleNewChat}>
            <FiPlusCircle />
            Nouveau Chat
          </button>

          <span className="ai-history-title">Historique</span>

          <div className="ai-history-list">
            {chatHistory.length > 0 ? (
              chatHistory.map(chat => (
                <div
                  key={chat._id}
                  className={`ai-history-item ${currentChatId === chat._id ? 'active' : ''}`}
                  onClick={() => handleLoadChat(chat._id)}
                >
                  <FiMessageSquare className="chat-icon" />
                  <span className="chat-title">{chat.title}</span>
                  <button
                    className="chat-delete-btn"
                    onClick={(e) => handleDeleteChat(chat._id, e)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))
            ) : (
              <p className="no-history">Aucun historique</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerator;