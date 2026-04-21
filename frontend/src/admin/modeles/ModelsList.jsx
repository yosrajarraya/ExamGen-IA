import { useState, useEffect } from 'react';
import React from 'react';
import iitLogo from '../../assets/iit2.png';
import './WordTemplate.css';

const MODEL_TYPES = [
  { id: 'final',      label: 'Examen Final' },
  { id: 'cc',         label: 'Contrôle Continu' },
  { id: 'rattrapage', label: 'Rattrapage' },
  { id: 'tp',         label: 'TP / Projet' },
];

const TYPE_LABELS = {
  final:      { label: 'Examen Final',     color: '#1e4fa8' },
  cc:         { label: 'Contrôle Continu', color: '#0d7a55' },
  rattrapage: { label: 'Rattrapage',       color: '#92600a' },
  tp:         { label: 'TP / Projet',      color: '#6d4fc9' },
};

const DEFAULT_SECTIONS = {
  zoneNomPrenom:   true,
  zoneGroupe:      true,
  blocNote:        true,
  blocCommentaires:true,
  blocSignature:   true,
  blocRemarques:   true,
};

const makeDefault = () => ({
  _localId: `local_${Date.now()}`,
  _id: null,
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
  matiere: '',
  discipline: '',
  enseignants: '',
  anneeUniversitaire: '2024-2025',
  semestre: '1',
  dateExamen: '',
  duree: '1h30',
  documentsAutorises: "PC & Internet non autorisés",
  feuilleType: "Feuille d'énoncé",
  sections: { ...DEFAULT_SECTIONS },
  police: 'Arial',
  taille: '11pt',
  margeH: '2',
  margeV: '2',
  exercices: [],
});

const normalizeFromServer = (t, existingLocalId = null) => ({
  ...t,
  _localId: existingLocalId || t._id,
  _id: t._id,
  margeH: String(t.margeH ?? 2),
  margeV: String(t.margeV ?? 2),
  sections: t.sections || { ...DEFAULT_SECTIONS },
  exercices: t.exercices || [],
});

/* ============================================================
   ExamPreviewScaled — même logique que ModelesTab enseignant
   ============================================================ */
const A4_W      = 794;
const VISIBLE_H = 270;

const ExamPreviewScaled = ({ model }) => {
  const wrapRef = React.useRef(null);
  const [scale, setScale] = React.useState(0.38);

  React.useLayoutEffect(() => {
    const measure = () => {
      if (wrapRef.current) {
        const w = wrapRef.current.getBoundingClientRect().width;
        if (w > 0) setScale(w / A4_W);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        width:      '100%',
        height:     `${VISIBLE_H}px`,
        overflow:   'hidden',
        position:   'relative',
        background: '#fff',
      }}
    >
      <div style={{
        position:        'absolute',
        top:             0,
        left:            0,
        transform:       `scale(${scale})`,
        transformOrigin: 'top left',
        width:           `${A4_W}px`,
      }}>
        <ExamPreview model={model} />
      </div>
    </div>
  );
};

/* ============================================================
   ExamPreview — rendu inline-styles fidèle au vrai document Word
   ============================================================ */
const ExamPreview = ({ model }) => {
  const universityAr     = model?.universiteAr     || 'الجامعة الشمالية الأمريكية الخاصة';
  const universityFr     = model?.universiteFr     || 'Université Nord-Américaine Privée';
  const institute        = model?.institutFr       || 'Institut International de Technologie';
  const department       = model?.departementFr    || 'Département Informatique';
  const subject          = model?.matiere          || '—';
  const discipline       = model?.discipline       || '—';
  const teachers         = model?.enseignants      || 'nom et prénom de l\'enseignant';
  const documentsAllowed = model?.documentsAutorises || 'PC & Internet non autorisés';
  const academicYear     = model?.anneeUniversitaire || '2024-2025';
  const semester         = model?.semestre
    ? `${model.semestre}${model.dateExamen ? ` (${model.dateExamen})` : ''}`
    : '1';
  const duration = model?.duree || '1h30';
  const titre    = model?.titreExamen || 'DEVOIR SURVEILLÉ';
  const sec      = model?.sections;

  const S = {
    sheet: {
      width: `${A4_W}px`,
      minHeight: '600px',
      background: '#fff',
      color: '#000',
      padding: '28px 24px 20px',
      boxSizing: 'border-box',
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '13px',
      lineHeight: '1.25',
    },
    header: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 2fr 0.8fr',
      gap: '10px',
      alignItems: 'start',
      paddingBottom: '8px',
      borderBottom: '2px solid #000',
    },
    headerLeft:   { textAlign: 'left', fontSize: '12px', lineHeight: '1.2' },
    headerCenter: { textAlign: 'center', fontSize: '12px', lineHeight: '1.3' },
    headerRight:  { display: 'flex', justifyContent: 'flex-end' },
    logoFrame: {
      width: '68px', height: '68px',
      border: '1px solid #000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fff', padding: '3px', boxSizing: 'border-box',
    },
    logoImg: { width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%) contrast(1.1)' },
    muted: { marginTop: '4px', fontSize: '10px', lineHeight: '1.2' },
    box: { border: '1px solid #000', marginTop: '12px' },
    boxTitle: {
      display: 'grid', gridTemplateColumns: '2fr 0.95fr',
      minHeight: '40px', borderBottom: '1px solid #000',
    },
    boxTitleLeft: {
      display: 'flex', alignItems: 'center',
      padding: '7px 10px', fontSize: '18px', fontWeight: '700', textTransform: 'uppercase',
    },
    boxTitleRight: { borderLeft: '1px solid #000', background: '#f8f8f8' },
    metaGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '18px', padding: '9px 10px', fontSize: '13px', lineHeight: '1.55',
    },
    metaRow: { marginBottom: '4px' },
    studentLine: {
      display: 'grid', gridTemplateColumns: '2.4fr 1fr',
      gap: '20px', padding: '10px', borderTop: '1px solid #000',
      fontSize: '13px', alignItems: 'center',
    },
    groupLine: { textAlign: 'center' },
    lineFillLong: {
      display: 'inline-block', borderBottom: '1px solid #000',
      height: '12px', verticalAlign: 'middle', width: '230px', marginLeft: '6px',
    },
    lineFillShort: {
      display: 'inline-block', borderBottom: '1px solid #000',
      height: '12px', verticalAlign: 'middle', width: '55px', marginLeft: '4px',
    },
    scoreRow: {
      display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr',
      gap: '12px', marginTop: '18px',
    },
    scoreBox: { minHeight: '78px', border: '1px solid #000', padding: '8px 10px', background: '#fff' },
    scoreTitle: { fontWeight: '700', fontSize: '13px' },
    nbBlock: { marginTop: '18px', border: '1px solid #000', padding: '10px 12px', fontSize: '13px', lineHeight: '1.6' },
    nbTitle: { fontWeight: '700', marginBottom: '4px' },
  };

  return (
    <div style={S.sheet}>
      {/* ── En-tête université ── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div>North American</div>
          <div>Private University</div>
          <div>SFAX | TUNISIA</div>
          <div style={S.muted}>TECHNOLOGY · BUSINESS · ARCHITECTURE</div>
        </div>
        <div style={S.headerCenter}>
          <div>{universityAr}</div>
          <div>{universityFr}</div>
          <div>{institute}</div>
          <div>{department}</div>
        </div>
        <div style={S.headerRight}>
          <div style={S.logoFrame}>
            <img src={iitLogo} alt="IIT" style={S.logoImg} />
          </div>
        </div>
      </div>

      {/* ── Bloc principal ── */}
      <div style={S.box}>
        <div style={S.boxTitle}>
          <div style={S.boxTitleLeft}>{titre}</div>
          <div style={S.boxTitleRight} />
        </div>
        <div style={S.metaGrid}>
          <div>
            <div style={S.metaRow}><strong>Matière :</strong> {subject}</div>
            <div style={S.metaRow}><strong>Discipline :</strong> {discipline}</div>
            <div style={S.metaRow}><strong>Enseignants :</strong> {teachers}</div>
            <div style={S.metaRow}><strong>Documents autorisés :</strong> {documentsAllowed}</div>
          </div>
          <div>
            <div style={S.metaRow}><strong>Année Universitaire :</strong> {academicYear}</div>
            <div style={S.metaRow}><strong>Semestre :</strong> {semester}</div>
            <div style={S.metaRow}><strong>Feuille d'énoncé / Durée :</strong> {duration}</div>
          </div>
        </div>
        {(sec?.zoneNomPrenom || sec?.zoneGroupe) && (
          <div style={S.studentLine}>
            <div>
              {sec?.zoneNomPrenom && (
                <><strong>Prénom &amp; Nom :</strong><span style={S.lineFillLong} /></>
              )}
            </div>
            <div style={S.groupLine}>
              {sec?.zoneGroupe && (
                <><strong>Groupe</strong><span style={S.lineFillShort} /></>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Note / Commentaires / Signature ── */}
      {(sec?.blocNote || sec?.blocCommentaires || sec?.blocSignature) && (
        <div style={S.scoreRow}>
          {sec?.blocNote         && <div style={S.scoreBox}><div style={S.scoreTitle}>Note /20</div></div>}
          {sec?.blocCommentaires && <div style={S.scoreBox}><div style={S.scoreTitle}>Commentaires</div></div>}
          {sec?.blocSignature    && <div style={S.scoreBox}><div style={S.scoreTitle}>Signature</div></div>}
        </div>
      )}

      {/* ── Bloc NB ── */}
      {sec?.blocRemarques && (
        <div style={S.nbBlock}>
          <div style={S.nbTitle}>NB.</div>
          <div>— Le barème est fourni à titre indicatif et peut être ajusté</div>
          <div>— La durée de l'examen est de {duration}</div>
          <div>— Les ordinateurs, l'accès à Internet et l'utilisation d'IDE Python sont strictement interdits</div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   ModelsList — vue cards (6 par page) style enseignant
   ============================================================ */
const ModelsList = ({ onEditModel, onCreateModel }) => {
  const [models,        setModels]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [previewModel,  setPreviewModel]  = useState(null);

  const ITEMS_PER_PAGE = 6;

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
          setModels(data.map((t) => normalizeFromServer(t)));
        } else {
          setModels([makeDefault()]);
        }
      } catch {
        setModels([makeDefault()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = () => {
    const m = makeDefault();
    setModels((prev) => [...prev, m]);
    onCreateModel(m);
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
    setModels(models.filter((m) => m._localId !== localId));
    setCurrentPage(1);
  };

  /* --- filtering --- */
  const filtered = models.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.nom       || '').toLowerCase().includes(q) ||
      (m.matiere   || '').toLowerCase().includes(q) ||
      (m.discipline|| '').toLowerCase().includes(q)
    );
  });

  /* --- pagination --- */
  const totalPages  = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage    = Math.min(currentPage, totalPages);
  const pageStart   = (safePage - 1) * ITEMS_PER_PAGE;
  const paginated   = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const handleSearch = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };

  if (loading) {
    return <div className="wt-loading">Chargement des modèles...</div>;
  }

  return (
    <div className="admin-models-page">

      {/* ── En-tête de la bibliothèque ── */}
      <div className="admin-models-header">
        <div className="admin-models-header__left">
          <div className="wt-panel-eyebrow">Bibliothèque</div>
          <h3 className="wt-panel-title">Modèles ({models.length})</h3>
        </div>
        <button className="wt-btn-new" onClick={handleCreate}>
          + Nouveau
        </button>
      </div>

      {/* ── Barre de recherche ── */}
      <div className="admin-models-search">
        <input
          type="text"
          placeholder="Rechercher un modèle par nom ou matière..."
          className="admin-search-input"
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      {/* ── Grille de cards ── */}
      {filtered.length === 0 ? (
        <div className="wt-loading" style={{ marginTop: '60px' }}>
          Aucun modèle trouvé.
        </div>
      ) : (
        <>
          <div className="admin-templates-grid">
            {paginated.map((m) => {
              const typeInfo = TYPE_LABELS[m.type] || { label: m.type || 'Autre', color: '#6b7a99' };
              return (
                <div
                  key={m._localId}
                  className="admin-template-card"
                  onClick={() => onEditModel(m)}
                >
                  {/* Aperçu A4 miniature */}
                  <div className="admin-card-preview">
                    <ExamPreviewScaled model={m} />
                  </div>

                  {/* Barre d'info */}
                  <div className="admin-card-info">
                    <div className="admin-card-name">{m.nom || 'Modèle sans titre'}</div>
                    <div className="admin-card-meta">
                      <span
                        className="admin-type-badge"
                        style={{ backgroundColor: typeInfo.color + '18', color: typeInfo.color }}
                      >
                        {typeInfo.label}
                      </span>
                      {m.matiere   && <span className="admin-meta-item">{m.matiere}</span>}
                      {m.discipline && <span className="admin-meta-item">{m.discipline}</span>}
                      {m.langue    && <span className="admin-meta-item">{m.langue}</span>}
                    </div>
                  </div>

                  {/* Bouton aperçu œil */}
                  <button
                    type="button"
                    className="admin-card-preview-btn"
                    onClick={(e) => { e.stopPropagation(); setPreviewModel(m); }}
                    aria-label={`Aperçu ${m.nom}`}
                    title="Aperçu du modèle"
                  >
                    👁
                  </button>

                  {/* Bouton supprimer (stopPropagation pour ne pas déclencher onEditModel) */}
                  <button
                    type="button"
                    className="admin-card-delete"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ _localId: m._localId, nom: m.nom }); }}
                    aria-label={`Supprimer ${m.nom}`}
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="wt-pagination">
              <button
                className="wt-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safePage === 1}
              >
                ← Précédent
              </button>
              <div className="wt-pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`wt-pagination__page${safePage === page ? ' wt-pagination__page--active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                className="wt-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={safePage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="wt-model-count">
            Affichage {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} modèle(s)
          </div>
        </>
      )}

      {error && <div className="wt-error" style={{ margin: '14px' }}>{error}</div>}

      {/* ── Modal Aperçu du modèle ── */}
      {previewModel && (
        <div className="preview-modal-overlay" onClick={() => setPreviewModel(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {previewModel.nom || 'Modèle sans titre'}</div>
              <button className="preview-modal-close" onClick={() => setPreviewModel(null)}>✕</button>
            </div>
            <div className="preview-modal-content">
              <ExamPreview model={previewModel} />
            </div>
          </div>
        </div>
      )}

      {/* ── Dialogue de confirmation suppression ── */}
      {confirmDelete && (
        <div className="confirmation-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer la suppression</h3>
            <p>Supprimer le modèle &quot;{confirmDelete.nom}&quot; ?</p>
            <div className="confirmation-actions">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button
                className="btn-confirm"
                onClick={() => { handleDelete(confirmDelete._localId); setConfirmDelete(null); }}
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

export default ModelsList;