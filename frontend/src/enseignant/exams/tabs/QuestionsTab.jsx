import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiTrash2, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp,
  FiImage, FiX, FiPlus, FiAlignLeft, FiHelpCircle, FiCheckSquare,
  FiToggleLeft, FiCode, FiMenu, FiAlertTriangle, FiLayers, FiBookOpen,
  FiZap, FiGrid, FiDatabase, FiSearch, FiCornerDownRight,
  FiCheckCircle,
} from 'react-icons/fi';
import { getQuestionBank } from '../../../api/enseignant/Enseignant.api';

/* ── Helpers ── */
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const QUESTION_TYPES = [
  { value: 'enonce',       label: 'Énoncé',               icon: FiAlignLeft,   color: 'gray'   },
  { value: 'ouverte',      label: 'Question ouverte',      icon: FiHelpCircle,  color: 'blue'   },
  { value: 'qcm_unique',   label: 'QCM — choix unique',    icon: FiCheckSquare, color: 'violet' },
  { value: 'qcm_multiple', label: 'QCM — choix multiple',  icon: FiCheckSquare, color: 'indigo' },
  { value: 'vrai_faux',    label: 'Vrai / Faux',           icon: FiToggleLeft,  color: 'green'  },
  { value: 'pratique',     label: 'Exercice pratique',     icon: FiCode,        color: 'gold'   },
];

const normalizeType = (t) => (t === 'qcm' ? 'qcm_multiple' : t);
const TYPE_META = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t]));
const isQcmType = (t) => t === 'qcm_unique' || t === 'qcm_multiple' || t === 'qcm';

const getDefaultOptions = (type) => {
  if (isQcmType(type) || type === 'vrai_faux') {
    const base = type === 'vrai_faux'
      ? [{ id: uid(), text: 'Vrai', correct: false }, { id: uid(), text: 'Faux', correct: false }]
      : [{ id: uid(), text: 'Option A', correct: false }, { id: uid(), text: 'Option B', correct: false }];
    return base;
  }
  return [];
};

const makeQuestion  = (type = 'ouverte') => ({ id: uid(), type: normalizeType(type), text: '', points: '', answerLines: 3, image: null, imageUrl: null, options: getDefaultOptions(type) });
const makeExercise  = (num) => ({ id: uid(), title: `Exercice ${num}`, points: '', questions: [makeQuestion()], collapsed: false });
const makeSection   = (num) => ({ id: uid(), title: `Partie ${num}`, exercises: [makeExercise(1)], collapsed: false });

const sumAllPoints = (secs) =>
  (secs || []).reduce((s, sec) =>
    s + (sec.exercises || []).reduce((es, ex) => {
      const ep = parseFloat(ex.points) || 0;
      const qp = (ex.questions || []).reduce((qs, q) => qs + (parseFloat(q.points) || 0), 0);
      return es + (ep || qp);
    }, 0), 0);

/* ── Outils de la barre latérale ── */
const TOOLBAR_GROUPS = [
  {
    id: 'structure',
    label: 'Structure',
    icon: FiLayers,
    items: [
      { id: 'section',  label: 'Nouvelle partie',   icon: FiLayers,   color: 'navy',   desc: 'Ajoute une partie à l\'examen' },
      { id: 'exercise', label: 'Nouvel exercice',    icon: FiBookOpen, color: 'blue',   desc: 'Ajoute un exercice dans la partie active' },
    ],
  },
  {
    id: 'questions',
    label: 'Questions',
    icon: FiHelpCircle,
    items: [
      { id: 'q_ouverte',      label: 'Question ouverte',   icon: FiHelpCircle,  color: 'blue',   desc: 'Réponse libre' },
      { id: 'q_qcm_unique',   label: 'QCM choix unique',   icon: FiCheckCircle, color: 'violet', desc: 'Une seule bonne réponse' },
      { id: 'q_qcm_multiple', label: 'QCM choix multiple', icon: FiCheckSquare, color: 'indigo', desc: 'Plusieurs bonnes réponses' },
      { id: 'q_vrai_faux',    label: 'Vrai / Faux',        icon: FiToggleLeft,  color: 'green',  desc: 'Vrai ou Faux' },
      { id: 'q_pratique',     label: 'Exercice pratique',  icon: FiCode,        color: 'gold',   desc: 'Code, calcul, manipulation' },
      { id: 'q_enonce',       label: 'Énoncé / Texte',     icon: FiAlignLeft,   color: 'gray',   desc: 'Bloc de texte sans points' },
    ],
  },
  {
    id: 'media',
    label: 'Médias',
    icon: FiImage,
    items: [
      { id: 'image', label: 'Image',  icon: FiImage, color: 'amber', desc: 'Insère une image dans la question active' },
    ],
  },
];

/* Clé de drag depuis la toolbar */
const TOOLBAR_DRAG_KEY = 'toolbar-item';

/* ── Barre d'outils latérale ── */
const Toolbar = ({ onDragStart, onInsertFromBank }) => {
  const [openGroups, setOpenGroups] = useState({ structure: true, questions: true, media: true });
  const [showBank, setShowBank] = useState(false);
  const [bankItems, setBankItems]     = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch]   = useState('');
  const [bankTypeFilter, setBankTypeFilter] = useState('');
  const [bankTab, setBankTab]         = useState('mes'); // 'mes' | 'autres'

  const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));


  /* Charge la banque à l'ouverture */
  const openBank = async () => {
    setShowBank(true);
    if (bankItems.length > 0) return; // déjà chargé
    setBankLoading(true);
    try {
      const data = await getQuestionBank();
      const mes    = Array.isArray(data?.mesQuestions)    ? data.mesQuestions    : [];
      const autres = Array.isArray(data?.autresQuestions) ? data.autresQuestions : [];
      setBankItems({ mes, autres });
    } catch {
      setBankItems({ mes: [], autres: [] });
    } finally {
      setBankLoading(false);
    }
  };

  const currentList = (bankItems[bankTab] || []).filter(q => {
    const s = bankSearch.trim().toLowerCase();
    const type = (bankTypeFilter || '').trim();
    if (type) {
      const qType = q.type || (Array.isArray(q.options) && q.options.length ? 'qcm' : 'ouverte');
      const normalized = (qType === 'qcm' || qType === 'qcm_multiple' || qType === 'qcm_unique') ? 'qcm' : qType;
      if (normalized !== type) return false;
    }
    return !s || (q.text || '').toLowerCase().includes(s) || (q.matiere || '').toLowerCase().includes(s);
  });



  return (
    <aside className="qt-toolbar">
      <div className="qt-toolbar-header">
        <FiGrid size={18} />
        <span>Outils de construction</span>
      </div>

      {/* ── Banque de questions (mise en avant) ── */}
      <button
        type="button"
        className={`qt-bank-btn ${showBank ? 'qt-bank-btn--active' : ''}`}
        onClick={() => showBank ? setShowBank(false) : openBank()}
      >
        <FiDatabase size={18} />
        <div className="qt-bank-btn-content">
          <span className="qt-bank-btn-title">Banque de questions</span>
          <span className="qt-bank-btn-subtitle">Réutiliser mes questions</span>
        </div>
        <span className="qt-tool-group-arrow">{showBank ? '▾' : '▸'}</span>
      </button>

      {/* Panneau Banque (inchangé ou légèrement amélioré) */}
       {showBank && (
        <div className="qt-bank-panel">
          {/* Onglets mes / autres */}
          <div className="qt-bank-tabs">
            <button
              type="button"
              className={`qt-bank-tab ${bankTab === 'mes' ? 'qt-bank-tab--active' : ''}`}
              onClick={() => setBankTab('mes')}
            >
              Mes questions
              {bankItems.mes && <span className="qt-bank-count">{bankItems.mes.length}</span>}
            </button>
            <button
              type="button"
              className={`qt-bank-tab ${bankTab === 'autres' ? 'qt-bank-tab--active' : ''}`}
              onClick={() => setBankTab('autres')}
            >
              Partagées
              {bankItems.autres && <span className="qt-bank-count">{bankItems.autres.length}</span>}
            </button>
          </div>

          {/* Recherche */}
          <div className="qt-bank-search">
            <FiSearch size={12} />
            <input
              type="text"
              placeholder="Rechercher…"
              value={bankSearch}
              onChange={e => setBankSearch(e.target.value)}
              className="qt-bank-search-input"
            />
            {bankSearch && (
              <button type="button" className="qt-bank-search-clear" onClick={() => setBankSearch('')}>
                <FiX size={11} />
              </button>
            )}
            <select className="qt-bank-type-select" value={bankTypeFilter} onChange={(e) => setBankTypeFilter(e.target.value)} style={{ marginLeft: '8px' }}>
              <option value="">Tous les types</option>
              <option value="ouverte">Ouverte</option>
              <option value="qcm">QCM</option>
              <option value="vrai_faux">Vrai / Faux</option>
              <option value="pratique">Pratique</option>
              <option value="enonce">Énoncé</option>
            </select>
          </div>

          {/* Liste */}
          <div className="qt-bank-list">
            {bankLoading ? (
              <div className="qt-bank-loading">Chargement…</div>
            ) : currentList.length === 0 ? (
              <div className="qt-bank-empty">
                {bankSearch ? 'Aucun résultat.' : 'Aucune question disponible.'}
              </div>
            ) : (
              currentList.map((q) => (
                <div key={q.id} className="qt-bank-item">
                  <div className="qt-bank-item-text">
                    {(q.text || '').length > 80 ? q.text.slice(0, 80) + '…' : q.text}
                  </div>
                  {q.matiere && <span className="qt-bank-item-tag">{q.matiere}</span>}
                  <button
                    type="button"
                    className="qt-bank-item-add"
                    title="Insérer dans l'exercice actif"
                    onClick={() => onInsertFromBank(q)}
                  >
                    <FiCornerDownRight size={12} />
                    Insérer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <div className="qt-toolbar-divider" />

      {/* ── Groupes d'outils ── */}
      {TOOLBAR_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = openGroups[group.id];

        return (
          <div key={group.id} className="qt-tool-group">
            <button
              type="button"
              className="qt-tool-group-header"
              data-group={group.id} 
              onClick={() => toggleGroup(group.id)}
            >
              <GroupIcon size={16} />
              <span>{group.label}</span>
              <span className="qt-tool-group-arrow">{isOpen ? '▾' : '▸'}</span>
            </button>

            {isOpen && (
              <div className="qt-tool-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={`qt-tool-item qt-tool-item--${item.color}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(TOOLBAR_DRAG_KEY, item.id);
                        onDragStart(item.id);
                      }}
                      title={item.desc}
                    >
                      <div className="qt-tool-icon-wrapper">
                        <Icon size={18} />
                      </div>
                      <div className="qt-tool-content">
                        <span className="qt-tool-label">{item.label}</span>
                        {item.desc && <span className="qt-tool-desc">{item.desc}</span>}
                      </div>
                      <div className="qt-drag-indicator" title="Glisser pour ajouter">
                        ⠿
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Raccourcis clavier améliorés */}
      <div className="qt-toolbar-shortcuts">
        <div className="qt-shortcut-title">
          <FiZap size={14} /> Raccourcis clavier
        </div>
        <div className="qt-shortcut-grid">
          <div className="qt-shortcut-item"><kbd>P</kbd> <span>Partie</span></div>
          <div className="qt-shortcut-item"><kbd>E</kbd> <span>Exercice</span></div>
          <div className="qt-shortcut-item"><kbd>Q</kbd> <span>Question</span></div>
        </div>
      </div>
    </aside>
  );
};

/* ── Barème Alert Banner ── */
const BaremeAlert = ({ total }) => {
  if (total <= 20) return null;
  return (
    <div className="bareme-alert-banner">
      <FiAlertTriangle size={16} />
      <span>
        Barème total : <strong>{total} pts</strong> — dépasse la limite de <strong>20 pts</strong>.
        Corrigez les points avant de passer à l'export.
      </span>
    </div>
  );
};

/* ── MCQ Options ── */
const McqOptions = ({ options = [], onChange, onAddOption, onRemoveOption, isVF, isUnique }) => (
  <div className="mcq-options">
    <div className="mcq-mode-hint">
      {isVF ? '⇄ Vrai ou Faux' : isUnique ? '⊙ Choix unique — une seule réponse correcte' : '☑ Choix multiple — plusieurs réponses correctes'}
    </div>
    {options.map((opt, i) => {
      const lbl = String.fromCharCode(65 + i);
      return (
        <div key={opt.id} className={`mcq-option-row ${opt.correct ? 'mcq-option-row--correct' : ''}`}>
          <button
            type="button"
            className={`mcq-check-btn ${opt.correct ? 'mcq-check-btn--active' : ''} ${isUnique ? 'mcq-check-btn--radio' : ''}`}
            onClick={() => {
              if (isUnique && !opt.correct) {
                options.forEach((o) => { if (o.id !== opt.id && o.correct) onChange(o.id, 'correct', false); });
              }
              onChange(opt.id, 'correct', !opt.correct);
            }}
            title={isUnique ? 'Sélectionner comme bonne réponse' : 'Cocher comme correcte'}
          >
            {isUnique ? (opt.correct ? '●' : '○') : (opt.correct ? '✓' : lbl)}
          </button>
          {isVF ? (
            <span className="vf-text-static">{opt.text}</span>
          ) : (
            <input type="text" className="mcq-option-input" placeholder={`Option ${lbl}`}
              value={opt.text} onChange={(e) => onChange(opt.id, 'text', e.target.value)} />
          )}
          {!isVF && options.length > 2 && (
            <button type="button" className="btn-action-sm btn-del-q" onClick={() => onRemoveOption(opt.id)}>
              <FiX size={12} />
            </button>
          )}
        </div>
      );
    })}
    {!isVF && (
      <button type="button" className="btn-add-option" onClick={onAddOption}>
        <FiPlus size={13} /> Ajouter une option
      </button>
    )}
  </div>
);

/* ── Image Upload ── */
const ImageUpload = ({ imageUrl, onUpload, onRemove }) => (
  <div className="img-upload-zone">
    {imageUrl ? (
      <div className="img-preview-wrap">
        <img src={imageUrl} alt="Aperçu" className="img-preview" />
        <button type="button" className="img-remove-btn" onClick={onRemove}><FiX size={14} /></button>
      </div>
    ) : (
      <label className="img-upload-label">
        <FiImage size={15} /><span>Ajouter une image</span>
        <input type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => onUpload(file, ev.target?.result);
            reader.readAsDataURL(file);
          }} />
      </label>
    )}
  </div>
);

/* ── Question Item ── */
const QuestionItem = ({ question, qIndex, onUpdate, onUpdateMultiple, onDelete, onUpdatePoints, onDragStart, onDragEnter, onDragEnd }) => {
  const type     = normalizeType(question.type);
  const isEnonce = type === 'enonce';
  const isQcm    = isQcmType(type);
  const isVF     = type === 'vrai_faux';
  const isUnique = type === 'qcm_unique';
  const meta     = TYPE_META[type] || TYPE_META['ouverte'];

  const handleTypeChange = (newType) => {
    const nt = normalizeType(newType);
    onUpdateMultiple(question.id, { type: nt, options: (isQcmType(nt) || nt === 'vrai_faux') ? getDefaultOptions(nt) : [] });
  };

  const handleOptChange   = (optId, field, value) => onUpdate(question.id, 'options', (question.options || []).map((o) => o.id === optId ? { ...o, [field]: value } : o));
  const handleAddOpt      = () => onUpdate(question.id, 'options', [...(question.options || []), { id: uid(), text: `Option ${String.fromCharCode(65 + (question.options || []).length)}`, correct: false }]);
  const handleRemoveOpt   = (optId) => onUpdate(question.id, 'options', question.options.filter((o) => o.id !== optId));

  return (
    <div
      className={`question-item question-item--${meta.color}`}
      draggable
      onDragStart={() => onDragStart(qIndex)}
      onDragEnter={() => onDragEnter(qIndex)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="question-item-header">
        <div className="q-header-left">
          <span className="q-drag-handle" title="Glisser pour réordonner"><FiMenu size={14} /></span>
          {!isEnonce && <span className="q-num-badge">{qIndex + 1}</span>}
          <select className="q-type-select" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="q-header-right">
          {!isEnonce && (
            <div className="q-pts-wrap">
              <input
                type="number"
                className={`q-pts-input${parseFloat(question.points) > 20 ? ' pts-input--over' : ''}`}
                placeholder="0"
                value={question.points}
                onChange={(e) => onUpdatePoints(question.id, e.target.value)}
                min="0" max="20" step="0.5"
              />
              <span className="q-pts-label">pts</span>
            </div>
          )}
          <button type="button" className="btn-action-sm btn-del-q" onClick={() => onDelete(question.id)}>
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      <textarea className="question-edit-textarea"
        placeholder={isEnonce ? "Texte de l'énoncé…" : 'Énoncé de la question…'}
        value={question.text} onChange={(e) => onUpdate(question.id, 'text', e.target.value)} rows={3} />

      {/* Lignes de réponse — uniquement pour questions ouvertes et pratiques */}
      {(type === 'ouverte' || type === 'pratique') && (
        <div className="q-answer-lines-ctrl">
          <label className="q-answer-lines-label">
            <span>Lignes de réponse pour l'étudiant :</span>
            <div className="q-answer-lines-input-wrap">
              <button
                type="button"
                className="q-answer-lines-btn"
                onClick={() => onUpdate(question.id, 'answerLines', Math.max(1, (question.answerLines || 3) - 1))}
              >−</button>
              <span className="q-answer-lines-val">{question.answerLines || 3}</span>
              <button
                type="button"
                className="q-answer-lines-btn"
                onClick={() => onUpdate(question.id, 'answerLines', Math.min(20, (question.answerLines || 3) + 1))}
              >+</button>
            </div>
          </label>
          {/* Aperçu des lignes */}
          <div className="q-answer-lines-preview">
            {Array.from({ length: Math.min(question.answerLines || 3, 5) }).map((_, i) => (
              <div key={i} className="q-answer-line-preview" />
            ))}
            {(question.answerLines || 3) > 5 && (
              <span className="q-answer-lines-more">+{(question.answerLines || 3) - 5} lignes</span>
            )}
          </div>
        </div>
      )}

      {question.imageUrl && (
        <ImageUpload imageUrl={question.imageUrl}
          onUpload={(f, url) => { onUpdate(question.id, 'image', f); onUpdate(question.id, 'imageUrl', url); }}
          onRemove={() => { onUpdate(question.id, 'image', null); onUpdate(question.id, 'imageUrl', null); }} />
      )}

      {!isEnonce && (isQcm || isVF) && (
        <McqOptions options={question.options} isVF={isVF} isUnique={isUnique}
          onChange={handleOptChange} onAddOption={handleAddOpt} onRemoveOption={handleRemoveOpt} />
      )}
    </div>
  );
};

/* ── Exercise Block ── */
const ExerciseBlock = ({ exercise, exoIndex, onUpdateExo, onDeleteExo, onUpdateExercisePoints, onUpdateQuestionPoints }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);
  const dragFrom = useRef(null);
  const dragTo   = useRef(null);

  const updateQ      = (qId, field, value) => onUpdateExo(exercise.id, 'questions', exercise.questions.map((q) => q.id === qId ? { ...q, [field]: value } : q));
  const updateQMulti = (qId, updates) => onUpdateExo(exercise.id, 'questions', exercise.questions.map((q) => q.id === qId ? { ...q, ...updates } : q));
  const deleteQ      = (qId) => onUpdateExo(exercise.id, 'questions', exercise.questions.filter((q) => q.id !== qId));
  const addQ         = (type) => onUpdateExo(exercise.id, 'questions', [...exercise.questions, makeQuestion(type)]);

  const handleDragStart = (i) => { dragFrom.current = i; };
  const handleDragEnter = (i) => { dragTo.current = i; };
  const handleDragEnd   = () => {
    const from = dragFrom.current, to = dragTo.current;
    if (from !== null && to !== null && from !== to) {
      const next = [...exercise.questions];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onUpdateExo(exercise.id, 'questions', next);
    }
    dragFrom.current = null; dragTo.current = null;
  };

  /* Drop depuis la toolbar */
  const handleToolDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(false);
    const toolId = e.dataTransfer.getData(TOOLBAR_DRAG_KEY);
    if (!toolId) return;
    if (toolId.startsWith('q_')) {
      const qType = toolId.replace('q_', '');
      addQ(qType);
      if (collapsed) setCollapsed(false);
    }
    // image : ouvre le file picker sur la dernière question
    if (toolId === 'image') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (ev) => {
        const file = ev.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          const lastQ = exercise.questions[exercise.questions.length - 1];
          if (lastQ) {
            updateQ(lastQ.id, 'image', file);
            updateQ(lastQ.id, 'imageUrl', re.target?.result);
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  const totalQpts = exercise.questions.reduce((s, q) => s + (parseFloat(q.points) || 0), 0);

  return (
    <div className="exercise-container">
      <div className="exercise-header">
        <div className="exercise-header-left">
          <span className="exercise-num">{exoIndex + 1}</span>
          <input type="text" className="exercise-title-input" value={exercise.title}
            onChange={(e) => onUpdateExo(exercise.id, 'title', e.target.value)}
            placeholder={`Exercice ${exoIndex + 1}`} />
        </div>
        <div className="exercise-header-right">
          <div className="exercise-pts-group">
            <input
              type="number"
              className={`exercise-pts-input${parseFloat(exercise.points) > 20 ? ' pts-input--over' : ''}`}
              placeholder="Pts"
              value={exercise.points}
              onChange={(e) => onUpdateExercisePoints(exercise.id, e.target.value)}
              min="0" max="20" step="0.5"
            />
            <span className="exercise-pts-label">pts</span>
          </div>
          {totalQpts > 0 && <span className="exercise-auto-pts" title="Total automatique des questions">∑ {totalQpts}</span>}
          <button type="button" className="btn-action-sm btn-collapse-exo" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
          </button>
          <button type="button" className="btn-action-sm btn-del-q" onClick={() => onDeleteExo(exercise.id)}>
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          className={`exercise-body ${dropTarget ? 'exercise-body--drop-target' : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes(TOOLBAR_DRAG_KEY)) setDropTarget(true); }}
          onDragLeave={() => setDropTarget(false)}
          onDrop={handleToolDrop}
        >
          {exercise.questions.map((q, qi) => (
            <QuestionItem key={q.id} question={q} qIndex={qi}
              onUpdate={updateQ} onUpdateMultiple={updateQMulti}
              onUpdatePoints={(qId, val) => onUpdateQuestionPoints(exercise.id, qId, val)}
              onDelete={deleteQ}
              onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Section Block ── */
const SectionBlock = ({ section, sectionIndex, onUpdateSection, onDeleteSection, onUpdateExercisePoints, onUpdateQuestionPoints }) => {
  const updateExo   = (exoId, field, value) => onUpdateSection(section.id, 'exercises', section.exercises.map((e) => e.id === exoId ? { ...e, [field]: value } : e));
  const deleteExo   = (exoId) => onUpdateSection(section.id, 'exercises', section.exercises.filter((e) => e.id !== exoId));
  const addExercise = () => onUpdateSection(section.id, 'exercises', [...section.exercises, makeExercise(section.exercises.length + 1)]);

  const totalPts = section.exercises.reduce((s, ex) => {
    const ep = parseFloat(ex.points) || 0;
    const qp = ex.questions.reduce((qs, q) => qs + (parseFloat(q.points) || 0), 0);
    return s + (ep || qp);
  }, 0);
  const totalQ = section.exercises.reduce((s, ex) => s + ex.questions.length, 0);

  return (
    <div className="section-container">
      <div className="section-header" onClick={() => onUpdateSection(section.id, 'collapsed', !section.collapsed)}>
        <div className="section-header-left">
          <span className="section-pill">Partie {sectionIndex + 1}</span>
          <input type="text" className="section-title-input" value={section.title}
            placeholder={`Partie ${sectionIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdateSection(section.id, 'title', e.target.value)} />
        </div>
        <div className="section-header-right">
          <span className="section-points-badge">{totalPts > 0 ? `${totalPts} pts · ` : ''}{totalQ} q.</span>
          <button type="button" className="btn-collapse">
            {section.collapsed ? <FiChevronDown size={15} /> : <FiChevronUp size={15} />}
          </button>
          <button type="button" className="btn-section-del"
            onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}>
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      {!section.collapsed && (
        <div className="section-body">
          {section.exercises.map((ex, ei) => (
            <ExerciseBlock key={ex.id} exercise={ex} exoIndex={ei}
              onUpdateExo={updateExo} onDeleteExo={deleteExo}
              onUpdateExercisePoints={onUpdateExercisePoints}
              onUpdateQuestionPoints={onUpdateQuestionPoints} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main ── */
const QuestionsTab = ({ sections, setSections, selectedTemplate, allTemplates, onTabChange, onSetSuccessMessage, onSetError }) => {
  const dragSecFrom    = useRef(null);
  const dragSecTo      = useRef(null);
  const [draggingTool, setDraggingTool] = useState(null);

  const updateSection = useCallback((secId, field, value) =>
    setSections((prev) => prev.map((s) => s.id === secId ? { ...s, [field]: value } : s)), [setSections]);

  const deleteSection = useCallback((secId) =>
    setSections((prev) => prev.filter((s) => s.id !== secId)), [setSections]);

  const updateQuestionPoints = useCallback((exoId, qId, value) => {
    const nextVal = String(value ?? '');
    setSections((prev) => prev.map((s) => ({
      ...s,
      exercises: s.exercises.map((ex) => {
        if (ex.id !== exoId) return ex;
        const updQ = ex.questions.map((q) => q.id === qId ? { ...q, points: nextVal } : q);
        const sum  = updQ.reduce((a, q) => a + (parseFloat(q.points) || 0), 0);
        return { ...ex, questions: updQ, points: String(sum) };
      }),
    })));
  }, [setSections]);

  const updateExercisePoints = useCallback((exoId, value) => {
    const nextVal = String(value ?? '');
    setSections((prev) => prev.map((s) => ({
      ...s,
      exercises: s.exercises.map((ex) => ex.id === exoId ? { ...ex, points: nextVal } : ex),
    })));
  }, [setSections]);

  /* Insère une question depuis la banque dans le dernier exercice */
  const insertFromBank = useCallback((bankQ) => {
    const newQ = makeQuestion('ouverte');
    newQ.text = bankQ.text || '';
    const sourceType = bankQ.type || (Array.isArray(bankQ.options) && bankQ.options.length ? 'qcm' : 'ouverte');
    const mappedType = normalizeType(sourceType);
    newQ.type = mappedType;
    if (Array.isArray(bankQ.options) && bankQ.options.length > 0) {
      newQ.options = bankQ.options.map(o => ({ id: uid(), text: typeof o === 'string' ? o : (o.text || ''), correct: !!o.correct }));
    } else if (mappedType === 'vrai_faux') {
      newQ.options = getDefaultOptions('vrai_faux');
    } else {
      newQ.options = getDefaultOptions(mappedType);
    }
    setSections((prev) => {
      if (prev.length === 0) {
        const sec = makeSection(1);
        sec.exercises[0].questions = [newQ];
        return [sec];
      }
      const last = prev[prev.length - 1];
      const lastExo = last.exercises[last.exercises.length - 1];
      return prev.map((s) =>
        s.id !== last.id ? s : {
          ...s,
          exercises: s.exercises.map((ex) =>
            ex.id !== lastExo.id ? ex : {
              ...ex,
              questions: [...ex.questions, newQ],
            }
          ),
        }
      );
    });
  }, [setSections]);

  const addSection = useCallback(() =>
    setSections((prev) => [...prev, makeSection(prev.length + 1)]), [setSections]);

  /* Ajoute un exercice dans la dernière section */
  const addExerciseToLast = useCallback(() => {
    setSections((prev) => {
      if (prev.length === 0) return [...prev, makeSection(1)];
      const last = prev[prev.length - 1];
      return prev.map((s) =>
        s.id === last.id
          ? { ...s, exercises: [...s.exercises, makeExercise(s.exercises.length + 1)] }
          : s
      );
    });
  }, [setSections]);

  /* Ajoute une question dans le dernier exercice de la dernière section */
  const addQuestionToLast = useCallback((type = 'ouverte') => {
    setSections((prev) => {
      if (prev.length === 0) {
        const sec = makeSection(1);
        sec.exercises[0].questions.push(makeQuestion(type));
        return [sec];
      }
      const last = prev[prev.length - 1];
      const lastExo = last.exercises[last.exercises.length - 1];
      return prev.map((s) =>
        s.id !== last.id ? s : {
          ...s,
          exercises: s.exercises.map((ex) =>
            ex.id !== lastExo.id ? ex : {
              ...ex,
              questions: [...ex.questions, makeQuestion(type)],
            }
          ),
        }
      );
    });
  }, [setSections]);

  /* Raccourcis clavier */
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); addSection(); }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); addExerciseToLast(); }
    if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); addQuestionToLast('ouverte'); }
  }, [addSection, addExerciseToLast, addQuestionToLast]);

  /* Drop depuis toolbar sur la zone principale (nouvelle section/exercice) */
  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    const toolId = e.dataTransfer.getData(TOOLBAR_DRAG_KEY);
    if (!toolId) return;
    if (toolId === 'section')  { addSection(); return; }
    if (toolId === 'exercise') { addExerciseToLast(); return; }
    if (toolId.startsWith('q_')) { addQuestionToLast(toolId.replace('q_', '')); }
  }, [addSection, addExerciseToLast, addQuestionToLast]);

  /* ── Drag & drop entre sections ── */
  const handleSecDragStart = (i) => { dragSecFrom.current = i; };
  const handleSecDragEnter = (i) => { dragSecTo.current = i; };
  const handleSecDragEnd   = () => {
    const from = dragSecFrom.current, to = dragSecTo.current;
    if (from !== null && to !== null && from !== to) {
      const next = [...sections];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setSections(next);
    }
    dragSecFrom.current = null;
    dragSecTo.current   = null;
  };

  const stats = useMemo(() => {
    let totalQ = 0, totalEx = 0, totalPts = 0;
    sections.forEach((s) => {
      totalEx += s.exercises.length;
      s.exercises.forEach((ex) => {
        const ep = parseFloat(ex.points) || 0;
        const qp = ex.questions.reduce((sum, q) => { totalQ++; return sum + (parseFloat(q.points) || 0); }, 0);
        totalPts += ep || qp;
      });
    });
    return { totalQ, totalEx, totalPts };
  }, [sections]);

  const ptsOver = stats.totalPts > 20;
  const ptsPct  = Math.min((stats.totalPts / 20) * 100, 100);

  return (
    <section
      className="exam-card questions-section"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      style={{ outline: 'none' }}
    >
      <BaremeAlert total={stats.totalPts} />

      {/* Layout 2 colonnes : toolbar + canvas */}
      <div className="qt-layout">

        {/* ── Barre d'outils ── */}
        <Toolbar onDragStart={setDraggingTool} onInsertFromBank={insertFromBank} />

        {/* ── Canvas principal ── */}
        <div
          className={`qt-canvas ${draggingTool ? 'qt-canvas--dragging' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
        >

          {/* Barème */}
          {stats.totalQ > 0 && (
            <div className={`bareme-summary ${ptsOver ? 'bareme-summary--over' : ''}`}>
              <div className="bareme-main-stat">
                <div className="bareme-total" style={ptsOver ? { color: '#ff6b82' } : {}}>
                  {stats.totalPts > 0 ? stats.totalPts : '—'}<span className="bareme-total-denom">/20</span>
                </div>
                <div className="bareme-label">Barème total</div>
                <div className="bareme-progress-bar">
                  <div className="bareme-progress-fill" style={{ width: `${ptsPct}%`, background: ptsOver ? '#ff6b82' : 'var(--ce-accent)' }} />
                </div>
              </div>
              <div className="bareme-breakdown">
                {[{ label: 'Partie(s)', value: sections.length }, { label: 'Exercice(s)', value: stats.totalEx }, { label: 'Question(s)', value: stats.totalQ }].map(({ label, value }) => (
                  <div key={label} className="bareme-item"><strong>{value}</strong><span>{label}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          {sections.length === 0 ? (
            <div className="qt-drop-zone">
              <div className="qt-drop-zone-icon">
                <FiZap size={28} />
              </div>
              <p className="qt-drop-zone-title">Commencez à construire votre examen</p>
              <p className="qt-drop-zone-hint">Glissez un outil depuis la barre de gauche, ou utilisez les boutons ci-dessous</p>
              <div className="qt-drop-zone-actions">
                <button type="button" className="qt-quick-btn qt-quick-btn--section" onClick={addSection}>
                  <FiLayers size={14} /> Nouvelle partie
                </button>
                <button type="button" className="qt-quick-btn qt-quick-btn--question" onClick={() => addQuestionToLast('ouverte')}>
                  <FiHelpCircle size={14} /> Question directe
                </button>
              </div>
            </div>
          ) : (
            sections.map((s, si) => (
              <div
                key={s.id}
                draggable
                onDragStart={() => handleSecDragStart(si)}
                onDragEnter={() => handleSecDragEnter(si)}
                onDragEnd={handleSecDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="section-drag-wrapper"
              >
                <SectionBlock section={s} sectionIndex={si}
                  onUpdateSection={updateSection} onDeleteSection={deleteSection}
                  onUpdateExercisePoints={updateExercisePoints}
                  onUpdateQuestionPoints={updateQuestionPoints} />
              </div>
            ))
          )}

          {/* Actions navigation */}
          <div className="exam-actions">
            <button type="button" className="exam-btn-secondary" onClick={() => onTabChange('Modèles')}>
              <FiChevronLeft /> Modèles
            </button>
            <button
              type="button"
              className={`exam-btn-primary ${ptsOver ? 'exam-btn-primary--disabled' : ''}`}
              onClick={() => {
                if (ptsOver) { onSetError?.('Le barème total dépasse 20 pts. Corrigez avant de continuer.'); return; }
                onTabChange('Export');
              }}
            >
              Continuer vers Export <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export { makeSection };
export default QuestionsTab;