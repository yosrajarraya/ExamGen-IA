import {
  FiArrowLeft,
  FiSave,
  FiUploadCloud,
  FiLayers,
  FiHelpCircle,
  FiAward,
  FiFileText,
} from 'react-icons/fi';

const ExportTab = ({
  examForm,
  onFormChange,
  sections,
  allTemplates,
  selectedTemplate,
  isSavingExam,
  exportMessage,
  exportError,
  onSave,
  onTabChange,
}) => {
  const FIXED_EXAM_TOTAL = 20;

  const totalQuestions = sections.reduce(
    (sum, sec) =>
      sum + sec.exercises.reduce((s2, exo) => s2 + exo.questions.length, 0),
    0
  );

  const selectedTpl = selectedTemplate
    ? allTemplates.find((t) => t._id === selectedTemplate)
    : null;

  return (
    <section className="exam-card">
      <h2>Terminer et sauvegarder l'examen</h2>

      {totalQuestions > 0 && (
        <div className="export-summary">
          <div className="export-summary-item">
            <FiLayers className="export-summary-icon" />
            <div>
              <div className="export-summary-value">
                {sections.length} partie{sections.length > 1 ? 's' : ''}
              </div>
              <div className="export-summary-label">Structure</div>
            </div>
          </div>

          <div className="export-summary-item">
            <FiHelpCircle className="export-summary-icon blue" />
            <div>
              <div className="export-summary-value blue">{totalQuestions}</div>
              <div className="export-summary-label">Questions</div>
            </div>
          </div>

          <div className="export-summary-item">
            <FiAward className="export-summary-icon gold" />
            <div>
              <div className="export-summary-value gold">
                {FIXED_EXAM_TOTAL}/20
              </div>
              <div className="export-summary-label">Barème fixe</div>
            </div>
          </div>

          {selectedTpl && (
            <div className="export-summary-item">
              <FiFileText className="export-summary-icon" />
              <div>
                <div className="export-summary-template">{selectedTpl.nom}</div>
                <div className="export-summary-label">Modèle</div>
              </div>
            </div>
          )}
        </div>
      )}

      {exportMessage && (
        <p className="msg-success export-msg">{exportMessage}</p>
      )}

      {exportError && <p className="msg-error export-msg">{exportError}</p>}

      {totalQuestions === 0 && (
        <p className="msg-error export-msg">
          Veuillez ajouter au moins une question dans l'onglet Questions avant de
          sauvegarder.
        </p>
      )}

      <div className="exam-actions">
        <button
          type="button"
          className="exam-btn-secondary"
          onClick={() => onTabChange('Questions')}
          disabled={isSavingExam}
        >
          <FiArrowLeft /> Retour aux Questions
        </button>

        <button
          type="button"
          className="exam-btn-secondary export-action-btn"
          onClick={() => onSave('Brouillon')}
          disabled={isSavingExam || totalQuestions === 0}
        >
          <FiSave />
          {isSavingExam ? 'Sauvegarde…' : 'Sauvegarder (Brouillon)'}
        </button>

        <button
          type="button"
          className="exam-btn-gold export-action-btn"
          onClick={() => onSave('En cours')}
          disabled={isSavingExam || totalQuestions === 0}
        >
          <FiUploadCloud />
          {isSavingExam ? 'Exportation…' : "Exporter l'examen"}
        </button>
      </div>
    </section>
  );
};

export default ExportTab;