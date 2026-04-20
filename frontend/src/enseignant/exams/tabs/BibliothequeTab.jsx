import { useState } from 'react';
import { copyQuestionBankItem, copyExamBankItem } from '../../../api/enseignant/Enseignant.api';

const BibliothequeTab = ({
  filter,
  onFilterChange,
  onFilterSearch,
  onFilterReset,
  isLoading,
  error,
  successMessage,
  hasSearched,
  filteredMesExamens,
  filteredAutresExamens,
  filteredMesQuestions,
  filteredAutresQuestions,
  onTabChange,
  onSetSuccessMessage,
  onSetError,
}) => {
  const [expandedExamId, setExpandedExamId] = useState(null);

  const handleCopyQuestion = async (questionId) => {
    try {
      const result = await copyQuestionBankItem(questionId);
      onSetSuccessMessage(`Question copiée de ${result.question.createdByName}`);
    } catch (err) {
      console.error('Error copying question:', err);
      onSetError('Erreur lors de la copie de la question');
    }
  };

  const handleCopyExam = async (examId) => {
    try {
      const result = await copyExamBankItem(examId);
      const copiedExamId = result.exam?.id || result.exam?._id || result.exam?.ID;
      if (!copiedExamId) { onSetError("Erreur: impossible d'obtenir l'ID de la copie"); return; }
      window.open(`/enseignant/exams/create?editExam=${copiedExamId}`, '_blank');
      onSetSuccessMessage(`Examen de ${result.exam?.createdByName} copié. S'ouvre dans un nouvel onglet…`);
    } catch (err) {
      onSetError("Erreur lors de la copie de l'examen");
    }
  };

  const ExamExpandedView = ({ exam, colorClass }) => (
    <div className="exam-preview">
      <div className={`exam-preview-header ${colorClass}`}>{exam.title || 'Sans titre'}</div>
      <div className="exam-preview-body">
        <table className="exam-preview-table">
          <tbody>
            <tr>
              <td>Matière</td><td>{exam.matiere || '—'}</td>
            </tr>
            <tr>
              <td>Niveau</td><td>{exam.niveau || '—'}</td>
            </tr>
            <tr>
              <td>Filière</td><td>{exam.filiere || '—'}</td>
            </tr>
            <tr>
              <td>Durée</td><td>{exam.duree ? `${exam.duree} min` : '—'}</td>
            </tr>
            <tr>
              <td>Type</td><td>{exam.type || '—'}</td>
            </tr>
            <tr>
              <td>Note totale</td><td>{exam.noteTotale ? `/${exam.noteTotale}` : '—'}</td>
            </tr>
            {exam.createdByName && (
              <tr><td>Créé par</td><td>{exam.createdByName}</td></tr>
            )}
          </tbody>
        </table>

        <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ce-text-label)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
          Exercices / Questions
        </h4>
        <table className="exercises-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>N°</th>
              <th>Énoncé</th>
              <th style={{ width: '16%', textAlign: 'center' }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {exam.questions && exam.questions.length > 0 ? (
              exam.questions.map((q, idx) => (
                <tr key={idx}>
                  <td>Ex. {idx + 1}</td>
                  <td>{String(q).substring(0, 90)}{String(q).length > 90 ? '…' : ''}</td>
                  <td style={{ textAlign: 'center' }}>/{exam.noteTotale || 20}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--ce-text-muted)', padding: '18px' }}>
                  Aucune question enregistrée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {colorClass === 'blue-hd' && (
        <div className="exam-preview-footer">
          <button
            className="btn-copy-exam"
            onClick={(e) => { e.stopPropagation(); handleCopyExam(exam.id); }}
          >
            Copier cet examen →
          </button>
        </div>
      )}
    </div>
  );

  const ExamCard = ({ exam, isMine }) => {
    const isExpanded = expandedExamId === exam.id;
    const colorClass = isMine ? 'green-hd' : 'blue-hd';
    const accentColor = isMine ? 'var(--ce-green)' : 'var(--ce-blue-mid)';

    return (
      <div
        className={`result-item ${isMine ? 'mine' : 'others'}`}
        style={{ cursor: 'pointer' }}
        onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '0' : '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isMine && (
              <span style={{ fontSize: '0.7rem', background: 'var(--ce-green-soft)', color: 'var(--ce-green)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>MES</span>
            )}
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--ce-text-primary)' }}>
              {isMine && '🔒 '}{exam.title || 'Sans titre'}
            </h4>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--ce-text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>

        {!isExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.8rem', color: 'var(--ce-text-muted)' }}>
            {exam.matiere && <span><strong>Matière:</strong> {exam.matiere}</span>}
            {exam.niveau && <span><strong>Niveau:</strong> {exam.niveau}</span>}
            {exam.type && <span><strong>Type:</strong> {exam.type}</span>}
          </div>
        )}

        {isExpanded && <ExamExpandedView exam={exam} colorClass={colorClass} />}
      </div>
    );
  };

  return (
    <section className="exam-card">
      <h2>Bibliothèque d'examens et questions</h2>

      {/* Filters */}
      <div className="filter-form">
        <div className="form-group">
          <label htmlFor="bib-matiere">Matière</label>
          <input id="bib-matiere" type="text" placeholder="Ex : Algorithme" value={filter.matiere}
            onChange={(e) => onFilterChange('matiere', e.target.value)} disabled={isLoading} />
        </div>
        <div className="form-group">
          <label htmlFor="bib-niveau">Niveau</label>
          <input id="bib-niveau" type="text" placeholder="Ex : L2" value={filter.niveau}
            onChange={(e) => onFilterChange('niveau', e.target.value)} disabled={isLoading} />
        </div>
        <div className="form-group">
          <label htmlFor="bib-annee">Année</label>
          <input id="bib-annee" type="text" placeholder="Ex : 2024-2025" value={filter.annee}
            onChange={(e) => onFilterChange('annee', e.target.value)} disabled={isLoading} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className="exam-btn-primary" onClick={onFilterSearch} disabled={isLoading}>
          {isLoading ? 'Recherche…' : 'Rechercher'}
        </button>
        <button className="exam-btn-secondary" onClick={onFilterReset} disabled={isLoading}>
          Réinitialiser
        </button>
      </div>

      {error && <p className="msg-error" style={{ marginBottom: '16px' }}>{error}</p>}
      {successMessage && <p className="msg-success" style={{ marginBottom: '16px' }}>{successMessage}</p>}
      {isLoading && <p className="msg-loading">Chargement des données…</p>}

      {hasSearched && !isLoading && (
        <>
          {/* Mes Examens */}
          <h3>Mes examens ({filteredMesExamens.length})</h3>
          {filteredMesExamens.length > 0 ? (
            <div className="filter-results">
              {filteredMesExamens.map(e => <ExamCard key={e.id} exam={e} isMine={true} />)}
            </div>
          ) : (
            <p style={{ color: 'var(--ce-text-muted)', fontStyle: 'italic', fontSize: '0.85rem', marginBottom: '8px' }}>Aucun examen personnel.</p>
          )}

          {/* Examens des autres */}
          {filteredAutresExamens.length > 0 && (
            <>
              <h3 style={{ marginTop: '24px' }}>Examens d'autres professeurs ({filteredAutresExamens.length})</h3>
              <div className="filter-results">
                {filteredAutresExamens.map(e => <ExamCard key={e.id} exam={e} isMine={false} />)}
              </div>
            </>
          )}

          {/* Mes Questions */}
          <h3 style={{ marginTop: '24px' }}>Mes questions ({filteredMesQuestions.length})</h3>
          {filteredMesQuestions.length > 0 ? (
            <div className="filter-results">
              {filteredMesQuestions.map((q, i) => (
                <div key={q.id} className="result-item mine" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ce-green)', marginRight: '8px' }}>🔒 Q{i + 1}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--ce-text-body)' }}>{q.text || 'Pas de texte'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--ce-text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Aucune question personnelle.</p>
          )}

          {/* Questions des autres */}
          {filteredAutresQuestions.length > 0 && (
            <>
              <h3 style={{ marginTop: '24px' }}>Questions d'autres professeurs ({filteredAutresQuestions.length})</h3>
              <div className="filter-results">
                {filteredAutresQuestions.map((q, i) => (
                  <div key={q.id} className="result-item others">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.875rem', color: 'var(--ce-text-body)' }}>{q.text || 'Pas de texte'}</p>
                        <small style={{ color: 'var(--ce-text-muted)', fontSize: '0.75rem' }}>Par {q.createdByName || '—'}</small>
                      </div>
                      <button
                        className="btn-add-to-exam"
                        onClick={() => handleCopyQuestion(q.id)}
                      >
                        📋 Copier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="exam-actions">
        <button className="exam-btn-primary" onClick={() => onTabChange('Modèles')}>
          Continuer vers Modèles →
        </button>
      </div>
    </section>
  );
};

export default BibliothequeTab;
