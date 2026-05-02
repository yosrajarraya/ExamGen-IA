import React, { useEffect, useState } from 'react';
import {
  TYPE_LABELS,
  normalizeTemplate,
  makeDefaultModel,
} from '../../utils/template.utils';
import { ExamPreview, ExamPreviewScaled } from '../../components/ExamPreview';
import './WordTemplate.css';

const ModelsList = ({ onEditModel, onCreateModel }) => {
  const [models,        setModels]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [previewModel,  setPreviewModel]  = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const token = localStorage.getItem('token');
        const res   = await fetch('http://localhost:5000/api/admin/word-template', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : [];
        setModels(data.map(m => normalizeTemplate(m)));
      } catch {
        setModels([makeDefaultModel()]);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleCreate = () => {
    const newModel = makeDefaultModel();
    setModels(prev => [...prev, newModel]);
    onCreateModel(newModel);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (!confirmDelete._id) {
      setModels(prev => prev.filter(m => m._localId !== confirmDelete._localId));
      setConfirmDelete(null);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/admin/word-template/${confirmDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setModels(prev => prev.filter(m => m._id !== confirmDelete._id));
    } finally {
      setConfirmDelete(null);
    }
  };

  const filtered = models.filter(m => {
    const q = searchQuery.toLowerCase();
    return !q
      || (m.nom        || '').toLowerCase().includes(q)
      || (m.matiere    || '').toLowerCase().includes(q)
      || (m.discipline || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="wt-loading">Chargement des modèles...</div>;

  return (
    <div className="admin-models-page">
      <div className="admin-models-header">
        <div>
          <div className="wt-panel-eyebrow">Bibliothèque</div>
          <h3 className="wt-panel-title">Modèles Word ({models.length})</h3>
        </div>
        <button className="wt-btn-new" onClick={handleCreate}>+ Nouveau Modèle</button>
      </div>

      <div className="admin-models-search">
        <input
          type="text"
          placeholder="Rechercher par nom, matière ou discipline..."
          className="admin-search-input"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="admin-templates-grid">
        {filtered.map(m => {
          const typeInfo = TYPE_LABELS[m.type] || { label: 'Autre', color: '#64748b' };
          return (
            <div key={m._localId} className="admin-template-card" onClick={() => onEditModel(m)}>
              <div className="admin-card-preview">
                <ExamPreviewScaled model={m} visibleHeight={240} />
              </div>

              <div className="admin-card-info">
                <div className="admin-card-name">{m.nom || 'Modèle sans nom'}</div>
                <div className="admin-card-meta">
                  <span className="admin-type-badge" style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}>
                    {typeInfo.label}
                  </span>
                  <span className="admin-meta-item">{m.templateStyle === 'court' ? 'Forme 2' : 'Forme 1'}</span>
                  {m.matiere && <span className="admin-meta-item">{m.matiere}</span>}
                </div>
              </div>

              <button className="admin-card-preview-btn" onClick={e => { e.stopPropagation(); setPreviewModel(m); }} title="Aperçu">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button className="admin-card-delete" onClick={e => { e.stopPropagation(); setConfirmDelete(m); }} title="Supprimer">
                <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          );
        })}
      </div>

      {previewModel && (
        <div className="preview-modal-overlay" onClick={() => setPreviewModel(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {previewModel.nom}</div>
              <button className="preview-modal-close" onClick={() => setPreviewModel(null)}>✕</button>
            </div>
            <div className="preview-modal-content"><ExamPreview model={previewModel} /></div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="confirmation-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirmation-dialog" onClick={e => e.stopPropagation()}>
            <h3>Supprimer ce modèle ?</h3>
            <p>« {confirmDelete.nom} » sera définitivement supprimé. Cette action est irréversible.</p>
            <div className="confirmation-actions">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-confirm" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelsList;