import React from 'react';

const TYPE_LABELS = {
  final: { label: 'Examen Final', color: '#1e4fa8' },
  cc: { label: 'Contrôle Continu', color: '#0d7a55' },
  rattrapage: { label: 'Rattrapage', color: '#92600a' },
  tp: { label: 'TP Noté', color: '#6d4fc9' },
};

const ModelesTab = ({
  allTemplates,
  selectedTemplate,
  onSelectTemplate,
  onTabChange,
  examForm,
  onFormChange,
}) => {

  const handleSelectTemplate = (tplId) => {
    const isCurrentlySelected = selectedTemplate === tplId;
    const newSelectedId = isCurrentlySelected ? null : tplId;

    onSelectTemplate(newSelectedId);

    if (!isCurrentlySelected) {
      const selectedTpl = allTemplates.find(t => t._id === tplId);
      if (!selectedTpl) return;

      onFormChange('titre', selectedTpl.titreExamen || selectedTpl.nom || '');
      onFormChange('matiere', selectedTpl.matiere || '');
      onFormChange('filiere', selectedTpl.discipline || selectedTpl.filiere || '');
      onFormChange('type', getExamTypeFromTemplate(selectedTpl.type) || '');
      onFormChange('duree', selectedTpl.duree || '');
      onFormChange('noteTotale', '20');
    }
  };

  const getExamTypeFromTemplate = (templateType) => {
    switch (templateType) {
      case 'final': return 'Examen final';
      case 'cc': return 'Contrôle continu';
      case 'rattrapage': return 'Rattrapage';
      case 'tp': return 'TP noté';
      default: return '';
    }
  };

  return (
    <section className="exam-card">
      <h3 className="exam-card-title">Choisissez un modèle d'examen</h3>
<input 
  type="text" 
  placeholder="Rechercher un modèle par nom ou matière..." 
  className="search-input"
/>
      {allTemplates.length === 0 ? (
        <div className="empty-state">
          <p>Aucun modèle disponible pour le moment.</p>
          <p className="hint">Contactez l'administrateur pour en créer.</p>
        </div>
      ) : (
        <div className="templates-a4-grid">
          {allTemplates.map((tpl) => {
            const isSelected = selectedTemplate === tpl._id;
            const typeInfo = TYPE_LABELS[tpl.type] || { label: tpl.type || 'Autre', color: '#6b7a99' };

            return (
              <div
                key={tpl._id}
                className={`a4-template-container ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectTemplate(tpl._id)}
              >
                {/* Aperçu A4 amélioré */}
                <div className="a4-mini-wrapper">
                  <A4Preview config={tpl} />
                </div>

                {/* Informations sous l'aperçu */}
                <div className="template-info-bar">
                  <div className="template-name">{tpl.nom || 'Modèle sans titre'}</div>

                  <div className="template-meta">
                    <span 
                      className="type-badge" 
                      style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}
                    >
                      {typeInfo.label}
                    </span>
                    {tpl.matiere && <span className="meta-item">{tpl.matiere}</span>}
                    {(tpl.discipline || tpl.filiere) && (
                      <span className="meta-item">
                        {tpl.discipline || tpl.filiere}
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Informations de l'examen */}
      <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>Informations de l'examen</h3>

      <div className="form-grid">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="exp-titre">Titre de l'examen *</label>
          <input
            id="exp-titre"
            type="text"
            placeholder="Ex : Examen Final — Algorithmique"
            value={examForm.titre || ''}
            onChange={(e) => onFormChange('titre', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="exp-matiere">Matière *</label>
          <input
            id="exp-matiere"
            type="text"
            placeholder="Ex : Algorithmique"
            value={examForm.matiere || ''}
            onChange={(e) => onFormChange('matiere', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="exp-filiere">Filière / Discipline</label>
          <input
            id="exp-filiere"
            type="text"
            placeholder="Ex : Informatique"
            value={examForm.filiere || ''}
            onChange={(e) => onFormChange('filiere', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="exp-niveau">Niveau</label>
          <input
            id="exp-niveau"
            type="text"
            placeholder="Ex : L2"
            value={examForm.niveau || ''}
            onChange={(e) => onFormChange('niveau', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="exp-type">Type d'examen</label>
          <select
            id="exp-type"
            value={examForm.type || ''}
            onChange={(e) => onFormChange('type', e.target.value)}
          >
            <option value="">— Choisir —</option>
            <option value="Contrôle continu">Contrôle continu</option>
            <option value="Examen final">Examen final</option>
            <option value="Rattrapage">Rattrapage</option>
            <option value="TP noté">TP noté</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="exp-duree">Durée (minutes)</label>
          <input
            id="exp-duree"
            type="number"
            placeholder="120"
            value={examForm.duree || ''}
            onChange={(e) => onFormChange('duree', e.target.value)}
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="exp-note">Note totale</label>
          <input
            id="exp-note"
            type="number"
            placeholder="20"
            value={examForm.noteTotale || ''}
            onChange={(e) => onFormChange('noteTotale', e.target.value)}
            min="0"
            step="0.5"
          />
        </div>
      </div>

      <div className="exam-actions">
        <button className="exam-btn-secondary" onClick={() => onTabChange('Bibliothèque')}>
          ← Retour
        </button>
        <button className="exam-btn-primary" onClick={() => onTabChange('Questions')}>
          Continuer vers Questions →
        </button>
      </div>
    </section>
  );
};

/* ==================== A4Preview Ajusté pour les mini cartes ==================== */
const A4Preview = ({ config }) => (
  <div className="a4-sheet-mini">
    {/* En-tête */}
    <div className="a4-header">
      <div className="a4-university">
        {config.universiteFr || 'Université Tunisienne'}
      </div>
      <div className="a4-institut">
        {config.institutFr || config.institut || 'Institut Supérieur'}
      </div>
      <div className="a4-departement">
        {config.departementFr || 'Département'}
      </div>
    </div>

    {/* Titre de l'examen */}
    <div className="a4-exam-title">
      {config.titreExamen || config.nom || 'Examen'}
      <span className="a4-exam-type">
        {config.type ? ` - ${config.type}` : ''}
      </span>
    </div>

    {/* Informations */}
    <div className="a4-info">
      <div className="a4-info-row">
        <span className="a4-label">Matière :</span>
        <span className="a4-value">{config.matiere || 'Non spécifiée'}</span>
      </div>
      <div className="a4-info-row">
        <span className="a4-label">Filière / Discipline :</span>
        <span className="a4-value">{config.discipline || config.filiere || '-'}</span>
      </div>
      <div className="a4-info-row">
        <span className="a4-label">Année Universitaire :</span>
        <span className="a4-value">{config.anneeUniversitaire || '-'}</span>
      </div>
    </div>

    {/* Zone étudiant */}
    <div className="a4-student-info">
      <div>Nom et Prénom de l'étudiant : _______________________________</div>
      <div>Groupe / Classe : ________________</div>
    </div>

    {/* Barre de notation exemple */}
    <div className="a4-marking">
      <div className="mark-bar">
        <span>Exercice 1</span>
        <span className="mark-dots">....................................</span>
        <span className="mark-score">/ 20</span>
      </div>
    </div>

    <div className="a4-footer-note">
      Bonne chance !
    </div>
  </div>
);

export default ModelesTab;