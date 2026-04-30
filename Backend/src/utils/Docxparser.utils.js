const mammoth = require('mammoth');

/**
 * Parse a .docx Buffer and extract structured content:
 * sections (Exercice / Partie / Question) with their text blocks.
 */
const parseDocxBuffer = async (buffer) => {
  const { value: rawHtml } = await mammoth.convertToHtml({ buffer });

  // Also get plain text for fallback
  const { value: rawText } = await mammoth.extractRawText({ buffer });

  const sections = extractSections(rawHtml, rawText);
  return { sections, rawText };
};

/**
 * Detect a heading/section line.
 * Matches patterns like: Exercice 1, Partie A, Question 1, Q1, Ex. 2, etc.
 */
const SECTION_REGEX = /^(exercice|partie|question|problème|probleme|ex\.?|q\.?)\s*[\d\w):.–\-]*/i;

const extractSections = (html, rawText) => {
  // Parse HTML into text lines with style hints
  const lines = htmlToLines(html);

  const sections = [];
  let currentSection = null;
  let globalLines = []; // lines before any section header

  for (const line of lines) {
    if (!line.text.trim()) continue;

    const isHeader = line.isHeading || SECTION_REGEX.test(line.text.trim());

    if (isHeader) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.text.trim(),
        content: [],
      };
    } else {
      if (currentSection) {
        currentSection.content.push(line.text.trim());
      } else {
        globalLines.push(line.text.trim());
      }
    }
  }

  if (currentSection) sections.push(currentSection);

  // If no sections were detected, fall back to splitting raw text by double newlines
  if (sections.length === 0) {
    return fallbackSplit(rawText);
  }

  // Prepend global lines (exam header/instructions) as a meta section if non-empty
  const filtered = globalLines.filter(Boolean);
  if (filtered.length > 0) {
    sections.unshift({
      title: 'En-tête / Instructions',
      content: filtered,
    });
  }

  return sections;
};

/**
 * Convert HTML string into an array of { text, isHeading } objects.
 */
const htmlToLines = (html) => {
  const lines = [];

  // Match block-level tags
  const blockRegex = /<(h[1-6]|p|li|td|th|tr)([\s\S]*?)>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[3]
      .replace(/<[^>]+>/g, '') // strip inner tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .trim();

    if (!inner) continue;

    lines.push({
      text: inner,
      isHeading: /^h[1-6]$/.test(tag),
    });
  }

  // If regex found nothing (very simple HTML), split by <br> and strip tags
  if (lines.length === 0) {
    const stripped = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    for (const line of stripped.split('\n')) {
      if (line.trim()) lines.push({ text: line.trim(), isHeading: false });
    }
  }

  return lines;
};

/**
 * Fallback: split raw text into paragraph-like blocks.
 */
const fallbackSplit = (rawText) => {
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  // Try to group by section keywords; otherwise return one section per paragraph
  const sections = [];
  let currentSection = null;

  for (const para of paragraphs) {
    if (SECTION_REGEX.test(para)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: para, content: [] };
    } else {
      if (currentSection) {
        currentSection.content.push(para);
      } else {
        sections.push({ title: para, content: [] });
      }
    }
  }

  if (currentSection) sections.push(currentSection);

  return sections.length > 0
    ? sections
    : [{ title: 'Contenu', content: paragraphs }];
};

module.exports = { parseDocxBuffer };