import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FiTrash2, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp,
  FiX, FiPlus, FiAlignLeft, FiHelpCircle, FiCheckSquare,
  FiToggleLeft, FiCode, FiMenu, FiLayers, FiBookOpen,
  FiZap, FiGrid, FiDatabase, FiImage, FiType,
  FiAlertTriangle, FiCheckCircle, FiArrowRight,
} from 'react-icons/fi';
import QuestionBankModal from './QuestionBankModal';
import AIChatModal from './AIChatModal';

/* ══════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════ */
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const QUESTION_TYPES = [
  { value: 'enonce', label: 'Énoncé', icon: FiAlignLeft, color: 'gray', desc: 'Texte sans points' },
  { value: 'ouverte', label: 'Question ouverte', icon: FiHelpCircle, color: 'blue', desc: 'Réponse libre' },
  { value: 'qcm_unique', label: 'QCM unique', icon: FiCheckSquare, color: 'violet', desc: '1 bonne réponse' },
  { value: 'qcm_multiple', label: 'QCM multiple', icon: FiCheckSquare, color: 'indigo', desc: 'Plusieurs bonnes réponses' },
  { value: 'vrai_faux', label: 'Vrai / Faux', icon: FiToggleLeft, color: 'green', desc: 'Vrai ou Faux' },
  { value: 'pratique', label: 'Exercice pratique', icon: FiCode, color: 'gold', desc: 'Code, calcul…' },
];

const TOOLBAR_GROUPS = [
  {
    id: 'structure',
    label: 'Structure',
    icon: FiLayers,
    items: [
      { id: 'section', label: 'Nouvelle partie', icon: FiLayers, color: 'navy', desc: 'Ajouter une partie' },
      { id: 'exercise', label: 'Nouvel exercice', icon: FiBookOpen, color: 'blue', desc: 'Ajouter un exercice' },
    ],
  },
  {
    id: 'questions',
    label: 'Types de questions',
    icon: FiHelpCircle,
    items: QUESTION_TYPES.map(t => ({
      id: `q_${t.value}`,
      label: t.label,
      icon: t.icon,
      color: t.color,
      desc: t.desc,
    })),
  },
  {
    id: 'media',
    label: 'Médias',
    icon: FiImage,
    items: [
      { id: 'image', label: 'Ajouter une image', icon: FiImage, color: 'amber', desc: 'Image dans la dernière question' },
    ],
  },
];

const TOOLBAR_DRAG_KEY = 'toolbar-item';

const normalizeType = (t) => (t === 'qcm' ? 'qcm_multiple' : t);
const isQcmType = (t) => t === 'qcm_unique' || t === 'qcm_multiple' || t === 'qcm';

const getDefaultOptions = (type) => {
  if (isQcmType(type) || type === 'vrai_faux') {
    return type === 'vrai_faux'
      ? [{ id: uid(), text: 'Vrai', correct: false }, { id: uid(), text: 'Faux', correct: false }]
      : [{ id: uid(), text: 'Option A', correct: false }, { id: uid(), text: 'Option B', correct: false }];
  }
  return [];
};

const parseQuestionSubparts = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const mainLine = lines[0];
  const subparts = [];

  for (const line of lines.slice(1)) {
    const match = line.match(/^([a-h])\s*[).:-]\s*(.+)$/i);
    if (!match) return null;
    subparts.push({ label: match[1].toLowerCase(), text: match[2].trim() });
  }

  return subparts.length > 0 ? { mainLine, subparts } : null;
};

const makeQuestion = (type = 'ouverte') => ({
  id: uid(), type: normalizeType(type), text: '', points: '',
  answerLines: type === 'ouverte' ? 3 : undefined,
  image: null, imageUrl: null, options: getDefaultOptions(type),
});
const makeExercise = (num) => ({ id: uid(), title: `Exercice ${num}`, points: '', questions: [makeQuestion()], collapsed: false });
const makeSection = (num) => ({ id: uid(), title: `Partie ${num}`, exercises: [makeExercise(1)], collapsed: false });

/* ══════════════════════════════════════════
   SIDEBAR OUTILS
   ══════════════════════════════════════════ */
const SidebarTools = ({ onDragStart, onQuickAdd }) => {
  const [openGroups, setOpenGroups] = useState({ structure: true, questions: true, media: true });
  const toggleGroup = (id) => setOpenGroups(p => ({ ...p, [id]: !p[id] }));

  return (
    <aside className="qt-sidebar">
      <div className="qt-sidebar-head">
        <FiGrid size={16} />
        <span>Outils</span>
      </div>

      {TOOLBAR_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = openGroups[group.id];
        return (
          <div key={group.id} className="qt-sidebar-group">
            <button
              type="button"
              className="qt-sidebar-group-toggle"
              onClick={() => toggleGroup(group.id)}
            >
              <GroupIcon size={15} />
              <span>{group.label}</span>
              <span className="qt-sidebar-arrow">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="qt-sidebar-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={`qt-sidebar-item qt-sidebar-item--${item.color}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(TOOLBAR_DRAG_KEY, item.id);
                        onDragStart(item.id);
                      }}
                      onClick={() => onQuickAdd(item.id)}
                      title={item.desc}
                    >
                      <div className="qt-sidebar-item-icon"><Icon size={16} /></div>
                      <div className="qt-sidebar-item-text">
                        <span className="qt-sidebar-item-label">{item.label}</span>
                        <span className="qt-sidebar-item-desc">{item.desc}</span>
                      </div>
                      <span className="qt-sidebar-item-hint">⠿</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="qt-sidebar-shortcuts">
        <div className="qt-sidebar-shortcuts-title"><FiZap size={12} /> Raccourcis</div>
        <div className="qt-sidebar-shortcuts-grid">
          <div className="qt-kbd-item"><kbd>P</kbd><span>Partie</span></div>
          <div className="qt-kbd-item"><kbd>E</kbd><span>Exercice</span></div>
          <div className="qt-kbd-item"><kbd>Q</kbd><span>Question</span></div>
        </div>
      </div>
    </aside>
  );
};

/* ══════════════════════════════════════════
   BARRE HORIZONTALE — Barème uniquement
   ══════════════════════════════════════════ */
const ScoreBar = ({ totalPts, totalEx, totalQ, ptsOver, ptsPct, sectionsCount, children }) => (
  <div className={`qt-scorebar${ptsOver ? ' qt-scorebar--over' : ''}`}>
    <div className="qt-scorebar-left">
      <div className="qt-scorebar-main">
        <span className={`qt-scorebar-pts${ptsOver ? ' qt-scorebar-pts--over' : ''}`}>
          {totalPts > 0 ? totalPts : '—'}
        </span>
        <span className="qt-scorebar-denom">/ 20 pts</span>
      </div>
      <div className="qt-scorebar-progress">
        <div className="qt-scorebar-fill" style={{ width: `${ptsPct}%` }} />
      </div>
    </div>

    <div className="qt-scorebar-chips">
      <div className="qt-scorebar-chip"><strong>{sectionsCount}</strong><span>Parties</span></div>
      <div className="qt-scorebar-chip"><strong>{totalEx}</strong><span>Exercices</span></div>
      <div className="qt-scorebar-chip"><strong>{totalQ}</strong><span>Questions</span></div>
    </div>

    {children && <div className="qt-scorebar-actions">{children}</div>}

    {ptsOver && (
      <div className="qt-scorebar-alert">
        <FiAlertTriangle size={14} />
        <span>Barème dépasse 20 pts</span>
      </div>
    )}
  </div>
);

/* ══════════════════════════════════════════
   QUESTION ITEM
   ══════════════════════════════════════════ */
const QuestionItem = ({ question, qIndex, displayNumber, onUpdate, onUpdateMultiple, onDelete, onUpdatePoints, onDragStart, onDragEnter, onDragEnd }) => {
  const type = normalizeType(question.type);
  const isEnonce = type === 'enonce';
  const isQcm = isQcmType(type);
  const isVF = type === 'vrai_faux';
  const isUnique = type === 'qcm_unique';

  const TYPE_COLORS = {
    enonce: '#9ca3af', ouverte: '#3b82f6', qcm_unique: '#8b5cf6',
    qcm_multiple: '#6366f1', vrai_faux: '#10b981', pratique: '#f59e0b',
  };
  const accentColor = TYPE_COLORS[type] || '#3b82f6';

  const handleTypeChange = (newType) => {
    const nt = normalizeType(newType);
    onUpdateMultiple(question.id, {
      type: nt,
      options: (isQcmType(nt) || nt === 'vrai_faux') ? getDefaultOptions(nt) : [] ,
      answerLines: nt === 'ouverte' ? (question.answerLines || 3) : undefined,
    });
  };

  const handleOptChange = (optId, field, value) =>
    onUpdate(question.id, 'options', (question.options || []).map((o) => o.id === optId ? { ...o, [field]: value } : o));
  const handleAddOpt = () =>
    onUpdate(question.id, 'options', [...(question.options || []), { id: uid(), text: `Option ${String.fromCharCode(65 + (question.options || []).length)}`, correct: false }]);
  const handleRemoveOpt = (optId) =>
    onUpdate(question.id, 'options', question.options.filter((o) => o.id !== optId));

  return (
    <div className="qitem" style={{ '--accent': accentColor }} draggable
      onDragStart={() => onDragStart(qIndex)} onDragEnter={() => onDragEnter(qIndex)}
      onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()}>
      <div className="qitem-accent" />
      <div className="qitem-inner">
        <div className="qitem-row">
          <span className="qitem-drag"><FiMenu size={13} /></span>
          {!isEnonce && <span className="qitem-num">{displayNumber || (qIndex + 1)}</span>}
          <select className="qitem-type-select" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="qitem-spacer" />
          {!isEnonce && (
            <div className="qitem-pts">
              <input type="number" className={`qitem-pts-input${parseFloat(question.points) > 20 ? ' pts-over' : ''}`}
                placeholder="0" value={question.points}
                onChange={(e) => onUpdatePoints(question.id, e.target.value)} min="0" max="20" step="0.5" />
              <span className="qitem-pts-label">pts</span>
            </div>
          )}
          <button type="button" className="qitem-del" onClick={() => onDelete(question.id)}><FiTrash2 size={13} /></button>
        </div>

        <textarea className="qitem-textarea" rows={3}
          placeholder={isEnonce ? "Texte de l'énoncé…" : 'Énoncé de la question…'}
          value={question.text} onChange={(e) => onUpdate(question.id, 'text', e.target.value)} />

        {parseQuestionSubparts(question.text) && (
          <div className="qitem-subparts-preview">
            <div className="qitem-subparts-title">Aperçu des sous-points</div>
            <div className="qitem-subparts-list">
              {parseQuestionSubparts(question.text).subparts.map((part) => (
                <div key={`${part.label}-${part.text}`} className="qitem-subpart-row">
                  <span className="qitem-subpart-label">{part.label})</span>
                  <span className="qitem-subpart-text">{part.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'ouverte' && (
          <div className="qitem-lines-ctrl">
            <span className="qitem-lines-label">Lignes de réponse :</span>
            <input
              type="number"
              className="qitem-lines-input"
              min="1"
              max="100"
              step="1"
              value={question.answerLines || 3}
              onChange={(e) => {
                const nextValue = Math.max(1, Math.min(100, parseInt(e.target.value || '3', 10) || 3));
                onUpdate(question.id, 'answerLines', nextValue);
              }}
            />
          </div>
        )}

        {question.imageUrl && (
          <div className="qitem-img-wrap">
            <img src={question.imageUrl} alt="Aperçu" className="qitem-img" />
            <button type="button" className="qitem-img-del"
              onClick={() => { onUpdate(question.id, 'image', null); onUpdate(question.id, 'imageUrl', null); }}><FiX size={12} /></button>
          </div>
        )}

        {!isEnonce && (isQcm || isVF) && (
          <div className="qitem-mcq">
            <p className="qitem-mcq-hint">{isVF ? 'Vrai ou Faux' : isUnique ? 'Choix unique' : 'Choix multiple'}</p>
            {(question.options || []).map((opt, i) => {
              const lbl = String.fromCharCode(65 + i);
              return (
                <div key={opt.id} className={`qitem-opt${opt.correct ? ' qitem-opt--correct' : ''}`}>
                  <button type="button" className={`qitem-opt-check${opt.correct ? ' qitem-opt-check--on' : ''}`}
                    onClick={() => {
                      if (isUnique && !opt.correct) {
                        (question.options || []).forEach((o) => { if (o.id !== opt.id && o.correct) handleOptChange(o.id, 'correct', false); });
                      }
                      handleOptChange(opt.id, 'correct', !opt.correct);
                    }}>
                    {isUnique ? (opt.correct ? '●' : '○') : (opt.correct ? '✓' : lbl)}
                  </button>
                  {isVF ? <span className="qitem-opt-vf">{opt.text}</span>
                    : <input type="text" className="qitem-opt-input" placeholder={`Option ${lbl}`}
                        value={opt.text} onChange={(e) => handleOptChange(opt.id, 'text', e.target.value)} />}
                  {!isVF && (question.options || []).length > 2 && (
                    <button type="button" className="qitem-opt-del" onClick={() => handleRemoveOpt(opt.id)}><FiX size={11} /></button>
                  )}
                </div>
              );
            })}
            {!isVF && (
              <button type="button" className="qitem-add-opt" onClick={handleAddOpt}><FiPlus size={12} /> Ajouter une option</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   EXERCISE BLOCK
   ══════════════════════════════════════════ */
const ExerciseBlock = ({ exercise, exoIndex, onUpdateExo, onDeleteExo, onUpdateExercisePoints, onUpdateQuestionPoints, getQuestionNumber }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);
  const dragFrom = useRef(null);
  const dragTo = useRef(null);

  const updateQ = (qId, field, value) => onUpdateExo(exercise.id, 'questions', exercise.questions.map((q) => q.id === qId ? { ...q, [field]: value } : q));
  const updateQMulti = (qId, updates) => onUpdateExo(exercise.id, 'questions', exercise.questions.map((q) => q.id === qId ? { ...q, ...updates } : q));
  const deleteQ = (qId) => onUpdateExo(exercise.id, 'questions', exercise.questions.filter((q) => q.id !== qId));
  const addQ = (type) => onUpdateExo(exercise.id, 'questions', [...exercise.questions, makeQuestion(type)]);

  const handleDragStart = (i) => { dragFrom.current = i; };
  const handleDragEnter = (i) => { dragTo.current = i; };
  const handleDragEnd = () => {
    const from = dragFrom.current, to = dragTo.current;
    if (from !== null && to !== null && from !== to) {
      const next = [...exercise.questions];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onUpdateExo(exercise.id, 'questions', next);
    }
    dragFrom.current = null; dragTo.current = null;
  };

  const handleToolDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDropTarget(false);
    const toolId = e.dataTransfer.getData(TOOLBAR_DRAG_KEY);
    if (!toolId) return;
    if (toolId.startsWith('q_')) { addQ(toolId.replace('q_', '')); if (collapsed) setCollapsed(false); }
    if (toolId === 'image') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (ev) => {
        const file = ev.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          const lastQ = exercise.questions[exercise.questions.length - 1];
          if (lastQ) { updateQ(lastQ.id, 'image', file); updateQ(lastQ.id, 'imageUrl', re.target?.result); }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  const totalQpts = exercise.questions.reduce((s, q) => s + (parseFloat(q.points) || 0), 0);

  return (
    <div className="exo-block">
      <div className="exo-header">
        <span className="exo-num">{exoIndex + 1}</span>
        <input type="text" className="exo-title" value={exercise.title}
          onChange={(e) => onUpdateExo(exercise.id, 'title', e.target.value)} placeholder={`Exercice ${exoIndex + 1}`} />
        <div className="exo-header-right">
          <div className="exo-pts-wrap">
            <input type="number" className={`exo-pts-input${parseFloat(exercise.points) > 20 ? ' pts-over' : ''}`}
              placeholder="—" value={exercise.points}
              onChange={(e) => onUpdateExercisePoints(exercise.id, e.target.value)} min="0" max="20" step="0.5" />
            <span className="exo-pts-label">pts</span>
          </div>
          {totalQpts > 0 && <span className="exo-sum" title="Somme des questions">∑ {totalQpts}</span>}
          <button type="button" className="exo-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FiChevronDown size={13} /> : <FiChevronUp size={13} />}
          </button>
          <button type="button" className="exo-btn exo-btn--del" onClick={() => onDeleteExo(exercise.id)}><FiTrash2 size={13} /></button>
        </div>
      </div>

      {!collapsed && (
        <div className={`exo-body${dropTarget ? ' exo-body--drop' : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes(TOOLBAR_DRAG_KEY)) setDropTarget(true); }}
          onDragLeave={() => setDropTarget(false)} onDrop={handleToolDrop}>
          {exercise.questions.map((q, qi) => (
            <QuestionItem
              key={q.id}
              question={q}
              qIndex={qi}
              displayNumber={q.type === 'enonce' ? null : getQuestionNumber()}
              onUpdate={updateQ}
              onUpdateMultiple={updateQMulti}
              onUpdatePoints={(qId, val) => onUpdateQuestionPoints(exercise.id, qId, val)}
              onDelete={deleteQ}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
            />
          ))}
          {exercise.questions.length === 0 && (
            <div className="exo-empty">Glissez une question ici ou utilisez les outils latéraux</div>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   SECTION BLOCK
   ══════════════════════════════════════════ */
const SectionBlock = ({ section, sectionIndex, onUpdateSection, onDeleteSection, onUpdateExercisePoints, onUpdateQuestionPoints }) => {
  const updateExo = (exoId, field, value) => onUpdateSection(section.id, 'exercises', section.exercises.map((e) => e.id === exoId ? { ...e, [field]: value } : e));
  const deleteExo = (exoId) => onUpdateSection(section.id, 'exercises', section.exercises.filter((e) => e.id !== exoId));

  const totalPts = section.exercises.reduce((s, ex) => {
    const ep = parseFloat(ex.points) || 0;
    const qp = ex.questions.reduce((qs, q) => qs + (parseFloat(q.points) || 0), 0);
    return s + (ep || qp);
  }, 0);
  const totalQ = section.exercises.reduce((s, ex) => s + ex.questions.length, 0);

  return (
    <div className="sec-block">
      <div className="sec-header" onClick={() => onUpdateSection(section.id, 'collapsed', !section.collapsed)}>
        <span className="sec-badge">Partie {sectionIndex + 1}</span>
        <input type="text" className="sec-title" value={section.title}
          placeholder={`Partie ${sectionIndex + 1}`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateSection(section.id, 'title', e.target.value)} />
        <div className="sec-header-right">
          {(totalPts > 0 || totalQ > 0) && (
            <span className="sec-meta">{totalPts > 0 && `${totalPts} pts · `}{totalQ} q.</span>
          )}
          <button type="button" className="sec-btn">{section.collapsed ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}</button>
          <button type="button" className="sec-btn sec-btn--del" onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}><FiTrash2 size={13} /></button>
        </div>
      </div>

      {!section.collapsed && (
        <div className="sec-body">
          {section.exercises.map((ex, ei) => {
            let visibleQuestionIndex = 0;
            return (
              <ExerciseBlock
                key={ex.id}
                exercise={ex}
                exoIndex={ei}
                onUpdateExo={updateExo}
                onDeleteExo={deleteExo}
                onUpdateExercisePoints={onUpdateExercisePoints}
                onUpdateQuestionPoints={onUpdateQuestionPoints}
                getQuestionNumber={() => ++visibleQuestionIndex}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════ */
const EmptyState = ({ onAddSection, onAddQuestion }) => (
  <div className="qt-empty-state">
    <div className="qt-empty-icon"><FiType size={32} /></div>
    <h3 className="qt-empty-title">Commencez votre examen</h3>
    <p className="qt-empty-hint">Utilisez les outils latéraux ou les boutons ci-dessous pour construire votre examen</p>
    <div className="qt-empty-actions">
      <button type="button" className="qt-empty-btn qt-empty-btn--primary" onClick={onAddSection}>
        <FiLayers size={14} /> Nouvelle partie
      </button>
      <button type="button" className="qt-empty-btn qt-empty-btn--secondary" onClick={() => onAddQuestion('ouverte')}>
        <FiHelpCircle size={14} /> Question directe
      </button>
    </div>
  </div>
);

/* ══════════════════════════════════════════
   MAIN — QuestionsTab
   ══════════════════════════════════════════ */
const QuestionsTab = ({ sections, setSections, selectedTemplate, allTemplates, onTabChange, onSetSuccessMessage, onSetError }) => {
  const dragSecFrom = useRef(null);
  const dragSecTo = useRef(null);
  const [draggingTool, setDraggingTool] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isShowingBankModal, setIsShowingBankModal] = useState(false);

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
        const sum = updQ.reduce((a, q) => a + (parseFloat(q.points) || 0), 0);
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
      if (prev.length === 0) { const sec = makeSection(1); sec.exercises[0].questions = [newQ]; return [sec]; }
      const last = prev[prev.length - 1];
      const lastExo = last.exercises[last.exercises.length - 1];
      return prev.map((s) => s.id !== last.id ? s : {
        ...s, exercises: s.exercises.map((ex) => ex.id !== lastExo.id ? ex : { ...ex, questions: [...ex.questions, newQ] })
      });
    });
  }, [setSections]);

  const addSection = useCallback(() => setSections((prev) => [...prev, makeSection(prev.length + 1)]), [setSections]);

  const addExerciseToLast = useCallback(() => {
    setSections((prev) => {
      if (prev.length === 0) return [...prev, makeSection(1)];
      const last = prev[prev.length - 1];
      return prev.map((s) => s.id === last.id ? { ...s, exercises: [...s.exercises, makeExercise(s.exercises.length + 1)] } : s);
    });
  }, [setSections]);

  const addQuestionToLast = useCallback((type = 'ouverte') => {
    setSections((prev) => {
      if (prev.length === 0) { const sec = makeSection(1); sec.exercises[0].questions.push(makeQuestion(type)); return [sec]; }
      const last = prev[prev.length - 1];
      const lastExo = last.exercises[last.exercises.length - 1];
      return prev.map((s) => s.id !== last.id ? s : {
        ...s, exercises: s.exercises.map((ex) => ex.id !== lastExo.id ? ex : { ...ex, questions: [...ex.questions, makeQuestion(type)] })
      });
    });
  }, [setSections]);

  const addImageToLast = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = ev.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        setSections((prev) => {
          if (!prev || prev.length === 0) return prev;
          const next = JSON.parse(JSON.stringify(prev));
          const lastSec = next[next.length - 1];
          if (!lastSec?.exercises?.length) return prev;
          const lastEx = lastSec.exercises[lastSec.exercises.length - 1];
          if (!lastEx?.questions?.length) return prev;
          const lastQ = lastEx.questions[lastEx.questions.length - 1];
          lastQ.image = file; lastQ.imageUrl = re.target?.result;
          return next;
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [setSections]);

  const handleQuickAdd = useCallback((toolId) => {
    if (toolId === 'section') addSection();
    else if (toolId === 'exercise') addExerciseToLast();
    else if (toolId === 'image') addImageToLast();
    else if (toolId.startsWith('q_')) addQuestionToLast(toolId.replace('q_', ''));
  }, [addSection, addExerciseToLast, addQuestionToLast, addImageToLast]);

  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); addSection(); }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); addExerciseToLast(); }
    if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); addQuestionToLast('ouverte'); }
  }, [addSection, addExerciseToLast, addQuestionToLast]);

  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    const toolId = e.dataTransfer.getData(TOOLBAR_DRAG_KEY);
    if (!toolId) return;
    if (toolId === 'section') { addSection(); return; }
    if (toolId === 'exercise') { addExerciseToLast(); return; }
    if (toolId === 'image') { addImageToLast(); return; }
    if (toolId.startsWith('q_')) { addQuestionToLast(toolId.replace('q_', '')); }
  }, [addSection, addExerciseToLast, addQuestionToLast, addImageToLast]);

  const handleSecDragStart = (i) => { dragSecFrom.current = i; };
  const handleSecDragEnter = (i) => { dragSecTo.current = i; };
  const handleSecDragEnd = () => {
    const from = dragSecFrom.current, to = dragSecTo.current;
    if (from !== null && to !== null && from !== to) {
      const next = [...sections];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setSections(next);
    }
    dragSecFrom.current = null; dragSecTo.current = null;
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
  const ptsPct = Math.min((stats.totalPts / 20) * 100, 100);

  const handleInsertAIQuestions = useCallback((aiQuestions) => {
    setSections(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const firstSection = { ...updated[0] };
      const exercises = [...firstSection.exercises];
      if (exercises.length === 0) return prev;
      const firstExo = { ...exercises[0] };
      firstExo.questions = [...firstExo.questions, ...aiQuestions];
      exercises[0] = firstExo;
      firstSection.exercises = exercises;
      updated[0] = firstSection;
      return updated;
    });
  }, [setSections]);

  const handleInsertAISections = useCallback((aiSections) => setSections(aiSections), [setSections]);

  return (
    <section className="qt-page" onKeyDown={handleKeyDown} tabIndex={-1} style={{ outline: 'none' }}>
      {/* ── Modals ── */}
      <QuestionBankModal
        isOpen={isShowingBankModal}
        onClose={() => setIsShowingBankModal(false)}
        onInsertFromBank={(q) => { insertFromBank(q); setIsShowingBankModal(false); }}
      />
      <AIChatModal
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onInsertQuestions={handleInsertAIQuestions}
        onInsertSections={handleInsertAISections}
        examContext={{
          matiere: selectedTemplate?.matiere || '',
          niveau: selectedTemplate?.niveau || '',
          duree: selectedTemplate?.duree || '',
        }}
      />

      {/* ═══════════════════════════════════════
          BARRE DE BARÈME STICKY
         ═══════════════════════════════════════ */}
      <div className="qt-scorebar-sticky">
        <ScoreBar
          totalPts={stats.totalPts}
          totalEx={stats.totalEx}
          totalQ={stats.totalQ}
          ptsOver={ptsOver}
          ptsPct={ptsPct}
          sectionsCount={sections.length}
        >
          <button type="button" className="qt-btn-bank" onClick={() => setIsShowingBankModal(true)}>
            <FiDatabase size={14} /> Banque de questions
          </button>
          <button type="button" className="qt-btn-ai" onClick={() => setShowAIChat(true)}>
            <FiZap size={14} /> Assistant IA
          </button>
        </ScoreBar>
      </div>

      {/* ═══════════════════════════════════════
          CONTENU PRINCIPAL — 2 colonnes
         ═══════════════════════════════════════ */}
      <div className="qt-main-layout">
        {/* ── Canvas ── */}
        <main
          className={`qt-canvas${draggingTool ? ' qt-canvas--dragging' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          {sections.length === 0 ? (
            <EmptyState onAddSection={addSection} onAddQuestion={addQuestionToLast} />
          ) : (
            <div className="qt-sections-list">
              {sections.map((s, si) => (
                <div key={s.id} draggable
                  onDragStart={() => handleSecDragStart(si)}
                  onDragEnter={() => handleSecDragEnter(si)}
                  onDragEnd={handleSecDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="sec-drag-wrapper">
                  <SectionBlock section={s} sectionIndex={si}
                    onUpdateSection={updateSection} onDeleteSection={deleteSection}
                    onUpdateExercisePoints={updateExercisePoints}
                    onUpdateQuestionPoints={updateQuestionPoints} />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── Sidebar Outils ── */}
        <SidebarTools onDragStart={setDraggingTool} onQuickAdd={handleQuickAdd} />
      </div>

      {/* ═══════════════════════════════════════
          FOOTER NAVIGATION
         ═══════════════════════════════════════ */}
      <footer className="qt-footer">
        <button type="button" className="qt-footer-btn qt-footer-btn--back" onClick={() => onTabChange('Modèles')}>
          <FiChevronLeft size={16} /> Retour aux modèles
        </button>

        <div className="qt-footer-center">
          {ptsOver && (
            <span className="qt-footer-warning">
              <FiAlertTriangle size={14} /> Le barème dépasse 20 pts
            </span>
          )}
        </div>

        <button
          type="button"
          className={`qt-footer-btn qt-footer-btn--next${ptsOver ? ' qt-footer-btn--disabled' : ''}`}
          onClick={() => {
            if (ptsOver) { onSetError?.('Le barème total dépasse 20 pts. Corrigez avant de continuer.'); return; }
            onTabChange('Export');
          }}
        >
          Continuer vers Export <FiArrowRight size={16} />
        </button>
      </footer>
    </section>
  );
};

export { makeSection };
export default QuestionsTab;