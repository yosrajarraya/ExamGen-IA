import React, { useState, useRef, useLayoutEffect } from 'react';
import iitLogo from '../../../assets/iit2.png';

const TYPE_LABELS = {
  final:      { label: 'Examen Final',      color: '#1e4fa8' },
  cc:         { label: 'Contrôle Continu',  color: '#0d7a55' },
  rattrapage: { label: 'Rattrapage',        color: '#92600a' },
  tp:         { label: 'TP Noté',           color: '#6d4fc9' },
};

const ITEMS_PER_PAGE = 3;

/* ============================================================
   ModelesTab
   ============================================================ */
const ModelesTab = ({
  allTemplates,
  selectedTemplate,
  onSelectTemplate,
  onTabChange,
  examForm,
  onFormChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery]   = useState('');

  /* --- filtering --- */
  const filtered = allTemplates.filter(tpl => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (tpl.nom        || '').toLowerCase().includes(q) ||
      (tpl.matiere    || '').toLowerCase().includes(q) ||
      (tpl.discipline || '').toLowerCase().includes(q)
    );
  });

  /* --- pagination --- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const pageStart  = (safePage - 1) * ITEMS_PER_PAGE;
  const paginated  = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const handleSearch = (e) => { setSearchQuery(e.target.value); setCurrentPage(1); };

  /* --- template selection --- */
  const getExamType = (t) => ({ final:'Examen final', cc:'Contrôle continu', rattrapage:'Rattrapage', tp:'TP noté' }[t] || '');

  const handleSelectTemplate = (tplId) => {
    const isSelected = selectedTemplate === tplId;
    onSelectTemplate(isSelected ? null : tplId);
    if (!isSelected) {
      const tpl = allTemplates.find(t => t._id === tplId);
      if (!tpl) return;
      onFormChange('titre',      tpl.titreExamen || tpl.nom || '');
      onFormChange('matiere',    tpl.matiere    || '');
      onFormChange('filiere',    tpl.discipline || tpl.filiere || '');
      onFormChange('type',       getExamType(tpl.type));
      onFormChange('duree',      tpl.duree      || '');
      onFormChange('noteTotale', '20');
    }
  };

  return (
    <section className="exam-card">
      <h3 className="exam-card-title">Choisissez un modèle d'examen</h3>

      <input
        type="text"
        placeholder="Rechercher un modèle par nom ou matière..."
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
          {/* ---- Grid 3 colonnes ---- */}
          <div className="templates-a4-grid">
            {paginated.map((tpl) => {
              const isSelected = selectedTemplate === tpl._id;
              const typeInfo   = TYPE_LABELS[tpl.type] || { label: tpl.type || 'Autre', color: '#6b7a99' };
              return (
                <div
                  key={tpl._id}
                  className={'a4-template-container' + (isSelected ? ' selected' : '')}
                  onClick={() => handleSelectTemplate(tpl._id)}
                >
                  {/* Aperçu A4 fidèle à l'admin */}
                  <div className="a4-mini-wrapper">
                    <ExamPreviewScaled model={tpl} />
                  </div>

                  {/* Barre d'info sous l'aperçu */}
                  <div className="template-info-bar">
                    <div className="template-name">{tpl.nom || 'Modèle sans titre'}</div>
                    <div className="template-meta">
                      <span className="type-badge"
                        style={{ backgroundColor: typeInfo.color + '18', color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                      {tpl.matiere && <span className="meta-item">{tpl.matiere}</span>}
                      {(tpl.discipline || tpl.filiere) && (
                        <span className="meta-item">{tpl.discipline || tpl.filiere}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Pagination ---- */}
          {totalPages > 1 && (
            <div className="tpl-pagination">
              <button className="tpl-pagination__btn"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={safePage === 1}>
                ← Précédent
              </button>
              <div className="tpl-pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page}
                    className={'tpl-pagination__page' + (safePage === page ? ' tpl-pagination__page--active' : '')}
                    onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                ))}
              </div>
              <button className="tpl-pagination__btn"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={safePage === totalPages}>
                Suivant →
              </button>
            </div>
          )}

          <div className="tpl-pagination-count">
            Affichage {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} modèle(s)
          </div>
        </>
      )}

      {/* ---- Informations de l'examen ---- */}
      <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>Informations de l'examen</h3>

      <div className="form-grid">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="exp-titre">Titre de l'examen *</label>
          <input id="exp-titre" type="text"
            placeholder="Ex : Examen Final — Algorithmique"
            value={examForm.titre || ''}
            onChange={e => onFormChange('titre', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-matiere">Matière *</label>
          <input id="exp-matiere" type="text" placeholder="Ex : Algorithmique"
            value={examForm.matiere || ''} onChange={e => onFormChange('matiere', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-filiere">Filière / Discipline</label>
          <input id="exp-filiere" type="text" placeholder="Ex : Informatique"
            value={examForm.filiere || ''} onChange={e => onFormChange('filiere', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-niveau">Niveau</label>
          <input id="exp-niveau" type="text" placeholder="Ex : L2"
            value={examForm.niveau || ''} onChange={e => onFormChange('niveau', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-type">Type d'examen</label>
          <select id="exp-type" value={examForm.type || ''} onChange={e => onFormChange('type', e.target.value)}>
            <option value="">— Choisir —</option>
            <option value="Contrôle continu">Contrôle continu</option>
            <option value="Examen final">Examen final</option>
            <option value="Rattrapage">Rattrapage</option>
            <option value="TP noté">TP noté</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-duree">Durée (minutes)</label>
          <input id="exp-duree" type="number" placeholder="120" min="0"
            value={examForm.duree || ''} onChange={e => onFormChange('duree', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exp-note">Note totale</label>
          <input id="exp-note" type="number" placeholder="20" min="0" step="0.5"
            value={examForm.noteTotale || ''} onChange={e => onFormChange('noteTotale', e.target.value)} />
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

/* ============================================================
   ExamPreviewScaled
   Mesure la vraie largeur du wrapper avec useRef,
   calcule le scale exact = wrapperWidth / A4_W
   pas de rognage, pas de marge grise.
   ============================================================ */
const A4_W      = 794;
const VISIBLE_H = 290;

const ExamPreviewScaled = ({ model }) => {
  const wrapRef = React.useRef(null);
  const [scale, setScale] = React.useState(0.5);

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
   ExamPreview — rendu 100 % inline-styles, fidèle pixel par pixel
   à la photo admin (WordTemplate.css n'est pas requis)
   ============================================================ */
const ExamPreview = ({ model }) => {
  const universityAr     = model?.universiteAr     || 'الجامعة الشمالية الأمريكية الخاصة';
  const universityFr     = model?.universiteFr     || 'Université Nord-Américaine Privée';
  const institute        = model?.institutFr       || 'Institut International de Technologie';
  const department       = model?.departementFr    || 'Département Informatique';
  const subject          = model?.matiere          || 'Fouille de données';
  const discipline       = model?.discipline       || '2ème année Génie Informatique';
  const teachers         = model?.enseignants      || 'Tarek Ben Said / Taoufik Ben Abdallah';
  const documentsAllowed = model?.documentsAutorises || 'PC & Internet non autorisés';
  const academicYear     = model?.anneeUniversitaire || '2024-2025';
  const semester         = model?.semestre
    ? `${model.semestre}${model.dateExamen ? ` (${model.dateExamen})` : ''}`
    : '1 (07/11/2024)';
  const duration = model?.duree || '1h30';
  const titre    = model?.titreExamen || 'DEVOIR SURVEILLÉ';
  const sec      = model?.sections;

  /* ── styles réutilisables ── */
  const S = {
    sheet: {
      width: `${A4_W}px`,
      minHeight: '600px',   // on n'a besoin que du haut
      background: '#fff',
      color: '#000',
      padding: '28px 24px 20px',
      boxSizing: 'border-box',
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '13px',
      lineHeight: '1.25',
      border: 'none',
    },
    /* En-tête */
    header: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 2fr 0.8fr',
      gap: '10px',
      alignItems: 'start',
      paddingBottom: '8px',
      borderBottom: '1px solid #000',
    },
    headerLeft: { textAlign: 'left', fontSize: '12px', lineHeight: '1.2' },
    headerCenter: { textAlign: 'center', fontSize: '12px', lineHeight: '1.3' },
    headerRight: { display: 'flex', justifyContent: 'flex-end' },
    logoFrame: {
      width: '68px', height: '68px',
      border: '1px solid #000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fff', padding: '3px', boxSizing: 'border-box',
    },
    logoImg: { width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%) contrast(1.1)' },
    muted: { marginTop: '4px', fontSize: '10px', lineHeight: '1.2' },
    /* Bloc principal */
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
    /* Ligne étudiant */
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
    /* Score row */
    scoreRow: {
      display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr',
      gap: '12px', marginTop: '18px',
    },
    scoreBox: { minHeight: '78px', border: '1px solid #000', padding: '8px 10px', background: '#fff' },
    scoreTitle: { fontWeight: '700', fontSize: '13px' },
    /* NB block */
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

        {/* Ligne étudiant — seulement si sections explicitement true */}
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
          {sec?.blocNote        && <div style={S.scoreBox}><div style={S.scoreTitle}>Note /20</div></div>}
          {sec?.blocCommentaires && <div style={S.scoreBox}><div style={S.scoreTitle}>Commentaires</div></div>}
          {sec?.blocSignature   && <div style={S.scoreBox}><div style={S.scoreTitle}>Signature</div></div>}
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

export default ModelesTab;