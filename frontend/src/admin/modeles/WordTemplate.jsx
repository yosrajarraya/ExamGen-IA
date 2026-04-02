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
  zoneNomPrenom: 'Zone Nom & Prénom',
  zoneGroupe: 'Zone Groupe',
  blocNote: 'Bloc Note',
  blocCommentaires: 'Bloc Commentaires',
  blocSignature: 'Bloc Signature',
  blocRemarques: 'Bloc Remarques',
};

const DEFAULT_SECTIONS = {
  zoneNomPrenom: true,
  zoneGroupe: true,
  blocNote: true,
  blocCommentaires: true,
  blocSignature: true,
  blocRemarques: true,
};

const makeDefault = () => ({
  _localId: `local_${Date.now()}`,
  _id: null,
  nom: 'Nouveau modèle',
  type: 'final',
  actif: true,
  langue: 'Français',

  universiteFr: 'Université Nord-Américaine Privée',
  institutFr: 'Institut International de Technologie',
  departementFr: 'Département Informatique',
  universiteAr: '',
  institutAr: '',
  departementAr: '',

  titreExamen: 'DEVOIR SURVEILLÉ',
  codeExamen: 'C',
  matiere: '',
  discipline: '',
  enseignants: '',
  anneeUniversitaire: '2024-2025',
  semestre: '1',
  dateExamen: '',
  nombrePages: '6',
  duree: '1h30',
  documentsAutorises: "PC & Internet non autorisés",
  feuilleType: "Feuille d'énoncé",

  sections: { ...DEFAULT_SECTIONS },

  police: 'Arial',
  taille: '11pt',
  margeH: '2',
  margeV: '2',
});

const normalizeFromServer = (t, existingLocalId = null) => ({
  ...t,
  _localId: existingLocalId || t._id,
  _id: t._id,
  margeH: String(t.margeH ?? 2),
  margeV: String(t.margeV ?? 2),
  sections: t.sections || { ...DEFAULT_SECTIONS },
});

const A4Preview = ({ config }) => (
  <div
    className="a4-sheet"
    style={{
      fontFamily: config.police,
      fontSize: config.taille,
      paddingLeft: `${config.margeH}cm`,
      paddingRight: `${config.margeH}cm`,
      paddingTop: `${config.margeV}cm`,
      paddingBottom: `${config.margeV}cm`,
    }}
  >
    <div className="exam-header-top">
      <div className="exam-header-left">
        <div className="small-header">North American | SFAX</div>
        <div className="small-header">Private University</div>
        <div className="small-sub">TECHNOLOGY . BUSINESS . ARCHITECTURE</div>
      </div>

      <div className="exam-header-center">
        {config.langue !== 'Français' && (
          <>
            <div className="header-ar">{config.universiteAr}</div>
            <div className="header-ar">{config.institutAr}</div>
            <div className="header-ar">{config.departementAr}</div>
          </>
        )}
        <div className="header-fr">{config.universiteFr}</div>
        <div className="header-fr">{config.institutFr}</div>
        <div className="header-fr">{config.departementFr}</div>
      </div>

      <div className="exam-header-right">
        <div className="iit-logo-box">IIT</div>
      </div>
    </div>

    <div className="exam-main-box">
      <div className="exam-title-row">
        <div className="exam-title-left">
          {config.titreExamen} {config.codeExamen}
        </div>
        <div className="exam-title-right" />
      </div>

      <div className="exam-info-grid">
        <div className="exam-info-left">
          <div><strong>Matière :</strong> {config.matiere}</div>
          <div><strong>Discipline :</strong> {config.discipline}</div>
          <div><strong>Enseignants :</strong> {config.enseignants}</div>
          <div><strong>Documents autorisés :</strong> {config.documentsAutorises}</div>
        </div>

        <div className="exam-info-right">
          <div><strong>Année Universitaire :</strong> {config.anneeUniversitaire}</div>
          <div><strong>Semestre :</strong> {config.semestre} ({config.dateExamen})</div>
          <div><strong>Nombre de page :</strong> {config.nombrePages}</div>
          <div><strong>{config.feuilleType}</strong> / <strong>Durée :</strong> {config.duree}</div>
        </div>
      </div>

      {(config.sections?.zoneNomPrenom || config.sections?.zoneGroupe) && (
        <div className="exam-student-row">
          {config.sections?.zoneNomPrenom && (
            <div className="student-name-line">
              <strong>Prénom &amp; Nom :</strong> ______________________________________
            </div>
          )}
          {config.sections?.zoneGroupe && (
            <div className="student-group-line">
              <strong>Groupe</strong> ______
            </div>
          )}
        </div>
      )}
    </div>

    {(config.sections?.blocNote ||
      config.sections?.blocCommentaires ||
      config.sections?.blocSignature) && (
      <div className="exam-marking-row">
        {config.sections?.blocNote && <div className="mark-box"><strong>Note /20</strong></div>}
        {config.sections?.blocCommentaires && (
          <div className="mark-box large"><strong>Commentaires</strong></div>
        )}
        {config.sections?.blocSignature && (
          <div className="mark-box"><strong>Signature</strong></div>
        )}
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
  const [confirmDelete, setConfirmDelete] = useState(null); // {_localId, nom}


  const selected = models.find((m) => m._localId === selectedLocalId) || null;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/admin/word-template', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error();

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((t) => normalizeFromServer(t));
          setModels(mapped);
          setSelectedLocalId(mapped[0]._localId);
        } else {
          const def = makeDefault();
          setModels([def]);
          setSelectedLocalId(def._localId);
        }
      } catch {
        const def = makeDefault();
        setModels([def]);
        setSelectedLocalId(def._localId);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = useCallback((key, val) => {
    setModels((prev) =>
      prev.map((m) =>
        m._localId === selectedLocalId ? { ...m, [key]: val } : m
      )
    );
    setSaved(false);
    setError('');
  }, [selectedLocalId]);

  const updateSection = useCallback((key, val) => {
    setModels((prev) =>
      prev.map((m) =>
        m._localId === selectedLocalId
          ? { ...m, sections: { ...(m.sections || {}), [key]: val } }
          : m
      )
    );
    setSaved(false);
  }, [selectedLocalId]);

  const handleCreate = () => {
    const m = makeDefault();
    setModels((prev) => [...prev, m]);
    setSelectedLocalId(m._localId);
    setSaved(false);
    setError('');
  };

  const handleDelete = async (localId) => {
    if (models.length === 1) {
      setError('Gardez au moins un modèle.');
      return;
    }

    const target = models.find((m) => m._localId === localId);

    if (target?._id) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5000/api/admin/word-template/${target._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(err);
      }
    }

    const remaining = models.filter((m) => m._localId !== localId);
    setModels(remaining);

    if (selectedLocalId === localId) {
      setSelectedLocalId(remaining[0]?._localId || null);
    }
  };

  const handleSave = async () => {
    if (!selected) return;

    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const payload = {
        nom: selected.nom,
        type: selected.type,
        actif: selected.actif,
        langue: selected.langue,
        universiteFr: selected.universiteFr,
        institutFr: selected.institutFr,
        departementFr: selected.departementFr,
        universiteAr: selected.universiteAr || '',
        institutAr: selected.institutAr || '',
        departementAr: selected.departementAr || '',
        titreExamen: selected.titreExamen,
        codeExamen: selected.codeExamen,
        matiere: selected.matiere,
        discipline: selected.discipline,
        enseignants: selected.enseignants,
        anneeUniversitaire: selected.anneeUniversitaire,
        semestre: selected.semestre,
        dateExamen: selected.dateExamen,
        nombrePages: selected.nombrePages,
        duree: selected.duree,
        documentsAutorises: selected.documentsAutorises,
        feuilleType: selected.feuilleType,
        sections: selected.sections,
        police: selected.police,
        taille: selected.taille,
        margeH: parseFloat(selected.margeH) || 2,
        margeV: parseFloat(selected.margeV) || 2,
      };

      const isNew = !selected._id;
      const url = isNew
        ? 'http://localhost:5000/api/admin/word-template'
        : `http://localhost:5000/api/admin/word-template/${selected._id}`;

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
      const updated = normalizeFromServer(data, selected._localId);

      setModels((prev) =>
        prev.map((m) => (m._localId === selectedLocalId ? updated : m))
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="new-admin-layout">
      <Sidebar
        roleLabel="Administration"
        navItems={adminNavItems}
        profile={buildAdminProfile(user)}
        onLogout={logout}
      />

      <main className="new-admin-main">
        <div className="wt-page-header">
          <div className="wt-page-header__text">
            <h1 className="wt-page-title">Modèles Word</h1>
            <p className="wt-page-subtitle">
              Configurez vos modèles d’examen avec une présentation plus claire,
              moderne et professionnelle.
            </p>
          </div>


        </div>

        <div className="new-admin-body wt-body">
          {loading ? (
            <div className="wt-loading">Chargement...</div>
          ) : (
            <div className="wt-workspace">
              <aside className="wt-panel wt-panel-left">
                <div className="wt-panel-header">
                  <div>
                    <div className="wt-panel-eyebrow">Bibliothèque</div>
                    <h3 className="wt-panel-title">Modèles ({models.length})</h3>
                  </div>

                  <button className="wt-btn-new" onClick={handleCreate}>
                    + Nouveau
                  </button>
                </div>

                <div className="wt-model-list">
                  {models.map((m) => (
                    <div
                      key={m._localId}
                      className={`wt-model-item ${
                        m._localId === selectedLocalId ? 'wt-model-item--active' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="wt-model-item__selector"
                        onClick={() => {
                          setSelectedLocalId(m._localId);
                          setSaved(false);
                          setError('');
                        }}
                      >
                        <div className="wt-model-item__top">
                          <span className="wt-model-item__name">{m.nom}</span>
                          <span className="wt-model-badge">{m.langue}</span>
                        </div>

                        <div className="wt-model-item__bottom">
                          {MODEL_TYPES.find((t) => t.id === m.type)?.label || m.type}
                        </div>
                      </button>

                      <button
                        type="button"
                        className="wt-model-item__delete"
                        onClick={() => setConfirmDelete({ _localId: m._localId, nom: m.nom })}
                        aria-label={`Supprimer ${m.nom}`}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>


              </aside>

              {selected && (
                <section className="wt-editor">
                  <div className="wt-card">
                    <div className="wt-card-header">
                      <div>
                        <div className="wt-card-eyebrow">Configuration</div>
                        <h3 className="wt-card-title">Informations générales</h3>
                      </div>
                    </div>

                    <div className="wt-grid wt-grid-2">
                      <div className="wt-field">
                        <label className="wt-label">Nom du modèle</label>
                        <input
                          className="wt-input"
                          value={selected.nom}
                          onChange={(e) => update('nom', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Langue</label>
                        <select
                          className="wt-select"
                          value={selected.langue}
                          onChange={(e) => update('langue', e.target.value)}
                        >
                          {LANGUAGES.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </select>
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Type</label>
                        <select
                          className="wt-select"
                          value={selected.type}
                          onChange={(e) => update('type', e.target.value)}
                        >
                          {MODEL_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="wt-card">
                    <div className="wt-card-header">
                      <div>
                        <div className="wt-card-eyebrow">Institution</div>
                        <h3 className="wt-card-title">En-tête institutionnel</h3>
                      </div>
                    </div>

                    <div className="wt-grid wt-grid-2">
                      <div className="wt-field">
                        <label className="wt-label">Université (FR)</label>
                        <div className="wt-static-field">
                          {selected.universiteFr}
                        </div>
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Institut (FR)</label>
                        <div className="wt-static-field">
                          {selected.institutFr}
                        </div>
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Département (FR)</label>
                        <input
                          className="wt-input"
                          value={selected.departementFr}
                          onChange={(e) => update('departementFr', e.target.value)}
                        />
                      </div>

                     
                    </div>
                  </div>

                  <div className="wt-card">
                    <div className="wt-card-header">
                      <div>
                        <div className="wt-card-eyebrow">Examen</div>
                        <h3 className="wt-card-title">Bloc examen</h3>
                      </div>
                    </div>

                    <div className="wt-grid wt-grid-2">
                      <div className="wt-field">
                        <label className="wt-label">Titre examen</label>
                        <input
                          className="wt-input"
                          value={selected.titreExamen}
                          onChange={(e) => update('titreExamen', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Code</label>
                        <input
                          className="wt-input"
                          value={selected.codeExamen}
                          onChange={(e) => update('codeExamen', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Matière</label>
                        <input
                          className="wt-input"
                          value={selected.matiere}
                          onChange={(e) => update('matiere', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Discipline</label>
                        <input
                          className="wt-input"
                          value={selected.discipline}
                          onChange={(e) => update('discipline', e.target.value)}
                        />
                      </div>

                      <div className="wt-field wt-field-full">
                        <label className="wt-label">Enseignants</label>
                        <input
                          className="wt-input"
                          value={selected.enseignants}
                          onChange={(e) => update('enseignants', e.target.value)}
                        />
                      </div>

                      <div className="wt-field wt-field-full">
                        <label className="wt-label">Documents autorisés</label>
                        <input
                          className="wt-input"
                          value={selected.documentsAutorises}
                          onChange={(e) => update('documentsAutorises', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Année universitaire</label>
                        <input
                          className="wt-input"
                          value={selected.anneeUniversitaire}
                          onChange={(e) => update('anneeUniversitaire', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Semestre</label>
                        <input
                          className="wt-input"
                          value={selected.semestre}
                          onChange={(e) => update('semestre', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Date examen</label>
                        <input
                          className="wt-input"
                          value={selected.dateExamen}
                          onChange={(e) => update('dateExamen', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Nombre de pages</label>
                        <input
                          className="wt-input"
                          value={selected.nombrePages}
                          onChange={(e) => update('nombrePages', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Durée</label>
                        <input
                          className="wt-input"
                          value={selected.duree}
                          onChange={(e) => update('duree', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Type de feuille</label>
                        <input
                          className="wt-input"
                          value={selected.feuilleType}
                          onChange={(e) => update('feuilleType', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="wt-card">
                    <div className="wt-card-header">
                      <div>
                        <div className="wt-card-eyebrow">Affichage</div>
                        <h3 className="wt-card-title">Sections affichées</h3>
                      </div>
                    </div>

                    <div className="wt-toggle-grid">
                      {Object.entries(selected.sections || {}).map(([key, value]) => (
                        <label key={key} className="wt-switch-card">
                          <div>
                            <div className="wt-switch-card__title">
                              {SECTION_LABELS[key] || key}
                            </div>
                            <div className="wt-switch-card__sub">
                              Activer ou masquer cette zone dans le modèle
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            className="wt-switch-input"
                            checked={!!value}
                            onChange={(e) => updateSection(key, e.target.checked)}
                          />
                          <span className="wt-switch-slider" />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="wt-card">
                    <div className="wt-card-header">
                      <div>
                        <div className="wt-card-eyebrow">Style</div>
                        <h3 className="wt-card-title">Mise en page</h3>
                      </div>
                    </div>

                    <div className="wt-grid wt-grid-2">
                      <div className="wt-field">
                        <label className="wt-label">Police</label>
                        <select
                          className="wt-select"
                          value={selected.police}
                          onChange={(e) => update('police', e.target.value)}
                        >
                          {FONTS.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Taille</label>
                        <select
                          className="wt-select"
                          value={selected.taille}
                          onChange={(e) => update('taille', e.target.value)}
                        >
                          {SIZES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Marge H (cm)</label>
                        <input
                          className="wt-input"
                          type="number"
                          min="1"
                          max="5"
                          step="0.5"
                          value={selected.margeH}
                          onChange={(e) => update('margeH', e.target.value)}
                        />
                      </div>

                      <div className="wt-field">
                        <label className="wt-label">Marge V (cm)</label>
                        <input
                          className="wt-input"
                          type="number"
                          min="1"
                          max="5"
                          step="0.5"
                          value={selected.margeV}
                          onChange={(e) => update('margeV', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {error && <div className="wt-error">{error}</div>}
                </section>
              )}
            </div>
          )}
        </div>

        {selected && (
          <div className="wt-footer-actions">
            <button
              className="wt-btn-secondary"
              onClick={() => setShowPreview(true)}
            >
              Aperçu A4
            </button>

            <button
              className="wt-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </main>

      {showPreview && selected && (
        <div
          className="preview-modal-overlay"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {selected.nom}</div>
              <button
                className="preview-modal-close"
                onClick={() => setShowPreview(false)}
              >
                ✕
              </button>
            </div>

            <div className="preview-modal-content">
              <A4Preview config={selected} />
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="confirmation-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer la suppression</h3>
            <p>Supprimer le modèle "{confirmDelete.nom}" ?</p>
            <div className="confirmation-actions">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button
                className="btn-confirm"
                onClick={() => {
                  handleDelete(confirmDelete._localId);
                  setConfirmDelete(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordTemplate;