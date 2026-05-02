import React from 'react';
import iitLogo from '../assets/iit2.png';
import { getPreviewData, DEFAULT_SECTIONS } from '../utils/template.utils';

// ─── Dimensions A4 partagées ──────────────────────────────────────────────────
export const A4_W = 794;

// ─── Aperçu principal — dispatche vers Long ou Court ─────────────────────────
export const ExamPreview = ({ model, examForm }) => {
  const templateStyle = model?.templateStyle || 'long';
  return templateStyle === 'court'
    ? <ExamPreviewCourt model={model} examForm={examForm} />
    : <ExamPreviewLong  model={model} examForm={examForm} />;
};

// ─── Aperçu miniature mis à l'échelle ────────────────────────────────────────
export const ExamPreviewScaled = ({ model, examForm, visibleHeight = 290 }) => {
  const wrapRef = React.useRef(null);
  const [scale, setScale] = React.useState(0.5);

  React.useLayoutEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.getBoundingClientRect().width;
      if (w > 0) setScale(w / A4_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', height: `${visibleHeight}px`, overflow: 'hidden', position: 'relative', background: '#fff' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left', width: `${A4_W}px` }}>
        <ExamPreview model={model} examForm={examForm} />
      </div>
    </div>
  );
};

// ─── Forme 1 — Session principale avec NB ────────────────────────────────────
const ExamPreviewLong = ({ model, examForm }) => {
  const d = getPreviewData(model, examForm);
  const semesterText = d.dateExamen ? `${d.semestre} (${d.dateExamen})` : d.semestre;

  const S = {
    sheet: { width: `${A4_W}px`, minHeight: '600px', background: '#fff', color: '#000', padding: '28px 24px 20px', boxSizing: 'border-box', fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '1.25' },
    header: { display: 'grid', gridTemplateColumns: '1.1fr 2fr 0.8fr', gap: '10px', alignItems: 'start', paddingBottom: '8px', borderBottom: '1.5px solid #000' },
    headerLeft:   { textAlign: 'left',   fontSize: '10.5px', lineHeight: '1.35' },
    headerCenter: { textAlign: 'center', fontSize: '10.5px', lineHeight: '1.35' },
    headerRight:  { display: 'flex', justifyContent: 'flex-end' },
    logoFrame: { width: '66px', height: '66px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    logoImg:   { width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%) contrast(1.1)' },
    box: { border: '1px solid #000', marginTop: '12px' },
    boxTitle: { display: 'grid', gridTemplateColumns: '2fr 0.95fr', minHeight: '40px', borderBottom: '1px solid #000' },
    boxTitleLeft: { display: 'flex', alignItems: 'center', padding: '7px 10px', fontSize: '18px', fontWeight: '700', textTransform: 'uppercase' },
    boxTitleRight: { borderLeft: '1px solid #000', background: '#f8f8f8' },
    metaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', padding: '9px 10px', fontSize: '13px', lineHeight: '1.55' },
    metaRow: { marginBottom: '4px' },
    studentLine: { display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: '20px', padding: '10px', borderTop: '1px solid #000', fontSize: '13px', alignItems: 'center' },
    lineFillLong:  { display: 'inline-block', borderBottom: '1px solid #000', height: '12px', verticalAlign: 'middle', width: '230px', marginLeft: '6px' },
    lineFillShort: { display: 'inline-block', borderBottom: '1px solid #000', height: '12px', verticalAlign: 'middle', width: '55px', marginLeft: '4px' },
    scoreRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: '12px', marginTop: '18px' },
    scoreBox: { minHeight: '78px', border: '1px solid #000', padding: '8px 10px', background: '#fff' },
    scoreTitle: { fontWeight: '700', fontSize: '13px' },
    nbBlock: { marginTop: '18px', border: '1px solid #000', padding: '10px 12px', fontSize: '13px', lineHeight: '1.6' },
    nbTitle: { fontWeight: '700', marginBottom: '4px' },
  };

  const remarqueLines = d.remarques.trim()
    ? d.remarques.split('\n').filter(l => l.trim())
    : [
        '— Le barème est fourni à titre indicatif et peut être ajusté.',
        `— La durée de l'examen est de ${d.duration}.`,
        '— Les documents indiqués ci-dessus doivent être respectés.',
      ];

  return (
    <div style={S.sheet}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div>{d.campusTextEn}</div>
          <div>{d.campusText}</div>
          <div style={{ marginTop: '4px', fontSize: '9.5px', color: '#666' }}>{d.campusTagline}</div>
        </div>
        <div style={S.headerCenter}>
          <div>{d.universityAr}</div>
          <div>{d.universityFr}</div>
          <div><strong>{d.institute}</strong></div>
          <div>{d.department}</div>
        </div>
        <div style={S.headerRight}>
          <div style={S.logoFrame}>
            <img src={iitLogo} alt="IIT" style={S.logoImg} />
          </div>
        </div>
      </div>

      <div style={S.box}>
        <div style={S.boxTitle}>
          <div style={S.boxTitleLeft}>{d.titre}</div>
          <div style={S.boxTitleRight} />
        </div>

        <div style={S.metaGrid}>
          <div>
            {d.subject    && <div style={S.metaRow}><strong>Matière :</strong> {d.subject}</div>}
            {d.discipline && <div style={S.metaRow}><strong>Discipline :</strong> {d.discipline}</div>}
            {d.teachers   && <div style={S.metaRow}><strong>Enseignants :</strong> {d.teachers}</div>}
            {d.docs       && <div style={S.metaRow}><strong>Documents autorisés :</strong> {d.docs}</div>}
          </div>
          <div>
            {d.academicYear && <div style={S.metaRow}><strong>Année Universitaire :</strong> {d.academicYear}</div>}
            {d.semestre     && <div style={S.metaRow}><strong>Semestre :</strong> {semesterText}</div>}
            {d.duration     && <div style={S.metaRow}><strong>Durée :</strong> {d.duration}</div>}
            <div style={{ border: '1px solid #000', height: '40px', marginTop: '4px', padding: '5px', fontSize: '10px', color: '#999' }}>
              Réservé à l&apos;administration
            </div>
          </div>
        </div>

        {(d.sec.zoneNomPrenom || d.sec.zoneGroupe) && (
          <div style={S.studentLine}>
            <div>
              {d.sec.zoneNomPrenom && (<>Prénom &amp; Nom : <span style={S.lineFillLong} /></>)}
            </div>
            <div style={{ textAlign: 'center' }}>
              {d.sec.zoneGroupe && (<>Groupe <span style={S.lineFillShort} /></>)}
            </div>
          </div>
        )}
      </div>

      {(d.sec.blocNote || d.sec.blocCommentaires || d.sec.blocSignature) && (
        <div style={S.scoreRow}>
          {d.sec.blocNote        && <div style={S.scoreBox}><div style={S.scoreTitle}>Commentaires &amp; Note /20</div></div>}
          {d.sec.blocSignature   && <div style={S.scoreBox}><div style={S.scoreTitle}>Signature</div></div>}
          {d.sec.blocCommentaires && <div style={S.scoreBox}><div style={S.scoreTitle}>Réservé à l&apos;administration</div></div>}
        </div>
      )}

      {d.sec.blocRemarques && (
        <div style={S.nbBlock}>
          <div style={S.nbTitle}>NB.</div>
          {remarqueLines.map((line, i) => (
            <div key={i}>{line.trim().startsWith('—') ? line : `— ${line}`}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Forme 2 — Tableau simple ─────────────────────────────────────────────────
const ExamPreviewCourt = ({ model, examForm }) => {
  const d = getPreviewData(model, examForm);

  const S = {
    sheet: { width: `${A4_W}px`, minHeight: '430px', background: '#fff', color: '#000', padding: '12px 36px 20px', boxSizing: 'border-box', fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', lineHeight: '1.18' },
    topHeader: { display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'start', marginBottom: '8px' },
    leftHeader:  { textAlign: 'center', fontSize: '10px', lineHeight: '1.15' },
    rightHeader: { textAlign: 'center', fontSize: '10px', lineHeight: '1.15' },
    logoBox: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
    logoImg: { width: '72px', height: '50px', objectFit: 'contain', filter: 'grayscale(100%) contrast(1.1)' },
    metaTable: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '4px' },
    metaTd: { border: '1px solid #000', padding: '3px 6px', verticalAlign: 'top', lineHeight: '1.2' },
    examLine: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginTop: '4px', fontSize: '11px' },
    nameBox: { border: '1px solid #000', marginTop: '6px', height: '56px', padding: '7px 8px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '10px' },
    nameLine: { flex: 1, borderBottom: '1px solid #000', height: '13px' },
    nbText: { marginTop: '10px', borderTop: '1px dashed #777', paddingTop: '6px', fontSize: '10px', lineHeight: '1.45' },
  };

  const remarqueLines = d.remarques.trim()
    ? d.remarques.split('\n').filter(l => l.trim())
    : [
        '— Réponses sur la feuille de l\'énoncé.',
        '— Le barème est donné à titre indicatif.',
      ];

  return (
    <div style={S.sheet}>
      <div style={S.topHeader}>
        <div style={S.leftHeader}>
          <div>République Tunisienne</div>
          <div>Ministère de l&apos;Enseignement</div>
          <div>Supérieur</div>
          <div>et de la Recherche Scientifique</div>
        </div>
        <div style={S.logoBox}>
          <img src={iitLogo} alt="IIT" style={S.logoImg} />
        </div>
        <div style={S.rightHeader}>
          <div>{d.universityFr}</div>
          <div>{d.institute}</div>
          <div style={{ fontSize: '9px' }}>{d.universityAr}</div>
        </div>
      </div>

      <table style={S.metaTable}>
        <tbody>
          <tr>
            <td style={{ ...S.metaTd, width: '34%' }}><strong>Matière :</strong> {d.subject}</td>
            <td style={{ ...S.metaTd, width: '33%' }}><strong>Discipline :</strong> {d.discipline}</td>
            <td style={{ ...S.metaTd, width: '33%' }}><strong>Semestre :</strong> {d.semestre}</td>
          </tr>
          <tr>
            <td style={S.metaTd}><strong>Enseignant :</strong> {d.teachers}</td>
            <td style={S.metaTd}><strong>Année universitaire :</strong> {d.academicYear}</td>
            <td style={S.metaTd}><strong>Date :</strong> {d.dateExamen || '—'}</td>
          </tr>
          <tr>
            <td style={S.metaTd}><strong>Documents :</strong> {d.docs}</td>
            <td style={S.metaTd}><strong>Nombre de pages :</strong> Auto</td>
            <td style={S.metaTd}><strong>Durée :</strong> {d.duration}</td>
          </tr>
        </tbody>
      </table>

      <div style={S.examLine}>
        <span />
        <strong>{d.feuilleType} ◄</strong>
      </div>

      {d.sec.zoneNomPrenom && (
        <div style={S.nameBox}>
          <span>Prénom &amp; Nom :</span>
          <div style={S.nameLine} />
        </div>
      )}

      {d.sec.blocRemarques && (
        <div style={S.nbText}>
          {remarqueLines.map((line, i) => (
            <div key={i}>{line.trim().startsWith('—') ? line : `— ${line}`}</div>
          ))}
        </div>
      )}
    </div>
  );
};
