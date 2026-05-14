import iitLogoAsset from '../assets/iit2.png';

let IIT_LOGO_B64 = null;

export const getIITLogo = async () => {
  if (IIT_LOGO_B64) return IIT_LOGO_B64;
  try {
    const resp = await fetch(iitLogoAsset);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        IIT_LOGO_B64 = reader.result;
        resolve(IIT_LOGO_B64);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

export const getSafeFileName = (name) =>
  (name || 'examen')
    .replace(/[^\wÀ-ÿ-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);

export const getOptionMarkClass = (type) =>
  type === 'qcm_unique' || type === 'vrai_faux'
    ? 'option-mark option-mark--unique'
    : 'option-mark option-mark--multi';

export const getQcmTypeLabel = (type) => {
  const labels = {
    qcm_unique: '(Choix unique)',
    qcm_multiple: '(Choix multiple)',
    vrai_faux: '(Vrai / Faux)',
  };
  return labels[type] || '';
};

export const calculateTotals = (sections) => {
  let totalQuestions = 0;
  let totalPoints = 0;

  sections.forEach((sec) => {
    (sec.exercises || []).forEach((exo) => {
      const exoPoints = parseFloat(exo.points) || 0;
      let questionPoints = 0;

      (exo.questions || []).forEach((q) => {
        if (q.type !== 'enonce') totalQuestions++;
        questionPoints += parseFloat(q.points) || 0;
      });

      totalPoints += exoPoints || questionPoints;
    });
  });

  return { totalQuestions, totalPoints };
};

/**
 * Estime le nombre de pages A4 basé sur le contenu.
 * Hauteur A4 ≈ 1123px à 96 DPI (297mm).
 * Côté React, on préfère mesurer le DOM réel via ResizeObserver,
 * mais cette fonction permet une estimation côté helper si besoin.
 */
export const estimatePageCount = (sections, headerHeight = 280) => {
  const A4_H = 1123;
  const lineHeight = 18;
  let contentHeight = headerHeight;

  sections.forEach((sec) => {
    contentHeight += 40; // Titre partie
    (sec.exercises || []).forEach((exo) => {
      contentHeight += 30; // Titre exercice
      (exo.questions || []).forEach((q) => {
        if (q.type === 'enonce') {
          contentHeight += lineHeight * 2;
        } else {
          contentHeight += lineHeight * 2.5; // Question + espacement
          if (['qcm', 'qcm_unique', 'qcm_multiple', 'vrai_faux'].includes(q.type) && q.options?.length) {
            contentHeight += q.options.length * lineHeight;
          }
          if (q.type === 'ouverte' || q.type === 'pratique') {
            contentHeight += (q.answerLines ?? 3) * 22;
          }
        }
      });
    });
  });

  return Math.max(1, Math.ceil(contentHeight / A4_H));
};

export const resolveActiveTemplate = (selectedTemplate, examForm, allTemplates) => {
  const selected = selectedTemplate
    ? allTemplates.find((t) => t._id === selectedTemplate)
    : null;

  const backend = !selected && examForm?.templateId
    ? allTemplates.find((t) => t._id === examForm.templateId)
    : null;

  return {
    ...(selected || backend || {}),
    templateStyle: (selected || backend)?.templateStyle || examForm?.templateStyle || 'long',
  };
};

/* ── CSS pour l'export Word ── */
export const buildExportCss = (tpl) => {
  const font = tpl.police || 'Times New Roman';
  const size = tpl.taille || '11pt';
  const marginH = `${tpl.margeH || 1.8}cm`;
  const marginV = `${tpl.margeV || 1.8}cm`;

  return `
@page { size: A4; margin: ${marginV} ${marginH}; }
@media print {
  .page-break { page-break-after: always; }
  footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9pt; color: #666; }
}
body {
  font-family: "${font}", serif;
  color: #000;
  font-size: ${size};
  line-height: 1.35;
  counter-reset: page;
}

/* En-tête LONG */
.top-header.long {
  display: grid;
  grid-template-columns: 1.1fr 2fr 0.8fr;
  gap: 10px;
  align-items: start;
  border-bottom: 1.5px solid #000;
  padding-bottom: 8px;
  margin-bottom: 0;
  font-size: 10pt;
  line-height: 1.25;
}
.h-left, .h-right-col { font-size: 9.5pt; line-height: 1.3; }
.h-center { text-align: center; font-size: 9.5pt; line-height: 1.3; }
.h-right-col { display: flex; justify-content: flex-end; }
.h-logo-box {
  border: 1px solid #000;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 66px;
  height: 66px;
}
.h-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: grayscale(100%) contrast(1.1);
}

/* Boîte titre + meta LONG */
.long-box { border: 1px solid #000; margin-top: 10px; }
.long-title {
  display: grid;
  grid-template-columns: 2fr 0.95fr;
  border-bottom: 1px solid #000;
  min-height: 36px;
}
.long-title-left {
  padding: 6px 10px;
  font-size: 14pt;
  font-weight: 900;
  text-transform: uppercase;
  display: flex;
  align-items: center;
}
.long-title-right { border-left: 1px solid #000; background: #f8f8f8; }
.long-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 8px 10px;
  font-size: 10.5pt;
}
.long-meta p { margin: 2px 0; }
.admin-box {
  border: 1px solid #000;
  height: 44px;
  margin-top: 4px;
  padding: 4px;
  font-size: 9pt;
  color: #aaa;
}
.student-line {
  display: grid;
  grid-template-columns: 2.4fr 1fr;
  border-top: 1px solid #000;
  padding: 10px;
  font-size: 10.5pt;
  align-items: center;
}
.group-cell { text-align: center; }

/* En-tête COURT */
.top-header.court {
  display: grid;
  grid-template-columns: 1fr 90px 1fr;
  align-items: start;
  margin-bottom: 6px;
  font-size: 10pt;
  line-height: 1.15;
  text-align: center;
}
.court-left, .court-right { text-align: center; font-size: 9.5pt; line-height: 1.2; }
.court-logo-box { display: flex; justify-content: center; align-items: center; }
.court-logo-img {
  width: 72px;
  height: 50px;
  object-fit: contain;
  filter: grayscale(100%) contrast(1.1);
}
.meta-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-top: 4px; }
.meta-table td { border: 1px solid #000; padding: 3px 6px; vertical-align: top; line-height: 1.2; }
.exam-line {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 4px;
  font-size: 11pt;
}
.name-box {
  border: 1px solid #000;
  margin-top: 6px;
  height: 50px;
  padding: 7px 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 10pt;
}
.name-line { flex: 1; border-bottom: 1px solid #000; height: 14px; }

/* Lignes de remplissage */
.fill-line {
  display: inline-block;
  border-bottom: 1px solid #000;
  height: 12px;
  vertical-align: middle;
  margin-left: 6px;
}
.fill-long { width: 220px; }
.fill-short { width: 65px; }

/* Parties / Exercices / Questions */
h2.part-title {
  font-size: 12.5pt;
  text-transform: uppercase;
  border-bottom: 1.5px solid #000;
  padding-bottom: 3px;
  margin-top: 20px;
  margin-bottom: 8px;
  font-weight: 700;
}
h3.exo-title { font-size: 11.5pt; margin: 10px 0 5px; font-weight: 600; }
.pts { color: #777; font-size: 9.5pt; margin-left: 5px; }
.question { margin: 8px 0; font-size: 10.5pt; }
.qcm-type-label { font-size: 9pt; color: #555; margin-left: 6px; font-style: italic; }
.options { margin-left: 20px; margin-top: 4px; display: grid; gap: 5px; }
.option-row { display: flex; align-items: flex-start; gap: 8px; }
.option-mark {
  width: 12px;
  height: 12px;
  border: 1.5px solid #000;
  display: inline-block;
  flex: 0 0 auto;
  margin-top: 2px;
  background: #fff;
  box-sizing: border-box;
}
.option-mark--unique { border-radius: 50%; }
.option-mark--multi { border-radius: 2px; }
.option-text { display: inline-block; line-height: 1.3; font-size: 10.5pt; }

/* Lignes de réponse */
.answer-lines { margin-top: 6px; }
.answer-dot-line { border-bottom: 1px dotted #555; height: 18px; margin-top: 4px; width: 100%; }

.enonce { font-style: italic; color: #333; margin: 4px 0; font-size: 10.5pt; }

/* Pied de page */
.page-footer { text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 4px; margin-top: 12px; }
`;
};

/* ── Builders HTML ── */
export const buildHeaderHtml = (examForm = {}, tpl = {}, logoB64 = '', pageCount = null) => {
  const data = {
    subject: examForm.matiere || tpl.matiere || '—',
    discipline: examForm.filiere || tpl.discipline || '—',
    teachers: examForm.enseignants || tpl.enseignants || '—',
    docs: examForm.documentsAutorises || tpl.documentsAutorises || '—',
    academicYear: examForm.anneeUniversitaire || tpl.anneeUniversitaire || '—',
    semestre: examForm.semestre || tpl.semestre || '—',
    dateExamen: examForm.dateExamen || tpl.dateExamen || '',
    duration: examForm.duree || tpl.duree || '—',
    title: examForm.titre || tpl.titreExamen || 'DEVOIR SURVEILLÉ',
    feuilleType: tpl.feuilleType || "Feuille d'énoncé",
    templateStyle: tpl.templateStyle || 'long',
  };

  const semStr = data.dateExamen ? `${data.semestre} (${data.dateExamen})` : data.semestre;
  const logoImg = logoB64
    ? `<img src="${logoB64}" alt="IIT" class="h-logo-img" />`
    : `<span style="font-size:18pt;font-weight:bold">IIT</span>`;

  const pagesDisplay = String(pageCount ?? '').trim() || 'Auto';

  if (data.templateStyle === 'court') {
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
    <div>${tpl.institutFr || 'Institut International de Technologie'}</div>
    <div style="font-size:8.5pt">${tpl.universiteAr || ''}</div>
  </div>
</div>
<table class="meta-table">
  <tr>
    <td style="width:34%"><strong>Matière :</strong> ${data.subject}</td>
    <td style="width:33%"><strong>Discipline :</strong> ${data.discipline}</td>
    <td style="width:33%"><strong>Semestre :</strong> ${data.semestre}</td>
  </tr>
  <tr>
    <td><strong>Enseignant :</strong> ${data.teachers}</td>
    <td><strong>Année universitaire :</strong> ${data.academicYear}</td>
    <td><strong>Date :</strong> ${data.dateExamen || '—'}</td>
  </tr>
  <tr>
    <td><strong>Documents :</strong> ${data.docs}</td>
    <td><strong>Nombre de pages :</strong> <span id="nb-pages">${pagesDisplay}</span></td>
    <td><strong>Durée :</strong> ${data.duration}</td>
  </tr>
</table>
<div class="exam-line"><strong>${data.feuilleType} ◄</strong></div>
<div class="name-box">
  <span>Prénom &amp; Nom :</span>
  <div class="name-line"></div>
</div>`;
  }

  // Style LONG
  return `
<div class="top-header long">
  <div class="h-left">
    <div>${tpl.campusTextEn || 'North American Private University'}</div>
    <div>${tpl.campusText || 'SFAX | TUNISIA'}</div>
    <div style="font-size:8.5pt;color:#666;margin-top:2px">${tpl.campusTagline || 'TECHNOLOGY · BUSINESS · ARCHITECTURE'}</div>
  </div>
  <div class="h-center">
    <div>${tpl.universiteAr || 'الجامعة الشمالية الأمريكية الخاصة'}</div>
    <div>${tpl.universiteFr || 'Université Nord-Américaine Privée'}</div>
    <div><strong>${tpl.institutFr || 'Institut International de Technologie'}</strong></div>
    <div>${tpl.departementFr || ''}</div>
  </div>
  <div class="h-right-col">
    <div class="h-logo-box">${logoImg}</div>
  </div>
</div>

<div class="long-box">
  <div class="long-title">
    <div class="long-title-left">${data.title}</div>
    <div class="long-title-right"></div>
  </div>
  <div class="long-meta">
    <div>
      <p><strong>Matière :</strong> ${data.subject}</p>
      <p><strong>Discipline :</strong> ${data.discipline}</p>
      <p><strong>Enseignants :</strong> ${data.teachers}</p>
      <p><strong>Documents autorisés :</strong> ${data.docs}</p>
    </div>
    <div>
      <p><strong>Année Universitaire :</strong> ${data.academicYear}</p>
      <p><strong>Semestre :</strong> ${semStr}</p>
      <p><strong>${data.feuilleType} / Durée :</strong> ${data.duration}</p>
      <div class="admin-box">Réservé à l'administration</div>
    </div>
  </div>
  <div class="student-line">
    <div><strong>Prénom &amp; Nom :</strong><span class="fill-line fill-long"></span></div>
    <div class="group-cell"><strong>Groupe</strong><span class="fill-line fill-short"></span></div>
  </div>
</div>`;
};

export const buildQuestionsHtml = (sections = []) => {
  let qNum = 1;

  return sections.map((sec, si) => {
    const exosHtml = (sec.exercises || []).map((exo, ei) => {
      const ep = parseFloat(exo.points) || 0;

      const qsHtml = (exo.questions || []).map((q) => {
        const pts = parseFloat(q.points) || 0;

        if (q.type === 'enonce') return `<p class="enonce">${q.text || ''}</p>`;

        const num = qNum++;
        const isQcm = ['qcm', 'qcm_unique', 'qcm_multiple', 'vrai_faux'].includes(q.type);
        const typeLabel = getQcmTypeLabel(q.type);

        const optsHtml = isQcm && q.options?.length
          ? `<div class="options">${q.options.map((o, oi) => `
              <div class="option-row">
                <span class="${getOptionMarkClass(q.type)}"></span>
                <span class="option-text">${String.fromCharCode(65 + oi)}. ${o.text || ''}</span>
              </div>`).join('')}</div>`
          : '';

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

/**
 * Exporte vers Word avec nombre de pages injecté.
 * @param {Object} examForm
 * @param {Array} sections
 * @param {Object} tpl
 * @param {number|null} pageCount — Nombre de pages calculé côté React (optionnel)
 */
export const exportToWord = async (examForm, sections, tpl, pageCount = null) => {
  const logoB64 = await getIITLogo();
  const css = buildExportCss(tpl);
  const header = buildHeaderHtml(examForm, tpl, logoB64, pageCount);
  const questions = buildQuestionsHtml(sections);
  const title = examForm.titre || tpl.titreExamen || 'Examen';

  // Script JS fallback si le fichier est ouvert dans un navigateur
  // et que pageCount n'a pas été fourni (affichera — puis calculera)
  const pageScript = `
    <script>
      (function() {
        var A4_H_PX = 1122;
        var totalH = document.body.scrollHeight;
        var nbPages = Math.max(1, Math.ceil(totalH / A4_H_PX));
        var els = document.querySelectorAll('.nb-pages, #nb-pages');
        els.forEach(function(el){ el.textContent = nbPages; });
      })();
    </script>`;

  const footerHtml = `
    <div class="page-footer">
      Page <span class="current-page"></span> / <span class="nb-pages">${String(pageCount ?? '').trim() || 'Auto'}</span>
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${getSafeFileName(examForm.matiere || examForm.titre)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};