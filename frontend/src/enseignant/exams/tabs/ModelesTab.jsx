import React, { useState } from 'react';
import {
  TYPE_LABELS,
  DISCIPLINES,
  DUREES,
  ANNEES,
  DOCUMENTS_OPTIONS,
} from '../../../utils/template.utils';
import { ExamPreview, ExamPreviewScaled } from '../../../components/ExamPreview';

const ITEMS_PER_PAGE = 3;

const ModelesTab = ({
  allTemplates = [],
  selectedTemplate,
  onSelectTemplate,
  onTabChange,
  examForm = {},
  onFormChange,
}) => {
  const [currentPage,  setCurrentPage]  = useState(1);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [previewModel, setPreviewModel] = useState(null);

  const filtered = allTemplates.filter(tpl => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (tpl.nom        || '').toLowerCase().includes(q) ||
      (tpl.matiere    || '').toLowerCase().includes(q) ||
      (tpl.discipline || '').toLowerCase().includes(q) ||
      (tpl.enseignants || '').toLowerCase().includes(q)
    );
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage    = Math.min(currentPage, totalPages);
  const pageStart   = (safePage - 1) * ITEMS_PER_PAGE;
  const paginated   = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const handleSearch = e => { setSearchQuery(e.target.value); setCurrentPage(1); };

  const handleSelectTemplate = tplId => {
    if (selectedTemplate === tplId) { onSelectTemplate(null); return; }
    const tpl = allTemplates.find(t => t._id === tplId);
    if (!tpl) return;
    onSelectTemplate(tplId);
    // Pré-remplissage des champs depuis le modèle
    onFormChange('templateId',          tpl._id);
    onFormChange('templateStyle',        tpl.templateStyle || 'long');
    onFormChange('titre',                tpl.titreExamen || tpl.nom || '');
    onFormChange('matiere',              tpl.matiere     || '');
    onFormChange('filiere',              tpl.discipline  || tpl.filiere || '');
    onFormChange('enseignants',          tpl.enseignants || '');
    onFormChange('type',                 tpl.type        || '');
    onFormChange('duree',                tpl.duree       || '');
    onFormChange('dateExamen',           tpl.dateExamen  || '');
    onFormChange('documentsAutorises',   tpl.documentsAutorises || '');
    onFormChange('anneeUniversitaire',   tpl.anneeUniversitaire || '');
    onFormChange('semestre',             tpl.semestre    || '');
    onFormChange('noteTotale',           '20');
  };

  const selectedTpl = allTemplates.find(tpl => tpl._id === selectedTemplate);

  return (
    <section className="exam-card">
      <h3 className="exam-card-title">Choisissez un modèle d'examen</h3>

      <input
        type="text"
        placeholder="Rechercher un modèle par nom, matière ou discipline..."
        className="search-input"
        value={searchQuery}
        onChange={handleSearch}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>Aucun modèle disponible pour le moment.</p>
          <p className="hint">Contactez l'administrateur pour en créer.</p>
        </div>
      ) : (
        <>
          <div className="templates-a4-grid">
            {paginated.map(tpl => {
              const isSelected = selectedTemplate === tpl._id;
              const typeInfo   = TYPE_LABELS[tpl.type] || { label: tpl.type || 'Autre', color: '#6b7a99' };
              return (
                <div
                  key={tpl._id}
                  className={`a4-template-container ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectTemplate(tpl._id)}
                >
                  <button type="button" className="template-eye-btn" title="Consulter le modèle"
                    onClick={e => { e.stopPropagation(); setPreviewModel(tpl); }}>
                    👁
                  </button>
                  <div className="a4-mini-wrapper">
                    <ExamPreviewScaled model={tpl} examForm={examForm} visibleHeight={290} />
                  </div>
                  <div className="template-info-bar">
                    <div className="template-name">{tpl.nom || 'Modèle sans titre'}</div>
                    <div className="template-meta">
                      <span className="type-badge" style={{ backgroundColor: `${typeInfo.color}18`, color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                      <span className="meta-item">{tpl.templateStyle === 'court' ? 'Forme 2' : 'Forme 1'}</span>
                      {tpl.matiere && <span className="meta-item">{tpl.matiere}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="tpl-pagination">
              <button className="tpl-pagination__btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={safePage === 1}>← Précédent</button>
              <div className="tpl-pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} className={`tpl-pagination__page ${safePage === page ? 'tpl-pagination__page--active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                ))}
              </div>
              <button className="tpl-pagination__btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={safePage === totalPages}>Suivant →</button>
            </div>
          )}
          <div className="tpl-pagination-count">
            Affichage {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} modèle(s)
          </div>
        </>
      )}

      {selectedTpl && (
        <div className="selected-template-box">
          <div><strong>Modèle sélectionné :</strong> {selectedTpl.nom || 'Modèle sans titre'}</div>
          <button type="button" className="exam-btn-secondary" onClick={() => setPreviewModel(selectedTpl)}>👁 Aperçu du modèle</button>
        </div>
      )}

      {/* Formulaire enseignant */}
      <h3 style={{ marginTop: '34px', marginBottom: '20px' }}>Informations du devoir</h3>
      <p className="teacher-form-hint">Ces champs sont modifiables par l'enseignant pour adapter le modèle au devoir.</p>

      <div className="form-grid">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="exp-titre">Titre du devoir *</label>
          <input id="exp-titre" type="text" placeholder="Ex : Examen Final — Algorithmique" value={examForm.titre || ''} onChange={e => onFormChange('titre', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-matiere">Matière *</label>
          <input id="exp-matiere" type="text" placeholder="Ex : Algorithmique" value={examForm.matiere || ''} onChange={e => onFormChange('matiere', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-filiere">Discipline / Filière *</label>
          <select id="exp-filiere" value={examForm.filiere || ''} onChange={e => onFormChange('filiere', e.target.value)}>
            <option value="">— Choisir —</option>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-enseignants">Enseignant(s) *</label>
          <input id="exp-enseignants" type="text" placeholder="Nom et prénom de l'enseignant" value={examForm.enseignants || ''} onChange={e => onFormChange('enseignants', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-type">Type d'examen</label>
          <select id="exp-type" value={examForm.type || ''} onChange={e => onFormChange('type', e.target.value)}>
            <option value="">— Choisir —</option>
            <option value="final">Examen final</option>
            <option value="cc">Contrôle continu</option>
            <option value="rattrapage">Rattrapage</option>
            <option value="tp">TP noté</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-date">Date du devoir</label>
          <input id="exp-date" type="text" placeholder="Ex : 07/11/2024" value={examForm.dateExamen || ''} onChange={e => onFormChange('dateExamen', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-duree">Durée</label>
          <select id="exp-duree" value={examForm.duree || ''} onChange={e => onFormChange('duree', e.target.value)}>
            <option value="">— Choisir —</option>
            {DUREES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-documents">Documents autorisés</label>
          <select id="exp-documents" value={examForm.documentsAutorises || ''} onChange={e => onFormChange('documentsAutorises', e.target.value)}>
            <option value="">— Choisir —</option>
            {DOCUMENTS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-annee">Année universitaire</label>
          <select id="exp-annee" value={examForm.anneeUniversitaire || ''} onChange={e => onFormChange('anneeUniversitaire', e.target.value)}>
            <option value="">— Choisir —</option>
            {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-semestre">Semestre</label>
          <select id="exp-semestre" value={examForm.semestre || ''} onChange={e => onFormChange('semestre', e.target.value)}>
            <option value="">— Choisir —</option>
            <option value="1">Semestre 1</option>
            <option value="2">Semestre 2</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-note">Note totale</label>
          <input id="exp-note" type="text" value="20 / 20" disabled />
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--ce-text-muted)' }}>Barème fixé automatiquement à 20/20</small>
        </div>
      </div>

      <div className="exam-actions">
        <button className="exam-btn-secondary" onClick={() => onTabChange('Bibliothèque')}>← Retour</button>
        <button className="exam-btn-primary" onClick={() => onTabChange('Questions')} disabled={!selectedTemplate} title={!selectedTemplate ? 'Veuillez choisir un modèle' : ''}>
          Continuer vers Questions →
        </button>
      </div>

      {previewModel && (
        <div className="template-preview-overlay" onClick={() => setPreviewModel(null)}>
          <div className="template-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="template-preview-header">
              <strong>Aperçu du modèle</strong>
              <button type="button" onClick={() => setPreviewModel(null)}>✕</button>
            </div>
            <div className="template-preview-content">
              <ExamPreview model={previewModel} examForm={examForm} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ModelesTab;