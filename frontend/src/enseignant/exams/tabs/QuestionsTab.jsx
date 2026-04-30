import { useCallback, useMemo } from 'react';
import {
  FiTrash2,
  FiCopy,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';

/* ── Helpers ── */
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const QUESTION_TYPES = [
  { value: 'enonce', label: 'Énoncé' },
  { value: 'ouverte', label: 'Question ouverte' },
  { value: 'qcm', label: 'QCM' },
  { value: 'vrai_faux', label: 'Vrai / Faux' },
  { value: 'pratique', label: 'Exercice pratique' },
];

const getDefaultOptions = (type) => {
  if (type === 'qcm') {
    return [
      { id: uid(), text: 'Option A', correct: false },
      { id: uid(), text: 'Option B', correct: false },
    ];
  }

  if (type === 'vrai_faux') {
    return [
      { id: uid(), text: 'Vrai', correct: false },
      { id: uid(), text: 'Faux', correct: false },
    ];
  }

  return [];
};

const makeQuestion = (type = 'ouverte') => ({
  id: uid(),
  type,
  text: '',
  points: '',
  isEditing: true,
  image: null, // Ajout du champ image
  imageUrl: null, // URL de l'image pour l'aperçu
  options: getDefaultOptions(type),
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

const getQuestionPointsTotal = (sectionsData) =>
  (Array.isArray(sectionsData) ? sectionsData : []).reduce((sum, section) => {
    return (
      sum +
      (section.exercises || []).reduce((exoSum, exo) => {
        return (
          exoSum +
          (exo.questions || []).reduce((questionSum, question) => {
            return questionSum + (parseFloat(question.points) || 0);
          }, 0)
        );
      }, 0)
    );
  }, 0);

const getExamTotalPoints = (sectionsData) =>
  (Array.isArray(sectionsData) ? sectionsData : []).reduce((sum, section) => {
    const sectionTotal = (section.exercises || []).reduce((exoSum, exo) => {
      const exoPts = parseFloat(exo.points) || 0;
      const qPts = (exo.questions || []).reduce(
        (questionSum, question) => questionSum + (parseFloat(question.points) || 0),
        0
      );

      return exoSum + (exoPts || qPts);
    }, 0);

    return sum + sectionTotal;
  }, 0);

/* ── Options QCM / Vrai Faux ── */
const McqOptions = ({
  options = [],
  onChange,
  onAddOption,
  onRemoveOption,
  isVF,
}) => {
  return (
    <div className="mcq-options">
      {options.map((opt, i) => {
        const optionLabel = String.fromCharCode(65 + i); // A, B, C, D...
        return (
          <div key={opt.id} className="mcq-option-row">
            {isVF ? (
              <span className="vf-text-static">{opt.text}</span>
            ) : (
              <>
                <span style={{ fontWeight: '600', minWidth: '28px' }}>
                  {optionLabel}.
                </span>
                <input
                  type="text"
                  className="mcq-option-input"
                  placeholder={`Option ${optionLabel}`}
                  value={opt.text}
                  onChange={(e) =>
                    onChange(opt.id, 'text', e.target.value)
                  }
                />
              </>
            )}

            {!isVF && options.length > 2 && (
              <button
                type="button"
                className="btn-action-sm btn-del-q"
                onClick={() => onRemoveOption(opt.id)}
                title="Supprimer l'option"
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        );
      })}

      {!isVF && (
        <button type="button" className="btn-add-option" onClick={onAddOption}>
          + Ajouter une option
        </button>
      )}

      <p className="correct-label">
        Cochez la ou les réponse(s) correcte(s)
      </p>
    </div>
  );
};

/* ── Question Item ── */
const QuestionItem = ({
  question,
  qIndex,
  onUpdate,
  onUpdateMultiple,
  onDelete,
  onUpdatePoints,
}) => {
  const isEnonce = question.type === 'enonce';
  const isQcm = question.type === 'qcm';
  const isVF = question.type === 'vrai_faux';

  const handleTypeChange = (newType) => {
    // Mettre à jour le type et les options en même temps
    const newOptions = (newType === 'qcm' || newType === 'vrai_faux')
      ? getDefaultOptions(newType)
      : [];

    onUpdateMultiple(question.id, {
      type: newType,
      options: newOptions,
    });
  };

  const handleOptionChange = (optId, field, value) => {
    const newOptions = (question.options || []).map((opt) =>
      opt.id === optId ? { ...opt, [field]: value } : opt
    );

    onUpdate(question.id, 'options', newOptions);
  };

  const handleAddOption = () => {
    const optionNum = (question.options || []).length + 1;
    const optionLabel = String.fromCharCode(64 + optionNum); // A, B, C, D, E...
    onUpdate(question.id, 'options', [
      ...(question.options || []),
      { id: uid(), text: `Option ${optionLabel}`, correct: false },
    ]);
  };

  const handleRemoveOption = (optId) => {
    onUpdate(
      question.id,
      'options',
      question.options.filter((opt) => opt.id !== optId)
    );
  };

  return (
    <div className="question-item">
      <div className="question-item-header">
        <div className="q-header-left">
          <span className="q-num-badge">{qIndex + 1}</span>

          <select
            className="q-type-select"
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="q-header-right">
          {!isEnonce && (
            <>
              <input
                type="number"
                className="q-pts-input"
                placeholder="0"
                value={question.points}
                onChange={(e) => onUpdatePoints(question.id, e.target.value)}
                min="0"
                max="20"
                step="0.5"
              />

              <span className="q-pts-label">pts</span>
            </>
          )}

          <button
            type="button"
            className="btn-action-sm btn-del-q"
            onClick={() => onDelete(question.id)}
            title="Supprimer la question"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      <textarea
        className="question-edit-textarea"
        placeholder={isEnonce ? "Énoncé..." : "Énoncé de la question..."}
        value={question.text}
        onChange={(e) => onUpdate(question.id, 'text', e.target.value)}
      />

      {/* Section Image */}
      <div style={{ marginTop: '12px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--ce-text-primary)' }}>
          Ajouter une image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                onUpdate(question.id, 'imageUrl', event.target?.result);
              };
              reader.readAsDataURL(file);
              onUpdate(question.id, 'image', file);
            }
          }}
          style={{ 
            padding: '8px 12px',
            border: '1.5px solid var(--ce-border)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        />

        {question.imageUrl && (
          <div style={{ marginTop: '12px', position: 'relative' }}>
            <img
              src={question.imageUrl}
              alt="Aperçu"
              style={{
                maxWidth: '100%',
                maxHeight: '200px',
                borderRadius: '8px',
                border: '1px solid var(--ce-border)'
              }}
            />
            <button
              type="button"
              onClick={() => {
                onUpdate(question.id, 'image', null);
                onUpdate(question.id, 'imageUrl', null);
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(192, 51, 74, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
              title="Supprimer l'image"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {!isEnonce && (isQcm || isVF) && (
        <McqOptions
          options={question.options}
          isVF={isVF}
          onChange={handleOptionChange}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
        />
      )}
    </div>
  );
};

/* ── Exercise Block ── */
const ExerciseBlock = ({
  exercise,
  exoIndex,
  onUpdateExo,
  onDeleteExo,
  onUpdateExercisePoints,
  onUpdateQuestionPoints,
}) => {
  const updateQuestion = (qId, field, value) => {
    onUpdateExo(
      exercise.id,
      'questions',
      exercise.questions.map((q) =>
        q.id === qId ? { ...q, [field]: value } : q
      )
    );
  };

  const updateQuestionMultiple = (qId, updates) => {
    onUpdateExo(
      exercise.id,
      'questions',
      exercise.questions.map((q) =>
        q.id === qId ? { ...q, ...updates } : q
      )
    );
  };

  const deleteQuestion = (qId) => {
    onUpdateExo(
      exercise.id,
      'questions',
      exercise.questions.filter((q) => q.id !== qId)
    );
  };

  const totalQuestionPts = exercise.questions.reduce(
    (sum, q) => sum + (parseFloat(q.points) || 0),
    0
  );

  const addQuestion = (type) => {
    onUpdateExo(exercise.id, 'questions', [
      ...exercise.questions,
      makeQuestion(type),
    ]);
  };

  return (
    <div className="exercise-container">
      <div className="exercise-header">
        <div className="exercise-header-left">
          <span className="exercise-num">{exoIndex + 1}</span>

          <input
            type="text"
            className="exercise-title-input"
            value={exercise.title}
            onChange={(e) =>
              onUpdateExo(exercise.id, 'title', e.target.value)
            }
            placeholder={`Exercice ${exoIndex + 1}`}
          />
        </div>

        <div className="exercise-header-right">
          <input
            type="number"
            className="exercise-pts-input"
            placeholder="Pts"
            value={exercise.points}
            onChange={(e) => onUpdateExercisePoints(exercise.id, e.target.value)}
            min="0"
            max="20"
            step="0.5"
          />

          <span className="exercise-pts-label">pts</span>

          {totalQuestionPts > 0 && (
            <span className="exercise-auto-pts">
              questions : {totalQuestionPts}
            </span>
          )}

          <button
            type="button"
            className="btn-action-sm btn-del-q"
            onClick={() => onDeleteExo(exercise.id)}
            title="Supprimer l'exercice"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      <div className="exercise-body">
        {exercise.questions.map((question, questionIndex) => (
          <QuestionItem
            key={question.id}
            question={question}
            qIndex={questionIndex}
            onUpdate={updateQuestion}
            onUpdateMultiple={updateQuestionMultiple}
            onUpdatePoints={(qId, value) => onUpdateQuestionPoints(exercise.id, qId, value)}
            onDelete={deleteQuestion}
          />
        ))}

        <div className="add-btns-row">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className="btn-add-q"
              onClick={() => addQuestion(type.value)}
            >
              + {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Section Block ── */
const SectionBlock = ({
  section,
  sectionIndex,
  onUpdateSection,
  onDeleteSection,
  onUpdateExercisePoints,
  onUpdateQuestionPoints,
}) => {
  const updateExo = (exoId, field, value) => {
    onUpdateSection(
      section.id,
      'exercises',
      section.exercises.map((exo) =>
        exo.id === exoId ? { ...exo, [field]: value } : exo
      )
    );
  };

  const deleteExo = (exoId) => {
    onUpdateSection(
      section.id,
      'exercises',
      section.exercises.filter((exo) => exo.id !== exoId)
    );
  };

  const addExercise = () => {
    onUpdateSection(section.id, 'exercises', [
      ...section.exercises,
      makeExercise(section.exercises.length + 1),
    ]);
  };

  const totalPts = section.exercises.reduce((sum, exo) => {
    const exoPts = parseFloat(exo.points) || 0;
    const qPts = exo.questions.reduce(
      (s, q) => s + (parseFloat(q.points) || 0),
      0
    );

    return sum + (exoPts || qPts);
  }, 0);

  const totalQuestions = section.exercises.reduce(
    (sum, exo) => sum + exo.questions.length,
    0
  );

  return (
    <div className="section-container">
      <div
        className="section-header"
        onClick={() =>
          onUpdateSection(section.id, 'collapsed', !section.collapsed)
        }
      >
        <div className="section-header-left">
          <span className="section-pill">Partie {sectionIndex + 1}</span>

          <input
            type="text"
            className="section-title-input"
            value={section.title}
            placeholder={`Partie ${sectionIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              onUpdateSection(section.id, 'title', e.target.value)
            }
          />
        </div>

        <div className="section-header-right">
          <span className="section-points-badge">
            {totalPts > 0 ? `${totalPts} pts · ` : ''}
            {totalQuestions} q.
          </span>

          <button type="button" className="btn-collapse">
            {section.collapsed ? <FiChevronDown /> : <FiChevronUp />}
          </button>

          <button
            type="button"
            className="btn-section-del"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSection(section.id);
            }}
            title="Supprimer la partie"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      {!section.collapsed && (
        <div className="section-body">
          {section.exercises.map((exercise, exerciseIndex) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              exoIndex={exerciseIndex}
              onUpdateExo={updateExo}
              onDeleteExo={deleteExo}
              onUpdateExercisePoints={onUpdateExercisePoints}
              onUpdateQuestionPoints={onUpdateQuestionPoints}
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

/* ── Main Component ── */
const QuestionsTab = ({
  sections,
  setSections,
  selectedTemplate,
  allTemplates,
  onTabChange,
  onSetSuccessMessage,
  onSetError,
}) => {
  const updateSection = useCallback(
    (secId, field, value) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === secId ? { ...section, [field]: value } : section
        )
      );
    },
    [setSections]
  );

  const deleteSection = useCallback(
    (secId) => {
      setSections((prev) => prev.filter((section) => section.id !== secId));
    },
    [setSections]
  );

  const updateQuestionPoints = useCallback(
    (exoId, qId, value) => {
      const nextValue = String(value ?? '');
      const nextNumeric = parseFloat(nextValue) || 0;

      if (nextNumeric > 20) {
        onSetError('Les points de chaque question ne peuvent pas dépasser 20.');
        return;
      }

      setSections((prev) => {
        const nextSections = prev.map((section) => ({
          ...section,
          exercises: section.exercises.map((exercise) => {
            if (exercise.id !== exoId) {
              return exercise;
            }

            // Update the question points
            const updatedQuestions = exercise.questions.map((question) =>
              question.id === qId ? { ...question, points: nextValue } : question
            );

            // Calculate the sum of all question points in this exercise
            const exoTotalPts = updatedQuestions.reduce(
              (sum, q) => sum + (parseFloat(q.points) || 0),
              0
            );

            return {
              ...exercise,
              questions: updatedQuestions,
              points: String(exoTotalPts), // Auto-sync: set exercise.points to question sum
            };
          }),
        }));

        const totalPoints = getQuestionPointsTotal(nextSections);

        if (totalPoints > 20) {
          onSetError('Le total des points des questions ne peut pas dépasser 20.');
          return prev;
        }

        return nextSections;
      });
    },
    [onSetError, setSections]
  );

  const updateExercisePoints = useCallback(
    (exoId, value) => {
      const nextValue = String(value ?? '');
      const nextNumeric = parseFloat(nextValue) || 0;

      if (nextNumeric > 20) {
        onSetError('Les points de chaque exercice ne peuvent pas dépasser 20.');
        return;
      }

      setSections((prev) => {
        const nextSections = prev.map((section) => ({
          ...section,
          exercises: section.exercises.map((exercise) =>
            exercise.id === exoId ? { ...exercise, points: nextValue } : exercise
          ),
        }));

        const totalPoints = getExamTotalPoints(nextSections);

        if (totalPoints > 20) {
          onSetError("Le barème total de l'examen ne peut pas dépasser 20 points.");
          return prev;
        }

        return nextSections;
      });
    },
    [onSetError, setSections]
  );

  const addSection = () => {
    setSections((prev) => [...prev, makeSection(prev.length + 1)]);
  };

  const stats = useMemo(() => {
    let totalQuestions = 0;
    let totalExercises = 0;
    let totalPts = 0;

    sections.forEach((section) => {
      totalExercises += section.exercises.length;

      section.exercises.forEach((exo) => {
        const exoPts = parseFloat(exo.points) || 0;

        const qPts = exo.questions.reduce((sum, q) => {
          totalQuestions += 1;
          return sum + (parseFloat(q.points) || 0);
        }, 0);

        totalPts += exoPts || qPts;
      });
    });

    return { totalQuestions, totalExercises, totalPts };
  }, [sections]);



  return (
    <section className="exam-card questions-section">
     

      {stats.totalQuestions > 0 && (
        <div className="bareme-summary">
          <div className="bareme-main-stat">
            <div
              className="bareme-total"
              style={stats.totalPts > 20 ? { color: '#c0334a' } : {}}
            >
              {stats.totalPts > 0 ? `${stats.totalPts} pts` : '—'}
            </div>
            <div className="bareme-label">Barème total</div>
          </div>

          {stats.totalPts > 20 && (
            <div
              style={{
                padding: '10px 12px',
                background: '#fce4e6',
                border: '1px solid #c0334a',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#c0334a',
                fontWeight: '500',
                marginTop: '10px',
              }}
            >
              ⚠️ Le barème total dépasse 20 points ({stats.totalPts} pts)
            </div>
          )}

          <div className="bareme-breakdown">
            <div className="bareme-item">
              <strong>{sections.length}</strong>
              <span>Partie(s)</span>
            </div>

            <div className="bareme-item">
              <strong>{stats.totalExercises}</strong>
              <span>Exercice(s)</span>
            </div>

            <div className="bareme-item">
              <strong>{stats.totalQuestions}</strong>
              <span>Question(s)</span>
            </div>
          </div>

        
        </div>
      )}

      {sections.length === 0 ? (
        <div className="empty-state">
          <p>Aucune partie pour le moment.</p>
          <span>Ajoutez une partie pour commencer votre examen.</span>
        </div>
      ) : (
        sections.map((section, sectionIndex) => (
          <SectionBlock
            key={section.id}
            section={section}
            sectionIndex={sectionIndex}
            onUpdateSection={updateSection}
            onDeleteSection={deleteSection}
            onUpdateExercisePoints={updateExercisePoints}
            onUpdateQuestionPoints={updateQuestionPoints}
          />
        ))
      )}

      <button type="button" className="btn-add-section" onClick={addSection}>
        + Ajouter une partie
      </button>

      <div className="exam-actions">
        <button
          type="button"
          className="exam-btn-secondary"
          onClick={() => onTabChange('Modèles')}
        >
          <FiChevronLeft /> Modèles
        </button>

        <button
          type="button"
          className="exam-btn-primary"
          onClick={() => onTabChange('Export')}
        >
          Continuer vers Export <FiChevronRight />
        </button>
      </div>
    </section>
  );
};

export { makeSection };
export default QuestionsTab;