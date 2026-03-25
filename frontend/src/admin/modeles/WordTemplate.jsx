import { useState, useEffect, useCallback } from 'react';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { adminNavItems, buildAdminProfile } from '../../components/sidebar/sidebarConfigs';
import './WordTemplate.css';

const LANGUAGES = ['Français', 'Arabe', 'Bilingue'];
const FONTS = ['Arial', 'Times New Roman', 'Calibri', 'Georgia', 'Helvetica', 'Cambria'];
const SIZES = ['10pt', '11pt', '12pt', '13pt', '14pt'];
const MODEL_TYPES = [
  { id: 'final', label: 'Examen Final' },
  { id: 'cc', label: 'Contrôle Continu' },
  { id: 'rattrapage', label: 'Rattrapage' },
  { id: 'tp', label: 'TP / Projet' },
];
const SECTION_LABELS = {
  zoneNomPrenom: 'Zone Nom & Prénom', zoneGroupe: 'Zone Groupe',
  blocNote: 'Bloc Note', blocCommentaires: 'Bloc Commentaires',
  blocSignature: 'Bloc Signature', blocRemarques: 'Bloc Remarques',
};
const DEFAULT_SECTIONS = { zoneNomPrenom: true, zoneGroupe: true, blocNote: true, blocCommentaires: true, blocSignature: true, blocRemarques: true };

const makeDefault = () => ({
  _localId: `local_${Date.now()}`, _id: null,
  nom: 'Nouveau modèle', type: 'final', actif: true, langue: 'Français',
  universiteFr: 'Institut Informatique de Tunis', institutFr: 'Institut International de Technologie',
  departementFr: 'Département Informatique', universiteAr: '', institutAr: '', departementAr: '',
  titreExamen: 'DEVOIR SURVEILLÉ', codeExamen: 'C', matiere: '', discipline: '', enseignants: '',
  anneeUniversitaire: '2024-2025', semestre: '1', dateExamen: '', nombrePages: '6', duree: '1h30',
  documentsAutorises: "PC & Internet non autorisés", feuilleType: "Feuille d'énoncé",
  sections: { ...DEFAULT_SECTIONS }, police: 'Arial', taille: '11pt', margeH: '2', margeV: '2',
});

const normalizeFromServer = (t, existingLocalId = null) => ({
  ...t, _localId: existingLocalId || t._id, _id: t._id,
  margeH: String(t.margeH ?? 2), margeV: String(t.margeV ?? 2),
  sections: t.sections || { ...DEFAULT_SECTIONS },
});

const A4Preview = ({ config }) => (
  <div className="a4-sheet" style={{ fontFamily: config.police, fontSize: config.taille, paddingLeft: `${config.margeH}cm`, paddingRight: `${config.margeH}cm`, paddingTop: `${config.margeV}cm`, paddingBottom: `${config.margeV}cm` }}>
    <div className="exam-header-top">
      <div className="exam-header-left"><div className="small-header">North American | SFAX</div><div className="small-header">Private University</div><div className="small-sub">TECHNOLOGY . BUSINESS . ARCHITECTURE</div></div>
      <div className="exam-header-center">
        {config.langue !== 'Français' && <><div className="header-ar">{config.universiteAr}</div><div className="header-ar">{config.institutAr}</div><div className="header-ar">{config.departementAr}</div></>}
        <div className="header-fr">{config.universiteFr}</div><div className="header-fr">{config.institutFr}</div><div className="header-fr">{config.departementFr}</div>
      </div>
      <div className="exam-header-right"><div className="iit-logo-box">IIT</div></div>
    </div>
    <div className="exam-main-box">
      <div className="exam-title-row"><div className="exam-title-left">{config.titreExamen} {config.codeExamen}</div><div className="exam-title-right" /></div>
      <div className="exam-info-grid">
        <div className="exam-info-left"><div><strong>Matière :</strong> {config.matiere}</div><div><strong>Discipline :</strong> {config.discipline}</div><div><strong>Enseignants :</strong> {config.enseignants}</div><div><strong>Documents autorisés :</strong> {config.documentsAutorises}</div></div>
        <div className="exam-info-right"><div><strong>Année Universitaire :</strong> {config.anneeUniversitaire}</div><div><strong>Semestre :</strong> {config.semestre} ({config.dateExamen})</div><div><strong>Nombre de page :</strong> {config.nombrePages}</div><div><strong>{config.feuilleType}</strong> / <strong>Durée :</strong> {config.duree}</div></div>
      </div>
      {(config.sections?.zoneNomPrenom || config.sections?.zoneGroupe) && (
        <div className="exam-student-row">
          {config.sections?.zoneNomPrenom && <div className="student-name-line"><strong>Prénom &amp; Nom :</strong> ______________________________________</div>}
          {config.sections?.zoneGroupe && <div className="student-group-line"><strong>Groupe</strong> ______</div>}
        </div>
      )}
    </div>
    {(config.sections?.blocNote || config.sections?.blocCommentaires || config.sections?.blocSignature) && (
      <div className="exam-marking-row">
        {config.sections?.blocNote && <div className="mark-box"><strong>Note /20</strong></div>}
        {config.sections?.blocCommentaires && <div className="mark-box large"><strong>Commentaires</strong></div>}
        {config.sections?.blocSignature && <div className="mark-box"><strong>Signature</strong></div>}
      </div>
    )}
    {config.sections?.blocRemarques && (
      <div className="exam-notes-block">
        <div className="notes-title">NB.</div>
        <div>— Le barème est fourni à titre indicatif et peut être ajusté</div>
        <div>— La durée de l'examen est de {config.duree}</div>
        <div>— Les ordinateurs et l'accès à Internet sont strictement interdits</div>
      </div>
    )}
  </div>
);

const WordTemplate = () => {
  const { user, logout } = useAuth();
  const [models, setModels] = useState([]);
  const [selectedLocalId, setSelectedLocalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const selected = models.find((m) => m._localId === selectedLocalId) || null;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/admin/word-template', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((t) => normalizeFromServer(t));
          setModels(mapped); setSelectedLocalId(mapped[0]._localId);
        } else { const def = makeDefault(); setModels([def]); setSelectedLocalId(def._localId); }
      } catch { const def = makeDefault(); setModels([def]); setSelectedLocalId(def._localId); }
      finally { setLoading(false); }
    })();
  }, []);

  const update = useCallback((key, val) => {
    setModels((prev) => prev.map((m) => m._localId === selectedLocalId ? { ...m, [key]: val } : m));
    setSaved(false); setError('');
  }, [selectedLocalId]);

  const updateSection = useCallback((key, val) => {
    setModels((prev) => prev.map((m) => m._localId === selectedLocalId ? { ...m, sections: { ...(m.sections || {}), [key]: val } } : m));
    setSaved(false);
  }, [selectedLocalId]);

  const handleCreate = () => { const m = makeDefault(); setModels((prev) => [...prev, m]); setSelectedLocalId(m._localId); setSaved(false); setError(''); };

  const handleDelete = async (localId) => {
    if (models.length === 1) { setError('Gardez au moins un modèle.'); return; }
    if (!window.confirm('Supprimer ce modèle ?')) return;
    const target = models.find((m) => m._localId === localId);
    if (target?._id) {
      try { const token = localStorage.getItem('token'); await fetch(`http://localhost:5000/api/admin/word-template/${target._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); }
      catch (err) { console.error(err); }
    }
    const remaining = models.filter((m) => m._localId !== localId);
    setModels(remaining);
    if (selectedLocalId === localId) setSelectedLocalId(remaining[0]?._localId || null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { nom: selected.nom, type: selected.type, actif: selected.actif, langue: selected.langue, universiteFr: selected.universiteFr, institutFr: selected.institutFr, departementFr: selected.departementFr, universiteAr: selected.universiteAr || '', institutAr: selected.institutAr || '', departementAr: selected.departementAr || '', titreExamen: selected.titreExamen, codeExamen: selected.codeExamen, matiere: selected.matiere, discipline: selected.discipline, enseignants: selected.enseignants, anneeUniversitaire: selected.anneeUniversitaire, semestre: selected.semestre, dateExamen: selected.dateExamen, nombrePages: selected.nombrePages, duree: selected.duree, documentsAutorises: selected.documentsAutorises, feuilleType: selected.feuilleType, sections: selected.sections, police: selected.police, taille: selected.taille, margeH: parseFloat(selected.margeH) || 2, margeV: parseFloat(selected.margeV) || 2 };
      const isNew = !selected._id;
      const url = isNew ? 'http://localhost:5000/api/admin/word-template' : `http://localhost:5000/api/admin/word-template/${selected._id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || `Erreur ${res.status}`); }
      const data = await res.json();
      const updated = normalizeFromServer(data, selected._localId);
      setModels((prev) => prev.map((m) => m._localId === selectedLocalId ? updated : m));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err) { setError(err.message || 'Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  return (
    <div className="new-admin-layout">
      {/* ✅ Sidebar partagée — aucun code sidebar ici */}
      <Sidebar
        roleLabel="Administration"
        navItems={adminNavItems}
        profile={buildAdminProfile(user)}
        onLogout={logout}
      />

      <main className="new-admin-main">
        <div className="new-topbar">
          <div className="new-topbar-left">
            <h1 className="new-topbar-title">Modèles Word</h1>
            <p className="new-topbar-sub">Configurer l'en-tête institutionnel éditable</p>
          </div>
        </div>

        <div className="new-admin-body wt-body">
          {loading ? <div className="wt-loading">Chargement...</div> : (
            <div className="wt-root">
              <div className="wt-sidebar">
                <div className="wt-sidebar__header">
                  <span className="wt-sidebar__title">Modèles ({models.length})</span>
                  <button className="wt-btn-new" onClick={handleCreate}>+ Nouveau</button>
                </div>
                <div className="wt-sidebar__list">
                  {models.map((m) => (
                    <div key={m._localId} className={`model-card ${m._localId === selectedLocalId ? 'model-card--active' : ''}`} onClick={() => { setSelectedLocalId(m._localId); setSaved(false); setError(''); }}>
                      <div className="model-card__name">{m.nom}</div>
                      <div className="model-card__meta">{m.langue}</div>
                    </div>
                  ))}
                </div>
                {selected && <button className="wt-btn-delete" onClick={() => handleDelete(selected._localId)}>Supprimer ce modèle</button>}
              </div>

              {selected && (
                <div className="wt-form">
                  <div className="wt-section">
                    <div className="wt-section__title">Informations générales</div>
                    <div className="wt-field"><label className="wt-label">Nom du modèle</label><input className="wt-input" value={selected.nom} onChange={(e) => update('nom', e.target.value)} /></div>
                    <div className="wt-row">
                      <div className="wt-field wt-field-grow"><label className="wt-label">Type</label><select className="wt-select" value={selected.type} onChange={(e) => update('type', e.target.value)}>{MODEL_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                      <div className="wt-field wt-field-grow"><label className="wt-label">Langue</label><select className="wt-select" value={selected.langue} onChange={(e) => update('langue', e.target.value)}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select></div>
                    </div>
                  </div>

                  <div className="wt-section">
                    <div className="wt-section__title">En-tête institutionnel</div>
                    {[['universiteFr','Université (FR)'],['institutFr','Institut (FR)'],['departementFr','Département (FR)'],['universiteAr','Université (AR)'],['institutAr','Institut (AR)'],['departementAr','Département (AR)']].map(([key, label]) => (
                      <div className="wt-field" key={key}><label className="wt-label">{label}</label><input className="wt-input" value={selected[key]} onChange={(e) => update(key, e.target.value)} /></div>
                    ))}
                  </div>

                  <div className="wt-section">
                    <div className="wt-section__title">Bloc examen</div>
                    <div className="wt-row">
                      <div className="wt-field wt-field-grow"><label className="wt-label">Titre examen</label><input className="wt-input" value={selected.titreExamen} onChange={(e) => update('titreExamen', e.target.value)} /></div>
                      <div className="wt-field wt-field-sm"><label className="wt-label">Code</label><input className="wt-input" value={selected.codeExamen} onChange={(e) => update('codeExamen', e.target.value)} /></div>
                    </div>
                    {[['matiere','Matière'],['discipline','Discipline'],['enseignants','Enseignants'],['documentsAutorises','Documents autorisés']].map(([key, label]) => (
                      <div className="wt-field" key={key}><label className="wt-label">{label}</label><input className="wt-input" value={selected[key]} onChange={(e) => update(key, e.target.value)} /></div>
                    ))}
                    <div className="wt-row">
                      <div className="wt-field wt-field-grow"><label className="wt-label">Année universitaire</label><input className="wt-input" value={selected.anneeUniversitaire} onChange={(e) => update('anneeUniversitaire', e.target.value)} /></div>
                      <div className="wt-field wt-field-grow"><label className="wt-label">Semestre</label><input className="wt-input" value={selected.semestre} onChange={(e) => update('semestre', e.target.value)} /></div>
                    </div>
                    <div className="wt-row">
                      <div className="wt-field wt-field-grow"><label className="wt-label">Date examen</label><input className="wt-input" value={selected.dateExamen} onChange={(e) => update('dateExamen', e.target.value)} /></div>
                      <div className="wt-field wt-field-grow"><label className="wt-label">Nombre de pages</label><input className="wt-input" value={selected.nombrePages} onChange={(e) => update('nombrePages', e.target.value)} /></div>
                    </div>
                    <div className="wt-row">
                      <div className="wt-field wt-field-grow"><label className="wt-label">Durée</label><input className="wt-input" value={selected.duree} onChange={(e) => update('duree', e.target.value)} /></div>
                      <div className="wt-field wt-field-grow"><label className="wt-label">Type de feuille</label><input className="wt-input" value={selected.feuilleType} onChange={(e) => update('feuilleType', e.target.value)} /></div>
                    </div>
                  </div>

                  <div className="wt-section">
                    <div className="wt-section__title">Sections affichées</div>
                    {Object.entries(selected.sections || {}).map(([key, value]) => (
                      <label key={key} className="wt-section-toggle">
                        <span className="wt-section-toggle__label">{SECTION_LABELS[key] || key}</span>
                        <input type="checkbox" checked={!!value} onChange={(e) => updateSection(key, e.target.checked)} />
                      </label>
                    ))}
                  </div>

                  <div className="wt-section">
                    <div className="wt-section__title">Mise en page</div>
                    <div className="wt-row">
                      <div className="wt-field wt-field-grow"><label className="wt-label">Police</label><select className="wt-select" value={selected.police} onChange={(e) => update('police', e.target.value)}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
                      <div className="wt-field wt-field-grow"><label className="wt-label">Taille</label><select className="wt-select" value={selected.taille} onChange={(e) => update('taille', e.target.value)}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="wt-row">
                      <div className="wt-field wt-field-grow"><label className="wt-label">Marge H (cm)</label><input className="wt-input" type="number" min="1" max="5" step="0.5" value={selected.margeH} onChange={(e) => update('margeH', e.target.value)} /></div>
                      <div className="wt-field wt-field-grow"><label className="wt-label">Marge V (cm)</label><input className="wt-input" type="number" min="1" max="5" step="0.5" value={selected.margeV} onChange={(e) => update('margeV', e.target.value)} /></div>
                    </div>
                  </div>

                  {error && <div className="wt-error">{error}</div>}

                  <div className="wt-actions">
                    <button className="wt-btn-preview" onClick={() => setShowPreview(true)}>👁️ Aperçu A4</button>
                    <button className="wt-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showPreview && selected && (
        <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {selected.nom}</div>
              <button className="preview-modal-close" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="preview-modal-content"><A4Preview config={selected} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordTemplate;