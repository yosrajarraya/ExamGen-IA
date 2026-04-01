import { useEffect, useState } from 'react';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import { addExamToBank, addQuestionToBank, getWordTemplates } from '../../api/enseignant/Enseignant.api';
import './CreateExam.css';

const tabs = ['Config', 'Sources', 'Questions', 'Modèles', 'Export'];
const sourceModes = ['Fichier', 'Texte libre', 'URL'];
const LOCAL_QUESTIONS_KEY = 'exam_create_questions';

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const readStoredQuestions = () => {
  try {
    const raw = localStorage.getItem(LOCAL_QUESTIONS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const text = String(item.text || '').trim();
        if (!text) return null;

        return {
          id: String(item.id || makeId()),
          text,
          editText: text,
          isEditing: false,
          savedToBank: Boolean(item.savedToBank),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const cmToTwip = (cmValue, fallbackCm = 2) => {
  const n = Number(cmValue);
  const cm = Number.isFinite(n) && n > 0 ? n : fallbackCm;
  return Math.round(cm * 567);
};

const TemplatePreview = ({ config }) => (
  <div className="template-preview-sheet" style={{ fontFamily: config?.police || 'Arial', fontSize: config?.taille || '11pt' }}>
    <div className="template-preview-header">{config?.universiteFr || 'Université'} - {config?.institutFr || 'Institut'}</div>
    <div className="template-preview-subheader">{config?.departementFr || 'Département'}</div>
    <div className="template-preview-title">{config?.titreExamen || 'Examen'} {config?.codeExamen || ''}</div>
    <div className="template-preview-row"><strong>Matière:</strong> {config?.matiere || '-'}</div>
    <div className="template-preview-row"><strong>Durée:</strong> {config?.duree || '-'}</div>
    <div className="template-preview-row"><strong>Année:</strong> {config?.anneeUniversitaire || '-'}</div>
    <div className="template-preview-hint">Les questions insérées seront placées sous cet en-tête lors de l'export.</div>
  </div>
);

const CreateExam = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Config');
  const [sourceMode, setSourceMode] = useState('Texte libre');
  const [sourceText, setSourceText] = useState('');
  const [questionDraft, setQuestionDraft] = useState('');
  const isQuestionDraftValid = questionDraft.trim().length > 0;
  const [questions, setQuestions] = useState(readStoredQuestions);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [sourceUrls, setSourceUrls] = useState([]);
  const [form, setForm] = useState({
    filiere: '',
    matiere: '',
    niveau: '',
    type: '',
    duree: '',
    noteTotale: '',
    titre: '',
  });
  const [configError, setConfigError] = useState('');
  const [configTouched] = useState(false);
  const [questionActionMessage, setQuestionActionMessage] = useState('');
  const [questionActionError, setQuestionActionError] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    try {
      const payload = questions.map((item) => ({
        id: item.id,
        text: item.text,
        savedToBank: Boolean(item.savedToBank),
      }));
      localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures to keep UI usable.
    }
  }, [questions]);

  useEffect(() => {
    if (!exportMessage && !exportError) return undefined;

    const timer = setTimeout(() => {
      setExportMessage('');
      setExportError('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [exportMessage, exportError]);

  useEffect(() => {
    if (!questionActionMessage && !questionActionError) return undefined;

    const timer = setTimeout(() => {
      setQuestionActionMessage('');
      setQuestionActionError('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [questionActionMessage, questionActionError]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setTemplatesLoading(true);
        setTemplatesError('');
        const data = await getWordTemplates();
        const list = Array.isArray(data) ? data : [];
        setTemplates(list);
      } catch (error) {
        setTemplatesError(error?.response?.data?.message || 'Impossible de charger les modèles');
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const onChange = (key, value) => {
    if (configError) setConfigError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSourcesBack = () => {
    setActiveTab('Config');
  };

  const handleSourcesContinue = () => {
    setActiveTab('Questions');
  };

  const insertQuestion = () => {
    const value = questionDraft.trim();
    if (!value) return;

    setQuestions((prev) => [
      ...prev,
      { id: makeId(), text: value, editText: value, isEditing: false },
    ]);
    setQuestionDraft('');
    setQuestionActionMessage('');
    setQuestionActionError('');
  };

  const addQuestionItemToBank = async (id) => {
    const target = questions.find((item) => item.id === id);
    const textToSave = String(target?.text || '').trim();

    if (!textToSave) {
      setQuestionActionError('Impossible d\'ajouter une question vide.');
      return;
    }

    try {
      await addQuestionToBank(textToSave);
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, savedToBank: true } : item
        )
      );
      setQuestionActionError('');
      setQuestionActionMessage('Question ajoutée à la banque avec succès.');
    } catch (error) {
      setQuestionActionMessage('');
      setQuestionActionError(error?.response?.data?.message || 'Erreur lors de l\'ajout de la question à la banque');
    }
  };

  const updateQuestionEdit = (id, value) => {
    setQuestions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, editText: value } : item))
    );
  };

  const saveQuestion = (id) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const clean = item.editText.trim();
        return {
          ...item,
          text: clean || item.text,
          editText: clean || item.text,
          isEditing: false,
        };
      })
    );
  };

  const startQuestionEdit = (id) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isEditing: true, editText: item.text } : item
      )
    );
  };

  const cancelQuestionEdit = (id) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, editText: item.text, isEditing: false } : item
      )
    );
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  const pageTitleByTab = {
    Config: "Creation d'examen",
    Sources: "Banque d'examens",
    Questions: 'Banque de questions',
    'Modèles': 'Choix du modèle',
    Export: 'Export',
  };

  const goToTab = (tab) => {
    setConfigError('');
    setActiveTab(tab);
  };

  const handleConfigContinue = () => {
    setConfigError('');
    setActiveTab('Sources');
  };

  const onUploadFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const mapped = files.map((file) => ({
      id: makeId(),
      file,
      selected: false,
    }));

    setUploadedFiles((prev) => [...prev, ...mapped]);
    event.target.value = '';
  };

  const removeUploadedFile = (id) => {
    setUploadedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleUploadedSelection = (id) => {
    setUploadedFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const addSourceUrl = () => {
    const value = urlInput.trim();
    if (!value) return;

    setSourceUrls((prev) => [
      ...prev,
      {
        id: makeId(),
        value,
        selected: false,
      },
    ]);
    setUrlInput('');
  };

  const removeSourceUrl = (id) => {
    setSourceUrls((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleUrlSelection = (id) => {
    setSourceUrls((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectedCount =
    uploadedFiles.filter((item) => item.selected).length +
    sourceUrls.filter((item) => item.selected).length;

  const selectedTemplate = templates.find((item) => String(item._id) === String(selectedTemplateId)) || null;
  const hasConfigData = [
    form.titre,
    form.filiere,
    form.matiere,
    form.niveau,
    form.type,
    form.duree,
    form.noteTotale,
  ].some((value) => String(value || '').trim());

  const downloadBlobAsDocx = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const blobToBase64 = async (blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunkSize = 0x8000;
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
  };

  const buildFilename = () => {
    const rawTitle = String(form.titre || '').trim() || 'examen';
    const safeTitle = rawTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    return `${safeTitle || 'examen'}_${Date.now()}.docx`;
  };

  const exportToDocx = async () => {
    try {
      const template = selectedTemplate;
      const validQuestions = questions
        .map((item) => String(item?.text || '').trim())
        .filter(Boolean);
      const questionsCount = validQuestions.length;
      const headerParagraphs = [];

      if (template) {
        const resolvedTitle = String(form.titre || '').trim() || String(template?.titreExamen || '').trim() || 'Examen';
        const resolvedCode = String(template?.codeExamen || '').trim();
        const resolvedMatiere = String(form.matiere || '').trim() || String(template?.matiere || '').trim();
        const resolvedFiliere = String(form.filiere || '').trim() || String(template?.discipline || '').trim();
        const resolvedType = String(form.type || '').trim() || String(template?.type || '').trim();
        const resolvedDuree = String(form.duree || '').trim() || String(template?.duree || '').trim();
        const resolvedNiveau = String(form.niveau || '').trim();
        const resolvedNote = String(form.noteTotale || '').trim();
        const resolvedSemestre = String(template?.semestre || '').trim();
        const resolvedAnnee = String(template?.anneeUniversitaire || '').trim();
        const resolvedDate = String(template?.dateExamen || '').trim();
        const resolvedPages = String(template?.nombrePages || '').trim();
        const resolvedDocs = String(template?.documentsAutorises || '').trim();
        const resolvedEnseignant = String(template?.enseignants || '').trim();

        const thinBorder = {
          top: { style: BorderStyle.SINGLE, size: 8, color: '1F2937' },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F2937' },
          left: { style: BorderStyle.SINGLE, size: 8, color: '1F2937' },
          right: { style: BorderStyle.SINGLE, size: 8, color: '1F2937' },
        };

        const noBorder = {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        };

        const modelHeaderTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorder,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  borders: noBorder,
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(template?.universiteFr || ''), bold: true })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(template?.institutFr || ''), bold: true })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(template?.departementFr || ''), bold: true })] }),
                  ],
                }),
                new TableCell({
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  borders: noBorder,
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(template?.universiteFr || '') })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(template?.institutFr || '') })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(template?.departementFr || '') })] }),
                  ],
                }),
                new TableCell({
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  borders: noBorder,
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'IIT', bold: true, size: 56 })] }),
                  ],
                }),
              ],
            }),
          ],
        });

        headerParagraphs.push(modelHeaderTable);
        headerParagraphs.push(
          new Paragraph({
            spacing: { before: 80, after: 140 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F2937' } },
          })
        );

        const infoLeft = [
          ['Matiere', resolvedMatiere],
          ['Discipline', resolvedFiliere],
          ['Enseignants', resolvedEnseignant],
          ['Documents', resolvedDocs],
        ].filter(([, value]) => String(value || '').trim());

        const infoRight = [
          ['Annee', resolvedAnnee],
          ['Semestre', resolvedSemestre],
          ['Date', resolvedDate],
          ['Pages', resolvedPages],
          ['Questions', String(questionsCount)],
          ['Duree', resolvedDuree],
          ['Type', resolvedType],
          ['Niveau', resolvedNiveau],
          ['Note', resolvedNote ? `${resolvedNote}/20` : ''],
        ].filter(([, value]) => String(value || '').trim());

        const examRows = [];

        examRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                borders: thinBorder,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: resolvedTitle, bold: true, size: 40 }),
                      new TextRun({ text: resolvedCode ? ` ${resolvedCode}` : '', bold: true, size: 40 }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                columnSpan: 1,
                borders: thinBorder,
                shading: { fill: '0B1730', color: 'auto' },
                children: [new Paragraph({ text: '' })],
              }),
            ],
          })
        );

        examRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                borders: thinBorder,
                children: infoLeft.map(([label, value]) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })] })),
              }),
              new TableCell({
                borders: thinBorder,
                children: infoRight.map(([label, value]) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })] })),
              }),
            ],
          })
        );

        if (template?.sections?.zoneNomPrenom || template?.sections?.zoneGroupe) {
          examRows.push(
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 2,
                  borders: thinBorder,
                  children: [
                    new Paragraph({ children: [new TextRun({ text: template?.sections?.zoneNomPrenom ? 'Nom: ________________________________' : '' })] }),
                  ],
                }),
                new TableCell({
                  borders: thinBorder,
                  children: [
                    new Paragraph({ children: [new TextRun({ text: template?.sections?.zoneGroupe ? 'Groupe: __________' : '' })] }),
                  ],
                }),
              ],
            })
          );
        }

        if (template?.sections?.blocNote || template?.sections?.blocCommentaires || template?.sections?.blocSignature) {
          examRows.push(
            new TableRow({
              children: [
                new TableCell({
                  borders: thinBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: template?.sections?.blocNote ? 'Exercice 1' : '' })] })],
                }),
                new TableCell({
                  borders: thinBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: template?.sections?.blocCommentaires ? 'Enonce...' : '' })] })],
                }),
                new TableCell({
                  borders: thinBorder,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: template?.sections?.blocSignature ? '/20' : '' })] })],
                }),
              ],
            })
          );
        }

        const modelMainTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: examRows,
        });

        headerParagraphs.push(modelMainTable);

        if (template?.sections?.blocRemarques) {
          headerParagraphs.push(
            new Paragraph({
              spacing: { before: 100, after: 100 },
              children: [new TextRun({ text: 'Remarques: Le bareme est indicatif. Ordinateurs et Internet non autorises.', italics: true })],
            })
          );
        }
      } else if (hasConfigData) {
        const configTitle = String(form.titre || '').trim() || 'Examen';
        const configEntries = [
          ['Filiere', form.filiere],
          ['Matiere', form.matiere],
          ['Niveau', form.niveau],
          ['Type', form.type],
          ['Duree', form.duree],
          ['Note totale', form.noteTotale],
        ].filter(([, value]) => String(value || '').trim());

        headerParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 220 },
            children: [new TextRun({ text: configTitle, bold: true, size: 34 })],
            heading: HeadingLevel.HEADING_1,
          })
        );

        configEntries.forEach(([label, value]) => {
          headerParagraphs.push(
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({ text: `${label}: `, bold: true }),
                new TextRun({ text: String(value).trim() }),
              ],
            })
          );
        });
      }

      const questionsParagraphs = [];

      if (template || hasConfigData) {
        questionsParagraphs.push(
          new Paragraph({
            text: 'Questions',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 320, after: 180 },
          })
        );
      }

      if (!questionsCount) {
        questionsParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: 'Aucune question inseree.', italics: true })],
          })
        );
      } else {
        validQuestions.forEach((questionTextValue, index) => {
          const questionText = `Question ${index + 1}: ${questionTextValue}`;

          questionsParagraphs.push(
            new Paragraph({
              spacing: { after: 140 },
              children: [new TextRun({ text: questionText })],
            })
          );
        });
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: cmToTwip(template?.margeV, 2),
                  right: cmToTwip(template?.margeH, 2),
                  bottom: cmToTwip(template?.margeV, 2),
                  left: cmToTwip(template?.margeH, 2),
                },
              },
            },
            children: [...headerParagraphs, ...questionsParagraphs],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const filename = buildFilename();
      downloadBlobAsDocx(blob, filename);

      try {
        const fileContentBase64 = await blobToBase64(blob);
        await addExamToBank({
          title:
            String(form.titre || '').trim() ||
            String(selectedTemplate?.titreExamen || '').trim() ||
            'Examen',
          filiere: String(form.filiere || '').trim(),
          matiere: String(form.matiere || '').trim(),
          niveau: String(form.niveau || '').trim(),
          type: String(form.type || '').trim(),
          duree: String(form.duree || '').trim(),
          noteTotale: Number(form.noteTotale) || 0,
          questionsCount,
          status: 'Exporte',
          fileName: filename,
          fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileContentBase64,
        });
        setExportError('');
        setExportMessage('Fichier .docx exporte et sauvegarde dans la banque d\'examens.');
      } catch {
        setExportMessage('');
        setExportError('Fichier telecharge, mais sauvegarde en banque d\'examens echouee.');
      }
    } catch {
      setExportMessage('');
      setExportError('Erreur lors de la generation du fichier .docx');
    }
  };

  const handleGoToExport = async () => {
    setActiveTab('Export');
    await exportToDocx();
  };

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
          <h1>{pageTitleByTab[activeTab] || "Creation d'examen"}</h1>
          <button className="exam-btn-logout" type="button" onClick={logout}>Se deconnecter</button>
        </header>

        <div className="exam-tabs" role="tablist" aria-label="Etapes creation examen">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`exam-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => goToTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Config' && (
          <section className="exam-card">
            <h2>Configuration de l'examen</h2>

            <div className="exam-form-grid">
              <label className="exam-field">
                Filiere
                <input
                  value={form.filiere}
                  placeholder="informatique"
                  className={configTouched && !String(form.filiere).trim() ? 'exam-input-error' : ''}
                  onChange={(e) => onChange('filiere', e.target.value)}
                />
              </label>

              <label className="exam-field">
                Matiere
                <input
                  value={form.matiere}
                  placeholder="algorithme"
                  className={configTouched && !String(form.matiere).trim() ? 'exam-input-error' : ''}
                  onChange={(e) => onChange('matiere', e.target.value)}
                />
              </label>

              <label className="exam-field">
                Niveau
                <input
                  value={form.niveau}
                  placeholder="L2"
                  className={configTouched && !String(form.niveau).trim() ? 'exam-input-error' : ''}
                  onChange={(e) => onChange('niveau', e.target.value)}
                />
              </label>

              <label className="exam-field">
                Type
                <input
                  value={form.type}
                  placeholder="partiel"
                  className={configTouched && !String(form.type).trim() ? 'exam-input-error' : ''}
                  onChange={(e) => onChange('type', e.target.value)}
                />
              </label>

              <label className="exam-field">
                Duree
                <input
                  value={form.duree}
                  placeholder="1H30"
                  className={configTouched && !String(form.duree).trim() ? 'exam-input-error' : ''}
                  onChange={(e) => onChange('duree', e.target.value)}
                />
              </label>

              <label className="exam-field">
                Note totale
                <input
                  value={form.noteTotale}
                  placeholder="20"
                  className={configTouched && !String(form.noteTotale).trim() ? 'exam-input-error' : ''}
                  onChange={(e) => onChange('noteTotale', e.target.value)}
                />
              </label>
            </div>

            <label className="exam-title-field">
              Titre de l'examen
              <input
                value={form.titre}
                placeholder="EXAMEN algorithme"
                className={configTouched && !String(form.titre).trim() ? 'exam-input-error' : ''}
                onChange={(e) => onChange('titre', e.target.value)}
              />
            </label>

            {configError && <p className="exam-config-error">{configError}</p>}

            <div className="exam-actions">
              <button type="button" className="exam-btn-secondary">Annuler</button>
              <button type="button" className="exam-btn-primary" onClick={handleConfigContinue}>Continuer</button>
            </div>
          </section>
        )}

        {activeTab === 'Sources' && (
          <section className="exam-card">
            <h2 className="sources-title">Gestion des sources</h2>

            <div className="sources-mode-tabs" role="tablist" aria-label="Mode source">
              {sourceModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`sources-mode-tab ${sourceMode === mode ? 'active' : ''}`}
                  onClick={() => setSourceMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            {sourceMode === 'Texte libre' && (
              <>
                <label className="sources-label" htmlFor="source-text">Texte libre</label>
                <textarea
                  id="source-text"
                  className="sources-textarea"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Ecrire ici le texte source de votre choix..."
                />
              </>
            )}

            {sourceMode === 'Fichier' && (
              <>
                <div className="sources-upload-row">
                  <label className="sources-upload-btn" htmlFor="source-files">
                    Ajouter des fichiers
                  </label>
                  <input
                    id="source-files"
                    className="sources-file-input"
                    type="file"
                    multiple
                    onChange={onUploadFiles}
                  />
                  <span className="sources-upload-help">
                    Tous types acceptés (.pdf, .docx, .txt, .png, .zip, etc.)
                  </span>
                </div>

                {uploadedFiles.length === 0 ? (
                  <div className="sources-placeholder">Aucun fichier uploadé.</div>
                ) : (
                  <ul className="sources-list">
                    {uploadedFiles.map((item) => (
                      <li key={item.id} className="sources-item">
                        <label className="sources-item-select">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleUploadedSelection(item.id)}
                          />
                          <span>
                            {item.file.name}
                            <small>{`${formatFileSize(item.file.size)}${item.file.type ? ` - ${item.file.type}` : ''}`}</small>
                          </span>
                        </label>

                        <button
                          type="button"
                          className="sources-delete-btn"
                          onClick={() => removeUploadedFile(item.id)}
                        >
                          Supprimer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {sourceMode === 'URL' && (
              <>
                <div className="sources-url-row">
                  <input
                    type="text"
                    className="sources-url-input"
                    placeholder="https://exemple.com/document"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <button type="button" className="sources-add-btn" onClick={addSourceUrl}>
                    Ajouter URL
                  </button>
                </div>

                {sourceUrls.length === 0 ? (
                  <div className="sources-placeholder">Aucune URL ajoutée.</div>
                ) : (
                  <ul className="sources-list">
                    {sourceUrls.map((item) => (
                      <li key={item.id} className="sources-item">
                        <label className="sources-item-select">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleUrlSelection(item.id)}
                          />
                          <span>{item.value}</span>
                        </label>

                        <button
                          type="button"
                          className="sources-delete-btn"
                          onClick={() => removeSourceUrl(item.id)}
                        >
                          Supprimer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <p className="sources-selection-info">
              Ressources sélectionnées: <strong>{selectedCount}</strong> (vous pouvez laisser aucune ressource sélectionnée).
            </p>

            <div className="exam-actions">
              <button type="button" className="exam-btn-secondary" onClick={handleSourcesBack}>Retour</button>
              <button type="button" className="exam-btn-primary" onClick={handleSourcesContinue}>Continuer</button>
            </div>
          </section>
        )}

        {activeTab === 'Questions' && (
          <section className="exam-card">
            <h2 className="sources-title">Zone de questions</h2>
            <p className="questions-help">Vous êtes maintenant dans la zone de questions. Ajoutez vos questions ici.</p>

            <label className="sources-label" htmlFor="question-draft">Question</label>
            <textarea
              id="question-draft"
              className="sources-textarea"
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              placeholder="Ex: Expliquez la complexite temporelle de l'algorithme BFS."
            />
            {!isQuestionDraftValid && (
              <p className="questions-validation">Veuillez écrire une question avant l'insertion.</p>
            )}

            <div className="questions-list-block">
              <h3 className="questions-list-title">Questions inserees ({questions.length})</h3>

              {questions.length === 0 ? (
                <p className="questions-empty">Aucune question inseree pour le moment.</p>
              ) : (
                <ul className="questions-list">
                  {questions.map((item, index) => (
                    <li key={item.id} className="question-item">
                      <span className="question-chip">Q{index + 1}</span>
                      {item.isEditing ? (
                        <textarea
                          className="question-item-textarea"
                          value={item.editText}
                          onChange={(e) => updateQuestionEdit(item.id, e.target.value)}
                        />
                      ) : (
                        <div className="question-item-text">{item.text}</div>
                      )}
                      <div className="question-item-actions">
                        {!item.isEditing && (
                          <button type="button" className="question-link-btn" onClick={() => startQuestionEdit(item.id)}>Modifier</button>
                        )}
                        {item.isEditing && (
                          <button type="button" className="question-link-btn" onClick={() => saveQuestion(item.id)}>Enregistrer</button>
                        )}
                        {item.isEditing && (
                          <button type="button" className="question-link-btn" onClick={() => cancelQuestionEdit(item.id)}>Annuler</button>
                        )}
                        {!item.isEditing && !item.savedToBank && (
                          <button type="button" className="question-link-btn" onClick={() => addQuestionItemToBank(item.id)}>Ajouter a la banque</button>
                        )}
                        {item.savedToBank && (
                          <span className="question-saved-badge">Ajoutée à la banque</span>
                        )}
                        <button type="button" className="question-link-btn danger" onClick={() => deleteQuestion(item.id)}>Supprimer</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {questionActionMessage && <p className="question-action-success">{questionActionMessage}</p>}
            {questionActionError && <p className="question-action-error">{questionActionError}</p>}

            <div className="exam-actions">
              <button
                type="button"
                className="exam-btn-primary"
                onClick={insertQuestion}
                disabled={!isQuestionDraftValid}
              >
                Inserer la question
              </button>
              <button type="button" className="exam-btn-secondary" onClick={() => setActiveTab('Modèles')}>Choisir un modele</button>
            </div>
          </section>
        )}

        {activeTab === 'Modèles' && (
          <section className="exam-card">
            <h2 className="sources-title">Choisir un modèle admin</h2>
            <p className="sources-selection-info">Sélectionnez un modèle, visualisez l'aperçu, puis exportez votre examen avec ce modèle et vos questions.</p>

            {templatesLoading ? (
              <div className="sources-placeholder">Chargement des modèles...</div>
            ) : templatesError ? (
              <div className="exam-config-error">{templatesError}</div>
            ) : templates.length === 0 ? (
              <div className="sources-placeholder">Aucun modèle disponible pour le moment.</div>
            ) : (
              <ul className="sources-list">
                <li className="sources-item">
                  <label className="sources-item-select">
                    <input
                      type="radio"
                      name="selected-template"
                      checked={!selectedTemplateId}
                      onChange={() => setSelectedTemplateId('')}
                    />
                    <span>
                      <strong>Sans modèle</strong>
                      <small>Exporter avec la configuration si remplie, sinon uniquement les questions.</small>
                    </span>
                  </label>
                </li>

                {templates.map((template) => (
                  <li key={template._id} className="sources-item">
                    <label className="sources-item-select">
                      <input
                        type="radio"
                        name="selected-template"
                        checked={String(selectedTemplateId) === String(template._id)}
                        onChange={() => setSelectedTemplateId(String(template._id))}
                      />
                      <span>
                        <strong>{template.nom || 'Modèle sans nom'}</strong>
                        <small>{`${template.langue || '-'} | ${template.type || '-'}`}</small>
                      </span>
                    </label>

                    <button
                      type="button"
                      className="sources-add-btn"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      Aperçu
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="exam-actions">
              <button type="button" className="exam-btn-secondary" onClick={() => setActiveTab('Questions')}>Retour</button>
              <button type="button" className="exam-btn-primary" onClick={handleGoToExport}>Aller a Export</button>
            </div>
          </section>
        )}

        {activeTab === 'Export' && (
          <section className="exam-card">
            <h2 className="sources-title">Export .docx</h2>
            <p className="sources-selection-info">
              Cliquez pour telecharger un fichier .docx contenant les questions inserees et les champs de configuration remplis.
            </p>

            {exportMessage && <p className="question-action-success">{exportMessage}</p>}
            {exportError && <p className="question-action-error">{exportError}</p>}

            <div className="exam-actions">
              <button type="button" className="exam-btn-secondary" onClick={() => setActiveTab('Questions')}>Retour</button>
              <button type="button" className="exam-btn-primary" onClick={exportToDocx}>Telecharger le .docx</button>
            </div>
          </section>
        )}
      </main>

      {previewTemplate && (
        <div className="preview-modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {previewTemplate.nom}</div>
              <button className="preview-modal-close" onClick={() => setPreviewTemplate(null)}>✕</button>
            </div>
            <div className="preview-modal-content">
              <TemplatePreview config={previewTemplate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateExam;
