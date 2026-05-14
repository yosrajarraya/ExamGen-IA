import { useState, useCallback } from 'react';
import {
  FiArrowLeft, FiCheck, FiLoader,
  FiGlobe, FiLock, FiSave,
  FiLayers, FiHelpCircle, FiBarChart2, FiLayout,
} from 'react-icons/fi';

/* ═══════════════════════════════════════════════════════════════════════════
   SOUS-COMPOSANTS
═══════════════════════════════════════════════════════════════════════════ */

const SummaryItem = ({ icon: Icon, label, value, variant }) => (
  <div className="export-summary-item">
    <div className={`export-summary-icon-wrap ${variant}`}>
      <Icon size={20} strokeWidth={1.8} />
    </div>
    <div className="export-summary-body">
      <div className={`export-summary-value ${variant}`}>{value}</div>
      <div className="export-summary-label">{label}</div>
    </div>
  </div>
);

const ActionCard = ({ icon: Icon, title, desc, variant, state, onClick, disabled }) => {
  const isLoading = state === 'loading';
  const isDone = state === 'done';

  return (
    <button
      type="button"
      className={`export-action-card export-action-${variant} ${state}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <div className="export-action-accent-bar" />
      <div className="export-action-inner">
        <div className="export-action-icon">
          {isDone ? <FiCheck size={26} strokeWidth={2.5} /> : <Icon size={26} strokeWidth={1.6} />}
        </div>
        <div className="export-action-title">
          {isLoading && (
            <>
              <FiLoader className="spin" size={15} />
              <span>Traitement…</span>
            </>
          )}
          {isDone && <span>Terminé</span>}
          {!isLoading && !isDone && <span>{title}</span>}
        </div>
        <div className="export-action-desc">{desc}</div>
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */

const ExportTab = ({
  examForm = {},
  sections = [],
  allTemplates = [],
  selectedTemplate,
  isSavingExam,
  exportMessage,
  exportError,
  onSave,
  onTabChange,
  onReset,
}) => {
  const [status, setStatus] = useState({ type: 'idle', key: null, error: '' });

  const selectedTpl = selectedTemplate
    ? allTemplates.find((t) => t._id === selectedTemplate)
    : null;
  const backendTpl = !selectedTpl && examForm.templateId
    ? allTemplates.find((t) => t._id === examForm.templateId)
    : null;

  const totalQuestions = sections.reduce(
    (sum, sec) => sum + (sec.exercises || []).reduce(
      (s2, ex) => s2 + (ex.questions || []).filter((q) => q.type !== 'enonce').length, 0
    ), 0
  );

  const totalPts = sections.reduce(
    (sum, sec) => sum + (sec.exercises || []).reduce((es, ex) => {
      const ep = parseFloat(ex.points) || 0;
      const qp = (ex.questions || []).reduce((qs, q) => qs + (parseFloat(q.points) || 0), 0);
      return es + (ep || qp);
    }, 0), 0
  );

  const canExport = !!(selectedTpl || backendTpl) && totalQuestions > 0;

  const handleAction = useCallback(async (key, visibility) => {
    setStatus({ type: 'loading', key, error: '' });
    try {
      if (!canExport) {
        throw new Error(
          !selectedTpl && !backendTpl
            ? 'Veuillez choisir un modèle.'
            : 'Veuillez ajouter au moins une question.'
        );
      }

      await onSave(key === 'draft' ? 'Brouillon' : 'Exporte', visibility);

      setStatus({ type: 'done', key, error: '' });

      if (onReset && key !== 'draft') {
        setTimeout(() => {
          onReset();
          onTabChange('Questions');
        }, 1500);
      } else {
        setTimeout(() => setStatus({ type: 'idle', key: null, error: '' }), 2500);
      }
    } catch (err) {
      setStatus({ type: 'error', key: null, error: err.message || 'Erreur inattendue.' });
    }
  }, [canExport, selectedTpl, backendTpl, onSave, onReset, onTabChange]);

  const getState = (key) => {
    if (status.type === 'done' && status.key === key) return 'done';
    if (status.type === 'loading' && status.key === key) return 'loading';
    return 'idle';
  };

  const modelName = selectedTpl?.nom || backendTpl?.nom || 'Aucun';

  return (
    <section className="exam-card export-section">


      <h2>Finaliser l'examen</h2>


      {/* ── Résumé ── */}
      <div className="export-summary">
        <SummaryItem icon={FiLayers} label="Parties" value={sections.length} variant="blue" />
        <SummaryItem icon={FiHelpCircle} label="Questions" value={totalQuestions} variant="violet" />
        <SummaryItem icon={FiBarChart2} label="Barème" value={`${totalPts}/20`} variant="gold" />
        <SummaryItem icon={FiLayout} label="Modèle" value={modelName} variant="slate" />
      </div>

      {/* ── Alertes ── */}
      {!canExport && (
        <div className="export-alert export-alert--error">
          <span className="export-alert-dot" />
          <p>
            {!selectedTpl && !backendTpl
              ? "Veuillez choisir un modèle avant l'export."
              : "Veuillez ajouter au moins une question avant de sauvegarder ou exporter."}
          </p>
        </div>
      )}
      {status.error && (
        <div className="export-alert export-alert--error">
          <span className="export-alert-dot" />
          <p>{status.error}</p>
        </div>
      )}
      {exportMessage && (
        <div className="export-alert export-alert--success">
          <FiCheck size={14} />
          <p>{exportMessage}</p>
        </div>
      )}
      {exportError && (
        <div className="export-alert export-alert--error">
          <span className="export-alert-dot" />
          <p>{exportError}</p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="export-actions-grid">
        <ActionCard
          icon={FiGlobe}
          title="Exporter en Public"
          desc="Télécharge le Word et publie l'examen visible par tous les enseignants."
          variant="public"
          state={getState('public')}
          onClick={() => handleAction('public', 'public')}
          disabled={!canExport}
        />
        <ActionCard
          icon={FiLock}
          title="Exporter en Privé"
          desc="Télécharge le Word et sauvegarde l'examen visible uniquement par vous."
          variant="private"
          state={getState('private')}
          onClick={() => handleAction('private', 'private')}
          disabled={!canExport}
        />
        <ActionCard
          icon={FiSave}
          title="Sauvegarder Brouillon"
          desc="Enregistre l'examen sans téléchargement ni publication immédiate."
          variant="draft"
          state={getState('draft')}
          onClick={() => handleAction('draft')}
          disabled={!canExport}
        />
      </div>

      {/* ── Footer ── */}
      <div className="export-footer">
        <button
          type="button"
          className="exam-btn-secondary"
          onClick={() => onTabChange('Questions')}
          disabled={status.type === 'loading'}
        >
          <FiArrowLeft size={16} />
          <span>Retour aux questions</span>
        </button>
      </div>
    </section>
  );
};

export default ExportTab;