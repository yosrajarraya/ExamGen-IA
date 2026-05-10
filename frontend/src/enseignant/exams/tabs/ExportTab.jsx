import { useState } from 'react';
import {
  FiArrowLeft, FiSave, FiUploadCloud, FiFileText,
  FiDownload, FiCheck, FiLoader,
} from 'react-icons/fi';
import iitLogoAsset from '../../../assets/iit2.png';

// ── Logo IIT — chargé depuis l'asset au runtime pour éviter la troncature ─────
let IIT_LOGO_B64 = null;
const getIITLogo = async () => {
  if (IIT_LOGO_B64) return IIT_LOGO_B64;
  try {
    const resp = await fetch(iitLogoAsset);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => { IIT_LOGO_B64 = reader.result; resolve(IIT_LOGO_B64); };
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

const A4_W = 794;

const getSafeFileName = (name) =>
  (name || 'examen').replace(/[^\wÀ-ÿ-]+/g, '_').replace(/_+/g, '_').slice(0, 60);

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS CSS / HTML
───────────────────────────────────────────────────────────────────────────── */

/** Retourne la class CSS selon le type de QCM */
const getOptionMarkClass = (type) =>
  type === 'qcm_unique' ? 'option-mark option-mark--unique' : 'option-mark option-mark--multi';

/** Retourne le label lisible du type de question */
const getQcmTypeLabel = (type) => {
  if (type === 'qcm_unique')   return '(Choix unique)';
  if (type === 'qcm_multiple') return '(Choix multiple)';
  if (type === 'vrai_faux')    return '(Vrai / Faux)';
  return '';
};

/* ─────────────────────────────────────────────────────────────────────────────
   CSS DE L'EXPORT WORD
───────────────────────────────────────────────────────────────────────────── */
const buildExportCss = (tpl) => {
  const font = tpl.police || 'Times New Roman';
  const size = tpl.taille || '11pt';
  const marginH = `${tpl.margeH || 1.8}cm`;
  const marginV = `${tpl.margeV || 1.8}cm`;
  return `
@page{size:A4;margin:${marginV} ${marginH}}
@media print{
  .page-break{page-break-after:always}
  footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:9pt;color:#666}
}
body{font-family:"${font}",serif;color:#000;font-size:${size};line-height:1.35;counter-reset:page}

/* ── EN-TÊTE LONG ── */
.top-header.long{display:grid;grid-template-columns:1.1fr 2fr 0.8fr;gap:10px;align-items:start;border-bottom:1.5px solid #000;padding-bottom:8px;margin-bottom:0;font-size:10pt;line-height:1.25}
.h-left,.h-right-col{font-size:9.5pt;line-height:1.3}
.h-center{text-align:center;font-size:9.5pt;line-height:1.3}
.h-right-col{display:flex;justify-content:flex-end}
.h-logo-box{border:1px solid #000;padding:4px;display:flex;align-items:center;justify-content:center;width:66px;height:66px}
.h-logo-img{width:100%;height:100%;object-fit:contain;filter:grayscale(100%) contrast(1.1)}

/* ── BOÎTE TITRE+META LONG ── */
.long-box{border:1px solid #000;margin-top:10px}
.long-title{display:grid;grid-template-columns:2fr 0.95fr;border-bottom:1px solid #000;min-height:36px}
.long-title-left{padding:6px 10px;font-size:14pt;font-weight:900;text-transform:uppercase;display:flex;align-items:center}
.long-title-right{border-left:1px solid #000;background:#f8f8f8}
.long-meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px 10px;font-size:10.5pt}
.long-meta p{margin:2px 0}
.admin-box{border:1px solid #000;height:44px;margin-top:4px;padding:4px;font-size:9pt;color:#aaa}
.student-line{display:grid;grid-template-columns:2.4fr 1fr;border-top:1px solid #000;padding:10px;font-size:10.5pt;align-items:center}
.group-cell{text-align:center}

/* ── EN-TÊTE COURT ── */
.top-header.court{display:grid;grid-template-columns:1fr 90px 1fr;align-items:start;margin-bottom:6px;font-size:10pt;line-height:1.15;text-align:center}
.court-left,.court-right{text-align:center;font-size:9.5pt;line-height:1.2}
.court-logo-box{display:flex;justify-content:center;align-items:center}
.court-logo-img{width:72px;height:50px;object-fit:contain;filter:grayscale(100%) contrast(1.1)}
.meta-table{width:100%;border-collapse:collapse;font-size:10.5pt;margin-top:4px}
.meta-table td{border:1px solid #000;padding:3px 6px;vertical-align:top;line-height:1.2}
.exam-line{display:flex;justify-content:flex-end;align-items:center;margin-top:4px;font-size:11pt}
.name-box{border:1px solid #000;margin-top:6px;height:50px;padding:7px 8px;display:flex;align-items:flex-start;gap:8px;font-size:10pt}
.name-line{flex:1;border-bottom:1px solid #000;height:14px}

/* ── LIGNES DE REMPLISSAGE ── */
.fill-line{display:inline-block;border-bottom:1px solid #000;height:12px;vertical-align:middle;margin-left:6px}
.fill-long{width:220px}.fill-short{width:65px}

/* ── PARTIES / EXERCICES / QUESTIONS ── */
h2.part-title{font-size:12.5pt;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:3px;margin-top:20px;margin-bottom:8px;font-weight:700}
h3.exo-title{font-size:11.5pt;margin:10px 0 5px;font-weight:600}
.pts{color:#777;font-size:9.5pt;margin-left:5px}
.question{margin:8px 0;font-size:10.5pt}
.qcm-type-label{font-size:9pt;color:#555;margin-left:6px;font-style:italic}
.options{margin-left:20px;margin-top:4px;display:grid;gap:5px}
.option-row{display:flex;align-items:flex-start;gap:8px}
.option-mark{width:12px;height:12px;border:1.5px solid #000;display:inline-block;flex:0 0 auto;margin-top:2px;background:#fff;box-sizing:border-box}
.option-mark--unique{border-radius:50%}
.option-mark--multi{border-radius:2px}
.option-text{display:inline-block;line-height:1.3;font-size:10.5pt}

/* ── LIGNES DE RÉPONSE (pointillés) ── */
.answer-lines{margin-top:6px}
.answer-dot-line{border-bottom:1px dotted #555;height:18px;margin-top:4px;width:100%}

.enonce{font-style:italic;color:#333;margin:4px 0;font-size:10.5pt}

/* ── PIED DE PAGE ── */
.page-footer{text-align:center;font-size:9pt;color:#666;border-top:1px solid #ccc;padding-top:4px;margin-top:12px}
`;
};

/* ─────────────────────────────────────────────────────────────────────────────
   BUILDER HTML – EN-TÊTE
───────────────────────────────────────────────────────────────────────────── */
const buildHeaderHtml = (examForm = {}, tpl = {}, logoB64 = '') => {
  const subject      = examForm.matiere            || tpl.matiere            || '—';
  const discipline   = examForm.filiere            || tpl.discipline         || '—';
  const teachers     = examForm.enseignants        || tpl.enseignants        || '—';
  const docs         = examForm.documentsAutorises || tpl.documentsAutorises || '—';
  const academicYear = examForm.anneeUniversitaire || tpl.anneeUniversitaire || '—';
  const semestre     = examForm.semestre           || tpl.semestre           || '—';
  const dateExamen   = examForm.dateExamen         || tpl.dateExamen         || '';
  const duration     = examForm.duree              || tpl.duree              || '—';
  const title        = examForm.titre              || tpl.titreExamen        || 'DEVOIR SURVEILLÉ';
  const feuilleType  = tpl.feuilleType             || "Feuille d'énoncé";
  const templateStyle = tpl.templateStyle || 'long';
  const semStr       = dateExamen ? `${semestre} (${dateExamen})` : semestre;

  const logoImg = logoB64 ? `<img src="${logoB64}" alt="IIT" class="h-logo-img" />` : `<span style="font-size:18pt;font-weight:bold">IIT</span>`;

  if (templateStyle === 'court') {
    return `
<div class="top-header court">
  <div class="court-left">
    <div>République Tunisienne</div>
    <div>Ministère de l'Enseignement</div>
    <div>Supérieur</div>
    <div>et de la Recherche Scientifique</div>
  </div>
  <div class="court-logo-box"><div style="width:72px;height:50px">${logoImg}</div></div>
  <div class="court-right">
    <div>${tpl.universiteFr || 'Université Nord-Américaine privée'}</div>
    <div>${tpl.institutFr   || 'Institut International de Technologie'}</div>
    <div style="font-size:8.5pt">${tpl.universiteAr || ''}</div>
  </div>
</div>
<table class="meta-table">
  <tr>
    <td style="width:34%"><strong>Matière :</strong> ${subject}</td>
    <td style="width:33%"><strong>Discipline :</strong> ${discipline}</td>
    <td style="width:33%"><strong>Semestre :</strong> ${semestre}</td>
  </tr>
  <tr>
    <td><strong>Enseignant :</strong> ${teachers}</td>
    <td><strong>Année universitaire :</strong> ${academicYear}</td>
    <td><strong>Date :</strong> ${dateExamen || '—'}</td>
  </tr>
  <tr>
    <td><strong>Documents :</strong> ${docs}</td>
    <td><strong>Nombre de pages :</strong> <span id="nb-pages">—</span></td>
    <td><strong>Durée :</strong> ${duration}</td>
  </tr>
</table>
<div class="exam-line"><strong>${feuilleType} ◄</strong></div>
<div class="name-box">
  <span>Prénom &amp; Nom :</span>
  <div class="name-line"></div>
</div>`;
  }

  /* ── Style LONG ── */
  return `
<div class="top-header long">
  <div class="h-left">
    <div>${tpl.campusTextEn || 'North American Private University'}</div>
    <div>${tpl.campusText   || 'SFAX | TUNISIA'}</div>
    <div style="font-size:8.5pt;color:#666;margin-top:2px">${tpl.campusTagline || 'TECHNOLOGY · BUSINESS · ARCHITECTURE'}</div>
  </div>
  <div class="h-center">
    <div>${tpl.universiteAr  || 'الجامعة الشمالية الأمريكية الخاصة'}</div>
    <div>${tpl.universiteFr  || 'Université Nord-Américaine Privée'}</div>
    <div><strong>${tpl.institutFr  || 'Institut International de Technologie'}</strong></div>
    <div>${tpl.departementFr || ''}</div>
  </div>
  <div class="h-right-col">
    <div class="h-logo-box">${logoImg}</div>
  </div>
</div>

<div class="long-box">
  <div class="long-title">
    <div class="long-title-left">${title}</div>
    <div class="long-title-right"></div>
  </div>
  <div class="long-meta">
    <div>
      <p><strong>Matière :</strong> ${subject}</p>
      <p><strong>Discipline :</strong> ${discipline}</p>
      <p><strong>Enseignants :</strong> ${teachers}</p>
      <p><strong>Documents autorisés :</strong> ${docs}</p>
    </div>
    <div>
      <p><strong>Année Universitaire :</strong> ${academicYear}</p>
      <p><strong>Semestre :</strong> ${semStr}</p>
      <p><strong>${feuilleType} / Durée :</strong> ${duration}</p>
      <div class="admin-box">Réservé à l'administration</div>
    </div>
  </div>
  <div class="student-line">
    <div><strong>Prénom &amp; Nom :</strong><span class="fill-line fill-long"></span></div>
    <div class="group-cell"><strong>Groupe</strong><span class="fill-line fill-short"></span></div>
  </div>
</div>`;
};

/* ─────────────────────────────────────────────────────────────────────────────
   BUILDER HTML – QUESTIONS
───────────────────────────────────────────────────────────────────────────── */
const buildQuestionsHtml = (sections = []) => {
  let qNum = 1;
  return sections.map((sec, si) => {
    const exosHtml = (sec.exercises || []).map((exo, ei) => {
      const ep = parseFloat(exo.points) || 0;
      const qsHtml = (exo.questions || []).map((q) => {
        const pts = parseFloat(q.points) || 0;
        if (q.type === 'enonce') return `<p class="enonce">${q.text || ''}</p>`;
        const num = qNum++;

        /* ── Options QCM ── */
        const isQcm = ['qcm', 'qcm_unique', 'qcm_multiple', 'vrai_faux'].includes(q.type);
        const typeLabel = getQcmTypeLabel(q.type);
        const optsHtml = isQcm && q.options?.length
          ? `<div class="options">${q.options.map((o, oi) => `
              <div class="option-row">
                <span class="${getOptionMarkClass(q.type)}"></span>
                <span class="option-text">${String.fromCharCode(65 + oi)}. ${o.text || ''}</span>
              </div>`).join('')}</div>`
          : '';

        /* ── Lignes de réponse avec pointillés ── */
        const nbAnswerLines = q.answerLines ?? 3;
        const ansHtml = (q.type === 'ouverte' || q.type === 'pratique')
          ? `<div class="answer-lines">${Array.from({ length: nbAnswerLines }).map(() => '<div class="answer-dot-line"></div>').join('')}</div>`
          : '';

        return `<div class="question">
          <strong>Q${num}.</strong> ${q.text || '(vide)'}
          ${pts > 0 ? `<span class="pts">(${pts} pts)</span>` : ''}
          ${typeLabel ? `<span class="qcm-type-label">${typeLabel}</span>` : ''}
          ${optsHtml}${ansHtml}
        </div>`;
      }).join('');
      return `<div class="exercise">
        <h3 class="exo-title">Exercice ${ei + 1} — ${exo.title || ''}
          ${ep > 0 ? `<span class="pts">(${ep} pts)</span>` : ''}</h3>
        ${qsHtml}
      </div>`;
    }).join('');
    return `<section class="part">
      <h2 class="part-title">Partie ${si + 1} — ${sec.title || ''}</h2>
      ${exosHtml}
    </section>`;
  }).join('');
};

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT → .doc
───────────────────────────────────────────────────────────────────────────── */
const exportToWord = async (examForm, sections, tpl) => {
  const logoB64 = await getIITLogo();
  const css     = buildExportCss(tpl);
  const header  = buildHeaderHtml(examForm, tpl, logoB64);
  const questions = buildQuestionsHtml(sections);
  const title   = examForm.titre || tpl.titreExamen || 'Examen';

  /* Script JS embarqué pour calculer le nb de pages et les remplir */
  const pageScript = `
    <script>
      window.onload = function() {
        // Calcul nb pages via la hauteur A4
        var A4_H_PX = 1122;
        var totalH  = document.body.scrollHeight;
        var nbPages = Math.max(1, Math.ceil(totalH / A4_H_PX));
        var els = document.querySelectorAll('.nb-pages');
        els.forEach(function(el){ el.textContent = nbPages; });
        var nb2 = document.querySelectorAll('#nb-pages');
        nb2.forEach(function(el){ el.textContent = nbPages; });
      };
    </script>`;

  const footerHtml = `
    <div class="page-footer">
      Page <span class="current-page"></span> / <span class="nb-pages">—</span>
    </div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>${css}</style>
  ${pageScript}
</head>
<body>
  ${header}
  ${questions}
  ${footerHtml}
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${getSafeFileName(examForm.matiere || examForm.titre)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
/* ─────────────────────────────────────────────────────────────────────────────
   APERÇU A4 REACT (JSX) – fidèle au modèle sélectionné
───────────────────────────────────────────────────────────────────────────── */
const ExamA4Preview = ({ examForm, sections, tpl }) => {
  const subject      = examForm.matiere            || tpl.matiere            || '—';
  const discipline   = examForm.filiere            || tpl.discipline         || '—';
  const teachers     = examForm.enseignants        || tpl.enseignants        || '—';
  const docs         = examForm.documentsAutorises || tpl.documentsAutorises || '—';
  const academicYear = examForm.anneeUniversitaire || tpl.anneeUniversitaire || '—';
  const semestre     = examForm.semestre           || tpl.semestre           || '—';
  const dateExamen   = examForm.dateExamen         || tpl.dateExamen         || '';
  const duration     = examForm.duree              || tpl.duree              || '—';
  const title        = examForm.titre              || tpl.titreExamen        || 'DEVOIR SURVEILLÉ';
  const feuilleType  = tpl.feuilleType             || "Feuille d'énoncé";
  const semStr       = dateExamen ? `${semestre} (${dateExamen})` : semestre;
  const templateStyle = tpl.templateStyle || 'long';

  const S = {
    sheet: { width: `${A4_W}px`, minHeight: '1123px', background: '#fff', color: '#000', padding: '22px 26px', boxSizing: 'border-box', fontFamily: '"Times New Roman", serif', fontSize: '11px', lineHeight: 1.3 },
    /* LONG */
    headerLong:    { display: 'grid', gridTemplateColumns: '1.1fr 2fr 0.8fr', gap: '10px', alignItems: 'start', borderBottom: '1.5px solid #000', paddingBottom: '8px', marginBottom: '0' },
    hLeft:         { fontSize: '9.5px', lineHeight: 1.3 },
    hCenter:       { textAlign: 'center', fontSize: '9.5px', lineHeight: 1.3 },
    hRight:        { display: 'flex', justifyContent: 'flex-end' },
    logoBox:       { width: '66px', height: '66px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' },
    logoImg:       { width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%) contrast(1.1)' },
    longBox:       { border: '1px solid #000', marginTop: '10px' },
    longTitle:     { display: 'grid', gridTemplateColumns: '2fr 0.95fr', borderBottom: '1px solid #000', minHeight: '34px' },
    longTitleL:    { padding: '6px 10px', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center' },
    longTitleR:    { borderLeft: '1px solid #000', background: '#f8f8f8' },
    longMeta:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '7px 10px', fontSize: '10px' },
    metaP:         { margin: '2px 0' },
    adminBox:      { border: '1px solid #000', height: '40px', marginTop: '4px', padding: '4px', fontSize: '9px', color: '#aaa' },
    studentLine:   { display: 'grid', gridTemplateColumns: '2.4fr 1fr', borderTop: '1px solid #000', padding: '8px 10px', fontSize: '10px', alignItems: 'center' },
    fillLong:      { display: 'inline-block', borderBottom: '1px solid #000', width: '200px', height: '12px', verticalAlign: 'middle', marginLeft: '6px' },
    fillShort:     { display: 'inline-block', borderBottom: '1px solid #000', width: '60px', height: '12px', verticalAlign: 'middle', marginLeft: '6px' },
    /* COURT */
    headerCourt:   { display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'start', marginBottom: '6px' },
    courtSide:     { textAlign: 'center', fontSize: '9px', lineHeight: 1.2 },
    courtLogoBox:  { display: 'flex', justifyContent: 'center', alignItems: 'center' },
    courtLogoImg:  { width: '72px', height: '50px', objectFit: 'contain', filter: 'grayscale(100%) contrast(1.1)' },
    metaTable:     { width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' },
    metaTd:        { border: '1px solid #000', padding: '3px 5px', verticalAlign: 'top', lineHeight: 1.2 },
    examLine:      { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px', fontSize: '10.5px' },
    nameBox:       { border: '1px solid #000', marginTop: '6px', height: '46px', padding: '6px 8px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '9.5px' },
    nameLine:      { flex: 1, borderBottom: '1px solid #000', height: '13px' },
    /* COMMUN */
    partTitle:     { fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', borderBottom: '1.5px solid #000', paddingBottom: '3px', marginTop: '18px', marginBottom: '8px' },
    exoTitle:      { fontWeight: 600, fontSize: '11px', margin: '10px 0 5px' },
    qRow:          { margin: '7px 0', fontSize: '10.5px' },
    pts:           { color: '#888', fontSize: '9.5px', marginLeft: '5px' },
    qcmLabel:      { color: '#555', fontSize: '8.5px', marginLeft: '5px', fontStyle: 'italic' },
    opts:          { marginLeft: '18px', marginTop: '4px', fontSize: '10px', display: 'grid', gap: '5px' },
    optionRow:     { display: 'flex', alignItems: 'flex-start', gap: '8px' },
    optMark:       { width: '11px', height: '11px', border: '1.5px solid #000', background: '#fff', boxSizing: 'border-box', flex: '0 0 auto', marginTop: '2px' },
    optMarkCircle: { borderRadius: '50%' },
    optMarkSquare: { borderRadius: '2px' },
    optText:       { display: 'inline-block', lineHeight: 1.25 },
    ansBlock:      { marginTop: '5px' },
    dotLine:       { borderBottom: '1px dotted #555', height: '17px', marginTop: '4px', width: '100%' },
    enonce:        { fontStyle: 'italic', color: '#444', margin: '5px 0', fontSize: '10px' },
    footer:        { textAlign: 'center', fontSize: '9px', color: '#888', borderTop: '1px solid #ccc', paddingTop: '4px', marginTop: '14px' },
  };

  let qNum = 1;

  const renderHeader = () => {
    if (templateStyle === 'court') {
      return (
        <>
          <div style={S.headerCourt}>
            <div style={S.courtSide}>
              <div>République Tunisienne</div>
              <div>Ministère de l'Enseignement</div>
              <div>Supérieur</div>
              <div>et de la Recherche Scientifique</div>
            </div>
            <div style={S.courtLogoBox}>
              <img src={iitLogoAsset} alt="IIT" style={S.courtLogoImg} />
            </div>
            <div style={S.courtSide}>
              <div>{tpl.universiteFr || 'Université Nord-Américaine privée'}</div>
              <div>{tpl.institutFr   || 'Institut International de Technologie'}</div>
              <div style={{ fontSize: '8px' }}>{tpl.universiteAr || ''}</div>
            </div>
          </div>
          <table style={S.metaTable}>
            <tbody>
              <tr>
                <td style={{ ...S.metaTd, width: '34%' }}><strong>Matière :</strong> {subject}</td>
                <td style={{ ...S.metaTd, width: '33%' }}><strong>Discipline :</strong> {discipline}</td>
                <td style={{ ...S.metaTd, width: '33%' }}><strong>Semestre :</strong> {semestre}</td>
              </tr>
              <tr>
                <td style={S.metaTd}><strong>Enseignant :</strong> {teachers}</td>
                <td style={S.metaTd}><strong>Année universitaire :</strong> {academicYear}</td>
                <td style={S.metaTd}><strong>Date :</strong> {dateExamen || '—'}</td>
              </tr>
              <tr>
                <td style={S.metaTd}><strong>Documents :</strong> {docs}</td>
                <td style={S.metaTd}><strong>Nb pages :</strong> —</td>
                <td style={S.metaTd}><strong>Durée :</strong> {duration}</td>
              </tr>
            </tbody>
          </table>
          <div style={S.examLine}><strong>{feuilleType} ◄</strong></div>
          <div style={S.nameBox}>
            <span>Prénom &amp; Nom :</span>
            <div style={S.nameLine} />
          </div>
        </>
      );
    }
    /* LONG */
    return (
      <>
        <div style={S.headerLong}>
          <div style={S.hLeft}>
            <div>{tpl.campusTextEn || 'North American Private University'}</div>
            <div>{tpl.campusText   || 'SFAX | TUNISIA'}</div>
            <div style={{ fontSize: '7.5px', color: '#666', marginTop: '2px' }}>{tpl.campusTagline || 'TECHNOLOGY · BUSINESS · ARCHITECTURE'}</div>
          </div>
          <div style={S.hCenter}>
            <div>{tpl.universiteAr  || 'الجامعة الشمالية الأمريكية الخاصة'}</div>
            <div>{tpl.universiteFr  || 'Université Nord-Américaine Privée'}</div>
            <div><strong>{tpl.institutFr || 'Institut International de Technologie'}</strong></div>
            <div>{tpl.departementFr || ''}</div>
          </div>
          <div style={S.hRight}>
            <div style={S.logoBox}>
              <img src={iitLogoAsset} alt="IIT" style={S.logoImg} />
            </div>
          </div>
        </div>

        <div style={S.longBox}>
          <div style={S.longTitle}>
            <div style={S.longTitleL}>{title}</div>
            <div style={S.longTitleR} />
          </div>
          <div style={S.longMeta}>
            <div>
              <p style={S.metaP}><strong>Matière :</strong> {subject}</p>
              <p style={S.metaP}><strong>Discipline :</strong> {discipline}</p>
              <p style={S.metaP}><strong>Enseignants :</strong> {teachers}</p>
              <p style={S.metaP}><strong>Documents autorisés :</strong> {docs}</p>
            </div>
            <div>
              <p style={S.metaP}><strong>Année Universitaire :</strong> {academicYear}</p>
              <p style={S.metaP}><strong>Semestre :</strong> {semStr}</p>
              <p style={S.metaP}><strong>{feuilleType} / Durée :</strong> {duration}</p>
              <div style={S.adminBox}>Réservé à l'administration</div>
            </div>
          </div>
          <div style={S.studentLine}>
            <div><strong>Prénom &amp; Nom :</strong><span style={S.fillLong} /></div>
            <div style={{ textAlign: 'center' }}><strong>Groupe</strong><span style={S.fillShort} /></div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={S.sheet}>
      {renderHeader()}

      {sections.map((sec, si) => (
        <div key={sec.id || si}>
          <div style={S.partTitle}>Partie {si + 1} — {sec.title}</div>
          {(sec.exercises || []).map((exo, ei) => {
            const ep = parseFloat(exo.points) || 0;
            return (
              <div key={exo.id || ei}>
                <div style={S.exoTitle}>
                  Exercice {ei + 1} — {exo.title}
                  {ep > 0 && <span style={S.pts}>( {ep} pts)</span>}
                </div>
                {(exo.questions || []).map((q) => {
                  const pts = parseFloat(q.points) || 0;
                  if (q.type === 'enonce') return <div key={q.id} style={S.enonce}>{q.text}</div>;
                  const num = qNum++;
                  const isQcm = ['qcm', 'qcm_unique', 'qcm_multiple', 'vrai_faux'].includes(q.type);
                  const typeLabel = getQcmTypeLabel(q.type);
                  const isUnique = q.type === 'qcm_unique' || q.type === 'vrai_faux';
                  return (
                    <div key={q.id} style={S.qRow}>
                      <div>
                        <strong>Q{num}.</strong> {q.text}
                        {pts > 0 && <span style={S.pts}>( {pts} pts)</span>}
                        {typeLabel && <span style={S.qcmLabel}>{typeLabel}</span>}
                      </div>
                      {isQcm && q.options?.length > 0 && (
                        <div style={S.opts}>
                          {q.options.map((opt, oi) => (
                            <div key={opt.id || oi} style={S.optionRow}>
                              <span style={{
                                ...S.optMark,
                                ...(isUnique ? S.optMarkCircle : S.optMarkSquare),
                              }} />
                              <span style={S.optText}>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(q.type === 'ouverte' || q.type === 'pratique') && (
                        <div style={S.ansBlock}>
                          {Array.from({ length: q.answerLines ?? 3 }).map((_, li) => (
                            <div key={li} style={S.dotLine} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}

      <div style={S.footer}>
        Page — / —
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   COMPOSANT PRINCIPAL ExportTab
───────────────────────────────────────────────────────────────────────────── */
const ExportTab = ({
  examForm = {},
  sections = [],
  allTemplates = [],
  selectedTemplate,
  isSavingExam,
  exportMessage,
  exportError,
  onSave,
  onTabChange,
}) => {
  const [wordLoading, setWordLoading] = useState(false);
  const [wordDone,    setWordDone]    = useState(false);
  const [wordError,   setWordError]   = useState('');
  const [visibility,  setVisibility]  = useState('public');

  /* Résolution du modèle actif */
  const selectedTpl = selectedTemplate
    ? allTemplates.find((t) => t._id === selectedTemplate)
    : null;
  const backendTpl = !selectedTpl && examForm.templateId
    ? allTemplates.find((t) => t._id === examForm.templateId)
    : null;
  const activeTpl = {
    ...(selectedTpl || backendTpl || {}),
    templateStyle: (selectedTpl || backendTpl)?.templateStyle || examForm.templateStyle || 'long',
  };

  const totalQuestions = sections.reduce(
    (sum, sec) => sum + (sec.exercises || []).reduce(
      (s2, ex) => s2 + (ex.questions || []).filter((q) => q.type !== 'enonce').length, 0
    ), 0
  );

  const totalPts = sections.reduce(
    (sum, sec) => sum + (sec.exercises || []).reduce((es, ex) => {
      const ep = parseFloat(ex.points) || 0;
      const qp = (ex.questions || []).reduce((qs, q) => qs + (parseFloat(q.points) || 0), 0);
      return es + (ep || qp);
    }, 0), 0
  );

  const canExport = !!(selectedTpl || backendTpl) && totalQuestions > 0;

  const handleWordExport = async () => {
    setWordLoading(true);
    setWordDone(false);
    setWordError('');
    try {
      if (!selectedTpl && !backendTpl) throw new Error('Veuillez sélectionner un modèle.');
      if (totalQuestions === 0) throw new Error('Veuillez ajouter au moins une question.');
      // Passe la visibilité choisie au moment du téléchargement
      await onSave('Exporte', visibility);
      setWordDone(true);
      setTimeout(() => setWordDone(false), 2500);
    } catch (err) {
      setWordError(err.message || "Erreur lors de l'export.");
    } finally {
      setWordLoading(false);
    }
  };

  return (
    <section className="exam-card export-section">
      
      <div className="export-header">
        <h2>Finaliser l'examen</h2>
        <p className="export-subtitle">Vérifiez l'aperçu puis sauvegardez ou exportez le fichier Word.</p>
      </div>

      {/* Résumé */}
      <div className="export-summary">
        {[
          { label: 'Parties',   value: sections.length },
          { label: 'Questions', value: totalQuestions },
          { label: 'Barème',    value: `${totalPts}/20` },
          { label: 'Modèle',    value: selectedTpl ? selectedTpl.nom : (backendTpl ? backendTpl.nom : 'Aucun') },
        ].map(({ label, value }) => (
          <div key={label} className="export-summary-item">
            <div className="export-summary-value">{value}</div>
            <div className="export-summary-label">{label}</div>
          </div>
        ))}
      </div>

      {!selectedTpl && !backendTpl && (
        <p className="msg-error export-msg">Veuillez choisir un modèle avant l'export.</p>
      )}
      {totalQuestions === 0 && (
        <p className="msg-error export-msg">Veuillez ajouter au moins une question avant de sauvegarder ou exporter.</p>
      )}

      {/* Bloc export Word */}
      <div className="word-export-block">
        <div className="word-export-info">

          <div className="word-export-icon"><FiFileText size={22} /></div>
          <div>
            <div className="word-export-title">Export Word</div>
            <div className="word-export-desc">Exportez l’examen au format Word avec sauvegarde automatique dans la banque</div>
          </div>
        </div>
 <div className="visibility-toggle-group">
          <button
            type="button"
            className={`visibility-btn ${visibility === 'private' ? 'visibility-btn--active visibility-btn--private' : ''}`}
            onClick={() => setVisibility('private')}
          >
            🔒 Privé
          </button>
          <button
            type="button"
            className={`visibility-btn ${visibility === 'public' ? 'visibility-btn--active visibility-btn--public' : ''}`}
            onClick={() => setVisibility('public')}
          >
            🌐 Public
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-word-export ${wordDone ? 'btn-word-export--done' : ''}`}
            onClick={handleWordExport}
            disabled={wordLoading || !canExport}
          >
            {wordLoading
              ? <><FiLoader className="spin" size={16} /> Génération…</>
              : wordDone
                ? <><FiCheck size={16} /> Téléchargé</>
                : <><FiDownload size={16} /> Télécharger & publier</>
            }
          </button>
        </div>
      </div>

      {wordError     && <p className="word-export-error">{wordError}</p>}
      {exportMessage && <p className="msg-success export-msg">{exportMessage}</p>}
      {exportError   && <p className="msg-error export-msg">{exportError}</p>}

      {/* Visibilité de l'examen */}
  
      {/* Actions */}
      <div className="exam-actions">
        <button type="button" className="exam-btn-secondary" onClick={() => onTabChange('Questions')} disabled={isSavingExam}>
          <FiArrowLeft /> Retour aux Questions
        </button>
        <button type="button"className="exam-btn-gold export-action-btn"  onClick={() => onSave('Brouillon', visibility)} disabled={isSavingExam || !canExport}>
          <FiSave /> {isSavingExam ? 'Sauvegarde…' : 'Sauvegarder brouillon'}
        </button>

      </div>
    </section>
  );
};

export { ExamA4Preview };

export default ExportTab;