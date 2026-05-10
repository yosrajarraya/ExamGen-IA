import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FiTrash2, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp,
  FiX, FiPlus, FiAlignLeft, FiHelpCircle, FiCheckSquare,
  FiToggleLeft, FiCode, FiMenu, FiLayers,
  FiZap, FiDatabase, FiCheckCircle,
} from 'react-icons/fi';
import QuestionBankModal from './QuestionBankModal';

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

/* ── Outils de la barre latérale ── */

/* Clé de drag */
const TOOLBAR_DRAG_KEY = 'toolbar-item';

/* Définition des actions rapides */
const QUICK_ACTIONS = [
  { id: 'section',        label: 'Partie',          dot: '#0e2b50', bg: '#e8edf5', color: '#0e2b50' },
  { id: 'exercise',       label: 'Exercice',         dot: '#1e4fa8', bg: '#eef2ff', color: '#1e4fa8' },
  { id: 'q_ouverte',      label: 'Question ouverte', dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8' },
  { id: 'q_qcm_unique',   label: 'QCM unique',       dot: '#8b5cf6', bg: '#f5f3ff', color: '#6d28d9' },
  { id: 'q_qcm_multiple', label: 'QCM multiple',     dot: '#6366f1', bg: '#eef2ff', color: '#4338ca' },
  { id: 'q_vrai_faux',    label: 'Vrai / Faux',      dot: '#10b981', bg: '#ecfdf5', color: '#065f46' },
  { id: 'q_pratique',     label: 'Pratique',         dot: '#f59e0b', bg: '#fffbeb', color: '#92400e' },
  { id: 'q_enonce',       label: 'Énoncé',           dot: '#9ca3af', bg: '#f9fafb', color: '#374151' },
];

/* ── Barre horizontale unifiée : barème + outils ── */
const HorizontalToolbar = ({ sections, totalPts, totalEx, totalQ, ptsOver, ptsPct, onOpenBank, onAddSection, onAddExercise, onAddQuestion, onDragStart }) => (
  <div className={`qt-hbar${ptsOver ? ' qt-hbar--over' : ''}`}>
    {/* Barème */}
    <div className="qt-hbar-score">
      <span className={`qt-hbar-pts${ptsOver ? ' qt-hbar-pts--over' : ''}`}>
        {totalPts > 0 ? totalPts : '—'}<span className="qt-hbar-denom">/20</span>
      </span>
      <div className="qt-hbar-progress">
        <div className="qt-hbar-fill" style={{ width: `${ptsPct}%`, background: ptsOver ? '#ef4444' : '#0e2b50' }} />
      </div>
    </div>

    {/* Stats chips */}
    <div className="qt-hbar-chips">
      {[
        { v: sections.length, l: 'Partie(s)' },
        { v: totalEx,         l: 'Exercice(s)' },
        { v: totalQ,          l: 'Question(s)' },
      ].map(({ v, l }) => (
        <div key={l} className="qt-hbar-chip">
          <strong>{v}</strong>
          <span>{l}</span>
        </div>
      ))}
    </div>

    <div className="qt-hbar-divider" />

    {/* Actions rapides — cliquables ET draggables */}
    <div className="qt-hbar-actions">
      {QUICK_ACTIONS.map(a => (
        <button
          key={a.id}
          type="button"
          className="qt-hbar-action"
          style={{ '--a-dot': a.dot, '--a-bg': a.bg, '--a-color': a.color }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(TOOLBAR_DRAG_KEY, a.id);
            onDragStart(a.id);
          }}
          onClick={() => {
            if (a.id === 'section') onAddSection();
            else if (a.id === 'exercise') onAddExercise();
            else onAddQuestion(a.id.replace('q_', ''));
          }}
          title={`Cliquer ou glisser pour ajouter : ${a.label}`}
        >
          <span className="qt-hbar-action-dot" />
          <span className="qt-hbar-action-label">{a.label}</span>
        </button>
      ))}
    </div>

    <div className="qt-hbar-divider" />

    {/* Banque */}
    <button type="button" className="qt-hbar-bank" onClick={onOpenBank}>
      <FiDatabase size={14} />
      <span>Banque</span>
    </button>
  </div>
);

/* ── Question Item — nouveau design ── */
const QuestionItem = ({ question, qIndex, onUpdate, onUpdateMultiple, onDelete, onUpdatePoints, onDragStart, onDragEnter, onDragEnd }) => {
  const type     = normalizeType(question.type);
  const isEnonce = type === 'enonce';
  const isQcm    = isQcmType(type);
  const isVF     = type === 'vrai_faux';
  const isUnique = type === 'qcm_unique';

  const TYPE_COLORS = {
    enonce: '#9ca3af', ouverte: '#3b82f6', qcm_unique: '#8b5cf6',
    qcm_multiple: '#6366f1', vrai_faux: '#10b981', pratique: '#f59e0b',
  };
  const accentColor = TYPE_COLORS[type] || '#3b82f6';

  const handleTypeChange = (newType) => {
    const nt = normalizeType(newType);
    onUpdateMultiple(question.id, { type: nt, options: (isQcmType(nt) || nt === 'vrai_faux') ? getDefaultOptions(nt) : [] });
  };

  const handleOptChange = (optId, field, value) =>
    onUpdate(question.id, 'options', (question.options || []).map((o) => o.id === optId ? { ...o, [field]: value } : o));
  const handleAddOpt = () =>
    onUpdate(question.id, 'options', [...(question.options || []), { id: uid(), text: `Option ${String.fromCharCode(65 + (question.options || []).length)}`, correct: false }]);
  const handleRemoveOpt = (optId) =>
    onUpdate(question.id, 'options', question.options.filter((o) => o.id !== optId));

  return (
    <div
      className="qitem"
      style={{ '--accent': accentColor }}
      draggable
      onDragStart={() => onDragStart(qIndex)}
      onDragEnter={() => onDragEnter(qIndex)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Accent bar */}
      <div className="qitem-accent" />

      <div className="qitem-inner">
        {/* Row 1 : type + points + delete */}
        <div className="qitem-row">
          <span className="qitem-drag"><FiMenu size={13} /></span>
          {!isEnonce && <span className="qitem-num">{qIndex + 1}</span>}
          <select className="qitem-type-select" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="qitem-spacer" />
          {!isEnonce && (
            <div className="qitem-pts">
              <input
                type="number"
                className={`qitem-pts-input${parseFloat(question.points) > 20 ? ' pts-over' : ''}`}
                placeholder="0"
                value={question.points}
                onChange={(e) => onUpdatePoints(question.id, e.target.value)}
                min="0" max="20" step="0.5"
              />
              <span className="qitem-pts-label">pts</span>
            </div>
          )}
          <button type="button" className="qitem-del" onClick={() => onDelete(question.id)}>
            <FiTrash2 size={13} />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          className="qitem-textarea"
          placeholder={isEnonce ? "Texte de l'énoncé…" : 'Énoncé de la question…'}
          value={question.text}
          onChange={(e) => onUpdate(question.id, 'text', e.target.value)}
          rows={3}
        />

        {/* Lignes de réponse */}
        {(type === 'ouverte' || type === 'pratique') && (
          <div className="qitem-lines-ctrl">
            <span className="qitem-lines-label">Lignes de réponse :</span>
            <button type="button" className="qitem-lines-btn"
              onClick={() => onUpdate(question.id, 'answerLines', Math.max(1, (question.answerLines || 3) - 1))}>−</button>
            <span className="qitem-lines-val">{question.answerLines || 3}</span>
            <button type="button" className="qitem-lines-btn"
              onClick={() => onUpdate(question.id, 'answerLines', Math.min(20, (question.answerLines || 3) + 1))}>+</button>
          </div>
        )}

        {/* Image */}
        {question.imageUrl && (
          <div className="qitem-img-wrap">
            <img src={question.imageUrl} alt="Aperçu" className="qitem-img" />
            <button type="button" className="qitem-img-del"
              onClick={() => { onUpdate(question.id, 'image', null); onUpdate(question.id, 'imageUrl', null); }}>
              <FiX size={12} />
            </button>
          </div>
        )}

        {/* MCQ */}
        {!isEnonce && (isQcm || isVF) && (
          <div className="qitem-mcq">
            <p className="qitem-mcq-hint">
              {isVF ? 'Vrai ou Faux' : isUnique ? 'Choix unique' : 'Choix multiple'}
            </p>
            {(question.options || []).map((opt, i) => {
              const lbl = String.fromCharCode(65 + i);
              return (
                <div key={opt.id} className={`qitem-opt${opt.correct ? ' qitem-opt--correct' : ''}`}>
                  <button
                    type="button"
                    className={`qitem-opt-check${opt.correct ? ' qitem-opt-check--on' : ''}`}
                    onClick={() => {
                      if (isUnique && !opt.correct) {
                        (question.options || []).forEach((o) => { if (o.id !== opt.id && o.correct) handleOptChange(o.id, 'correct', false); });
                      }
                      handleOptChange(opt.id, 'correct', !opt.correct);
                    }}
                  >
                    {isUnique ? (opt.correct ? '●' : '○') : (opt.correct ? '✓' : lbl)}
                  </button>
                  {isVF ? (
                    <span className="qitem-opt-vf">{opt.text}</span>
                  ) : (
                    <input type="text" className="qitem-opt-input" placeholder={`Option ${lbl}`}
                      value={opt.text} onChange={(e) => handleOptChange(opt.id, 'text', e.target.value)} />
                  )}
                  {!isVF && (question.options || []).length > 2 && (
                    <button type="button" className="qitem-opt-del" onClick={() => handleRemoveOpt(opt.id)}>
                      <FiX size={11} />
                    </button>
                  )}
                </div>
              );
            })}
            {!isVF && (
              <button type="button" className="qitem-add-opt" onClick={handleAddOpt}>
                <FiPlus size={12} /> Ajouter une option
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Exercise Block — nouveau design ── */
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
        <input
          type="text"
          className="exo-title"
          value={exercise.title}
          onChange={(e) => onUpdateExo(exercise.id, 'title', e.target.value)}
          placeholder={`Exercice ${exoIndex + 1}`}
        />
        <div className="exo-header-right">
          <div className="exo-pts-wrap">
            <input
              type="number"
              className={`exo-pts-input${parseFloat(exercise.points) > 20 ? ' pts-over' : ''}`}
              placeholder="—"
              value={exercise.points}
              onChange={(e) => onUpdateExercisePoints(exercise.id, e.target.value)}
              min="0" max="20" step="0.5"
            />
            <span className="exo-pts-label">pts</span>
          </div>
          {totalQpts > 0 && <span className="exo-sum" title="Somme des questions">∑{totalQpts}</span>}
          <button type="button" className="exo-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FiChevronDown size={13} /> : <FiChevronUp size={13} />}
          </button>
          <button type="button" className="exo-btn exo-btn--del" onClick={() => onDeleteExo(exercise.id)}>
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          className={`exo-body${dropTarget ? ' exo-body--drop' : ''}`}
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
          {exercise.questions.length === 0 && (
            <div className="exo-empty">Glissez une question ici ou utilisez la barre latérale</div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Section Block — nouveau design ── */
const SectionBlock = ({ section, sectionIndex, onUpdateSection, onDeleteSection, onUpdateExercisePoints, onUpdateQuestionPoints }) => {
  const updateExo = (exoId, field, value) =>
    onUpdateSection(section.id, 'exercises', section.exercises.map((e) => e.id === exoId ? { ...e, [field]: value } : e));
  const deleteExo = (exoId) =>
    onUpdateSection(section.id, 'exercises', section.exercises.filter((e) => e.id !== exoId));

  const totalPts = section.exercises.reduce((s, ex) => {
    const ep = parseFloat(ex.points) || 0;
    const qp = ex.questions.reduce((qs, q) => qs + (parseFloat(q.points) || 0), 0);
    return s + (ep || qp);
  }, 0);
  const totalQ = section.exercises.reduce((s, ex) => s + ex.questions.length, 0);

  return (
    <div className="sec-block">
      {/* Section header */}
      <div className="sec-header" onClick={() => onUpdateSection(section.id, 'collapsed', !section.collapsed)}>
        <span className="sec-badge">Partie {sectionIndex + 1}</span>
        <input
          type="text"
          className="sec-title"
          value={section.title}
          placeholder={`Partie ${sectionIndex + 1}`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateSection(section.id, 'title', e.target.value)}
        />
        <div className="sec-header-right">
          {(totalPts > 0 || totalQ > 0) && (
            <span className="sec-meta">
              {totalPts > 0 && `${totalPts} pts · `}{totalQ} q.
            </span>
          )}
          <button type="button" className="sec-btn">
            {section.collapsed ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
          </button>
          <button type="button" className="sec-btn sec-btn--del"
            onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}>
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      {!section.collapsed && (
        <div className="sec-body">
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
      {/* Modal Banque de Questions */}
      <QuestionBankModal
        isOpen={isShowingBankModal}
        onClose={() => setIsShowingBankModal(false)}
        onInsertFromBank={(q) => {
          insertFromBank(q);
          setIsShowingBankModal(false);
        }}
      />

      {/* ── Barre horizontale sticky : barème + outils ── */}
      <div className="qt-hbar-sticky-wrapper">
        <HorizontalToolbar
          sections={sections}
          totalPts={stats.totalPts}
          totalEx={stats.totalEx}
          totalQ={stats.totalQ}
          ptsOver={ptsOver}
          ptsPct={ptsPct}
          onOpenBank={() => setIsShowingBankModal(true)}
          onAddSection={addSection}
          onAddExercise={addExerciseToLast}
          onAddQuestion={addQuestionToLast}
          onDragStart={setDraggingTool}
        />
      </div>

      {/* ── Canvas pleine largeur ── */}
      <div
        className={`qt-canvas${draggingTool ? ' qt-canvas--dragging' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
      >
        {sections.length === 0 ? (
          <div className="qt-empty-state">
            <div className="qt-empty-icon"><FiZap size={26} /></div>
            <p className="qt-empty-title">Construisez votre examen</p>
            <p className="qt-empty-hint">Utilisez la barre d'outils ci-dessus ou les boutons ci-dessous</p>
            <div className="qt-empty-actions">
              <button type="button" className="qt-empty-btn qt-empty-btn--primary" onClick={addSection}>
                <FiLayers size={14} /> Nouvelle partie
              </button>
              <button type="button" className="qt-empty-btn qt-empty-btn--secondary" onClick={() => addQuestionToLast('ouverte')}>
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
            >
              <SectionBlock section={s} sectionIndex={si}
                onUpdateSection={updateSection} onDeleteSection={deleteSection}
                onUpdateExercisePoints={updateExercisePoints}
                onUpdateQuestionPoints={updateQuestionPoints} />
            </div>
          ))
        )}

        {/* Navigation */}
        <div className="exam-actions">
          <button type="button" className="exam-btn-secondary" onClick={() => onTabChange('Modèles')}>
            <FiChevronLeft /> Modèles
          </button>
          <button
            type="button"
            className={`exam-btn-primary${ptsOver ? ' exam-btn-primary--disabled' : ''}`}
            onClick={() => {
              if (ptsOver) { onSetError?.('Le barème total dépasse 20 pts. Corrigez avant de continuer.'); return; }
              onTabChange('Export');
            }}
          >
            Continuer vers Export <FiChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
};

export { makeSection };
export default QuestionsTab;