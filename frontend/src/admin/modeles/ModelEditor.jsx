import { useCallback, useState } from 'react';
import {
  DEFAULT_SECTIONS,
  SECTION_LABELS,
  MODEL_TYPES,
  LANGUAGES,
  FONTS,
  FONT_SIZES,
  SEMESTRES,
  DUREES,
  ANNEES,
  DEPARTEMENTS,
  DISCIPLINES,
  DOCUMENTS_OPTIONS,
  normalizeTemplate,
} from '../../utils/template.utils';
import { ExamPreview } from '../../components/ExamPreview';
import './WordTemplate.css';

const REQUIRED_FIELDS = [
  'nom', 'type', 'langue', 'templateStyle',
  'universiteFr', 'institutFr', 'departementFr', 'campusText',
  'titreExamen', 'documentsAutorises', 'feuilleType',
  'duree', 'semestre', 'anneeUniversitaire', 'police', 'taille',
];

const REQUIRED_LABELS = {
  nom: 'Nom du modèle', type: 'Type', langue: 'Langue',
  templateStyle: 'Forme du modèle', universiteFr: 'Université (FR)',
  institutFr: 'Institut (FR)', departementFr: 'Département (FR)',
  campusText: 'Texte campus', titreExamen: 'Titre examen',
  documentsAutorises: 'Documents autorisés', feuilleType: 'Type de feuille',
  duree: 'Durée', semestre: 'Semestre',
  anneeUniversitaire: 'Année universitaire', police: 'Police', taille: 'Taille',
};

const ModelEditor = ({ model, onBack, onModelUpdate }) => {
  const [current, setCurrent] = useState(normalizeTemplate(model));
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const update = useCallback((key, val) => {
    setCurrent(prev => ({ ...prev, [key]: val }));
    setSaved(false);
    setError('');
  }, []);

  const updateSection = useCallback((key, val) => {
    setCurrent(prev => ({
      ...prev,
      sections: { ...(prev.sections || DEFAULT_SECTIONS), [key]: val },
    }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const missing = REQUIRED_FIELDS.filter(f => {
        const v = current?.[f];
        return typeof v !== 'string' || v.trim() === '';
      });
      if (missing.length > 0) {
        throw new Error(
          `Champs obligatoires manquants : ${missing.map(f => REQUIRED_LABELS[f] || f).join(', ')}`
        );
      }

      const token = localStorage.getItem('token');
      const payload = {
        nom: current.nom, type: current.type, actif: current.actif,
        langue: current.langue, templateStyle: current.templateStyle || 'long',
        universiteFr: current.universiteFr, institutFr: current.institutFr,
        departementFr: current.departementFr,
        universiteAr: current.universiteAr || '', institutAr: current.institutAr || '',
        departementAr: current.departementAr || '',
        campusText: current.campusText,
        campusTextEn: current.campusTextEn || '',
        campusTagline: current.campusTagline || '',
        titreExamen: current.titreExamen,
        documentsAutorises: current.documentsAutorises,
        feuilleType: current.feuilleType,
        matiere: current.matiere || '', discipline: current.discipline || '',
        enseignants: current.enseignants || '',
        anneeUniversitaire: current.anneeUniversitaire,
        semestre: current.semestre, dateExamen: current.dateExamen || '',
        duree: current.duree,
        sections: { ...DEFAULT_SECTIONS, ...(current.sections || {}) },
        remarques: current.remarques || '',
        police: current.police, taille: current.taille,
        margeH: parseFloat(current.margeH) || 2,
        margeV: parseFloat(current.margeV) || 2,
        exercices: current.exercices || [],
      };

      const isNew = !current._id;
      const url   = isNew
        ? 'http://localhost:5000/api/admin/word-template'
        : `http://localhost:5000/api/admin/word-template/${current._id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || `Erreur ${res.status}`);
      }

      const data    = await res.json();
      const updated = normalizeTemplate(data, current._localId);
      setCurrent(updated);
      onModelUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="model-editor-container">
      <div className="editor-header">
        <button className="wt-btn-secondary" onClick={onBack}>← Retour à la liste</button>
        <h2 className="editor-title">{current.nom || 'Nouveau modèle'}</h2>
      </div>

      <section className="wt-editor">
        {/* Identification */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div><div className="wt-card-eyebrow">Identification</div><h3 className="wt-card-title">Informations du modèle</h3></div>
          </div>
          <div className="wt-grid wt-grid-2">
            <div className="wt-field"><label className="wt-label">Nom du modèle *</label><input className="wt-input" value={current.nom || ''} onChange={e => update('nom', e.target.value)} /></div>
            <div className="wt-field"><label className="wt-label">Type *</label>
              <select className="wt-select" value={current.type || 'final'} onChange={e => update('type', e.target.value)}>
                {MODEL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Langue *</label>
              <select className="wt-select" value={current.langue || 'Français'} onChange={e => update('langue', e.target.value)}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Forme du modèle *</label>
              <select className="wt-select wt-select--highlight" value={current.templateStyle || 'long'} onChange={e => update('templateStyle', e.target.value)}>
                <option value="long">Forme 1 — Session principale avec NB</option>
                <option value="court">Forme 2 — Tableau simple</option>
              </select>
            </div>
          </div>
        </div>

        {/* En-tête institutionnel */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div><div className="wt-card-eyebrow">En-tête</div><h3 className="wt-card-title">Informations institutionnelles</h3></div>
          </div>
          <div className="wt-grid wt-grid-2">
            <div className="wt-field"><label className="wt-label">Université FR *</label><input className="wt-input" value={current.universiteFr || ''} onChange={e => update('universiteFr', e.target.value)} /></div>
            <div className="wt-field"><label className="wt-label">Institut FR *</label><input className="wt-input" value={current.institutFr || ''} onChange={e => update('institutFr', e.target.value)} /></div>
            <div className="wt-field"><label className="wt-label">Département FR *</label>
              <select className="wt-select" value={current.departementFr || ''} onChange={e => update('departementFr', e.target.value)}>
                <option value="">— Choisir —</option>
                {DEPARTEMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Texte campus *</label><input className="wt-input" value={current.campusText || ''} onChange={e => update('campusText', e.target.value)} placeholder="Ex : SFAX - TUNISIA" /></div>
            <div className="wt-field"><label className="wt-label">Ligne campus EN</label><input className="wt-input" value={current.campusTextEn || ''} onChange={e => update('campusTextEn', e.target.value)} placeholder="Ex : North American Private University" /></div>
            <div className="wt-field"><label className="wt-label">Tagline campus EN</label><input className="wt-input" value={current.campusTagline || ''} onChange={e => update('campusTagline', e.target.value)} placeholder="Ex : TECHNOLOGY · BUSINESS · ARCHITECTURE" /></div>
            <div className="wt-field"><label className="wt-label">Université AR</label><input className="wt-input" value={current.universiteAr || ''} onChange={e => update('universiteAr', e.target.value)} /></div>
            <div className="wt-field"><label className="wt-label">Institut AR</label><input className="wt-input" value={current.institutAr || ''} onChange={e => update('institutAr', e.target.value)} /></div>
            <div className="wt-field wt-field-full"><label className="wt-label">Département AR</label><input className="wt-input" value={current.departementAr || ''} onChange={e => update('departementAr', e.target.value)} /></div>
          </div>
        </div>

        {/* Champs examen */}
        <div className="wt-card wt-card--editable">
          <div className="wt-card-header">
            <div><div className="wt-card-eyebrow">Examen</div><h3 className="wt-card-title">Champs du modèle</h3></div>
          </div>
          <div className="wt-grid wt-grid-2">
            <div className="wt-field"><label className="wt-label">Titre de l'examen *</label><input className="wt-input" value={current.titreExamen || ''} onChange={e => update('titreExamen', e.target.value)} /></div>
            <div className="wt-field"><label className="wt-label">Documents autorisés *</label>
              <select className="wt-select" value={current.documentsAutorises || ''} onChange={e => update('documentsAutorises', e.target.value)}>
                <option value="">— Choisir —</option>
                {DOCUMENTS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Type de feuille *</label><input className="wt-input" value={current.feuilleType || ''} onChange={e => update('feuilleType', e.target.value)} /></div>
            <div className="wt-field"><label className="wt-label">Matière</label><input className="wt-input wt-input--editable" value={current.matiere || ''} onChange={e => update('matiere', e.target.value)} placeholder="Ex : Administration de base de données" /></div>
            <div className="wt-field"><label className="wt-label">Discipline / Niveau</label>
              <select className="wt-select wt-select--editable" value={current.discipline || ''} onChange={e => update('discipline', e.target.value)}>
                <option value="">— Choisir —</option>
                {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Enseignant(s)</label><input className="wt-input wt-input--editable" value={current.enseignants || ''} onChange={e => update('enseignants', e.target.value)} placeholder="Ex : Amal Frikha / Taoufik Ben Abdallah" /></div>
            <div className="wt-field"><label className="wt-label">Année universitaire *</label>
              <select className="wt-select" value={current.anneeUniversitaire || ANNEES[0]} onChange={e => update('anneeUniversitaire', e.target.value)}>
                {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Semestre *</label>
              <select className="wt-select" value={current.semestre || '1'} onChange={e => update('semestre', e.target.value)}>
                {SEMESTRES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Date examen</label><input className="wt-input" value={current.dateExamen || ''} onChange={e => update('dateExamen', e.target.value)} placeholder="06/01/2025" /></div>
            <div className="wt-field"><label className="wt-label">Durée *</label>
              <select className="wt-select" value={current.duree || '1h30'} onChange={e => update('duree', e.target.value)}>
                {DUREES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Note totale</label><input className="wt-input" type="text" value="20 / 20" disabled /><span className="wt-field-hint">Barème fixé automatiquement à 20/20</span></div>
          </div>
        </div>

        {/* Blocs */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div><div className="wt-card-eyebrow">Blocs</div><h3 className="wt-card-title">Afficher / masquer les zones</h3></div>
          </div>
          <div className="wt-toggle-grid">
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <label className="wt-switch-card" key={key}>
                <span>
                  <span className="wt-switch-card__title">{label}</span>
                  <span className="wt-switch-card__sub">{current.sections?.[key] ? 'Affiché' : 'Masqué'}</span>
                </span>
                <input className="wt-switch-input" type="checkbox" checked={!!current.sections?.[key]} onChange={e => updateSection(key, e.target.checked)} />
                <span className="wt-switch-slider" />
              </label>
            ))}
          </div>
          {current.sections?.blocRemarques && current.templateStyle !== 'court' && (
            <div className="wt-field wt-field-full wt-remarque-field">
              <label className="wt-label">Contenu du bloc Remarques / NB</label>
              <textarea className="wt-textarea" rows={5} placeholder={`— Réponses sur la feuille de l'énoncé.\n— Le barème est donné à titre indicatif.`} value={current.remarques || ''} onChange={e => update('remarques', e.target.value)} />
              <span className="wt-field-hint">Chaque ligne sera affichée dans le bloc NB.</span>
            </div>
          )}
        </div>

        {/* Mise en page */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div><div className="wt-card-eyebrow">Mise en page</div><h3 className="wt-card-title">Police et marges</h3></div>
          </div>
          <div className="wt-grid wt-grid-2">
            <div className="wt-field"><label className="wt-label">Police *</label>
              <select className="wt-select" value={current.police || 'Times New Roman'} onChange={e => update('police', e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Taille *</label>
              <select className="wt-select" value={current.taille || '12pt'} onChange={e => update('taille', e.target.value)}>
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="wt-field"><label className="wt-label">Marge H (cm)</label><input className="wt-input" type="number" min="1" max="5" step="0.5" value={current.margeH || '2'} onChange={e => update('margeH', e.target.value)} /></div>
            <div className="wt-field"><label className="wt-label">Marge V (cm)</label><input className="wt-input" type="number" min="1" max="5" step="0.5" value={current.margeV || '2'} onChange={e => update('margeV', e.target.value)} /></div>
          </div>
        </div>

        {error && <div className="wt-error">{error}</div>}
      </section>

      <div className="wt-footer-actions">
        <button type="button" className="wt-btn-secondary" onClick={() => setShowPreview(true)}>Aperçu A4</button>
        <button type="button" className="wt-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      {showPreview && (
        <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {current.nom || 'Modèle'}</div>
              <button className="preview-modal-close" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="preview-modal-content"><ExamPreview model={current} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelEditor;