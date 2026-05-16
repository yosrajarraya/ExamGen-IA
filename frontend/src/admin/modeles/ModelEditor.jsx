import { useCallback, useMemo, useState } from 'react';
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
  FILIERES,
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
  const [current, setCurrent]       = useState(() => normalizeTemplate(model));
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');
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

  const filiereOptions = useMemo(() => {
    const opts = [];
    const dept = current.departementFr;
    if (dept && FILIERES[dept]) opts.push(...FILIERES[dept]);
    if (current.filiereFr && !opts.includes(current.filiereFr)) {
      opts.push(current.filiereFr);
    }
    return opts;
  }, [current.departementFr, current.filiereFr]);

  const handleSave = useCallback(async () => {
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
      if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.');

      const payload = {
        nom: current.nom,
        type: current.type,
        actif: current.actif ?? true,
        langue: current.langue,
        templateStyle: current.templateStyle || 'long',
        universiteFr: current.universiteFr,
        institutFr: current.institutFr,
        departementFr: current.departementFr,
        filiereFr: current.filiereFr || '',
        universiteAr: current.universiteAr || '',
        institutAr: current.institutAr || '',
        departementAr: current.departementAr || '',
        campusText: current.campusText,
        campusTextEn: current.campusTextEn || '',
        campusTagline: current.campusTagline || '',
        titreExamen: current.titreExamen,
        documentsAutorises: current.documentsAutorises,
        feuilleType: current.feuilleType,
        matiere: current.matiere || '',
        discipline: current.discipline || '',
        enseignants: current.enseignants || '',
        anneeUniversitaire: current.anneeUniversitaire,
        semestre: current.semestre,
        dateExamen: current.dateExamen || '',
        duree: current.duree,
        sections: { ...DEFAULT_SECTIONS, ...(current.sections || {}) },
        remarques: current.remarques || '',
        police: current.police,
        taille: current.taille,
        margeH: parseFloat(current.margeH) || 2,
        margeV: parseFloat(current.margeV) || 2,
        exercices: current.exercices || [],
      };

      const isNew = !current._id;
      const url = isNew
        ? 'http://localhost:5000/api/admin/word-template'
        : `http://localhost:5000/api/admin/word-template/${current._id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || `Erreur ${res.status}`);
      }

      const data = await res.json();
      const updated = normalizeTemplate(data, current._localId);
      setCurrent(updated);
      onModelUpdate?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [current, onModelUpdate]);

  const Field = ({ id, label, required, children, full }) => (
    <div className={`wt-field ${full ? 'wt-field-full' : ''}`}>
      <label htmlFor={id} className="wt-label">
        {label}
        {required && <span style={{ color: 'var(--crimson)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="model-editor-container">
      {/* ─── Header simple (plus de boutons ici) ─── */}
      <div className="editor-header">
        <button type="button" className="wt-btn-secondary" onClick={onBack}>
          ← Retour à la liste
        </button>
        <h2 className="editor-title">{current.nom || 'Nouveau modèle'}</h2>
      </div>

      <section className="wt-editor">
        {/* Identification */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Identification</div>
              <h3 className="wt-card-title">Informations du modèle</h3>
            </div>
          </div>
          <div className="wt-grid wt-grid-2">
            <Field id="fld-nom" label="Nom du modèle" required>
              <input id="fld-nom" className="wt-input" value={current.nom || ''} onChange={e => update('nom', e.target.value)} />
            </Field>
            <Field id="fld-type" label="Type" required>
              <select id="fld-type" className="wt-select" value={current.type || 'final'} onChange={e => update('type', e.target.value)}>
                {MODEL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field id="fld-langue" label="Langue" required>
              <select id="fld-langue" className="wt-select" value={current.langue || 'Français'} onChange={e => update('langue', e.target.value)}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field id="fld-style" label="Forme du modèle" required>
              <select id="fld-style" className="wt-select wt-select--highlight" value={current.templateStyle || 'long'} onChange={e => update('templateStyle', e.target.value)}>
                <option value="long">Forme 1 — Session principale avec NB</option>
                <option value="court">Forme 2 — Tableau simple</option>
              </select>
            </Field>
          </div>
        </div>

        {/* En-tête institutionnel */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">En-tête</div>
              <h3 className="wt-card-title">Informations institutionnelles</h3>
            </div>
          </div>
          <div className="wt-grid wt-grid-2">
            <Field id="fld-uni-fr" label="Université FR" required>
              <input id="fld-uni-fr" className="wt-input" value={current.universiteFr || ''} onChange={e => update('universiteFr', e.target.value)} />
            </Field>
            <Field id="fld-inst-fr" label="Institut FR" required>
              <input id="fld-inst-fr" className="wt-input" value={current.institutFr || ''} onChange={e => update('institutFr', e.target.value)} />
            </Field>
            <Field id="fld-dept-fr" label="Département FR" required>
              <select id="fld-dept-fr" className="wt-select" value={current.departementFr || ''} onChange={e => update('departementFr', e.target.value)}>
                <option value="">— Choisir —</option>
                {DEPARTEMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field id="fld-fil-fr" label="Filière FR">
              <select id="fld-fil-fr" className="wt-select" value={current.filiereFr || ''} onChange={e => update('filiereFr', e.target.value)}>
                <option value="">— Choisir —</option>
                {filiereOptions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field id="fld-campus" label="Texte campus" required>
              <input id="fld-campus" className="wt-input" value={current.campusText || ''} onChange={e => update('campusText', e.target.value)} placeholder="Ex : SFAX - TUNISIA" />
            </Field>
            <Field id="fld-campus-en" label="Ligne campus EN">
              <input id="fld-campus-en" className="wt-input" value={current.campusTextEn || ''} onChange={e => update('campusTextEn', e.target.value)} placeholder="Ex : North American Private University" />
            </Field>
            <Field id="fld-tagline" label="Tagline campus EN">
              <input id="fld-tagline" className="wt-input" value={current.campusTagline || ''} onChange={e => update('campusTagline', e.target.value)} placeholder="Ex : TECHNOLOGY · BUSINESS · ARCHITECTURE" />
            </Field>
            <Field id="fld-uni-ar" label="Université AR">
              <input id="fld-uni-ar" className="wt-input" value={current.universiteAr || ''} onChange={e => update('universiteAr', e.target.value)} />
            </Field>
            <Field id="fld-inst-ar" label="Institut AR">
              <input id="fld-inst-ar" className="wt-input" value={current.institutAr || ''} onChange={e => update('institutAr', e.target.value)} />
            </Field>
            <Field id="fld-dept-ar" label="Département AR" full>
              <input id="fld-dept-ar" className="wt-input" value={current.departementAr || ''} onChange={e => update('departementAr', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Champs examen */}
        <div className="wt-card wt-card--editable">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Examen</div>
              <h3 className="wt-card-title">Champs du modèle</h3>
            </div>
          </div>
          <div className="wt-grid wt-grid-2">
            <Field id="fld-titre" label="Titre de l'examen" required>
              <input id="fld-titre" className="wt-input" value={current.titreExamen || ''} onChange={e => update('titreExamen', e.target.value)} />
            </Field>
            <Field id="fld-docs" label="Documents autorisés" required>
              <select id="fld-docs" className="wt-select" value={current.documentsAutorises || ''} onChange={e => update('documentsAutorises', e.target.value)}>
                <option value="">— Choisir —</option>
                {DOCUMENTS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field id="fld-feuille" label="Type de feuille" required>
              <input id="fld-feuille" className="wt-input" value={current.feuilleType || ''} onChange={e => update('feuilleType', e.target.value)} />
            </Field>
            <Field id="fld-matiere" label="Matière">
              <input id="fld-matiere" className="wt-input wt-input--editable" value={current.matiere || ''} onChange={e => update('matiere', e.target.value)} placeholder="Ex : Administration de base de données" />
            </Field>
            <Field id="fld-discipline" label="Discipline / Niveau">
              <select id="fld-discipline" className="wt-select wt-select--editable" value={current.discipline || ''} onChange={e => update('discipline', e.target.value)}>
                <option value="">— Choisir —</option>
                {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field id="fld-ens" label="Enseignant(s)">
              <input id="fld-ens" className="wt-input wt-input--editable" value={current.enseignants || ''} onChange={e => update('enseignants', e.target.value)} placeholder="Ex : Amal Frikha / Taoufik Ben Abdallah" />
            </Field>
            <Field id="fld-annee" label="Année universitaire" required>
              <select id="fld-annee" className="wt-select" value={current.anneeUniversitaire || ANNEES[0]} onChange={e => update('anneeUniversitaire', e.target.value)}>
                {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field id="fld-semestre" label="Semestre" required>
              <select id="fld-semestre" className="wt-select" value={current.semestre || '1'} onChange={e => update('semestre', e.target.value)}>
                {SEMESTRES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field id="fld-date" label="Date examen">
              <input id="fld-date" className="wt-input" value={current.dateExamen || ''} onChange={e => update('dateExamen', e.target.value)} placeholder="06/01/2025" />
            </Field>
            <Field id="fld-duree" label="Durée" required>
              <select id="fld-duree" className="wt-select" value={current.duree || '1h30'} onChange={e => update('duree', e.target.value)}>
                {DUREES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field id="fld-note" label="Note totale">
              <input id="fld-note" className="wt-input" readOnly value="20 / 20" />
              <span className="wt-field-hint">Barème fixé automatiquement à 20/20</span>
            </Field>
          </div>
        </div>

        {/* Blocs */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Blocs</div>
              <h3 className="wt-card-title">Afficher / masquer les zones</h3>
            </div>
          </div>
          <div className="wt-toggle-grid">
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <label className="wt-switch-card" htmlFor={`sw-${key}`} key={key}>
                <span>
                  <span className="wt-switch-card__title">{label}</span>
                  <span className="wt-switch-card__sub">{current.sections?.[key] ? 'Affiché' : 'Masqué'}</span>
                </span>
                <input id={`sw-${key}`} className="wt-switch-input" type="checkbox" checked={!!current.sections?.[key]} onChange={e => updateSection(key, e.target.checked)} />
                <span className="wt-switch-slider" />
              </label>
            ))}
          </div>
          {current.sections?.blocRemarques && current.templateStyle !== 'court' && (
            <div className="wt-field wt-field-full wt-remarque-field">
              <label htmlFor="fld-remarques" className="wt-label">Contenu du bloc Remarques / NB</label>
              <textarea id="fld-remarques" className="wt-textarea" rows={5} placeholder={`— Réponses sur la feuille de l'énoncé.\n— Le barème est donné à titre indicatif.`} value={current.remarques || ''} onChange={e => update('remarques', e.target.value)} />
              <span className="wt-field-hint">Chaque ligne sera affichée dans le bloc NB.</span>
            </div>
          )}
        </div>

        {/* Mise en page */}
        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Mise en page</div>
              <h3 className="wt-card-title">Police et marges</h3>
            </div>
          </div>
          <div className="wt-grid wt-grid-2">
            <Field id="fld-police" label="Police" required>
              <select id="fld-police" className="wt-select" value={current.police || 'Times New Roman'} onChange={e => update('police', e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field id="fld-taille" label="Taille" required>
              <select id="fld-taille" className="wt-select" value={current.taille || '12pt'} onChange={e => update('taille', e.target.value)}>
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field id="fld-marge-h" label="Marge H (cm)">
              <input id="fld-marge-h" className="wt-input" type="number" min="1" max="5" step="0.5" value={current.margeH ?? '2'} onChange={e => update('margeH', e.target.value)} />
            </Field>
            <Field id="fld-marge-v" label="Marge V (cm)">
              <input id="fld-marge-v" className="wt-input" type="number" min="1" max="5" step="0.5" value={current.margeV ?? '2'} onChange={e => update('margeV', e.target.value)} />
            </Field>
          </div>
        </div>

        {error && <div className="wt-error" role="alert">{error}</div>}
      </section>

      {/* ─── BARRE D'ACTIONS EN BAS ─── */}
      <div className="">
        <button type="button" className="wt-btn-secondary" onClick={() => setShowPreview(true)}>Aperçu A4</button>
        <button type="button" className="wt-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      {/* Modale aperçu */}
      {showPreview && (
        <div className="preview-modal-overlay--fullscreen" onClick={() => setShowPreview(false)} role="dialog" aria-modal="true">
          <div className="preview-modal preview-modal--fullscreen" onClick={e => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {current.nom || 'Modèle'}</div>
              <button type="button" className="preview-modal-close" onClick={() => setShowPreview(false)} aria-label="Fermer l'aperçu">✕</button>
            </div>
            <div className="preview-modal-content"><ExamPreview model={current} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelEditor;