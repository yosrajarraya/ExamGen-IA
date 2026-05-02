const mammoth = require('mammoth');
const { parseDOM } = require('htmlparser2');

/**
 * Parse a .docx Buffer and extract structured content:
 * sections (Exercice / Partie / Question) with their AST content.
 */
const parseDocxBuffer = async (buffer) => {
  const { value: rawHtml } = await mammoth.convertToHtml({ buffer });

  // Also get plain text for fallback
  const { value: rawText } = await mammoth.extractRawText({ buffer });

  const sections = extractSectionsAsAst(rawHtml, rawText);
  return { sections, rawText };
};

/**
 * Detect a heading/section line.
 * Matches patterns like: Exercice 1, Partie A, Question 1, Q1, Ex. 2, etc.
 */
const SECTION_REGEX = /^(exercice|partie|question|problème|probleme|ex\.?|q\.?)\s*[\d\w):.–\-]*/i;

/**
 * Build sections returning AST for each section.
 * We parse the HTML into DOM nodes, walk top-level blocks and group them when
 * a heading or SECTION_REGEX-like text is found.
 */
const extractSectionsAsAst = (html, rawText) => {
  const dom = parseDOM(html);

  const blocks = domToBlockNodes(dom);

  const sections = [];
  let currentSection = null;
  const globalBlocks = [];

  for (const block of blocks) {
    const textContent = blockText(block).trim();
    const isHeader = (block.type === 'heading') || (SECTION_REGEX.test(textContent));

    if (isHeader) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: textContent || '—',
        contentAst: [],
      };
    } else {
      if (currentSection) currentSection.contentAst.push(block);
      else globalBlocks.push(block);
    }
  }

  if (currentSection) sections.push(currentSection);

  if (sections.length === 0) {
    // fallback to plain-text paragraphs
    return fallbackSplit(rawText).map(s => ({ title: s.title, contentAst: [{ type: 'paragraph', children: [{ type: 'text', text: (s.content || []).join('\n') }] }] }));
  }

  if (globalBlocks.length > 0) {
    sections.unshift({ title: 'En-tête / Instructions', contentAst: globalBlocks });
  }

  return sections;
};

/**
 * Convert HTML string into an array of { text, isHeading } objects.
 */
/**
 * Convert the htmlparser2 DOM into block-level AST nodes we can render.
 */
const domToBlockNodes = (domNodes) => {
  const blocks = [];

  for (const node of domNodes) {
    if (node.type === 'text') {
      const t = node.data.replace(/&nbsp;/g, ' ').trim();
      if (t) blocks.push({ type: 'paragraph', children: [{ type: 'text', text: t }] });
      continue;
    }

    if (node.type === 'tag') {
      const tag = node.name.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        blocks.push({ type: 'heading', level: Number(tag[1]), children: inlineChildren(node.children) });
        continue;
      }

      if (tag === 'p' || tag === 'div') {
        blocks.push({ type: 'paragraph', children: inlineChildren(node.children) });
        continue;
      }

      if (tag === 'ul' || tag === 'ol') {
        const items = (node.children || []).filter(n => n.type === 'tag' && n.name.toLowerCase() === 'li').map(li => ({ children: inlineChildren(li.children) }));
        blocks.push({ type: 'list', ordered: tag === 'ol', items });
        continue;
      }

      if (tag === 'table') {
        const rows = [];
        const trs = (node.children || []).filter(n => n.type === 'tag' && n.name.toLowerCase() === 'tr');
        for (const tr of trs) {
          const cells = (tr.children || []).filter(n => n.type === 'tag' && /^(td|th)$/.test(n.name)).map(td => ({ children: inlineChildren(td.children) }));
          rows.push(cells);
        }
        blocks.push({ type: 'table', rows });
        continue;
      }

      if (tag === 'img') {
        const src = (node.attribs && (node.attribs.src || node.attribs['data-src'])) || '';
        blocks.push({ type: 'image', src, alt: (node.attribs && node.attribs.alt) || '' });
        continue;
      }

      // Fallback: if node contains children, flatten them into paragraphs/blocks
      if (node.children && node.children.length) {
        blocks.push(...domToBlockNodes(node.children));
      }
    }
  }

  return blocks;
};

/**
 * Convert inline DOM nodes into AST inline nodes (text with marks, links, etc.).
 */
const inlineChildren = (children = []) => {
  const out = [];

  for (const ch of children) {
    if (ch.type === 'text') {
      const txt = (ch.data || '').replace(/\s+/g, ' ');
      if (txt) out.push({ type: 'text', text: txt });
      continue;
    }

    if (ch.type === 'tag') {
      const tag = ch.name.toLowerCase();
      if (tag === 'strong' || tag === 'b') {
        out.push(...inlineChildren(ch.children).map(n => ({ ...n, bold: true })));
        continue;
      }
      if (tag === 'em' || tag === 'i') {
        out.push(...inlineChildren(ch.children).map(n => ({ ...n, italic: true })));
        continue;
      }
      if (tag === 'u') {
        out.push(...inlineChildren(ch.children).map(n => ({ ...n, underline: true })));
        continue;
      }
      if (tag === 'a') {
        const href = ch.attribs && ch.attribs.href;
        out.push({ type: 'link', href: href || '', children: inlineChildren(ch.children) });
        continue;
      }
      if (tag === 'img') {
        const src = (ch.attribs && (ch.attribs.src || ch.attribs['data-src'])) || '';
        out.push({ type: 'image', src, alt: (ch.attribs && ch.attribs.alt) || '' });
        continue;
      }

      // Unknown inline tag: recurse
      if (ch.children && ch.children.length) {
        out.push(...inlineChildren(ch.children));
      }
    }
  }

  return out;
};

const blockText = (block) => {
  if (!block) return '';
  if (block.type === 'text') return block.text || '';
  if (block.children) return block.children.map(blockText).join(' ');
  if (block.type === 'list') return block.items.map(i => i.children.map(blockText).join(' ')).join(' ');
  if (block.type === 'table') return block.rows.flat().map(cell => cell.children.map(blockText).join(' ')).join(' ');
  return '';
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