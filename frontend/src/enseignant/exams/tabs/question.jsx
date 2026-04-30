import { useState, useCallback } from 'react';
import { addQuestionToBank, copyQuestionBankItem } from '../../../api/enseignant/Enseignant.api';

/* ── helpers ── */
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const QUESTION_TYPES = [
  { value: 'ouverte', label: 'Question ouverte' },
  { value: 'qcm', label: 'QCM' },
  { value: 'vrai_faux', label: 'Vrai / Faux' },
];

const makeQuestion = () => ({
  id: uid(),
  type: 'ouverte',
  text: '',
  points: '',
  isEditing: true,
  options: [{ id: uid(), text: '', correct: false }, { id: uid(), text: '', correct: false }],
});

const makeExercise = (num) => ({
  id: uid(),
  title: `Exercice ${num}`,
  points: '',
  questions: [makeQuestion()],
  collapsed: false,
});

const makeSection = (num) => ({
  id: uid(),
  title: `Partie ${num}`,
  exercises: [makeExercise(1)],
  collapsed: false,
});

/* ── Sub-components ── */
const McqOptions = ({ options, onChange, onAddOption, onRemoveOption }) => (
  <div className="mcq-options">
    {options.map((opt, i) => (
      <div key={opt.id} className="mcq-option-row">
        <input
          type="checkbox"
          checked={opt.correct}
          onChange={() => onChange(opt.id, 'correct', !opt.correct)}
          title="Réponse correcte"
        />
        <input
          type="text"
          className="mcq-option-input"
          placeholder={`Option ${i + 1}`}
          value={opt.text}
          onChange={(e) => onChange(opt.id, 'text', e.target.value)}
        />
        {options.length > 2 && (
          <button
            type="button"
            className="btn-action-sm btn-del-q"
            onClick={() => onRemoveOption(opt.id)}
            style={{ padding: '4px 8px' }}
          >
            ✕
          </button>
        )}
      </div>
    ))}
    <button type="button" className="btn-add-option" onClick={onAddOption}>
      + Ajouter une option
    </button>
    <p className="correct-label">Cochez la ou les réponse(s) correcte(s)</p>
  </div>
);

const QuestionItem = ({ question, qIndex, onUpdate, onDelete }) => {
  const isQcm = question.type === 'qcm';
  const isVF = question.type === 'vrai_faux';

  const handleOptionChange = (optId, field, value) => {
    const newOpts = question.options.map(o => o.id === optId ? { ...o, [field]: value } : o);
    onUpdate(question.id, 'options', newOpts);
  };

  const handleAddOption = () => {
    onUpdate(question.id, 'options', [...question.options, { id: uid(), text: '', correct: false }]);
  };

  const handleRemoveOption = (optId) => {
    onUpdate(question.id, 'options', question.options.filter(o => o.id !== optId));
  };

  return (
    <div className="question-item">
      <div className="question-item-header">
        <span className="q-num-badge">{qIndex + 1}</span>

        <select
          className="q-type-select"
          value={question.type}
          onChange={(e) => {
            onUpdate(question.id, 'type', e.target.value);
            if (e.target.value === 'vrai_faux') {
              onUpdate(question.id, 'options', [
                { id: uid(), text: 'Vrai', correct: false },
                { id: uid(), text: 'Faux', correct: false },
              ]);
            }
          }}
        >
          {QUESTION_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input
          type="number"
          className="q-pts-input"
          placeholder="Pts"
          value={question.points}
          onChange={(e) => onUpdate(question.id, 'points', e.target.value)}
          min="0"
          step="0.5"
        />
        <span className="q-pts-label">pts</span>

        <div className="q-item-actions">
          <button type="button" className="btn-action-sm btn-del-q" onClick={() => onDelete(question.id)}>
            Supprimer
          </button>
        </div>
      </div>

      {/* Question text — énoncé uniquement */}
      <textarea
        className="question-edit-textarea"
        placeholder="Énoncé de la question…"
        value={question.text}
        onChange={(e) => onUpdate(question.id, 'text', e.target.value)}
        style={{ minHeight: '64px' }}
      />

      {/* MCQ options */}
      {(isQcm || isVF) && (
        <McqOptions
          options={question.options}
          onChange={handleOptionChange}
          onAddOption={isVF ? null : handleAddOption}
          onRemoveOption={handleRemoveOption}
        />
      )}
    </div>
  );
};

const ExerciseBlock = ({ exercise, exoIndex, onUpdateExo, onDeleteExo }) => {
  const updateQuestion = (qId, field, value) => {
    const newQs = exercise.questions.map(q => q.id === qId ? { ...q, [field]: value } : q);
    onUpdateExo(exercise.id, 'questions', newQs);
  };

  const deleteQuestion = (qId) => {
    onUpdateExo(exercise.id, 'questions', exercise.questions.filter(q => q.id !== qId));
  };

  const addQuestion = () => {
    onUpdateExo(exercise.id, 'questions', [...exercise.questions, makeQuestion()]);
  };

  const totalPts = exercise.questions.reduce((sum, q) => sum + (parseFloat(q.points) || 0), 0);

  return (
    <div className="exercise-container">
      <div className="exercise-header">
        <div className="exercise-header-left">
          <span className="exercise-num">{exoIndex + 1}</span>
          <input
            type="text"
            className="exercise-title-input"
            value={exercise.title}
            onChange={(e) => onUpdateExo(exercise.id, 'title', e.target.value)}
            placeholder={`Exercice ${exoIndex + 1}`}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="number"
            className="exercise-pts-input"
            placeholder="Pts"
            value={exercise.points}
            onChange={(e) => onUpdateExo(exercise.id, 'points', e.target.value)}
            min="0"
            step="0.5"
            title="Points de l'exercice"
          />
          <span className="exercise-pts-label">pts</span>
          {totalPts > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--ce-text-muted)' }}>
              (questions: {totalPts})
            </span>
          )}
          <button
            type="button"
            className="btn-action-sm btn-del-q"
            onClick={() => onDeleteExo(exercise.id)}
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="exercise-body">
        {exercise.questions.map((q, qi) => (
          <QuestionItem
            key={q.id}
            question={q}
            qIndex={qi}
            onUpdate={updateQuestion}
            onDelete={deleteQuestion}
          />
        ))}

        <div className="add-btns-row">
          {QUESTION_TYPES.slice(0, 4).map(t => (
            <button
              key={t.value}
              type="button"
              className="btn-add-q"
              onClick={() => {
                const nq = makeQuestion();
                nq.type = t.value;
                if (t.value === 'vrai_faux') {
                  nq.options = [
                    { id: uid(), text: 'Vrai', correct: false },
                    { id: uid(), text: 'Faux', correct: false },
                  ];
                }
                onUpdateExo(exercise.id, 'questions', [...exercise.questions, nq]);
              }}
            >
              + {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SectionBlock = ({ section, sectionIndex, onUpdateSection, onDeleteSection }) => {
  const updateExo = (exoId, field, value) => {
    const newExos = section.exercises.map(e => e.id === exoId ? { ...e, [field]: value } : e);
    onUpdateSection(section.id, 'exercises', newExos);
  };

  const deleteExo = (exoId) => {
    onUpdateSection(section.id, 'exercises', section.exercises.filter(e => e.id !== exoId));
  };

  const addExercise = () => {
    const num = section.exercises.length + 1;
    onUpdateSection(section.id, 'exercises', [...section.exercises, makeExercise(num)]);
  };

  const totalPts = section.exercises.reduce((sum, exo) => {
    const exoPts = parseFloat(exo.points) || 0;
    const qPts = exo.questions.reduce((s, q) => s + (parseFloat(q.points) || 0), 0);
    return sum + (exoPts || qPts);
  }, 0);

  const totalQuestions = section.exercises.reduce((sum, e) => sum + e.questions.length, 0);

  return (
    <div className="section-container">
      <div
        className="section-header"
        onClick={() => onUpdateSection(section.id, 'collapsed', !section.collapsed)}
      >
        <div className="section-header-left">
          <span className="section-pill">Partie {sectionIndex + 1}</span>
          <input
            type="text"
            className="section-title-input"
            value={section.title}
            placeholder={`Partie ${sectionIndex + 1}`}
            onChange={(e) => {
              e.stopPropagation();
              onUpdateSection(section.id, 'title', e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="section-header-right">
          {totalPts > 0 && (
            <span className="section-points-badge">{totalPts} pts · {totalQuestions} q.</span>
          )}
          <button type="button" className="btn-collapse">
            {section.collapsed ? '▼ Afficher' : '▲ Réduire'}
          </button>
          <button
            type="button"
            className="btn-section-del"
            onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
          >
            ✕ Supprimer
          </button>
        </div>
      </div>

      {!section.collapsed && (
        <div className="section-body">
          {section.exercises.map((exo, ei) => (
            <ExerciseBlock
              key={exo.id}
              exercise={exo}
              exoIndex={ei}
              onUpdateExo={updateExo}
              onDeleteExo={deleteExo}
            />
          ))}
          <button type="button" className="btn-add-exo" onClick={addExercise}>
            + Ajouter un exercice
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Main QuestionsTab ── */
const QuestionsTab = ({
  sections,
  setSections,
  filteredMesQuestions,
  filteredAutresQuestions,
  selectedTemplate,
  allTemplates,
  onTabChange,
  onSetSuccessMessage,
  onSetError,
}) => {
  const updateSection = (secId, field, value) => {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, [field]: value } : s));
  };

  const deleteSection = (secId) => {
    setSections(prev => prev.filter(s => s.id !== secId));
  };

  const addSection = () => {
    setSections(prev => [...prev, makeSection(prev.length + 1)]);
  };

  /* Bareme calculations */
  const totalSectionPts = sections.reduce((sum, sec) => {
    return sum + sec.exercises.reduce((s2, exo) => {
      const exoPts = parseFloat(exo.points) || 0;
      const qPts = exo.questions.reduce((s3, q) => s3 + (parseFloat(q.points) || 0), 0);
      return s2 + (exoPts || qPts);
    }, 0);
  }, 0);

  const totalQuestions = sections.reduce((sum, sec) =>
    sum + sec.exercises.reduce((s2, exo) => s2 + exo.questions.length, 0), 0);

  const totalExercises = sections.reduce((sum, sec) => sum + sec.exercises.length, 0);

  /* Copy question from bank into current section */
  const handleCopyQuestion = async (questionId) => {
    try {
      const result = await copyQuestionBankItem(questionId);
      setSections(prev => {
        if (prev.length === 0) return prev;
        const newSecs = [...prev];
        const lastSec = { ...newSecs[newSecs.length - 1] };
        const newExos = [...lastSec.exercises];
        const lastExo = { ...newExos[newExos.length - 1] };
        lastExo.questions = [...lastExo.questions, {
          id: uid(),
          type: 'ouverte',
          text: result.question.text,
          points: '',
          isEditing: false,
          options: [],
        }];
        newExos[newExos.length - 1] = lastExo;
        lastSec.exercises = newExos;
        newSecs[newSecs.length - 1] = lastSec;
        return newSecs;
      });
      onSetSuccessMessage('Question ajoutée depuis la banque');
    } catch {
      onSetError('Erreur lors de la copie');
    }
  };

  /* ✅ Copier uniquement les énoncés depuis le QuestionsTab (structure locale) */
  const handleCopyQuestionsLocal = () => {
    if (sections.length === 0) {
      onSetError('Aucune question à copier.');
      return;
    }

    const lines = [];
    let qIndex = 1;

    sections.forEach((section) => {
      section.exercises.forEach((exercise) => {
        exercise.questions.forEach((q, qi) => {
          // Copier uniquement l'énoncé (q.text), pas les options (q.options)
          if (q.text && q.text.trim()) {
            lines.push(`${qIndex}. ${q.text.trim()}`);
            qIndex += 1;
          }
        });
      });
    });

    const text = lines.join('\n').trim();

    if (!text) {
      onSetError('Aucun énoncé à copier. Remplissez les questions d\'abord.');
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => onSetSuccessMessage('Questions copiées dans le presse-papier ✓'))
      .catch(() => onSetError("Erreur : impossible d'accéder au presse-papier."));
  };

  return (
    <section className="exam-card questions-section">
      <h2>Questions de l'examen</h2>

      {/* Selected template badge */}
      {selectedTemplate && (
        <div className="info-banner gold" style={{ marginBottom: '20px' }}>
          Modèle : <strong>{allTemplates.find(t => t._id === selectedTemplate)?.nom || 'Modèle sélectionné'}</strong>
        </div>
      )}

      {/* Bareme summary */}
      {totalQuestions > 0 && (
        <div className="bareme-summary">
          <div>
            <div className="bareme-total">{totalSectionPts > 0 ? `${totalSectionPts} pts` : '—'}</div>
            <div className="bareme-label">Barème total</div>
          </div>
          <div className="bareme-breakdown">
            <div className="bareme-item">
              <div className="bareme-item-val">{sections.length}</div>
              <div className="bareme-item-lbl">Partie{sections.length > 1 ? 's' : ''}</div>
            </div>
            <div className="bareme-item">
              <div className="bareme-item-val">{totalExercises}</div>
              <div className="bareme-item-lbl">Exercice{totalExercises > 1 ? 's' : ''}</div>
            </div>
            <div className="bareme-item">
              <div className="bareme-item-val">{totalQuestions}</div>
              <div className="bareme-item-lbl">Question{totalQuestions > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* ✅ Bouton copier les questions dans le QuestionsTab */}
          <button
            type="button"
            className="btn-copy-questions"
            onClick={handleCopyQuestionsLocal}
            title="Copier les énoncés sans les réponses"
          >
            📋 Copier les questions
          </button>
        </div>
      )}

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: '20px' }}>
          <p>Aucune section pour le moment.</p>
          <p className="hint">Ajoutez une partie pour organiser votre examen.</p>
        </div>
      ) : (
        sections.map((sec, si) => (
          <SectionBlock
            key={sec.id}
            section={sec}
            sectionIndex={si}
            onUpdateSection={updateSection}
            onDeleteSection={deleteSection}
          />
        ))
      )}

      <button type="button" className="btn-add-section" onClick={addSection}>
        + Ajouter une partie
      </button>

      <div className="exam-actions">
        <button type="button" className="exam-btn-secondary" onClick={() => onTabChange('Modèles')}>
          ← Modèles
        </button>
        <button type="button" className="exam-btn-primary" onClick={() => onTabChange('Export')}>
          Continuer vers Export →
        </button>
      </div>
    </section>
  );
};

export { makeSection };
export default QuestionsTab;