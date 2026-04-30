import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeightRule, ShadingType, VerticalAlign, ImageRun } from 'docx';
import { useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  addExamToBank,
  addQuestionToBank,
  getExamBank,
  getExamBankItem,
  getExamContent,
  getFilteredExams,
  getFilteredQuestions,
  getWordTemplates,
} from '../../api/enseignant/Enseignant.api';

import ModelesTab from './tabs/ModelesTab';
import QuestionsTab, { makeSection } from './tabs/QuestionsTab';
import ExportTab from './tabs/ExportTab';
import '../../styles/CreateExam.css';

const TABS = ['Modèles', 'Questions', 'Export'];
const FIXED_EXAM_TOTAL = 20;

const isLikelyHeaderLine = (line) => {
  const t = String(line || '').trim();
  if (!t) return true;
  if (/^(institut|universit[eé]|mati[eè]re\s*:|fili[eè]re\s*:|d[eé]partement\s*:|niveau\s*:|dur[eé]e\s*:|bar[eè]me\s*:|ann[eé]e\s*:|enseignant\s*:|pr[eé]nom\s*&\s*nom\s*:|groupe\s*:)/i.test(t)) return true;
  if (/^_{6,}$/.test(t)) return true;
  if (/^[-=]{6,}$/.test(t)) return true;
  if (/^(cocher|choisir)\b.*r[eé]ponse/i.test(t)) return true;
  return false;
};

const isCorrectionLine = (line) => {
  const t = String(line || '').trim();
  if (!t) return true;
  if (/^(r[eé]ponse|corrig[eé]|correction|solution)\b/i.test(t)) return true;
  return false;
};

const normalizeQuestionLine = (line) => {
  const t = String(line || '').trim();
  return t
    .replace(/^[-•]\s+/, '')
    .replace(/^\d+\s*[).:-]\s+/, '')
    .replace(/^(question|q\.?)\s*\d+\s*[:.)-]?\s*/i, '')
    .replace(/\(\s*\.{3,}\s*\)/g, '')
    .replace(/\[\s*\.{3,}\s*\]/g, '')
    .replace(/_{5,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const parseQuestionPrefix = (line) => {
  const t = String(line || '').trim();
  const m1 = t.match(/^\d+\s*[).:-]\s*(.+)$/i);
  if (m1) return m1[1]?.trim() || '';
  const m2 = t.match(/^(question|q\.?)\s*\d+\s*[:.)-]?\s*(.+)$/i);
  if (m2) return m2[2]?.trim() || '';
  return null;
};

const parseOptionLine = (line) => {
  const t = String(line || '').trim();
  const m = t.match(/^([a-d])\s*[).:-]\s*(.+)$/i);
  if (m) {
    const text = normalizeQuestionLine(m[2]);
    return text ? text : null;
  }
  if (/^(vrai|faux)$/i.test(t)) {
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }
  return null;
};

const dataUrlToUint8Array = (dataUrl) => {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const buildImageRun = async (dataUrl) => {
  if (!dataUrl) return null;

  const image = new Image();
  image.src = dataUrl;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const maxWidth = 420;
  const width = Math.min(maxWidth, image.width || maxWidth);
  const ratio = image.width ? image.height / image.width : 1;
  const height = Math.max(120, Math.round(width * ratio));

  const mime = String(dataUrl).slice(5, String(dataUrl).indexOf(';')) || 'image/png';
  const type = mime.includes('jpeg') || mime.includes('jpg')
    ? 'jpg'
    : mime.includes('gif')
      ? 'gif'
      : mime.includes('bmp')
        ? 'bmp'
        : 'png';

  return new ImageRun({
    data: dataUrlToUint8Array(dataUrl),
    transformation: {
      width,
      height,
    },
    type,
  });
};

const parseSectionQuestions = (contentLines) => {
  const parsed = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const text = normalizeQuestionLine(current.text);
    if (!text) { current = null; return; }

    const optionTexts = (current.options || [])
      .map((o) => normalizeQuestionLine(o))
      .filter(Boolean);

    const isTrueFalseOptions =
      optionTexts.length === 2 &&
      optionTexts.every((opt) => /^(vrai|faux)$/i.test(opt));

    const forceTrueFalseByText = /\bvrai\s*\/?s*faux\b/i.test(text);

    let type = 'ouverte';
    let options = [];

    if (isTrueFalseOptions || forceTrueFalseByText) {
      type = 'vrai_faux';
      options = [
        { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text: 'Vrai', correct: false },
        { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text: 'Faux', correct: false },
      ];
    } else if (optionTexts.length > 0) {
      type = 'qcm';
      options = optionTexts.map((opt) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: opt,
        correct: false,
      }));
    }

    parsed.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      text,
      points: '',
      isEditing: false,
      options,
    });

    current = null;
  };

  (Array.isArray(contentLines) ? contentLines : []).forEach((rawLine) => {
    const raw = String(rawLine || '').trim();
    if (!raw) return;
    if (isLikelyHeaderLine(raw) || isCorrectionLine(raw)) return;

    const optionText = parseOptionLine(raw);
    if (optionText && current) {
      current.options.push(optionText);
      return;
    }

    const qText = parseQuestionPrefix(raw);
    if (qText !== null) {
      flush();
      current = { text: qText, options: [] };
      return;
    }

    const normalized = normalizeQuestionLine(raw);
    if (!normalized) return;

    if (!current) {
      current = { text: normalized, options: [] };
      return;
    }

    current.text = `${current.text} ${normalized}`.trim();
  });

  flush();
  return parsed;
};

const CreateExam = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('Modèles');

  const [filter, setFilter] = useState({ matiere: '', niveau: '', annee: '' });
  const [mesExamens, setMesExamens] = useState([]);
  const [autresExamens, setAutresExamens] = useState([]);
  const [mesQuestions, setMesQuestions] = useState([]);
  const [autresQuestions, setAutresQuestions] = useState([]);
  const [filteredMesExamens, setFilteredMesExamens] = useState([]);
  const [filteredAutresExamens, setFilteredAutresExamens] = useState([]);
  const [filteredMesQuestions, setFilteredMesQuestions] = useState([]);
  const [filteredAutresQuestions, setFilteredAutresQuestions] = useState([]);
  const [hasSearched, setHasSearched] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [sections, setSections] = useState([makeSection(1)]);

  const [examForm, setExamForm] = useState({
    titre: '',
    filiere: '',
    matiere: '',
    niveau: '',
    type: '',
    duree: '',
    noteTotale: String(FIXED_EXAM_TOTAL),
    statut: 'Brouillon',
    templateId: null,
  });

  const [isSavingExam, setIsSavingExam] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [editingExamId, setEditingExamId] = useState(null);

  const onFormChange = (field, value) => {
    setExamForm(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [examsData, questionsData, templatesRaw] = await Promise.allSettled([
          getExamBank(),
          getFilteredQuestions('', '', ''),
          getWordTemplates(),
        ]);

        const exams = examsData.status === 'fulfilled' ? examsData.value : {};
        const qs = questionsData.status === 'fulfilled' ? questionsData.value : {};
        const tplRaw = templatesRaw.status === 'fulfilled' ? templatesRaw.value : [];

        const mesEx = Array.isArray(exams?.mesExamens) ? exams.mesExamens.filter(Boolean) : [];
        const autEx = Array.isArray(exams?.autresExamens) ? exams.autresExamens.filter(Boolean) : [];
        const mesQ = Array.isArray(qs?.mesQuestions) ? qs.mesQuestions.filter(Boolean) : [];
        const autQ = Array.isArray(qs?.autresQuestions) ? qs.autresQuestions.filter(Boolean) : [];

        let tpls = Array.isArray(tplRaw) ? tplRaw
          : Array.isArray(tplRaw?.data) ? tplRaw.data
            : Array.isArray(tplRaw?.templates) ? tplRaw.templates : [];

        setMesExamens(mesEx);
        setAutresExamens(autEx);
        setMesQuestions(mesQ);
        setAutresQuestions(autQ);
        setFilteredMesExamens(mesEx);
        setFilteredAutresExamens(autEx);
        setFilteredMesQuestions(mesQ);
        setFilteredAutresQuestions(autQ);
        setAllTemplates(tpls);

        const total = mesEx.length + autEx.length + mesQ.length + autQ.length;
        setSuccessMessage(total > 0
          ? `${mesEx.length + autEx.length} examen(s) et ${mesQ.length + autQ.length} question(s) chargé(s).`
          : 'Aucun contenu trouvé dans la base.');
      } catch (err) {
        setError(err?.message || 'Erreur de chargement');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('editExam');
    if (!id || editingExamId) return;

    (async () => {
      try {
        const { exam } = await getExamBankItem(id);
        if (!exam) { setError('Examen introuvable'); return; }

        setEditingExamId(id);
        setExamForm({
          titre:      exam.title       || '',
          filiere:    exam.filiere     || '',
          matiere:    exam.matiere     || '',
          niveau:     exam.niveau      || '',
          type:       exam.type        || '',
          duree:      exam.duree       || '',
          noteTotale: String(FIXED_EXAM_TOTAL),
          statut:     exam.status      || 'Brouillon',
          templateId: exam.templateId  || null,
        });

        try {
          const { sections: parsedSections } = await getExamContent(id);
          if (parsedSections && parsedSections.length > 0) {
            const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const rebuilt = parsedSections
              .map((sec, si) => {
                const sectionTitle = String(sec?.title || '').trim();
                const isHeaderSection = /en[-\s]?t[êe]te|instruction/i.test(sectionTitle);
                const parsedQuestions = parseSectionQuestions(sec?.content);
                if (isHeaderSection || parsedQuestions.length === 0) return null;
                return {
                  id: uid(),
                  title: sectionTitle || `Partie ${si + 1}`,
                  collapsed: false,
                  exercises: [{
                    id: uid(),
                    title: 'Exercice 1',
                    points: '',
                    collapsed: false,
                    questions: parsedQuestions,
                  }],
                };
              })
              .filter(Boolean);

            setSections(rebuilt.length > 0 ? rebuilt : [makeSection(1)]);
          } else {
            setSections([makeSection(1)]);
          }
        } catch {
          setSections([makeSection(1)]);
        }

        setActiveTab('Questions');
        setSuccessMessage(`"${exam.title}" chargé avec ses exercices. Modifiez et exportez.`);
      } catch {
        setError("Erreur lors du chargement de l'examen");
      }
    })();
  }, [location, editingExamId]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const handleFilterChange = (key, val) => setFilter(p => ({ ...p, [key]: val }));

  const handleFilterSearch = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [ex, qs] = await Promise.all([
        getFilteredExams(filter.matiere, filter.niveau, filter.annee),
        getFilteredQuestions(filter.matiere, filter.niveau, filter.annee),
      ]);
      const me = Array.isArray(ex?.mesExamens) ? ex.mesExamens.filter(Boolean) : [];
      const ae = Array.isArray(ex?.autresExamens) ? ex.autresExamens.filter(Boolean) : [];
      const mq = Array.isArray(qs?.mesQuestions) ? qs.mesQuestions.filter(Boolean) : [];
      const aq = Array.isArray(qs?.autresQuestions) ? qs.autresQuestions.filter(Boolean) : [];

      setFilteredMesExamens(me);
      setFilteredAutresExamens(ae);
      setFilteredMesQuestions(mq);
      setFilteredAutresQuestions(aq);
      setHasSearched(true);
      setSuccessMessage(`${me.length + ae.length} examen(s) · ${mq.length + aq.length} question(s) trouvé(s).`);
    } catch (e) {
      setError(e?.message || 'Erreur de recherche');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterReset = () => {
    setFilter({ matiere: '', niveau: '', annee: '' });
    setFilteredMesExamens(mesExamens);
    setFilteredAutresExamens(autresExamens);
    setFilteredMesQuestions(mesQuestions);
    setFilteredAutresQuestions(autresQuestions);
    setError('');
    setSuccessMessage('');
    setHasSearched(true);
  };

  const handleSelectTemplate = (id) => {
    const next = selectedTemplate === id ? null : id;
    setSelectedTemplate(next);
    setExamForm(p => ({ ...p, templateId: next }));
  };

  /* ═══════════════════════════════════════════════════════════
     BUILD & SAVE EXAM — DOCX generation corrigée
     ═══════════════════════════════════════════════════════════ */
  const finishAndSaveExam = async (overrideStatut) => {
    const titre = examForm.titre.trim();
    if (!titre) {
      setExportError("Le titre de l'examen est requis");
      return;
    }

    const allQuestions = sections.flatMap(sec =>
      sec.exercises.flatMap(exo => exo.questions.map(q => q.text?.trim()).filter(Boolean))
    );

    if (allQuestions.length === 0) {
      setExportError('Ajoutez au moins une question');
      return;
    }

    const statusToUse = overrideStatut || examForm.statut;

    setIsSavingExam(true);
    setExportError('');
    setExportMessage('Génération du document…');

    try {
      const selectedTpl = examForm.templateId
        ? allTemplates.find(t => t._id === examForm.templateId)
        : null;

      const docChildren = [];
      const tpl = selectedTpl;

      /* ─── Constantes de mise en page A4 ─── */
      // A4 avec marges 1.5cm : largeur utile ≈ 8497 DXA
      const PAGE_W   = 11906; // A4 largeur en DXA
      const MARGIN   = 1134;  // ~2 cm en DXA
      const CONTENT_W = PAGE_W - 2 * MARGIN; // ≈ 9638 DXA

      /* ─── Helpers bordures ─── */
      const bSingle = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
      const bNone   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' };
      const bordersAll  = { top: bSingle, bottom: bSingle, left: bSingle, right: bSingle };
      const bordersNone = { top: bNone,   bottom: bNone,   left: bNone,   right: bNone   };

      /* ─── Helper cellule vide ─── */
      const emptyCell = (w) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        borders: bordersNone,
        children: [new Paragraph({ children: [] })],
      });

      /* ─── Valeurs depuis le template ─── */
      const tplMatiere    = tpl?.matiere            || examForm.matiere  || '';
      const tplDiscipline = tpl?.discipline         || examForm.filiere  || '';
      const tplTeachers   = tpl?.enseignants        || '';
      const tplDocs       = tpl?.documentsAutorises || '';
      const tplAnnee      = tpl?.anneeUniversitaire || `${new Date().getFullYear()}-${new Date().getFullYear()+1}`;
      const tplSemestre   = tpl?.semestre
        ? tpl.semestre + (tpl.dateExamen ? ` (${tpl.dateExamen})` : '')
        : '';
      const tplDuree      = tpl?.duree || examForm.duree || '1h30';
      const tplTitre      = tpl?.titreExamen || 'DEVOIR SURVEILLÉ';

      const sec      = tpl?.sections;
      const showNP   = !sec || sec.zoneNomPrenom;
      const showGrp  = !sec || sec.zoneGroupe;
      const showNote = !sec || sec.blocNote;
      const showComm = !sec || sec.blocCommentaires;
      const showSign = !sec || sec.blocSignature;
      const showNB   = !sec || sec.blocRemarques;

      if (tpl) {
        /* ══ 1. EN-TÊTE UNIVERSITÉ (3 colonnes) ══ */
        // Largeurs colonnes : 27% | 53% | 20% en DXA
        const colLeft   = Math.round(CONTENT_W * 0.27);
        const colCenter = Math.round(CONTENT_W * 0.53);
        const colRight  = CONTENT_W - colLeft - colCenter;

        docChildren.push(new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [colLeft, colCenter, colRight],
          borders: {
            top: bNone, bottom: bNone, left: bNone, right: bNone,
            insideH: bNone, insideV: bNone,
          },
          rows: [new TableRow({ children: [

            // Colonne gauche : texte anglais
            new TableCell({
              width: { size: colLeft, type: WidthType.DXA },
              borders: bordersNone,
              margins: { top: 60, bottom: 60, left: 0, right: 80 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'North American',                        font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Private University',                    font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'SFAX | TUNISIA',                        font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'TECHNOLOGY · BUSINESS · ARCHITECTURE', font: 'Times New Roman', size: 14, color: '888888' })] }),
              ],
            }),

            // Colonne centre : noms arabe / français
            new TableCell({
              width: { size: colCenter, type: WidthType.DXA },
              borders: bordersNone,
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.universiteAr  || 'الجامعة الشمالية الأمريكية الخاصة', font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.universiteFr  || 'Université Nord-Américaine Privée',   font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.institutFr    || 'Institut International de Technologie',font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.departementFr || 'Département Informatique',             font: 'Times New Roman', size: 18 })] }),
              ],
            }),

            // Colonne droite : encadré IIT
            new TableCell({
              width: { size: colRight, type: WidthType.DXA },
              borders: bordersAll,
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'IIT', bold: true, font: 'Times New Roman', size: 32 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Institut International', font: 'Times New Roman', size: 14, color: '444444' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'de Technologie',         font: 'Times New Roman', size: 14, color: '444444' })] }),
              ],
            }),

          ]})],
        }));

        docChildren.push(new Paragraph({ children: [], spacing: { after: 160 } }));

        /* ══ 2. TITRE : DEVOIR SURVEILLÉ ══ */
        const colTitleMain  = Math.round(CONTENT_W * 0.68);
        const colTitleRight = CONTENT_W - colTitleMain;

        docChildren.push(new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [colTitleMain, colTitleRight],
          rows: [new TableRow({
            height: { value: 600, rule: HeightRule.ATLEAST },
            children: [
              new TableCell({
                width: { size: colTitleMain, type: WidthType.DXA },
                borders: bordersAll,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [new TextRun({ text: tplTitre, bold: true, font: 'Times New Roman', size: 34, allCaps: true })],
                })],
              }),
              new TableCell({
                width: { size: colTitleRight, type: WidthType.DXA },
                borders: bordersAll,
                children: [new Paragraph({ children: [] })],
              }),
            ],
          })],
        }));

        /* ══ 3. GRILLE MÉTA ══ */
        const colMeta = Math.round(CONTENT_W / 2);
        const colMeta2 = CONTENT_W - colMeta;

        docChildren.push(new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [colMeta, colMeta2],
          rows: [new TableRow({ children: [

            new TableCell({
              width: { size: colMeta, type: WidthType.DXA },
              borders: { top: bNone, bottom: bSingle, left: bSingle, right: bNone },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Matière : ',             bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplMatiere,    font: 'Times New Roman', size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Discipline : ',          bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplDiscipline, font: 'Times New Roman', size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Enseignants : ',         bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplTeachers,   font: 'Times New Roman', size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Documents autorisés : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplDocs,      font: 'Times New Roman', size: 20 })] }),
              ],
            }),

            new TableCell({
              width: { size: colMeta2, type: WidthType.DXA },
              borders: { top: bNone, bottom: bSingle, left: bSingle, right: bSingle },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Année Universitaire : ',      bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplAnnee,    font: 'Times New Roman', size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Semestre : ',                 bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplSemestre, font: 'Times New Roman', size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "Feuille d'énoncé / Durée : ", bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplDuree,   font: 'Times New Roman', size: 20 })] }),
              ],
            }),

          ]})],
        }));

        /* ══ 4. LIGNE ÉTUDIANT ══ */
        if (showNP || showGrp) {
          const colStudent = Math.round(CONTENT_W * 0.68);
          const colGroup   = CONTENT_W - colStudent;

          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [colStudent, colGroup],
            rows: [new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: colStudent, type: WidthType.DXA },
                  borders: { top: bNone, bottom: bSingle, left: bSingle, right: bNone },
                  margins: { top: 100, bottom: 100, left: 120, right: 80 },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    children: [new TextRun({ text: showNP ? 'Prénom & Nom :   _______________________________________' : '', font: 'Times New Roman', size: 20 })],
                  })],
                }),
                new TableCell({
                  width: { size: colGroup, type: WidthType.DXA },
                  borders: { top: bNone, bottom: bSingle, left: bSingle, right: bSingle },
                  margins: { top: 100, bottom: 100, left: 80, right: 80 },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: showGrp ? 'Groupe   ________' : '', font: 'Times New Roman', size: 20 })],
                  })],
                }),
              ],
            })],
          }));
        }

        docChildren.push(new Paragraph({ children: [], spacing: { after: 180 } }));

        /* ══ 5. CASES NOTE / COMMENTAIRES / SIGNATURE ══ */
        if (showNote || showComm || showSign) {
          const boxes = [];
          if (showNote) boxes.push('Note /20');
          if (showComm) boxes.push('Commentaires');
          if (showSign) boxes.push('Signature');
          const perBox = Math.floor(CONTENT_W / boxes.length);
          const lastBox = CONTENT_W - perBox * (boxes.length - 1);

          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: boxes.map((_, i) => i === boxes.length - 1 ? lastBox : perBox),
            rows: [new TableRow({
              height: { value: 1200, rule: HeightRule.ATLEAST },
              children: boxes.map((label, idx) => new TableCell({
                width: { size: idx === boxes.length - 1 ? lastBox : perBox, type: WidthType.DXA },
                borders: bordersAll,
                margins: { top: 80, bottom: 80, left: 120, right: 80 },
                children: [new Paragraph({
                  children: [new TextRun({ text: label, bold: true, font: 'Times New Roman', size: 20 })],
                })],
              })),
            })],
          }));
        }

        docChildren.push(new Paragraph({ children: [], spacing: { after: 180 } }));

        /* ══ 6. BLOC NB ══ */
        if (showNB) {
          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [CONTENT_W],
            rows: [new TableRow({ children: [new TableCell({
              width: { size: CONTENT_W, type: WidthType.DXA },
              borders: bordersAll,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'NB.', bold: true, font: 'Times New Roman', size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: '— Le barème est fourni à titre indicatif et peut être ajusté', font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: `— La durée de l'examen est de ${tplDuree}`, font: 'Times New Roman', size: 18 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: "— Les ordinateurs, l'accès à Internet et l'utilisation d'IDE Python sont strictement interdits", font: 'Times New Roman', size: 18 })] }),
              ],
            })]})],
          }));
        }

        docChildren.push(new Paragraph({ children: [], spacing: { after: 360 } }));

      } else {
        /* ══ EN-TÊTE MINIMAL (sans template) ══ */
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 160 },
          children: [new TextRun({ text: titre, bold: true, font: 'Times New Roman', size: 32, allCaps: true })],
        }));

        const metaLines = [
          examForm.matiere    && `Matière : ${examForm.matiere}`,
          examForm.filiere    && `Filière : ${examForm.filiere}`,
          examForm.niveau     && `Niveau : ${examForm.niveau}`,
          examForm.type       && `Type : ${examForm.type}`,
          examForm.duree      && `Durée : ${examForm.duree} min`,
          `Barème : /${FIXED_EXAM_TOTAL}`,
          `Date : ${new Date().toLocaleDateString('fr-FR')}`,
        ].filter(Boolean);

        // Tableau 2 colonnes pour les méta
        if (metaLines.length > 0) {
          const halfMeta = Math.round(CONTENT_W / 2);
          const leftLines = metaLines.slice(0, Math.ceil(metaLines.length / 2));
          const rightLines = metaLines.slice(Math.ceil(metaLines.length / 2));
          const maxRows = Math.max(leftLines.length, rightLines.length);

          const metaRows = [];
          for (let i = 0; i < maxRows; i++) {
            metaRows.push(new TableRow({ children: [
              new TableCell({
                width: { size: halfMeta, type: WidthType.DXA },
                borders: bordersNone,
                margins: { top: 40, bottom: 40, left: 0, right: 80 },
                children: [new Paragraph({ children: leftLines[i]
                  ? [new TextRun({ text: leftLines[i], font: 'Times New Roman', size: 20 })]
                  : [] })],
              }),
              new TableCell({
                width: { size: CONTENT_W - halfMeta, type: WidthType.DXA },
                borders: bordersNone,
                margins: { top: 40, bottom: 40, left: 80, right: 0 },
                children: [new Paragraph({ children: rightLines[i]
                  ? [new TextRun({ text: rightLines[i], font: 'Times New Roman', size: 20 })]
                  : [] })],
              }),
            ]}));
          }

          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [halfMeta, CONTENT_W - halfMeta],
            rows: metaRows,
          }));
        }

        // Ligne séparatrice
        docChildren.push(new Paragraph({
          spacing: { before: 120, after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
          children: [],
        }));
      }

      /* ═══════════════════════════════════════════════════════
         SECTIONS / EXERCICES / QUESTIONS
         ═══════════════════════════════════════════════════════ */
      for (const [si, sec] of sections.entries()) {
        // Titre de partie
        docChildren.push(new Paragraph({
          spacing: { before: 320, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 1 } },
          children: [
            new TextRun({ text: `Partie ${si + 1} — `, bold: true, font: 'Times New Roman', size: 24, color: '1e4fa8' }),
            new TextRun({ text: sec.title || `Partie ${si + 1}`, bold: true, font: 'Times New Roman', size: 24 }),
          ],
        }));

        for (const [ei, exo] of sec.exercises.entries()) {
          // Points de l'exercice
          const exoPts = exo.points ? ` (${exo.points} pts)` : '';

          // Titre d'exercice
          docChildren.push(new Paragraph({
            spacing: { before: 200, after: 80 },
            indent: { left: 0 },
            children: [
              new TextRun({
                text: `${exo.title || `Exercice ${ei + 1}`}${exoPts}`,
                bold: true,
                font: 'Times New Roman',
                size: 22,
                underline: {},
              }),
            ],
          }));

          for (const [qi, q] of exo.questions.entries()) {
            const pts = q.points ? ` [${q.points} pts]` : '';
            const qNum = qi + 1;

            // Énoncé de la question
            docChildren.push(new Paragraph({
              spacing: { before: 120, after: 60 },
              indent: { left: 360 }, // ~0.5cm d'indentation
              children: [
                new TextRun({ text: `${qNum}. `, bold: true, font: 'Times New Roman', size: 20 }),
                new TextRun({ text: `${q.text || ''}`, font: 'Times New Roman', size: 20 }),
                ...(pts ? [new TextRun({ text: pts, bold: true, font: 'Times New Roman', size: 18, color: '1e4fa8' })] : []),
              ],
            }));

            if (q.imageUrl) {
              const imageRun = await buildImageRun(q.imageUrl);
              if (imageRun) {
                docChildren.push(new Paragraph({
                  spacing: { before: 80, after: 80 },
                  alignment: AlignmentType.CENTER,
                  children: [imageRun],
                }));
              }
            }

            // Options QCM (sans indicateur de bonne réponse)
            if (q.type === 'qcm' && q.options?.length) {
              q.options.forEach((opt, oi) => {
                const letter = String.fromCharCode(97 + oi); // a, b, c, d...
                docChildren.push(new Paragraph({
                  spacing: { before: 40, after: 40 },
                  indent: { left: 720 }, // ~1cm
                  children: [
                    new TextRun({ text: `${letter}) `, bold: true, font: 'Times New Roman', size: 19 }),
                    new TextRun({ text: opt.text || '', font: 'Times New Roman', size: 19 }),
                    // NOTE : opt.correct est intentionnellement OMIS du document final
                  ],
                }));
              });
            }

            // Options Vrai/Faux
            if (q.type === 'vrai_faux') {
              docChildren.push(new Paragraph({
                spacing: { before: 40, after: 60 },
                indent: { left: 720 },
                children: [
                  new TextRun({ text: '☐ Vrai     ☐ Faux', font: 'Times New Roman', size: 19 }),
                ],
              }));
            }

            // Lignes de réponse pour questions ouvertes / calcul / définition / code
            if (['ouverte', 'calcul', 'definition', 'code', 'completement', 'schema'].includes(q.type)) {
              const nbLines = q.type === 'calcul' ? 5 : q.type === 'code' ? 6 : 3;
              for (let li = 0; li < nbLines; li++) {
                docChildren.push(new Paragraph({
                  spacing: { before: 40, after: 40 },
                  indent: { left: 360 },
                  children: [
                    new TextRun({
                      text: '         ___________________________________________________________',
                      font: 'Times New Roman',
                      size: 16,
                      color: 'BBBBBB',
                    }),
                  ],
                }));
              }
            }

            // Espace après chaque question
            docChildren.push(new Paragraph({ children: [], spacing: { after: 60 } }));
          }

          // Espace après exercice
          docChildren.push(new Paragraph({ children: [], spacing: { after: 60 } }));
        }
      }

      /* ── Génération du Document ── */
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size:   { width: PAGE_W, height: 16838 }, // A4
              margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
            },
          },
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);

      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const b64 = btoa(String.fromCharCode.apply(null, bytes));
      const filename = `${titre.replace(/\s+/g, '_')}_${Date.now()}.docx`;

      await addExamToBank({
        title: titre,
        filiere: examForm.filiere.trim(),
        matiere: examForm.matiere.trim(),
        niveau: examForm.niveau.trim(),
        type: examForm.type,
        duree: examForm.duree,
        noteTotale: FIXED_EXAM_TOTAL,
        questionsCount: allQuestions.length,
        status: statusToUse,
        fileName: filename,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileContentBase64: b64,
        anneeUniversitaire: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        ...(examForm.templateId && { templateId: examForm.templateId }),
      });

      /* Sauvegarder les questions dans la banque */
      const questionSavePromises = sections.flatMap(sec =>
        sec.exercises.flatMap(exo =>
          exo.questions
            .filter(q => q.text?.trim())
            .map(q =>
              addQuestionToBank(
                q.text.trim(),
                examForm.matiere.trim(),
                examForm.niveau.trim(),
                `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
              ).catch(() => {})
            )
        )
      );
      await Promise.all(questionSavePromises);

      // Only trigger browser download when exporting the exam (status 'En cours')
      if (statusToUse === 'En cours') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      const tplInfo = selectedTpl ? ` avec le modèle "${selectedTpl.nom}"` : '';
      setExportMessage(`Examen "${titre}" sauvegardé${tplInfo} — ${allQuestions.length} question(s) · téléchargement en cours.`);

      setTimeout(() => {
        setExamForm({
          titre: '', filiere: '', matiere: '', niveau: '', type: '', duree: '', noteTotale: String(FIXED_EXAM_TOTAL),
          statut: 'Brouillon', templateId: null,
        });
        setSections([makeSection(1)]);
        setSelectedTemplate(null);
        setExportMessage('');
        setExportError('');
      }, 4000);

    } catch (err) {
      setExportMessage('');
      setExportError(err?.response?.data?.message || err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSavingExam(false);
    }
  };

  /* ─────────────────────────────── render ── */
  return (
    <div className="exam-create-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="exam-create-main">
        <header className="exam-create-header">
          <div className="exam-create-header-left">
            <h2 className="eb-header-title">Création d'<span>examen</span></h2>
          </div>
        </header>

        <nav className="exam-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`exam-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === 'Modèles' && (
          <ModelesTab
            allTemplates={allTemplates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={handleSelectTemplate}
            onTabChange={setActiveTab}
            examForm={examForm}
            onFormChange={onFormChange}
          />
        )}

        {activeTab === 'Questions' && (
          <QuestionsTab
            sections={sections}
            setSections={setSections}
            filteredMesQuestions={filteredMesQuestions}
            filteredAutresQuestions={filteredAutresQuestions}
            selectedTemplate={selectedTemplate}
            allTemplates={allTemplates}
            onTabChange={setActiveTab}
            onSetSuccessMessage={setSuccessMessage}
            onSetError={setError}
          />
        )}

        {activeTab === 'Export' && (
          <ExportTab
            examForm={examForm}
            onFormChange={onFormChange}
            sections={sections}
            allTemplates={allTemplates}
            selectedTemplate={selectedTemplate}
            isSavingExam={isSavingExam}
            exportMessage={exportMessage}
            exportError={exportError}
            onSave={finishAndSaveExam}
            onTabChange={setActiveTab}
          />
        )}
      </main>
    </div>
  );
};

export default CreateExam;