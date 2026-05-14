import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiX, FiSend, FiPaperclip, FiFile, FiImage, FiTrash2,
  FiLoader, FiCheckCircle, FiDownload, FiZap, FiMessageSquare,
  FiCpu, FiUser, FiAlertCircle,
} from 'react-icons/fi';
import { chatWithAI } from '../../../api/enseignant/Enseignant.api';
import '../../../styles/AIChatModal.css';
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const FILE_ICONS = {
  'application/pdf': { icon: FiFile, color: '#ef4444', label: 'PDF' },
  'image/': { icon: FiImage, color: '#3b82f6', label: 'Image' },
  'text/': { icon: FiFile, color: '#10b981', label: 'Texte' },
};

const getFileMeta = (file) => {
  for (const [key, meta] of Object.entries(FILE_ICONS)) {
    if (file.type.startsWith(key)) return meta;
  }
  return { icon: FiFile, color: '#6b7280', label: 'Fichier' };
};

const normalizeAIQuestion = (q) => ({
  id: uid(),
  type: q.type || 'ouverte',
  text: q.text || '',
  points: String(q.points || ''),
  answerLines: q.answerLines || 3,
  image: null,
  imageUrl: null,
  options: Array.isArray(q.options)
    ? q.options.map((o, i) => ({
        id: o.id || uid(),
        text: o.text || `Option ${String.fromCharCode(65 + i)}`,
        correct: !!o.correct,
      }))
    : [],
});

const AIChatModal = ({ isOpen, onClose, onInsertQuestions, onInsertSections, examContext = {} }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: uid(),
        role: 'assistant',
        content: `Bonjour ! Je suis votre assistant pour la création d'examens.\n\nVous pouvez :\n• Uploader des supports de cours (PDF, images, texte)\n• Me demander de générer des questions\n• Discuter pour affiner le contenu\n\nQuelle matière et quel niveau souhaitez-vous traiter ?`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && files.length === 0) || loading) return;

    const userMsg = { id: uid(), role: 'user', content: input, files: [...files], timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFiles([]);
    setLoading(true);
    setError('');

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const data = await chatWithAI({ message: input || 'Analyse les fichiers joints', files, history, context: examContext });

      const assistantMsg = {
        id: uid(),
        role: 'assistant',
        content: data.reply,
        jsonData: data.jsonData,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de connexion avec l'IA");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, files, messages, loading, examContext]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected].slice(0, 5));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped].slice(0, 5));
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleInsert = (jsonData) => {
    if (jsonData.mode === 'questions' && Array.isArray(jsonData.questions)) {
      onInsertQuestions(jsonData.questions.map(normalizeAIQuestion));
    } else if (jsonData.mode === 'exam' && Array.isArray(jsonData.sections)) {
      onInsertSections(jsonData.sections.map(sec => ({
        id: uid(),
        title: sec.title || 'Partie',
        collapsed: false,
        exercises: (sec.exercises || []).map(ex => ({
          id: uid(),
          title: ex.title || 'Exercice',
          points: String(ex.points || ''),
          collapsed: false,
          questions: (ex.questions || []).map(normalizeAIQuestion),
        })),
      })));
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}><FiCpu size={18} /></div>
            <div>
              <div style={styles.headerTitle}>Assistant IA</div>
              <div style={styles.headerSub}>Groq · llama-3.3-70b</div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><FiX size={18} /></button>
        </div>

        {/* Messages */}
        <div style={styles.messagesArea}>
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onInsert={msg.jsonData ? () => handleInsert(msg.jsonData) : null}
            />
          ))}

          {loading && (
            <div style={styles.typingRow}>
              <div style={styles.typingAvatar}><FiZap size={14} /></div>
              <div style={styles.typingDots}>
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div style={styles.errorRow}>
              <FiAlertCircle size={14} color="#ef4444" />
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Files preview */}
        {files.length > 0 && (
          <div style={styles.filesPreview}>
            {files.map((file, i) => {
              const meta = getFileMeta(file);
              const Icon = meta.icon;
              return (
                <div key={i} style={styles.fileChip}>
                  <Icon size={14} color={meta.color} />
                  <span style={styles.fileChipName}>{file.name}</span>
                  <span style={styles.fileChipLabel}>{meta.label}</span>
                  <button style={styles.fileChipDel} onClick={() => removeFile(i)}><FiTrash2 size={12} /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input area */}
        <div
          style={{ ...styles.inputArea, borderColor: dragOver ? '#3b82f6' : '#e5e7eb' }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <textarea
            ref={inputRef}
            style={styles.textarea}
            placeholder="Décrivez l'examen souhaité, ou posez une question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div style={styles.inputActions}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.docx,.doc,.png,.jpg,.jpeg,.md,.json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              style={styles.iconBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un fichier (PDF, image, texte…)"
            >
              <FiPaperclip size={18} />
            </button>
            <button
              style={{ ...styles.sendBtn, opacity: (!input.trim() && files.length === 0) || loading ? 0.5 : 1 }}
              onClick={handleSend}
              disabled={(!input.trim() && files.length === 0) || loading}
            >
              {loading ? <FiLoader size={18} className="spin" /> : <FiSend size={18} />}
            </button>
          </div>
        </div>

        {dragOver && <div style={styles.dragOverlay}>Déposez vos fichiers ici</div>}
      </div>
    </div>
  );
};

/* ── Message Bubble ── */
const MessageBubble = ({ msg, onInsert }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{ ...styles.msgRow, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <div style={styles.msgAvatar}>
          <FiZap size={14} />
        </div>
      )}
      <div style={{ maxWidth: '78%' }}>
        <div style={{ ...styles.msgBubble, background: isUser ? '#0e2b50' : '#f3f4f6', color: isUser ? '#e8dcc4' : '#111827' }}>
          {msg.files?.length > 0 && (
            <div style={styles.msgFiles}>
              {msg.files.map((f, i) => (
                <span key={i} style={styles.msgFileTag}>📎 {f.name}</span>
              ))}
            </div>
          )}
          <div style={styles.msgText}>{msg.content}</div>
        </div>

        {/* Bouton insérer si JSON détecté */}
        {onInsert && (
          <button style={styles.insertBtn} onClick={onInsert}>
            <FiCheckCircle size={14} />
            Insérer dans l'examen
          </button>
        )}
      </div>
      {isUser && (
        <div style={{ ...styles.msgAvatar, background: '#dbeafe', color: '#1d4ed8' }}>
          <FiUser size={14} />
        </div>
      )}
    </div>
  );
};

/* ── Styles ── */
const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(10,22,40,0.55)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%', maxWidth: 720, height: '85vh', maxHeight: 720,
    background: '#fff', borderRadius: 16,
    boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #e5e7eb',
    background: '#0e2b50', flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(201,168,76,0.2)', color: '#c9a84c',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: '0.92rem', fontWeight: 700, color: '#e8dcc4' },
  headerSub: { fontSize: '0.65rem', color: 'rgba(232,220,196,0.5)', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, border: 'none',
    background: 'rgba(255,255,255,0.08)', color: 'rgba(232,220,196,0.6)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  messagesArea: {
    flex: 1, overflowY: 'auto', padding: '16px 18px',
    display: 'flex', flexDirection: 'column', gap: 14,
    background: '#fafbfd',
  },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  msgAvatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#fef3c7', color: '#d97706',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: '0.7rem', fontWeight: 700,
  },
  msgBubble: {
    padding: '10px 14px', borderRadius: 14,
    fontSize: '0.84rem', lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  msgFiles: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  msgFileTag: { fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.12)', padding: '2px 7px', borderRadius: 4 },
  msgText: {},
  insertBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    marginTop: 6, padding: '5px 10px',
    background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
    borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  typingRow: { display: 'flex', alignItems: 'center', gap: 8 },
  typingAvatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#fef3c7', color: '#d97706',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  typingDots: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '8px 14px', background: '#f3f4f6', borderRadius: 14,
  },
  errorRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', background: '#fee2e2', borderRadius: 8,
    color: '#991b1b', fontSize: '0.78rem',
  },
  errorText: {},
  filesPreview: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
    padding: '8px 18px', borderTop: '1px solid #e5e7eb',
    background: '#fff', flexShrink: 0,
  },
  fileChip: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '4px 8px', background: '#f3f4f6', borderRadius: 6,
    fontSize: '0.7rem', color: '#374151', border: '1px solid #e5e7eb',
  },
  fileChipName: { maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileChipLabel: { fontSize: '0.6rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' },
  fileChipDel: {
    width: 18, height: 18, border: 'none', borderRadius: 4,
    background: 'transparent', color: '#9ca3af', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginLeft: 2,
  },
  inputArea: {
    display: 'flex', alignItems: 'flex-end', gap: 8,
    padding: '10px 14px', borderTop: '2px solid #e5e7eb',
    background: '#fff', flexShrink: 0,
    transition: 'border-color 0.2s',
  },
  textarea: {
    flex: 1, border: 'none', outline: 'none',
    fontSize: '0.85rem', lineHeight: 1.5, resize: 'none',
    maxHeight: 120, minHeight: 20, background: 'transparent',
    color: '#111827', fontFamily: 'inherit',
  },
  inputActions: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 8, border: 'none',
    background: '#f3f4f6', color: '#6b7280', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 8, border: 'none',
    background: '#0e2b50', color: '#e8dcc4', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  dragOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(59,130,246,0.08)', border: '2px dashed #3b82f6',
    borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#1d4ed8', fontSize: '1rem', fontWeight: 600,
    pointerEvents: 'none',
  },
};

export default AIChatModal;
