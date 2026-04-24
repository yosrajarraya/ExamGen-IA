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
  /* Count total questions across all sections */
  const totalQuestions = sections.reduce(
    (sum, sec) =>
      sum + sec.exercises.reduce((s2, exo) => s2 + exo.questions.length, 0),
    0,
  );

  const totalPts = sections.reduce((sum, sec) => {
    return (
      sum +
      sec.exercises.reduce((s2, exo) => {
        const exoPts = parseFloat(exo.points) || 0;
        const qPts = exo.questions.reduce(
          (s3, q) => s3 + (parseFloat(q.points) || 0),
          0,
        );
        return s2 + (exoPts || qPts);
      }, 0)
    );
  }, 0);

  const selectedTpl = selectedTemplate
    ? allTemplates.find((t) => t._id === selectedTemplate)
    : null;

  return (
    <section className="exam-card">
      <h2>Terminer et sauvegarder l'examen</h2>
      {/* Résumé de la structure */}
      {totalQuestions > 0 && (
        <div className="export-structure-summary">
          <div className="export-structure-stat">
            <div className="export-structure-value">
              {sections.length} partie{sections.length > 1 ? "s" : ""}
            </div>
            <div className="export-structure-label">Structure</div>
          </div>
          <div className="export-structure-stat">
            <div className="export-structure-value export-structure-value-blue">
              {totalQuestions}
            </div>
            <div className="export-structure-label">Questions</div>
          </div>
          {totalPts > 0 && (
            <div className="export-structure-stat">
              <div className="export-structure-value export-structure-value-accent">
                {totalPts} pts
              </div>
              <div className="export-structure-label">Barème</div>
            </div>
          )}
          {selectedTpl && (
            <div className="export-structure-stat">
              <div className="export-structure-value export-structure-value-template">
                {selectedTpl.nom}
              </div>
              <div className="export-structure-label">Modèle</div>
            </div>
          )}
        </div>
      )}

      {/* Statut de l'examen */}
      <h3>Statut de l'examen</h3>
      <div className="status-grid">
        <label
          className={`status-option ${examForm.statut === "Brouillon" ? "active-brouillon" : ""}`}
        >
          <input
            type="radio"
            name="statut"
            value="Brouillon"
            checked={examForm.statut === "Brouillon"}
            onChange={(e) => onFormChange("statut", e.target.value)}
          />
          <span className="status-option-name">Brouillon</span>
          <p className="status-option-desc">
            Examen en cours d'édition, non finalisé
          </p>
        </label>
        <label
          className={`status-option ${examForm.statut === "En cours" ? "active-encours" : ""}`}
        >
          <input
            type="radio"
            name="statut"
            value="En cours"
            checked={examForm.statut === "En cours"}
            onChange={(e) => onFormChange("statut", e.target.value)}
          />
          <span className="status-option-name">En cours</span>
          <p className="status-option-desc">
            Examen finalisé et prêt à distribuer
          </p>
        </label>
      </div>

      {/* Messages */}
      {exportMessage && (
        <p className="msg-success" style={{ marginBottom: "14px" }}>
          {exportMessage}
        </p>
      )}
      {exportError && (
        <p className="msg-error" style={{ marginBottom: "14px" }}>
          {exportError}
        </p>
      )}

      {totalQuestions === 0 && (
        <p className="msg-error" style={{ marginBottom: "14px" }}>
          Veuillez ajouter au moins une question dans l'onglet Questions avant
          de sauvegarder.
        </p>
      )}

      {/* Actions */}
      <div className="exam-actions">
        <button
          type="button"
          className="exam-btn-secondary"
          onClick={() => onTabChange("Questions")}
          disabled={isSavingExam}
        >
          ← Retour aux Questions
        </button>
        <button
          type="button"
          className="exam-btn-gold"
          onClick={onSave}
          disabled={isSavingExam || totalQuestions === 0}
          style={{ minWidth: "210px" }}
        >
          {isSavingExam ? "Sauvegarde…" : "Terminer et sauvegarder ✓"}
        </button>
      </div>
    </section>
  );
};

export default ExportTab;
