import { useState, useEffect, useRef } from 'react';
import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
  HeightRule, ShadingType, VerticalAlign, ImageRun,
  LevelFormat,
} from 'docx';
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
import { estimatePageCount } from '../../utils/exportHelpers';

import ModelesTab from './tabs/ModelesTab';
import QuestionsTab, { makeSection } from './tabs/QuestionsTab';
import ExportTab from './tabs/ExportTab';
import '../../styles/CreateExam.css';

import iitLogoAsset from '../../assets/iit2.png';

// ─── IIT Logo base64 — chargé depuis l'asset au runtime ──────────────────────
let IIT_LOGO_B64 = null;
const loadIITLogo = async () => {
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
    return null;
  }
};

const TABS = ['Modèles', 'Exercices', 'Export'];
const FIXED_EXAM_TOTAL = 20;

// ─── Helpers parsing (inchangés) ─────────────────────────────────────────────
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

const astNodeToText = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.children)) return node.children.map(astNodeToText).join('');
  if (node.type === 'list') {
    return (node.items || [])
      .map((item) => (item.children || []).map(astNodeToText).join(''))
      .join('\n');
  }
  if (node.type === 'table') {
    return (node.rows || [])
      .flat()
      .map((cell) => (cell.children || []).map(astNodeToText).join(''))
      .join(' ');
  }
  return '';
};

const astNodesToLines = (nodes = []) => {
  const lines = [];
  const pushLines = (text) => {
    String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => lines.push(line));
  };

  (Array.isArray(nodes) ? nodes : []).forEach((node) => {
    if (!node) return;
    if (node.type === 'paragraph' || node.type === 'heading') {
      pushLines(astNodeToText(node));
      return;
    }
    if (node.type === 'list') {
      (node.items || []).forEach((item) => pushLines(astNodeToText(item)));
      return;
    }
    if (node.type === 'table') {
      (node.rows || []).forEach((row) => {
        pushLines((row || []).map((cell) => astNodeToText(cell)).join(' | '));
      });
      return;
    }
    if (Array.isArray(node.children)) {
      pushLines(astNodeToText(node));
    }
  });

  return lines;
};

const htmlToLines = (html = '') =>
  String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

const normalizeExtractedText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const stripCheckboxGlyphs = (s) => String(s || '')
  .replace(/[\u25A0\u25A1\u25A2\u25A3\u25FB\u25FD\u25FE\u2610\u2611\u2612\u2613]/g, ' ')
  .replace(/[\u2618\u2619]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const collectTextFromNode = (node, ignoreSelector = '') => {
  if (!node) return '';
  if (node.nodeType === 3) return node.textContent || '';
  if (node.nodeType !== 1) return '';

  const el = node;
  if (ignoreSelector && el.matches && el.matches(ignoreSelector)) return '';

  return Array.from(el.childNodes || []).map((child) => collectTextFromNode(child, ignoreSelector)).join('');
};

const parseQuestionType = (label, hasOptions) => {
  const value = normalizeExtractedText(label).toLowerCase();
  if (!value && hasOptions) return 'qcm';
  if (value.includes('choix unique')) return 'qcm_unique';
  if (value.includes('choix multiple')) return 'qcm_multiple';
  if (value.includes('vrai') && value.includes('faux')) return 'vrai_faux';
  if (value.includes('question ouverte') || value.includes('réponse libre') || value.includes('reponse libre')) return 'ouverte';
  if (value.includes('exercice pratique') || value.includes('pratique')) return 'pratique';
  if (value.includes('énoncé') || value.includes('enonce')) return 'enonce';
  if (hasOptions) return 'qcm';
  return 'ouverte';
};

const parseQuestionElement = (questionEl) => {
  if (!questionEl) return null;

  const typeLabel = normalizeExtractedText(questionEl.querySelector('.qcm-type-label')?.textContent || '');
  const optionTexts = Array.from(questionEl.querySelectorAll('.options .option-text'))
    .map((optEl) => normalizeExtractedText(optEl.textContent || '').replace(/^[A-D]\s*\.\s*/, ''))
    .filter(Boolean);

  const rawText = normalizeExtractedText(
    collectTextFromNode(questionEl, '.qcm-type-label, .options, .answer-lines, .pts, strong')
  );
  const cleanedRawText = stripCheckboxGlyphs(rawText);
  const text = cleanedRawText.replace(/^Q\d+\.?\s*/i, '').trim();
  const type = parseQuestionType(typeLabel, optionTexts.length > 0);
  const answerLinesCount = Math.max(
    1,
    questionEl.querySelectorAll('.answer-lines .answer-dot-line').length || 0
  );

  const question = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    text,
    points: '',
    isEditing: false,
  };

  if (type === 'ouverte') {
    question.answerLines = answerLinesCount;
  }

  if (type === 'vrai_faux') {
    question.options = [
      { id: `${Date.now()}_a`, text: 'Vrai', correct: false },
      { id: `${Date.now()}_b`, text: 'Faux', correct: false },
    ];
  } else if (optionTexts.length > 0) {
    question.options = optionTexts.map((optText) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: stripCheckboxGlyphs(optText),
      correct: false,
    }));
  } else {
    question.options = [];
  }

  return question;
};

const parseExamSectionsFromHtml = (rawHtml = '') => {
  if (!rawHtml) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const partEls = Array.from(doc.querySelectorAll('section.part'));

  if (partEls.length === 0) return [];

  return partEls.map((partEl, partIndex) => {
    const partTitle = normalizeExtractedText(partEl.querySelector('.part-title')?.textContent || `Partie ${partIndex + 1}`)
      .replace(/^Partie\s*\d+\s*[—-]?\s*/i, '')
      .trim() || `Partie ${partIndex + 1}`;

    const exercises = Array.from(partEl.children || [])
      .filter((child) => child.classList && child.classList.contains('exercise'))
      .map((exoEl, exoIndex) => {
        const exoTitle = normalizeExtractedText(exoEl.querySelector('.exo-title')?.textContent || `Exercice ${exoIndex + 1}`)
          .replace(/^Exercice\s*\d+\s*[—-]?\s*/i, '')
          .replace(/\(.*?pts?\)/i, '')
          .trim() || `Exercice ${exoIndex + 1}`;

        const questions = Array.from(exoEl.querySelectorAll(':scope > .question'))
          .map((questionEl) => parseQuestionElement(questionEl))
          .filter(Boolean);

        return {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: exoTitle,
          points: '',
          collapsed: false,
          questions,
        };
      })
      .filter((exo) => exo.questions.length > 0);

    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: partTitle,
      collapsed: false,
      exercises,
    };
  }).filter((part) => part.exercises.length > 0);
};

const getSectionContentLines = (section) => {
  if (Array.isArray(section?.content) && section.content.length > 0) {
    return section.content.map((line) => String(line || '').trim()).filter(Boolean);
  }
  if (Array.isArray(section?.contentAst) && section.contentAst.length > 0) {
    return astNodesToLines(section.contentAst);
  }
  if (typeof section?.content === 'string' && section.content.trim()) {
    return section.content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  if (typeof section?.contentAst === 'string' && section.contentAst.trim()) {
    return section.contentAst.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  return [];
};

const buildEditableSections = ({ sections: apiSections, rawText, rawHtml }) => {
  const htmlSections = parseExamSectionsFromHtml(rawHtml || '');
  if (htmlSections.length > 0) return htmlSections;

  const structuredSections = Array.isArray(apiSections) ? apiSections.filter(Boolean) : [];
  if (structuredSections.length > 0) return structuredSections;

  const sourceLines = rawText?.trim()
    ? rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : htmlToLines(rawHtml || '');

  if (sourceLines.length === 0) return [];

  const fallbackSections = [];
  let current = null;
  let sectionIndex = 0;
  const isSectionHeading = (line) => /^(partie|section|chapitre|exercice)\b/i.test(line);
  const isQuestionStarter = (line) => /^\d+\s*[).:-]\s+/.test(line) || /^(question|q\.?)\s*\d+\b/i.test(line);
  const isIgnoredLeadLine = (line) => isLikelyHeaderLine(line) || /^(en[-\s]?t[êe]te|instructions?|consignes?|feuille\s*d['’]énonc[eé])\b/i.test(line);

  sourceLines.forEach((line) => {
    if (isIgnoredLeadLine(line)) return;

    if (isSectionHeading(line)) {
      if (current) fallbackSections.push(current);
      current = { title: line, content: [] };
      sectionIndex += 1;
      return;
    }

    if (isQuestionStarter(line) && !current) {
      sectionIndex += 1;
      current = { title: `Partie ${sectionIndex}`, content: [] };
    }

    if (!current) return;
    current.content.push(line);
  });

  if (current) fallbackSections.push(current);
  return fallbackSections.length > 0 ? fallbackSections : [];
};

// ─── Helpers image ────────────────────────────────────────────────────────────
const dataUrlToUint8Array = (dataUrl) => {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const getMimeType = (dataUrl) => {
  const mime = String(dataUrl).slice(5, String(dataUrl).indexOf(';')) || 'image/png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('bmp')) return 'bmp';
  return 'png';
};

const loadImageDimensions = (dataUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width || 400, h: img.height || 300 });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = dataUrl;
  });

const buildImageRun = async (dataUrl) => {
  if (!dataUrl) return null;
  const { w, h } = await loadImageDimensions(dataUrl);
  const maxW = 420;
  const width = Math.min(maxW, w);
  const height = Math.max(60, Math.round((h / w) * width));
  return new ImageRun({
    data: dataUrlToUint8Array(dataUrl),
    transformation: { width, height },
    type: getMimeType(dataUrl),
  });
};

// ─── IIT Logo ImageRun ────────────────────────────────────────────────────────
const buildLogoImageRun = async () => {
  try {
    const logoB64 = await loadIITLogo();
    if (!logoB64) return null;
    const { w, h } = await loadImageDimensions(logoB64);
    const height = 66;
    const width = Math.round((w / h) * height);
    return new ImageRun({
      data: dataUrlToUint8Array(logoB64),
      transformation: { width: Math.min(width, 80), height },
      type: 'png',
    });
  } catch {
    return null;
  }
};

// ─── Parsing sections depuis l'API ───────────────────────────────────────────
const parseSectionQuestions = (contentLines) => {
  const parsed = [];
  let current = null;
  let pendingForceType = null;

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
        { id: `${Date.now()}_a`, text: 'Vrai', correct: false },
        { id: `${Date.now()}_b`, text: 'Faux', correct: false },
      ];
    } else if (optionTexts.length > 0) {
      type = 'qcm';
      options = optionTexts.map((opt) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: opt,
        correct: false,
      }));
    }

    // honor any explicit type forced by the source (e.g. a preceding label)
    const forced = current.forceType || pendingForceType || null;
    if (forced) {
      type = forced;
      if (pendingForceType) pendingForceType = null;

      // sensible defaults for forced types
      if (type === 'vrai_faux') {
        options = [
          { id: `${Date.now()}_a`, text: 'Vrai', correct: false },
          { id: `${Date.now()}_b`, text: 'Faux', correct: false },
        ];
      }
      if (type === 'ouverte') {
        options = [];
        current.answerLines = current.answerLines || 3;
      }
      if (type === 'pratique' || type === 'enonce') {
        options = [];
      }
      // qcm_unique / qcm_multiple: keep discovered options if present; otherwise allow empty list
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
    // detect explicit type declarations like "Choix unique" or "Choix multiple"
    const detectExplicitType = (line) => {
      const t = String(line || '').toLowerCase();
      if (/choix\s*unique|\(choix\s*unique\)|\bchoix\s*unique\b/.test(t)) return 'qcm_unique';
      if (/choix\s*multiple|choix\s*multiples|\(choix\s*multiple\)/.test(t)) return 'qcm_multiple';
      if (/vrai\s*\/\s*faux|vrai\s*et\s*faux|\(vrai\s*\/\s*faux\)/.test(t)) return 'vrai_faux';
      if (t.includes('vrai') && t.includes('faux')) return 'vrai_faux';
      if (/question\s+ouverte|réponse\s+libre|reponse\s+libre|\(question\s+ouverte\)/.test(t)) return 'ouverte';
      if (/exercice\s+pratique|pratique|\(pratique\)/.test(t)) return 'pratique';
      if (/énoncé|enonce|\(énoncé\)/.test(t)) return 'enonce';
      return null;
    };

    const extractInlineOptions = (line) => {
      const opts = [];
      const regex = /([a-d])\s*[).:-]\s*([^\n]+)/gi;
      let m;
      while ((m = regex.exec(line)) !== null) {
        if (m[2]) opts.push(m[2].trim());
        if (m.index === regex.lastIndex) regex.lastIndex++;
      }
      return opts;
    };

    // remove checkbox glyphs before further parsing to avoid them leaking into question text
    const cleanLine = stripCheckboxGlyphs(raw);
    const explicitType = detectExplicitType(cleanLine);
    // Try to detect a numbered question first (e.g. '2. Question' or '2. (Choix unique)')
    const qText = parseQuestionPrefix(raw);
    if (qText !== null) {
      flush();
      current = { text: qText, options: [] };
      if (explicitType) current.forceType = explicitType;
      // handle inline options on the same line (e.g. '1. Question a) optA b) optB')
      const inlineOptsAfter = extractInlineOptions(raw);
      if (inlineOptsAfter.length > 0) current.options.push(...inlineOptsAfter);
      return;
    }

    // If no numbered prefix, but the line declares an explicit type, attach it to current or pending
    if (explicitType) {
      if (current) current.forceType = explicitType;
      else pendingForceType = explicitType;
      return;
    }

    // options like 'a) texte' appearing inline or alone
    const inlineOpts = extractInlineOptions(cleanLine);
    if (inlineOpts.length > 0) {
      if (!current) {
        const firstOptIdx = raw.search(/[a-d]\s*[).:-]/i);
        if (firstOptIdx > 0) {
          const possibleQ = raw.slice(0, firstOptIdx).trim();
          const qPref = parseQuestionPrefix(possibleQ);
          current = { text: qPref !== null ? qPref : possibleQ, options: [] };
        } else {
          current = { text: '', options: [] };
        }
      }
      current.options.push(...inlineOpts);
      return;
    }

    const optionText = parseOptionLine(cleanLine);
    if (optionText && current) { current.options.push(optionText); return; }
    const normalized = normalizeQuestionLine(cleanLine);
    if (!normalized) return;
    if (!current) { current = { text: normalized, options: [] }; return; }
    current.text = `${current.text} ${normalized}`.trim();
  });
  flush();
  return parsed;
};

// ─── Constantes mise en page A4 ──────────────────────────────────────────────
const PAGE_W = 11906;  // A4 largeur DXA
const MARGIN = 1134;   // ~2 cm
const CONTENT_W = PAGE_W - 2 * MARGIN;

// ─── Helpers bordures ────────────────────────────────────────────────────────
const bSingle = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const bNone = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const bordersAll = { top: bSingle, bottom: bSingle, left: bSingle, right: bSingle };
const bordersNone = { top: bNone, bottom: bNone, left: bNone, right: bNone };

// ─── Helper : cellule vide ────────────────────────────────────────────────────
const _emptyCell = (w) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  borders: bordersNone,
  children: [new Paragraph({ children: [] })],
});

// ─── Helper : paragraphe texte simple ────────────────────────────────────────
const tp = (text, opts = {}) => new Paragraph({
  spacing: { before: opts.before ?? 40, after: opts.after ?? 40 },
  alignment: opts.align,
  children: [new TextRun({
    text: String(text || ''),
    font: 'Times New Roman',
    size: opts.size ?? 20,
    bold: opts.bold ?? false,
    color: opts.color,
    underline: opts.underline ? {} : undefined,
  })],
});

// ─── Étiquette type de question pour le .docx ────────────────────────────────
const getTypeLabel = (type) => {
  switch (type) {
    case 'qcm':
    case 'qcm_multiple': return '(Choix multiple)';
    case 'qcm_unique': return '(Choix unique)';
    case 'vrai_faux': return '(Vrai / Faux)';
    case 'ouverte': return '(Question ouverte)';
    case 'pratique': return '(Exercice pratique)';
    case 'enonce': return '';
    default: return '';
  }
};

const parseQuestionSubparts = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const mainLine = lines[0];
  const subparts = [];

  for (const line of lines.slice(1)) {
    const match = line.match(/^([a-h])\s*[).:-]\s*(.+)$/i);
    if (!match) return null;
    subparts.push({ label: match[1].toLowerCase(), text: match[2].trim() });
  }

  return subparts.length > 0 ? { mainLine, subparts } : null;
};

const isQcmType = (t) =>
  t === 'qcm' || t === 'qcm_unique' || t === 'qcm_multiple' || t === 'vrai_faux';

// ─── Composant principal ─────────────────────────────────────────────────────
const CreateExam = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('Modèles');
  const [filter, setFilter] = useState({ matiere: '', niveau: '', annee: '' });
  const [mesExamens, setMesExamens] = useState([]);
  const [autresExamens, setAutresExamens] = useState([]);
  const [mesQuestions, setMesQuestions] = useState([]);
  const [autresQuestions, setAutresQuestions] = useState([]);
  const [_filteredMesExamens, setFilteredMesExamens] = useState([]);
  const [_filteredAutresExamens, setFilteredAutresExamens] = useState([]);
  const [filteredMesQuestions, setFilteredMesQuestions] = useState([]);
  const [filteredAutresQuestions, setFilteredAutresQuestions] = useState([]);
  const [_hasSearched, setHasSearched] = useState(true);
  const [_isLoading, setIsLoading] = useState(true);
  const [_error, setError] = useState('');
  const [_successMessage, setSuccessMessage] = useState('');
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sections, setSections] = useState([makeSection(1)]);
  const [examForm, setExamForm] = useState({
    titre: '', departement: '', filiere: '', matiere: '', niveau: '', type: '', duree: '',
    noteTotale: String(FIXED_EXAM_TOTAL), statut: 'Brouillon', templateId: null,
  });
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [editingExamId, setEditingExamId] = useState(null);
  const importedQuestionRef = useRef(null);

  const onFormChange = (field, value) =>
    setExamForm(prev => ({ ...prev, [field]: value }));

  // ─── Chargement initial ───────────────────────────────────────────────────
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

        // ─── Tous les templates sont accessibles à tous les enseignants ───
        setMesExamens(mesEx); setAutresExamens(autEx);
        setMesQuestions(mesQ); setAutresQuestions(autQ);
        setFilteredMesExamens(mesEx); setFilteredAutresExamens(autEx);
        setFilteredMesQuestions(mesQ); setFilteredAutresQuestions(autQ);
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
  }, [user]);

  // ─── Chargement examen à éditer ───────────────────────────────────────────
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
          titre: exam.title || '',
          filiere: exam.filiere || '',
          matiere: exam.matiere || '',
          niveau: exam.niveau || '',
          type: exam.type || '',
          duree: exam.duree || '',
          noteTotale: String(FIXED_EXAM_TOTAL),
          statut: exam.status || 'Brouillon',
          templateId: exam.templateId || null,
        });
        setSelectedTemplate(exam.templateId || null);

        try {
          const contentData = await getExamContent(id);
          const editableSections = buildEditableSections(contentData);

          if (editableSections.length > 0) {
            const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const rebuilt = editableSections.map((sec, si) => {
              const sectionTitle = String(sec?.title || '').trim();
              const isHeaderSection = /en[-\s]?t[êe]te|instruction/i.test(sectionTitle);
              const parsedQuestions = parseSectionQuestions(getSectionContentLines(sec));
              if (isHeaderSection || parsedQuestions.length === 0) return null;
              return {
                id: uid(), title: sectionTitle || `Partie ${si + 1}`, collapsed: false,
                exercises: [{ id: uid(), title: 'Exercice 1', points: '', collapsed: false, questions: parsedQuestions }],
              };
            }).filter(Boolean);
            setSections(rebuilt.length > 0 ? rebuilt : [makeSection(1)]);
          } else {
            setSections([makeSection(1)]);
          }
        } catch {
          setSections([makeSection(1)]);
        }
        setActiveTab('Exercices');
        setSuccessMessage(`"${exam.title}" chargé avec ses exercices.`);
      } catch {
        setError("Erreur lors du chargement de l'examen");
      }
    })();
  }, [location, editingExamId]);

  // Import a single question passed via navigation state (from QuestionBank 'Modifier')
  useEffect(() => {
    const imported = location.state?.importQuestion;
    if (!imported || importedQuestionRef.current) return;

    try {
      const mapQ = (q) => {
        const nid = `imp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        let t = (q.type || 'ouverte').toString();
        if (t === 'qcm') t = 'qcm_multiple';
        const opts = Array.isArray(q.options) ? q.options.map((o, i) => ({
          id: o.id || `opt_${Date.now()}_${i}`,
          text: typeof o === 'string' ? o : (o.text || ''),
          correct: !!o.correct,
        })) : [];

        return {
          id: nid,
          type: t,
          text: q.text || '',
          points: '',
          isEditing: false,
          answerLines: q.answerLines || 3,
          image: null,
          imageUrl: q.imageUrl || null,
          options: opts,
        };
      };

      const qToAdd = mapQ(imported);
      setSections((prev) => {
        const next = Array.isArray(prev) ? JSON.parse(JSON.stringify(prev)) : [];
        if (next.length === 0) next.push(makeSection(1));
        const lastSec = next[next.length - 1];
        if (!Array.isArray(lastSec.exercises) || lastSec.exercises.length === 0) {
          lastSec.exercises = [{ id: `exo_${Date.now()}`, title: 'Exercice 1', points: '', collapsed: false, questions: [] }];
        }
        const lastEx = lastSec.exercises[lastSec.exercises.length - 1];
        lastEx.questions = lastEx.questions || [];
        lastEx.questions.push(qToAdd);
        return next;
      });
      importedQuestionRef.current = imported.id || true;
      setActiveTab('Exercices');
      setSuccessMessage('Question importée depuis la banque.');
      // Clear state to avoid re-import on refresh
      try { window.history.replaceState({}, document.title, location.pathname + location.search.replace(/(&?importQuestion=[^&]*)/, '')); } catch (e) {}
    } catch (e) {
      console.warn('Import question failed', e);
    }
  }, [location]);

  const _handleFilterChange = (key, val) => setFilter(p => ({ ...p, [key]: val }));

  const _handleFilterSearch = async () => {
    setIsLoading(true); setError('');
    try {
      const [ex, qs] = await Promise.all([
        getFilteredExams(filter.matiere, filter.niveau, filter.annee),
        getFilteredQuestions(filter.matiere, filter.niveau, filter.annee),
      ]);
      const me = Array.isArray(ex?.mesExamens) ? ex.mesExamens.filter(Boolean) : [];
      const ae = Array.isArray(ex?.autresExamens) ? ex.autresExamens.filter(Boolean) : [];
      const mq = Array.isArray(qs?.mesQuestions) ? qs.mesQuestions.filter(Boolean) : [];
      const aq = Array.isArray(qs?.autresQuestions) ? qs.autresQuestions.filter(Boolean) : [];
      setFilteredMesExamens(me); setFilteredAutresExamens(ae);
      setFilteredMesQuestions(mq); setFilteredAutresQuestions(aq);
      setHasSearched(true);
      setSuccessMessage(`${me.length + ae.length} examen(s) · ${mq.length + aq.length} question(s) trouvé(s).`);
    } catch (e) {
      setError(e?.message || 'Erreur de recherche');
    } finally {
      setIsLoading(false);
    }
  };

  const _handleFilterReset = () => {
    setFilter({ matiere: '', niveau: '', annee: '' });
    setFilteredMesExamens(mesExamens); setFilteredAutresExamens(autresExamens);
    setFilteredMesQuestions(mesQuestions); setFilteredAutresQuestions(autresQuestions);
    setError(''); setSuccessMessage(''); setHasSearched(true);
  };

  const handleSelectTemplate = (id) => {
    const next = selectedTemplate === id ? null : id;
    setSelectedTemplate(next);
    setExamForm(p => ({ ...p, templateId: next }));
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     BUILD & SAVE EXAM — génération .docx corrigée
     ═══════════════════════════════════════════════════════════════════════════ */
  const finishAndSaveExam = async (overrideStatut, visibility = 'public') => {
    const titre = examForm.titre.trim();
    if (!titre) { setExportError("Le titre de l'examen est requis"); return; }

    const allQuestions = sections.flatMap(sec =>
      sec.exercises.flatMap(exo =>
        exo.questions.map(q => q.text?.trim()).filter(Boolean)
      )
    );
    if (allQuestions.length === 0) { setExportError('Ajoutez au moins une question'); return; }

    const statusToUse = overrideStatut || examForm.statut;
    setIsSavingExam(true); setExportError(''); setExportMessage('Génération du document Word…');

    try {
      const resolvedId = selectedTemplate || examForm.templateId || null;
      const selectedTpl = resolvedId
        ? allTemplates.find(t => t._id === resolvedId)
        : null;
      const tpl = selectedTpl;

      // ─── Valeurs fusionnées : examForm > template > défaut ──────────────
      const tplMatiere = examForm.matiere || tpl?.matiere || '';
      const tplDiscipline = examForm.filiere || tpl?.discipline || '';
      const tplTeachers = examForm.enseignants || tpl?.enseignants || '';
      const tplDocs = examForm.documentsAutorises || tpl?.documentsAutorises || '';
      const tplAnnee = examForm.anneeUniversitaire || tpl?.anneeUniversitaire ||
        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      const rawSemestre = examForm.semestre || tpl?.semestre || '';
      const rawDate = examForm.dateExamen || tpl?.dateExamen || '';
      const tplSemestre = rawSemestre ? rawSemestre + (rawDate ? ` (${rawDate})` : '') : '';
      const tplDuree = examForm.duree || tpl?.duree || '1h30';
      const tplTitre = examForm.titre || tpl?.titreExamen || 'DEVOIR SURVEILLÉ';
      const feuilleType = tpl?.feuilleType || "Feuille d'énoncé";

      const tplCampusTextEn = tpl?.campusTextEn || 'North American Private University';
      const tplCampusText = tpl?.campusText || 'SFAX - TUNISIA';
      const tplCampusTagline = tpl?.campusTagline || 'TECHNOLOGY · BUSINESS · ARCHITECTURE';
      const pageCount = Math.max(1, estimatePageCount(sections));

      const sec = tpl?.sections;
      const showNP = !sec || sec.zoneNomPrenom;
      const showGrp = !sec || sec.zoneGroupe;
      const showNote = !sec || sec.blocNote;
      const showComm = !sec || sec.blocCommentaires;
      const showSign = !sec || sec.blocSignature;
      const showNB = !sec || sec.blocRemarques;

      const docChildren = [];

      // ─── EN-TÊTE ────────────────────────────────────────────────────────
      if (tpl) {
        const templateStyle = tpl.templateStyle || 'long';

        if (templateStyle === 'court') {
          // ── Style COURT (Forme 2 — Tableau simple) ──
          const logoRun = await buildLogoImageRun();
          const colCourtLeft = Math.round(CONTENT_W * 0.33);
          const colCourtCenter = Math.round(CONTENT_W * 0.34);
          const colCourtRight = CONTENT_W - colCourtLeft - colCourtCenter;

          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [colCourtLeft, colCourtCenter, colCourtRight],
            borders: { top: bNone, bottom: bNone, left: bNone, right: bNone, insideH: bNone, insideV: bNone },
            rows: [new TableRow({
              children: [
                new TableCell({
                  width: { size: colCourtLeft, type: WidthType.DXA },
                  borders: bordersNone,
                  margins: { top: 40, bottom: 40, left: 0, right: 60 },
                  children: [
                    tp('République Tunisienne', { size: 16, alignment: AlignmentType.CENTER }),
                    tp("Ministère de l'Enseignement", { size: 16, alignment: AlignmentType.CENTER }),
                    tp('Supérieur', { size: 16, alignment: AlignmentType.CENTER }),
                    tp('et de la Recherche Scientifique', { size: 16, alignment: AlignmentType.CENTER }),
                  ],
                }),
                new TableCell({
                  width: { size: colCourtCenter, type: WidthType.DXA },
                  borders: bordersNone,
                  margins: { top: 40, bottom: 40, left: 60, right: 60 },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoRun ? [logoRun] : [new TextRun({ text: 'IIT', bold: true, font: 'Times New Roman', size: 32 })],
                  })],
                }),
                new TableCell({
                  width: { size: colCourtRight, type: WidthType.DXA },
                  borders: bordersNone,
                  margins: { top: 40, bottom: 40, left: 60, right: 0 },
                  children: [
                    tp(tpl.universiteFr || 'Université Nord-Américaine privée', { size: 16, alignment: AlignmentType.CENTER }),
                    tp(tpl.institutFr || 'Institut International de Technologie', { size: 16, alignment: AlignmentType.CENTER }),
                    tp(tpl.universiteAr || '', { size: 14, alignment: AlignmentType.CENTER, color: '888888' }),
                  ],
                }),
              ],
            })],
          }));

          docChildren.push(new Paragraph({ children: [], spacing: { after: 80 } }));

          // Tableau méta court (3 colonnes × 3 lignes)
          const c1 = Math.round(CONTENT_W * 0.34);
          const c2 = Math.round(CONTENT_W * 0.33);
          const c3 = CONTENT_W - c1 - c2;
          const mkCell = (text, w) => new TableCell({
            width: { size: w, type: WidthType.DXA },
            borders: bordersAll,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text, font: 'Times New Roman', size: 18 })] })],
          });
          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [c1, c2, c3],
            rows: [
              new TableRow({ children: [
                mkCell(`Matière : ${tplMatiere}`, c1),
                mkCell(`Discipline : ${tplDiscipline}`, c2),
                mkCell(`Semestre : ${rawSemestre}`, c3),
              ]}),
              new TableRow({ children: [
                mkCell(`Enseignant : ${tplTeachers}`, c1),
                mkCell(`Année universitaire : ${tplAnnee}`, c2),
                mkCell(`Date : ${rawDate || '—'}`, c3),
              ]}),
              new TableRow({ children: [
                mkCell(`Documents : ${tplDocs}`, c1),
                mkCell(`Nombre de pages : ${pageCount}`, c2),
                mkCell(`Durée : ${tplDuree}`, c3),
              ]}),
            ],
          }));

          docChildren.push(new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: `${feuilleType} ◄`, bold: true, font: 'Times New Roman', size: 20 })],
          }));

          if (showNP) {
            docChildren.push(new Table({
              width: { size: CONTENT_W, type: WidthType.DXA },
              columnWidths: [CONTENT_W],
              rows: [new TableRow({
                height: { value: 700, rule: HeightRule.ATLEAST },
                children: [new TableCell({
                  width: { size: CONTENT_W, type: WidthType.DXA },
                  borders: bordersAll,
                  margins: { top: 80, bottom: 80, left: 120, right: 80 },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Prénom & Nom :   _______________________________________', font: 'Times New Roman', size: 20 })],
                  })],
                })],
              })],
            }));
          }

          if (showNB) {
            const remarquesRaw = (tpl?.remarques || '').trim();
            const nbLines = remarquesRaw
              ? remarquesRaw.split('\n').filter(l => l.trim())
              : ["— Réponses sur la feuille de l'énoncé.", '— Le barème est donné à titre indicatif.'];
            docChildren.push(new Paragraph({ children: [], spacing: { after: 120 } }));
            nbLines.forEach(line => {
              docChildren.push(new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: line, font: 'Times New Roman', size: 18 })],
              }));
            });
          }

          docChildren.push(new Paragraph({ children: [], spacing: { after: 360 } }));

        } else {
          // ── Style LONG (Forme 1 — Session principale avec NB) ──
        // ── 1. Colonnes en-tête université ──
        const colLeft = Math.round(CONTENT_W * 0.27);
        const colCenter = Math.round(CONTENT_W * 0.53);
        const colRight = CONTENT_W - colLeft - colCenter;

        // Logo IIT en tant qu'ImageRun
        const logoRun = await buildLogoImageRun();
        const logoCell = new TableCell({
          width: { size: colRight, type: WidthType.DXA },
          borders: bordersAll,
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: logoRun
              ? [logoRun]
              : [new TextRun({ text: 'IIT', bold: true, font: 'Times New Roman', size: 32 })],
          })],
        });

        docChildren.push(new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [colLeft, colCenter, colRight],
          borders: { top: bNone, bottom: bNone, left: bNone, right: bNone, insideH: bNone, insideV: bNone },
          rows: [new TableRow({
            children: [
              // Colonne gauche — texte campus anglais
              new TableCell({
                width: { size: colLeft, type: WidthType.DXA },
                borders: bordersNone,
                margins: { top: 60, bottom: 60, left: 0, right: 80 },
                children: [
                  tp(tplCampusTextEn, { size: 18 }),
                  tp(tplCampusText, { size: 18 }),
                  tp(tplCampusTagline, { size: 14, color: '888888' }),
                ],
              }),
              // Colonne centre — noms arabe / français
              new TableCell({
                width: { size: colCenter, type: WidthType.DXA },
                borders: bordersNone,
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.universiteAr || 'الجامعة الشمالية الأمريكية الخاصة', font: 'Times New Roman', size: 18 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.universiteFr || 'Université Nord-Américaine Privée', font: 'Times New Roman', size: 18 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.institutFr || 'Institut International de Technologie', font: 'Times New Roman', size: 18, bold: true })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.departementFr || '', font: 'Times New Roman', size: 18 })] }),
                ],
              }),
              // Colonne droite — logo
              logoCell,
            ]
          })],
        }));

        docChildren.push(new Paragraph({ children: [], spacing: { after: 160 } }));

        // ── 2. Boîte titre (DEVOIR SURVEILLÉ + case réservée) ──
        const colTitleMain = Math.round(CONTENT_W * 0.68);
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
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [tp(feuilleType, { size: 18, color: '888888' })],
              }),
            ],
          })],
        }));

        // ── 3. Grille méta (matière / semestre / durée…) ──
        const colMeta = Math.round(CONTENT_W / 2);
        const colMeta2 = CONTENT_W - colMeta;

        docChildren.push(new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [colMeta, colMeta2],
          rows: [new TableRow({
            children: [
              new TableCell({
                width: { size: colMeta, type: WidthType.DXA },
                borders: { top: bNone, bottom: bSingle, left: bSingle, right: bNone },
                margins: { top: 80, bottom: 80, left: 120, right: 80 },
                children: [
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Matière : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplMatiere, font: 'Times New Roman', size: 20 })] }),
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Discipline : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplDiscipline, font: 'Times New Roman', size: 20 })] }),
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Enseignants : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplTeachers, font: 'Times New Roman', size: 20 })] }),
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Documents autorisés : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplDocs, font: 'Times New Roman', size: 20 })] }),
                ],
              }),
              new TableCell({
                width: { size: colMeta2, type: WidthType.DXA },
                borders: { top: bNone, bottom: bSingle, left: bSingle, right: bSingle },
                margins: { top: 80, bottom: 80, left: 120, right: 80 },
                children: [
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Année Universitaire : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplAnnee, font: 'Times New Roman', size: 20 })] }),
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Semestre : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplSemestre, font: 'Times New Roman', size: 20 })] }),
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Durée : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: tplDuree, font: 'Times New Roman', size: 20 })] }),
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Nombre de pages : ', bold: true, font: 'Times New Roman', size: 20 }), new TextRun({ text: String(pageCount), font: 'Times New Roman', size: 20 })] }),
                ],
              }),
            ]
          })],
        }));

        // ── 4. Ligne étudiant ──
        if (showNP || showGrp) {
          const colStudent = Math.round(CONTENT_W * 0.68);
          const colGroup = CONTENT_W - colStudent;
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

        // ── 5. Cases note / commentaires / signature ──
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

        // ── 6. Bloc NB (remarques) ──
        if (showNB) {
          const remarquesRaw = (tpl?.remarques || '').trim();
          const nbLines = remarquesRaw
            ? remarquesRaw.split('\n').filter(l => l.trim())
            : [
              '— Le barème est fourni à titre indicatif et peut être ajusté',
              `— La durée de l'examen est de ${tplDuree}`,
              "— Les ordinateurs, l'accès à Internet sont strictement interdits",
            ];

          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [CONTENT_W],
            rows: [new TableRow({
              children: [new TableCell({
                width: { size: CONTENT_W, type: WidthType.DXA },
                borders: bordersAll,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'NB.', bold: true, font: 'Times New Roman', size: 20 })] }),
                  ...nbLines.map(line =>
                    new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: line, font: 'Times New Roman', size: 18 })] })
                  ),
                ],
              })]
            })],
          }));
        }

        docChildren.push(new Paragraph({ children: [], spacing: { after: 360 } }));

        } // end else (long style)

      } else {
        // ── EN-TÊTE MINIMAL (sans template) ──
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 160 },
          children: [new TextRun({ text: titre, bold: true, font: 'Times New Roman', size: 32, allCaps: true })],
        }));

        const metaLines = [
          examForm.matiere && `Matière : ${examForm.matiere}`,
          examForm.filiere && `Filière : ${examForm.filiere}`,
          examForm.niveau && `Niveau : ${examForm.niveau}`,
          examForm.type && `Type : ${examForm.type}`,
          examForm.duree && `Durée : ${examForm.duree}`,
          `Barème : /${FIXED_EXAM_TOTAL}`,
          `Date : ${new Date().toLocaleDateString('fr-FR')}`,
        ].filter(Boolean);

        const halfMeta = Math.round(CONTENT_W / 2);
        const leftLines = metaLines.slice(0, Math.ceil(metaLines.length / 2));
        const rightLines = metaLines.slice(Math.ceil(metaLines.length / 2));
        const maxRows = Math.max(leftLines.length, rightLines.length);

        const metaRows = [];
        for (let i = 0; i < maxRows; i++) {
          metaRows.push(new TableRow({
            children: [
              new TableCell({
                width: { size: halfMeta, type: WidthType.DXA }, borders: bordersNone,
                margins: { top: 40, bottom: 40, left: 0, right: 80 },
                children: [new Paragraph({ children: leftLines[i] ? [new TextRun({ text: leftLines[i], font: 'Times New Roman', size: 20 })] : [] })],
              }),
              new TableCell({
                width: { size: CONTENT_W - halfMeta, type: WidthType.DXA }, borders: bordersNone,
                margins: { top: 40, bottom: 40, left: 80, right: 0 },
                children: [new Paragraph({ children: rightLines[i] ? [new TextRun({ text: rightLines[i], font: 'Times New Roman', size: 20 })] : [] })],
              }),
            ]
          }));
        }

        if (metaRows.length > 0) {
          docChildren.push(new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [halfMeta, CONTENT_W - halfMeta],
            rows: metaRows,
          }));
        }

        docChildren.push(new Paragraph({
          spacing: { before: 120, after: 240 },
          border: { bottom: { style: BorderStyle.DOTTED, size: 6, color: '000000', space: 1 } },
          children: [],
        }));
      }

      /* ═══════════════════════════════════════════════════════════════════
         SECTIONS / EXERCICES / QUESTIONS
         ═══════════════════════════════════════════════════════════════════ */
      for (const [si, sec] of sections.entries()) {
        // ── Titre de partie ──
        docChildren.push(new Paragraph({
          spacing: { before: 320, after: 120 },
          border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: 'CCCCCC', space: 1 } },
          children: [
            new TextRun({ text: `Partie ${si + 1} — `, bold: true, font: 'Times New Roman', size: 24, color: '1e4fa8' }),
            new TextRun({ text: sec.title || `Partie ${si + 1}`, bold: true, font: 'Times New Roman', size: 24 }),
          ],
        }));

        for (const [ei, exo] of sec.exercises.entries()) {
          const exoPts = exo.points ? ` (${exo.points} pts)` : '';

          // ── Titre d'exercice ──
          docChildren.push(new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [new TextRun({
              text: `${exo.title || `Exercice ${ei + 1}`}${exoPts}`,
              bold: true, font: 'Times New Roman', size: 22, underline: {},
            })],
          }));

          let visibleQuestionIndex = 0;
          for (const [qi, q] of exo.questions.entries()) {
            const pts = q.points ? ` [${q.points} pts]` : '';
            const qNum = q.type === 'enonce' ? null : ++visibleQuestionIndex;
            const _typeLabel = getTypeLabel(q.type);
            const structuredText = parseQuestionSubparts(q.text);
            const mainText = structuredText ? structuredText.mainLine : (q.text || '');

            // ── Énoncé de l'énoncé / question ──
            if (q.type === 'enonce') {
              // Bloc texte italique sans numéro
              docChildren.push(new Paragraph({
                spacing: { before: 100, after: 60 },
                indent: { left: 360 },
                children: [new TextRun({ text: mainText, font: 'Times New Roman', size: 20, italics: true })],
              }));
            } else {
              // Numéro + texte + type
              docChildren.push(new Paragraph({
                spacing: { before: 120, after: 60 },
                indent: { left: 360 },
                children: [
                  new TextRun({ text: `${qNum}. `, bold: true, font: 'Times New Roman', size: 20 }),
                  new TextRun({ text: mainText, font: 'Times New Roman', size: 20 }),
                  ...(pts ? [new TextRun({ text: pts, bold: true, font: 'Times New Roman', size: 18, color: '1e4fa8' })] : []),
                ],
              }));
            }

            if (structuredText) {
              structuredText.subparts.forEach((part) => {
                docChildren.push(new Paragraph({
                  spacing: { before: 40, after: 30 },
                  indent: { left: 720 },
                  children: [
                    new TextRun({ text: `${part.label}) `, bold: true, font: 'Times New Roman', size: 19 }),
                    new TextRun({ text: part.text, font: 'Times New Roman', size: 19 }),
                  ],
                }));
              });
            }

            // ── Image éventuelle ──
            if (q.imageUrl) {
              const imgRun = await buildImageRun(q.imageUrl);
              if (imgRun) {
                docChildren.push(new Paragraph({
                  spacing: { before: 80, after: 80 },
                  alignment: AlignmentType.CENTER,
                  children: [imgRun],
                }));
              }
            }

            // ── Options QCM (sans indication de bonne réponse) ──
            if (isQcmType(q.type) && q.options?.length) {
              if (q.type === 'vrai_faux') {
                // Vrai / Faux sur une seule ligne avec cases à cocher
                docChildren.push(new Paragraph({
                  spacing: { before: 40, after: 60 },
                  indent: { left: 720 },
                  children: [new TextRun({ text: '☐ Vrai     ☐ Faux', font: 'Times New Roman', size: 20 })],
                }));
              } else {
                // QCM standard — une option par ligne
                q.options.forEach((opt, oi) => {
                  const letter = String.fromCharCode(97 + oi); // a, b, c, d…
                  const markChar = q.type === 'qcm_unique' ? '○' : '☐';
                  docChildren.push(new Paragraph({
                    spacing: { before: 40, after: 40 },
                    indent: { left: 720 },
                    children: [
                      new TextRun({ text: `${markChar} ${letter}) `, bold: true, font: 'Times New Roman', size: 19 }),
                      new TextRun({ text: opt.text || '', font: 'Times New Roman', size: 19 }),
                    ],
                  }));
                });
              }
            }

            // ── Lignes de réponse (questions ouvertes, pratique, etc.) ──
            const isOpenType = ['ouverte', 'calcul', 'definition', 'code', 'completement', 'schema'].includes(q.type);
            if (isOpenType) {
              const rawLines = q.answerLines;
              const nbLines = (rawLines !== null && rawLines !== undefined && Number(rawLines) > 0)
                ? Number(rawLines)
                : (q.type === 'calcul' ? 5 : q.type === 'code' || q.type === 'pratique' ? 6 : 3);
              // Un seul tableau avec N lignes — chaque ligne a une bordure inférieure pointillée
              const answerRows = [];
              for (let li = 0; li < nbLines; li++) {
                answerRows.push(
                  new TableRow({
                    height: { value: 400, rule: HeightRule.EXACT },
                    children: [
                      new TableCell({
                        width: { size: CONTENT_W, type: WidthType.DXA },
                        borders: {
                          top: bNone,
                          left: bNone,
                          right: bNone,
                          bottom: { style: BorderStyle.DOTTED, size: 6, color: '888888' },
                        },
                        margins: { top: 0, bottom: 0, left: 0, right: 0 },
                        children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
                      }),
                    ],
                  })
                );
              }
              docChildren.push(
                new Table({
                  width: { size: CONTENT_W, type: WidthType.DXA },
                  columnWidths: [CONTENT_W],
                  borders: {
                    top: bNone,
                    left: bNone,
                    right: bNone,
                    bottom: bNone,
                    insideH: bNone,
                    insideV: bNone,
                  },
                  rows: answerRows,
                })
              );
            }

            // Espace après chaque question
            docChildren.push(new Paragraph({ children: [], spacing: { after: 60 } }));
          }

          // Espace après exercice
          docChildren.push(new Paragraph({ children: [], spacing: { after: 60 } }));
        }
      }

      // ─── Génération du Document .docx ─────────────────────────────────
      const doc = new Document({
        numbering: {
          config: [
            {
              reference: 'qcm-bullets',
              levels: [{
                level: 0,
                format: LevelFormat.BULLET,
                text: '○',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              }],
            },
          ],
        },
        sections: [{
          properties: {
            page: {
              size: { width: PAGE_W, height: 16838 }, // A4
              margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
            },
          },
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const filename = `${titre.replace(/\s+/g, '_')}_${Date.now()}.docx`;

      // ─── Conversion blob → base64 par chunks (évite les crashs mémoire) ─
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let b64 = '';
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      b64 = btoa(b64);

      // ─── Sauvegarde en base ───────────────────────────────────────────
      await addExamToBank({
        title: titre,
        departement: examForm.departement.trim(),
        filiere: examForm.filiere.trim(),
        matiere: examForm.matiere.trim(),
        niveau: examForm.niveau.trim(),
        type: examForm.type,
        duree: examForm.duree,
        noteTotale: FIXED_EXAM_TOTAL,
        questionsCount: allQuestions.length,
        status: statusToUse,
        visibility: visibility || 'public',
        fileName: filename,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileContentBase64: b64,
        anneeUniversitaire: examForm.anneeUniversitaire ||
          `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        semestre: examForm.semestre || '',
        ...(examForm.templateId && { templateId: examForm.templateId }),
      });

      // ─── Sauvegarde des questions dans la banque ─────────────────────
      const questionSavePromises = sections.flatMap(sec =>
        sec.exercises.flatMap(exo =>
          exo.questions
            .filter(q => q.text?.trim())
            .map(q =>
              addQuestionToBank(
                q.text.trim(),
                examForm.matiere.trim(),
                examForm.niveau.trim(),
                `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                q.type || 'ouverte',
                typeof q.answerLines === 'number' ? q.answerLines : undefined,
                Array.isArray(q.options) ? q.options : [],
                q.imageUrl || ''
              ).catch((err) => console.error('Erreur sauvegarde question:', err))
            )
        )
      );
      await Promise.all(questionSavePromises);

      // ─── Téléchargement si statut "En cours" ou "Exporte" ────────────
      if (statusToUse === 'En cours' || statusToUse === 'Exporte') {
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
      setExportMessage(
        `Examen "${titre}" sauvegardé${tplInfo} — ${allQuestions.length} question(s) · téléchargement en cours.`
      );

      setTimeout(() => {
        setExamForm({
          titre: '', filiere: '', matiere: '', niveau: '', type: '', duree: '',
          noteTotale: String(FIXED_EXAM_TOTAL), statut: 'Brouillon', templateId: null,
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

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="exam-create-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="exam-create-main">
        {/* ── Onglets — style original ── */}
        <nav className="exam-tabs" role="tablist">
          {TABS.map((tab, i) => (
            <button
              key={tab} type="button" role="tab"
              aria-selected={activeTab === tab}
              className={`exam-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="exam-tab-step">{i + 1}</span>
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

        {activeTab === 'Exercices' && (
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