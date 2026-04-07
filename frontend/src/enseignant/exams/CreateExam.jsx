import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } from 'docx';
import { useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import { addQuestionToBank, addExamToBank, getExamBank, getExamBankItem, getFilteredExams, getFilteredQuestions, copyQuestionBankItem, copyExamBankItem, getWordTemplates } from '../../api/enseignant/Enseignant.api';
import './CreateExam.css';

const tabs = ['Bibliothèque', 'Modèles', 'Questions', 'Export'];
// const sourceModes = ['Fichier', 'Texte libre', 'URL']; // For future Sources tab implementation
const LOCAL_QUESTIONS_KEY = 'exam_create_questions';

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const readStoredQuestions = () => {
  try {
    const raw = localStorage.getItem(LOCAL_QUESTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object').map((item) => {
      const text = String(item.text || '').trim();
      if (!text) return null;
      return { id: String(item.id || makeId()), text, editText: text, isEditing: false, savedToBank: Boolean(item.savedToBank), selected: item.selected !== false };
    }).filter(Boolean);
  } catch {
    return [];
  }
};

const CreateExam = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('Bibliothèque');
  const [filter, setFilter] = useState({
    matiere: '',
    niveau: '',
    annee: '',
  });
  const [mesExamens, setMesExamens] = useState([]);
  const [autresExamens, setAutresExamens] = useState([]);
  const [mesQuestions, setMesQuestions] = useState([]);
  const [autresQuestions, setAutresQuestions] = useState([]);
  const [filteredMesExamens, setFilteredMesExamens] = useState([]);
  const [filteredAutresExamens, setFilteredAutresExamens] = useState([]);
  const [filteredMesQuestions, setFilteredMesQuestions] = useState([]);
  const [filteredAutresQuestions, setFilteredAutresQuestions] = useState([]);
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(true);

  // For future Sources tab implementation
  // const [sourceMode, setSourceMode] = useState('Texte libre');
  // const [sourceText, setSourceText] = useState('');
  // const [uploadedFiles, setUploadedFiles] = useState([]);
  // const [urlInput, setUrlInput] = useState('');
  // const [sourceUrls, setSourceUrls] = useState([]);

  const [questions, setQuestions] = useState(readStoredQuestions());
  const [questionDraft, setQuestionDraft] = useState('');
  const isQuestionDraftValid = questionDraft.trim().length > 0;
  
  // Exam form configuration
  const [examForm, setExamForm] = useState({
    titre: '',
    filiere: '',
    matiere: '',
    niveau: '',
    type: '',
    duree: '',
    noteTotale: '',
    statut: 'Brouillon',
    templateId: null,
  });
  
  // For Modèles tab - templates list
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);

  // Load all exams and questions on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Load exams
        console.log('[DATA-LOAD] Fetching exams from MongoDB...');
        const examsData = await getExamBank();
        console.log('[EXAMS] Raw backend response:', examsData);

        // Load questions
        console.log('[DATA-LOAD] Fetching questions from MongoDB...');
        const questionsData = await getFilteredQuestions('', '', '');
        console.log('[QUESTIONS] Raw backend response:', questionsData);

        // Load templates
        let templatesData = [];
        try {
          templatesData = await getWordTemplates();
          console.log('[TEMPLATES] Raw response:', templatesData);
        } catch (templateErr) {
          console.error('[TEMPLATES] Error loading templates:', templateErr);
          templatesData = [];
        }

        // Normalize exams data with defensive checks
        const mesExamsArray = Array.isArray(examsData?.mesExamens) 
          ? examsData.mesExamens.filter(e => e && typeof e === 'object')
          : [];
        const autresExamsArray = Array.isArray(examsData?.autresExamens)
          ? examsData.autresExamens.filter(e => e && typeof e === 'object')
          : [];
        
        console.log('[EXAMS] Processed - Mine:', mesExamsArray.length, 'Others:', autresExamsArray.length);

        // Normalize questions data with defensive checks
        const mesQuestionsArray = Array.isArray(questionsData?.mesQuestions)
          ? questionsData.mesQuestions.filter(q => q && typeof q === 'object')
          : [];
        const autresQuestionsArray = Array.isArray(questionsData?.autresQuestions)
          ? questionsData.autresQuestions.filter(q => q && typeof q === 'object')
          : [];

        console.log('[QUESTIONS] Processed - Mine:', mesQuestionsArray.length, 'Others:', autresQuestionsArray.length);

        // Normalize templates data
        let templatesArray = [];
        if (Array.isArray(templatesData)) {
          templatesArray = templatesData.filter(t => t && typeof t === 'object');
        } else if (templatesData && typeof templatesData === 'object') {
          if (Array.isArray(templatesData.data)) {
            templatesArray = templatesData.data.filter(t => t && typeof t === 'object');
          } else if (Array.isArray(templatesData.templates)) {
            templatesArray = templatesData.templates.filter(t => t && typeof t === 'object');
          }
        }

        console.log('[TEMPLATES] Normalized count:', templatesArray.length);

        // Update state
        setMesExamens(mesExamsArray);
        setAutresExamens(autresExamsArray);
        setMesQuestions(mesQuestionsArray);
        setAutresQuestions(autresQuestionsArray);
        setFilteredMesExamens(mesExamsArray);
        setFilteredAutresExamens(autresExamsArray);
        setFilteredMesQuestions(mesQuestionsArray);
        setFilteredAutresQuestions(autresQuestionsArray);
        setAllTemplates(templatesArray);

        // Display summary message
        const examCount = mesExamsArray.length + autresExamsArray.length;
        const questionCount = mesQuestionsArray.length + autresQuestionsArray.length;
        
        console.log('[DATA-LOAD] Complete - Exams:', examCount, 'Questions:', questionCount);

        if (examCount === 0 && questionCount === 0) {
          setSuccessMessage('Aucun examen ou question trouvé.');
        } else {
          setSuccessMessage(`${examCount} examen(s) et ${questionCount} question(s) dans la base de données.`);
        }
      } catch (err) {
        console.error('[DATA-LOAD] Error:', err);
        const errorMsg = err?.response?.data?.message || err?.message || 'Erreur lors du chargement des données';
        setError(errorMsg);
        setFilteredMesExamens([]);
        setFilteredAutresExamens([]);
        setFilteredMesQuestions([]);
        setFilteredAutresQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  // Handle loading a copied exam for editing
  useEffect(() => {
    const loadCopiedExam = async () => {
      const params = new URLSearchParams(location.search);
      const examIdToEdit = params.get('editExam');
      
      if (!examIdToEdit || editingExamId) return;
      
      console.log('[LOAD-COPIED-EXAM] Loading exam ID:', examIdToEdit);
      
      try {
        // Fetch the exam from the API
        const response = await getExamBankItem(examIdToEdit);
        const examToEdit = response.exam;
        
        if (!examToEdit) {
          console.error('[LOAD-COPIED-EXAM] Exam not found in response');
          setError('Examen introuvable');
          return;
        }
        
        console.log('[LOAD-COPIED-EXAM] Loaded exam:', examToEdit);
        setEditingExamId(examIdToEdit);
        
        // Populate exam form with the loaded exam data
        setExamForm({
          titre: examToEdit.title || '',
          filiere: examToEdit.filiere || '',
          matiere: examToEdit.matiere || '',
          niveau: examToEdit.niveau || '',
          type: examToEdit.type || '',
          duree: examToEdit.duree || '',
          noteTotale: String(examToEdit.noteTotale || ''),
          statut: examToEdit.status || 'Brouillon',
          templateId: examToEdit.templateId || null,
        });
        
        // Clear previous questions and let user add new ones
        setQuestions([]);
        localStorage.removeItem(LOCAL_QUESTIONS_KEY);
        
        // Switch to Questions tab for editing
        setActiveTab('Questions');
        
        // Show success message
        setSuccessMessage(`Examen "${examToEdit.title}" chargé pour modification. Vous pouvez maintenant ajouter des questions.`);
      } catch (err) {
        console.error('[LOAD-COPIED-EXAM] Error:', err);
        setError('Erreur lors du chargement de l\'examen');
      }
    };
    
    loadCopiedExam();
  }, [location]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleFilterChange = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleFilterSearch = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      console.log('[FILTER] Searching with:', { matiere: filter.matiere, niveau: filter.niveau, annee: filter.annee });

      const [examsData, questionsData] = await Promise.all([
        getFilteredExams(filter.matiere, filter.niveau, filter.annee),
        getFilteredQuestions(filter.matiere, filter.niveau, filter.annee),
      ]);

      console.log('[FILTER] Exams response:', examsData);
      console.log('[FILTER] Questions response:', questionsData);

      // Normalize filtered exams
      const mesExamsArray = Array.isArray(examsData?.mesExamens)
        ? examsData.mesExamens.filter(e => e && typeof e === 'object')
        : [];
      const autresExamsArray = Array.isArray(examsData?.autresExamens)
        ? examsData.autresExamens.filter(e => e && typeof e === 'object')
        : [];

      // Normalize filtered questions
      const mesQuestionsArray = Array.isArray(questionsData?.mesQuestions)
        ? questionsData.mesQuestions.filter(q => q && typeof q === 'object')
        : [];
      const autresQuestionsArray = Array.isArray(questionsData?.autresQuestions)
        ? questionsData.autresQuestions.filter(q => q && typeof q === 'object')
        : [];

      console.log('[FILTER] Results - Exams:', mesExamsArray.length + autresExamsArray.length, 'Questions:', mesQuestionsArray.length + autresQuestionsArray.length);

      setFilteredMesExamens(mesExamsArray);
      setFilteredAutresExamens(autresExamsArray);
      setFilteredMesQuestions(mesQuestionsArray);
      setFilteredAutresQuestions(autresQuestionsArray);
      setHasSearched(true);

      const examCount = mesExamsArray.length + autresExamsArray.length;
      const questionCount = mesQuestionsArray.length + autresQuestionsArray.length;

      if (examCount === 0 && questionCount === 0) {
        setSuccessMessage('Aucun examen ou question trouvé avec ces critères.');
      } else {
        setSuccessMessage(`${examCount} examen(s) et ${questionCount} question(s) trouvé(s) selon les critères.`);
      }
    } catch (err) {
      console.error('[FILTER] Error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Erreur lors de la recherche';
      setError(errorMsg);
      setFilteredMesExamens([]);
      setFilteredAutresExamens([]);
      setFilteredMesQuestions([]);
      setFilteredAutresQuestions([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterReset = () => {
    console.log('[RESET] Resetting filters to all data');
    setFilter({ matiere: '', niveau: '', annee: '' });
    setFilteredMesExamens(mesExamens);
    setFilteredAutresExamens(autresExamens);
    setFilteredMesQuestions(mesQuestions);
    setFilteredAutresQuestions(autresQuestions);
    setError('');
    setSuccessMessage('');
    setHasSearched(true);
    console.log('[RESET] Data reset complete - Exams:', mesExamens.length + autresExamens.length, 'Questions:', mesQuestions.length + autresQuestions.length);
  };

  const insertQuestion = async () => {
    const value = questionDraft.trim();
    if (!value) return;
    
    try {
      setIsSavingQuestion(true);
      // Save to bank automatically
      await addQuestionToBank(value);
      
      // Add to local state with savedToBank flag already true
      setQuestions((prev) => [...prev, { id: makeId(), text: value, editText: value, isEditing: false, savedToBank: true, selected: true }]);
      setQuestionDraft('');
    } catch (err) {
      console.error('Error saving question:', err);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const updateQuestionEdit = (id, value) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, editText: value } : item)));
  };

  const saveQuestion = (id) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const clean = item.editText.trim();
        return { ...item, text: clean || item.text, editText: clean || item.text, isEditing: false };
      })
    );
  };

  // Auto-save question when editing is turned off
  useEffect(() => {
    const timer = setTimeout(() => {
      // Sauvegarder automatiquement les questions
      const questionsToSave = questions.filter(q => q.text && q.text.trim());
      if (questionsToSave.length > 0) {
        localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(questionsToSave));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [questions]);

  const startQuestionEdit = (id) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, isEditing: true, editText: item.text } : item)));
  };

  const cancelQuestionEdit = (id) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, editText: item.text, isEditing: false } : item)));
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  const addQuestionItemToBank = async (id) => {
    const target = questions.find((item) => item.id === id);
    const textToSave = String(target?.text || '').trim();
    if (!textToSave) return;
    try {
      await addQuestionToBank(textToSave);
      setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, savedToBank: true } : item)));
    } catch (err) {
      console.error('Error adding question to bank:', err);
    }
  };

  const handleCopyQuestion = async (questionId) => {
    try {
      const result = await copyQuestionBankItem(questionId);
      setQuestions((prev) => [...prev, { 
        id: result.question.id, 
        text: result.question.text, 
        editText: result.question.text, 
        isEditing: false,
        savedToBank: true,
        selected: true,
        copiedFrom: result.question.createdByName
      }]);
      setSuccessMessage(`Question copiée de ${result.question.createdByName}`);
    } catch (err) {
      console.error('Error copying question:', err);
      setError('Erreur lors de la copie de la question');
    }
  };

  const handleCopyExam = async (examId) => {
    try {
      console.log('[COPY-EXAM] Copying exam:', examId);
      
      const result = await copyExamBankItem(examId);
      console.log('[COPY-EXAM] Copy result:', result);
      
      // Extract copy exam ID from result
      const copiedExamId = result.exam?.id || result.exam?._id || result.exam?.ID;
      if (!copiedExamId) {
        setError('Erreur: Impossible d\'obtenir l\'ID de la copie');
        return;
      }

      console.log('[COPY-EXAM] Opening copied exam in new tab:', copiedExamId);
      
      // Open the copied exam in a NEW tab for editing
      const newTabUrl = `/enseignant/exams/create?editExam=${copiedExamId}`;
      window.open(newTabUrl, '_blank');
      
      // Show success message on current page
      setSuccessMessage(`Examen de ${result.exam?.createdByName} copié avec succès. S'ouvre dans un nouvel onglet...`);
    } catch (err) {
      console.error('[COPY-EXAM] Error:', err);
      setError('Erreur lors de la copie de l\'examen');
    }
  };

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

  const handleExamFormChange = (field, value) => {
    setExamForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplate(selectedTemplate === templateId ? null : templateId);
    setExamForm((prev) => ({
      ...prev,
      templateId: selectedTemplate === templateId ? null : templateId,
    }));
  };

  const finishAndSaveExam = async () => {
    try {
      const titre = examForm.titre.trim();
      if (!titre) {
        setExportError('Le titre de l\'examen est requis');
        return;
      }
      if (questions.length === 0) {
        setExportError('Veuillez ajouter au moins une question');
        return;
      }

      setIsSavingExam(true);
      setExportError('');
      setExportMessage('Sauvegarde de l\'examen en cours...');

      console.log('[SAVE-EXAM] Starting exam save with', questions.length, 'questions');
      console.log('[SAVE-EXAM] Exam form:', examForm);

      // Get valid questions (only selected ones)
      const validQuestions = questions
        .filter((item) => item.selected !== false)  // Inclure seulement les cochées
        .map((item) => String(item?.text || '').trim())
        .filter(Boolean);
      
      console.log('[SAVE-EXAM] Valid questions count:', validQuestions.length, 'Total questions:', questions.length);

      // Get selected template if any
      const selectedTemplateData = examForm.templateId 
        ? allTemplates.find(t => t._id === examForm.templateId)
        : null;
      
      console.log('[SAVE-EXAM] Selected template:', selectedTemplateData);

      const docChildren = [];

      if (selectedTemplateData) {
        console.log('[SAVE-EXAM] Building professional document with template styling');
        
        // === HEADER WITH INSTITUTIONAL INFO ===
        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        text: String(selectedTemplateData.universiteFr || '').trim(),
                        bold: true,
                        alignment: 'center',
                        size: 20,
                      }),
                      new Paragraph({
                        text: String(selectedTemplateData.institutFr || '').trim(),
                        bold: true,
                        alignment: 'center',
                        size: 18,
                      }),
                      new Paragraph({
                        text: String(selectedTemplateData.departementFr || '').trim(),
                        bold: true,
                        alignment: 'center',
                        size: 18,
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        text: 'IIT',
                        bold: true,
                        alignment: 'center',
                        size: 48,
                        spacing: { before: 200, after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );

        // Horizontal separator
        docChildren.push(
          new Paragraph({
            text: '═'.repeat(100),
            alignment: 'center',
            spacing: { before: 100, after: 200 },
          })
        );

        // === MAIN EXAM TABLE ===
        const examTypeLabel = selectedTemplateData.type === 'final' ? 'FINAL'
          : selectedTemplateData.type === 'cc' ? 'CC'
          : selectedTemplateData.type === 'rattrapage' ? 'RATTRAPAGE'
          : 'TP';

        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Title row with type code
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    shading: { fill: 'FFFFFF' },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                    },
                    children: [
                      new Paragraph({
                        text: `${String(selectedTemplateData.titreExamen || 'DEVOIR SURVEILLÉ').toUpperCase()} ${String(selectedTemplateData.codeExamen || examTypeLabel).toUpperCase()}`,
                        bold: true,
                        size: 32,
                        alignment: 'center',
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: '1a1a1a' },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                    },
                    children: [
                      new Paragraph({
                        text: '',
                      }),
                    ],
                  }),
                ],
              }),
              // Details row
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                    },
                    children: [
                      // Details in columns
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              // Left column
                              new TableCell({
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE },
                                },
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Matière : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: examForm.matiere.trim(), size: 22 }),
                                    ],
                                  }),
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Discipline : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: examForm.filiere.trim(), size: 22 }),
                                    ],
                                    spacing: { before: 100 },
                                  }),
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Enseignants : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: user?.Prenom + ' ' + user?.Nom || 'Enseignant', size: 22 }),
                                    ],
                                    spacing: { before: 100 },
                                  }),
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Documents : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: 'Autorisés selon instructions', size: 22 }),
                                    ],
                                    spacing: { before: 100 },
                                  }),
                                ],
                              }),
                              // Right column
                              new TableCell({
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE },
                                },
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Année : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1), size: 22 }),
                                    ],
                                  }),
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Niveau : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: examForm.niveau.trim(), size: 22 }),
                                    ],
                                    spacing: { before: 100 },
                                  }),
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Date : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: new Date().toLocaleDateString('fr-FR'), size: 22 }),
                                    ],
                                    spacing: { before: 100 },
                                  }),
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Durée : ', bold: true, color: '0066cc', size: 22 }),
                                      new TextRun({ text: examForm.duree.trim() + ' min', size: 22 }),
                                    ],
                                    spacing: { before: 100 },
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              // Student info and questions area
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 300, bottom: 300, left: 200, right: 200 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                      right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                    },
                    children: [
                      // Student name and group row
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE },
                                },
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Nom : ', bold: true }),
                                      new TextRun({ text: '_'.repeat(45) }),
                                    ],
                                  }),
                                ],
                              }),
                              new TableCell({
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE },
                                },
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun({ text: 'Groupe : ', bold: true }),
                                      new TextRun({ text: '_'.repeat(35) }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),

                      // Questions/Exercises table
                      new Paragraph({
                        text: '',
                        spacing: { before: 200, after: 200 },
                      }),

                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: validQuestions.map((q, i) => {
                          const pointsPerQuestion = examForm.noteTotale ? Math.ceil(Number(examForm.noteTotale) / validQuestions.length) : 20;
                          
                          return new TableRow({
                            children: [
                              // Exercise number column
                              new TableCell({
                                width: { size: 20, type: WidthType.PERCENTAGE },
                                margins: { top: 150, bottom: 150, left: 150, right: 150 },
                                borders: {
                                  top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                },
                                children: [
                                  new Paragraph({
                                    text: `Exercice ${i + 1}`,
                                    bold: true,
                                    alignment: 'center',
                                    size: 20,
                                  }),
                                ],
                              }),

                              // Question text column
                              new TableCell({
                                width: { size: 55, type: WidthType.PERCENTAGE },
                                margins: { top: 150, bottom: 150, left: 150, right: 150 },
                                borders: {
                                  top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                },
                                children: [
                                  new Paragraph({
                                    text: q,
                                    alignment: 'left',
                                    size: 18,
                                  }),
                                ],
                              }),

                              // Points column
                              new TableCell({
                                width: { size: 25, type: WidthType.PERCENTAGE },
                                margins: { top: 150, bottom: 150, left: 150, right: 150 },
                                borders: {
                                  top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                  right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
                                },
                                children: [
                                  new Paragraph({
                                    text: `/${pointsPerQuestion}`,
                                    bold: true,
                                    alignment: 'center',
                                    size: 20,
                                  }),
                                ],
                              }),
                            ],
                          });
                        }),
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
      } else {
        // Simple document without template
        docChildren.push(
          new Paragraph({
            text: titre,
            bold: true,
            size: 32,
            alignment: 'center',
            spacing: { before: 200, after: 200 },
          })
        );

        docChildren.push(
          new Paragraph({
            text: `Matière: ${examForm.matiere.trim()}`,
            spacing: { line: 240, lineRule: 'auto', before: 100 },
          })
        );

        docChildren.push(
          new Paragraph({
            text: `Niveau: ${examForm.niveau.trim()}`,
            spacing: { line: 240, lineRule: 'auto' },
          })
        );

        docChildren.push(
          new Paragraph({
            text: `Durée: ${examForm.duree.trim()} minutes`,
            spacing: { line: 240, lineRule: 'auto' },
          })
        );

        docChildren.push(
          new Paragraph({
            text: '\nQuestions',
            bold: true,
            size: 24,
            spacing: { before: 200, after: 100 },
          })
        );

        validQuestions.forEach((q, i) => {
          docChildren.push(
            new Paragraph({
              text: `Question ${i + 1}: ${q}`,
              spacing: { line: 240, lineRule: 'auto', after: 100 },
            })
          );
        });
      }

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const fileContentBase64 = btoa(String.fromCharCode.apply(null, uint8Array));
      const filename = `${titre.replace(/\s+/g, '_')}_${Date.now()}.docx`;

      console.log('[SAVE-EXAM] Generated filename:', filename);
      console.log('[SAVE-EXAM] File size (Base64):', fileContentBase64.length, 'bytes');

      // Save exam to database
      const payload = {
        title: titre,
        filiere: examForm.filiere.trim(),
        matiere: examForm.matiere.trim(),
        niveau: examForm.niveau.trim(),
        type: examForm.type.trim(),
        duree: examForm.duree.trim(),
        noteTotale: Number(examForm.noteTotale) || 0,
        questionsCount: validQuestions.length,
        status: examForm.statut,
        fileName: filename,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileContentBase64,
        anneeUniversitaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        ...(examForm.templateId && { templateId: examForm.templateId }),
      };

      console.log('[SAVE-EXAM] Saving payload to MongoDB:', {
        title: payload.title,
        filiere: payload.filiere,
        matiere: payload.matiere,
        niveau: payload.niveau,
        questionsCount: payload.questionsCount,
        status: payload.status,
        templateId: payload.templateId || 'none',
        anneeUniversitaire: payload.anneeUniversitaire,
      });

      const saveResult = await addExamToBank(payload);
      console.log('[SAVE-EXAM] Save result:', saveResult);

      // Download the file
      downloadBlobAsDocx(blob, filename);
      
      const templateInfo = selectedTemplateData ? ` avec le modèle "${selectedTemplateData.nom}"` : '';
      setExportMessage(`Examen "${titre}" sauvegardé${templateInfo} avec le statut "${examForm.statut}", ${validQuestions.length} question(s) enregistrée(s) et fichier téléchargé avec succès!`);
      
      // Reset form after successful save
      setTimeout(() => {
        console.log('[SAVE-EXAM] Resetting form and questions...');
        setExamForm({
          titre: '',
          filiere: '',
          matiere: '',
          niveau: '',
          type: '',
          duree: '',
          noteTotale: '',
          statut: 'Brouillon',
          templateId: null,
        });
        setQuestions([]);
        setSelectedTemplate(null);
        setExportError('');
        setExportMessage('');
      }, 3000);
    } catch (err) {
      console.error('[SAVE-EXAM] Error:', err);
      setExportMessage('');
      const errorMsg = err?.response?.data?.message || err?.message || 'Erreur lors de la sauvegarde de l\'examen';
      setExportError(errorMsg);
    } finally {
      setIsSavingExam(false);
    }
  };

  return (
    <div className="exam-create-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />
      <main className="exam-create-main">
        <header className="exam-create-header">
          <h1>Création d'examen</h1>
          <button className="exam-btn-logout" type="button" onClick={logout}>Se déconnecter</button>
        </header>
        <div className="exam-tabs" role="tablist">{tabs.map((tab) => (<button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`exam-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>))}</div>
        {activeTab === 'Bibliothèque' && (
          <section className="exam-card">
            <h2>Filtrer les examens et questions</h2>
            <div className="filter-form">
              <div className="form-group"><label htmlFor="matiere">Matière</label><input id="matiere" type="text" placeholder="Ex: Algorithme" value={filter.matiere} onChange={(e) => handleFilterChange('matiere', e.target.value)} disabled={isLoading} /></div>
              <div className="form-group"><label htmlFor="niveau">Niveau</label><input id="niveau" type="text" placeholder="Ex: L2" value={filter.niveau} onChange={(e) => handleFilterChange('niveau', e.target.value)} disabled={isLoading} /></div>
              <div className="form-group"><label htmlFor="annee">Année</label><input id="annee" type="text" placeholder="Ex: 2024-2025" value={filter.annee} onChange={(e) => handleFilterChange('annee', e.target.value)} disabled={isLoading} /></div>
            </div>
            <div className="exam-actions"><button className="exam-btn-primary" onClick={handleFilterSearch} disabled={isLoading}>{isLoading ? 'Recherche...' : 'Rechercher'}</button><button className="exam-btn-secondary" onClick={handleFilterReset} disabled={isLoading}>Réinitialiser</button></div>
            {error && <p className="exam-config-error">{error}</p>}
            {successMessage && <p className="exam-config-success">{successMessage}</p>}
            {isLoading && <p className="exam-loading-message">Chargement des examens et questions...</p>}
            {hasSearched && !isLoading && (
              <>
                {/* Mes Examens */}
                <h3>Mes Examens ({filteredMesExamens.length})</h3>
                {filteredMesExamens.length > 0 ? (
                  <div className="filter-results">
                    {filteredMesExamens.map((exam) => (
                      <div 
                        key={exam.id} 
                        className="result-item" 
                        style={{ borderLeft: '4px solid #22c55e', background: '#f0fdf4', padding: '14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease' }}
                        onClick={() => setExpandedExamId(expandedExamId === exam.id ? null : exam.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                          <h4 style={{ margin: '0', color: '#16a34a' }}>🔒 {exam.title || 'Sans titre'}</h4>
                          <span style={{ fontSize: '11px', background: '#22c55e', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>MES</span>
                        </div>
                        {expandedExamId === exam.id ? (
                          <div style={{ marginTop: '16px', padding: '0', background: 'white', border: '2px solid #22c55e', borderRadius: '8px', fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                            {/* En-tête */}
                            <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', padding: '24px', color: 'white' }}>
                              <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '700', textAlign: 'center' }}>{exam.title || 'Sans titre'}</h3>
                            </div>
                            {/* Contenu */}
                            <div style={{ padding: '24px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px 0 12px 0', fontWeight: '600', color: '#16a34a', width: '50%' }}>Matière :</td>
                                    <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.matiere || '-'}</td>
                                    <td style={{ padding: '12px 0 12px 16px', fontWeight: '600', color: '#16a34a', width: '25%' }}>Année :</td>
                                    <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>2026-2027</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px 0 12px 0', fontWeight: '600', color: '#16a34a' }}>Discipline :</td>
                                    <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.matiere || '-'}</td>
                                    <td style={{ padding: '12px 0 12px 16px', fontWeight: '600', color: '#16a34a' }}>Niveau :</td>
                                    <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.niveau || '-'}</td>
                                  </tr>
                                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px 0 12px 0', fontWeight: '600', color: '#16a34a' }}>Enseignants :</td>
                                    <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>-</td>
                                    <td style={{ padding: '12px 0 12px 16px', fontWeight: '600', color: '#16a34a' }}>Date :</td>
                                    <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>02/04/2026</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '12px 0', fontWeight: '600', color: '#16a34a' }}>Durée :</td>
                                    <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.duree || '-'}</td>
                                  </tr>
                                </tbody>
                              </table>
                              {/* Ligne Nom/Groupe */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                                <div>
                                  <label style={{ display: 'block', fontWeight: '600', color: '#16a34a', marginBottom: '8px' }}>Nom :</label>
                                  <div style={{ borderBottom: '2px solid #d1d5db', minHeight: '24px' }}></div>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontWeight: '600', color: '#16a34a', marginBottom: '8px' }}>Groupe :</label>
                                  <div style={{ borderBottom: '2px solid #d1d5db', minHeight: '24px' }}></div>
                                </div>
                              </div>
                              {/* Tableau Exercices */}
                              <div style={{ marginTop: '24px' }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>Exercices :</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #22c55e' }}>
                                      <th style={{ padding: '12px', border: 'none', fontWeight: '600', color: '#16a34a', textAlign: 'left' }}>Exercice</th>
                                      <th style={{ padding: '12px', border: 'none', fontWeight: '600', color: '#16a34a', textAlign: 'left' }}>Énoncé</th>
                                      <th style={{ padding: '12px', border: 'none', fontWeight: '600', color: '#16a34a', textAlign: 'center', width: '80px' }}>Points</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {exam.questions && exam.questions.length > 0 ? (
                                      exam.questions.map((q, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                          <td style={{ padding: '12px', color: '#1f2937' }}>Ex {idx + 1}</td>
                                          <td style={{ padding: '12px', color: '#1f2937' }}>{q.substring(0, 80)}...</td>
                                          <td style={{ padding: '12px', textAlign: 'center', color: '#1f2937' }}>/{exam.noteTotale || '20'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Aucune question</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="exam-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#1e3558', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #bbf7d0' }}>
                            <p style={{ margin: '0' }}><strong>Filière:</strong> <span style={{ color: '#16a34a', fontWeight: '600' }}>{exam.filiere || '-'}</span></p>
                            <p style={{ margin: '0' }}><strong>Matière:</strong> <span style={{ color: '#16a34a', fontWeight: '600' }}>{exam.matiere || '-'}</span></p>
                            <p style={{ margin: '0' }}><strong>Niveau:</strong> <span style={{ color: '#16a34a', fontWeight: '600' }}>{exam.niveau || '-'}</span></p>
                            <p style={{ margin: '0' }}><strong>Type:</strong> <span style={{ color: '#16a34a', fontWeight: '600' }}>{exam.type || '-'}</span></p>
                            <p style={{ margin: '0' }}><strong>Durée:</strong> <span style={{ color: '#16a34a', fontWeight: '600' }}>{exam.duree || '-'}</span></p>
                            <p style={{ margin: '0' }}><strong>Note Totale:</strong> <span style={{ color: '#16a34a', fontWeight: '600' }}>{exam.noteTotale || '-'}</span></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#607089', fontStyle: 'italic' }}>Aucun examen personnel.</p>
                )}
                
                {/* Examens des autres */}
                {filteredAutresExamens.length > 0 && (
                  <>
                    <h3 style={{ marginTop: '24px', color: '#2a4a6f' }}>Examens d'autres professeurs ({filteredAutresExamens.length})</h3>
                    <div className="filter-results">
                      {filteredAutresExamens.map((exam) => (
                        <div 
                          key={exam.id} 
                          className="result-item" 
                          style={{ borderLeft: '4px solid #2a70b1', background: '#f0f9ff', padding: '14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease' }}
                          onClick={() => setExpandedExamId(expandedExamId === exam.id ? null : exam.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                            <h4 style={{ margin: '0', color: '#0369a1' }}>{exam.title || 'Sans titre'}</h4>
                            <span style={{ fontSize: '11px', background: '#2a70b1', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>AUTRES</span>
                          </div>
                          {expandedExamId === exam.id ? (
                            <div style={{ marginTop: '16px', padding: '0', background: 'white', border: '2px solid #2a70b1', borderRadius: '8px', fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                              {/* En-tête */}
                              <div style={{ background: 'linear-gradient(135deg, #2a70b1 0%, #1e40af 100%)', padding: '24px', color: 'white' }}>
                                <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '700', textAlign: 'center' }}>{exam.title || 'Sans titre'}</h3>
                              </div>
                              {/* Contenu */}
                              <div style={{ padding: '24px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                  <tbody>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '12px 0 12px 0', fontWeight: '600', color: '#2a70b1', width: '50%' }}>Matière :</td>
                                      <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.matiere || '-'}</td>
                                      <td style={{ padding: '12px 0 12px 16px', fontWeight: '600', color: '#2a70b1', width: '25%' }}>Année :</td>
                                      <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>2026-2027</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '12px 0 12px 0', fontWeight: '600', color: '#2a70b1' }}>Discipline :</td>
                                      <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.matiere || '-'}</td>
                                      <td style={{ padding: '12px 0 12px 16px', fontWeight: '600', color: '#2a70b1' }}>Niveau :</td>
                                      <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.niveau || '-'}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '12px 0 12px 0', fontWeight: '600', color: '#2a70b1' }}>Enseignants :</td>
                                      <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.createdByName || '-'}</td>
                                      <td style={{ padding: '12px 0 12px 16px', fontWeight: '600', color: '#2a70b1' }}>Date :</td>
                                      <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>02/04/2026</td>
                                    </tr>
                                    <tr>
                                      <td style={{ padding: '12px 0', fontWeight: '600', color: '#2a70b1' }}>Durée :</td>
                                      <td style={{ padding: '12px 0 12px 16px', color: '#1f2937' }}>{exam.duree || '-'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                                {/* Ligne Nom/Groupe */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                                  <div>
                                    <label style={{ display: 'block', fontWeight: '600', color: '#2a70b1', marginBottom: '8px' }}>Nom :</label>
                                    <div style={{ borderBottom: '2px solid #d1d5db', minHeight: '24px' }}></div>
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontWeight: '600', color: '#2a70b1', marginBottom: '8px' }}>Groupe :</label>
                                    <div style={{ borderBottom: '2px solid #d1d5db', minHeight: '24px' }}></div>
                                  </div>
                                </div>
                                {/* Tableau Exercices */}
                                <div style={{ marginTop: '24px' }}>
                                  <h4 style={{ margin: '0 0 12px 0', color: '#2a70b1', fontWeight: '600', fontSize: '14px' }}>Exercices :</h4>
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ background: '#f0f9ff', borderBottom: '2px solid #2a70b1' }}>
                                        <th style={{ padding: '12px', border: 'none', fontWeight: '600', color: '#2a70b1', textAlign: 'left' }}>Exercice</th>
                                        <th style={{ padding: '12px', border: 'none', fontWeight: '600', color: '#2a70b1', textAlign: 'left' }}>Énoncé</th>
                                        <th style={{ padding: '12px', border: 'none', fontWeight: '600', color: '#2a70b1', textAlign: 'center', width: '80px' }}>Points</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {exam.questions && exam.questions.length > 0 ? (
                                        exam.questions.map((q, idx) => (
                                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>Ex {idx + 1}</td>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{q.substring(0, 80)}...</td>
                                            <td style={{ padding: '12px', textAlign: 'center', color: '#1f2937' }}>/{exam.noteTotale || '20'}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Aucune question</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              {/* Bouton Copier */}
                              <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                <button 
                                  className="exam-btn-primary"
                                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '600', background: '#2a70b1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.3s' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyExam(exam.id);
                                  }}
                                  onMouseOver={(e) => e.target.style.background = '#1e40af'}
                                  onMouseOut={(e) => e.target.style.background = '#2a70b1'}
                                >
                                  Copier cet Examen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="exam-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#1e3558', marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #bfdbfe' }}>
                              <p style={{ margin: '0' }}><strong>Filière:</strong> <span style={{ color: '#0369a1', fontWeight: '600' }}>{exam.filiere || '-'}</span></p>
                              <p style={{ margin: '0' }}><strong>Matière:</strong> <span style={{ color: '#0369a1', fontWeight: '600' }}>{exam.matiere || '-'}</span></p>
                              <p style={{ margin: '0' }}><strong>Niveau:</strong> <span style={{ color: '#0369a1', fontWeight: '600' }}>{exam.niveau || '-'}</span></p>
                              <p style={{ margin: '0' }}><strong>Type:</strong> <span style={{ color: '#0369a1', fontWeight: '600' }}>{exam.type || '-'}</span></p>
                              <p style={{ margin: '0' }}><strong>Durée:</strong> <span style={{ color: '#0369a1', fontWeight: '600' }}>{exam.duree || '-'}</span></p>
                              <p style={{ margin: '0' }}><strong>Note Totale:</strong> <span style={{ color: '#0369a1', fontWeight: '600' }}>{exam.noteTotale || '-'}</span></p>
                              <p style={{ margin: '0', gridColumn: '1 / -1' }}><strong>Créé par:</strong> <span style={{ color: '#0369a1', fontWeight: '600' }}>{exam.createdByName || '-'}</span></p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {/* Mes Questions */}
                <h3 style={{ marginTop: '24px' }}>Mes Questions ({filteredMesQuestions.length})</h3>
                {filteredMesQuestions.length > 0 ? (
                  <div className="filter-results">
                    {filteredMesQuestions.map((q, i) => (
                      <div 
                        key={q.id} 
                        className="result-item" 
                        style={{ borderLeft: '4px solid #22c55e', background: '#f0fdf4', padding: '14px', borderRadius: '8px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <h4 style={{ margin: '0', color: '#16a34a' }}>🔒 Q {i + 1}</h4>
                          <span style={{ fontSize: '11px', background: '#22c55e', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>MES</span>
                        </div>
                        <p style={{ margin: '8px 0 0', color: '#1e3558', fontSize: '14px', lineHeight: '1.6' }}>{q.text || 'Pas de texte'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#607089', fontStyle: 'italic' }}>Aucune question personnelle.</p>
                )}
                
                {/* Questions des autres */}
                {filteredAutresQuestions.length > 0 && (
                  <>
                    <h3 style={{ marginTop: '24px', color: '#2a4a6f' }}>Questions d'autres professeurs ({filteredAutresQuestions.length})</h3>
                    <div className="filter-results">
                      {filteredAutresQuestions.map((q, i) => (
                        <div key={q.id} className="result-item" style={{ borderLeft: '4px solid #2a70b1', background: '#f0f9ff', padding: '14px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <h4 style={{ margin: '0', color: '#0369a1' }}>Q {i + 1}</h4>
                            <span style={{ fontSize: '11px', background: '#2a70b1', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>AUTRES</span>
                          </div>
                          <p style={{ margin: '8px 0', color: '#1e3558', fontSize: '14px', lineHeight: '1.6' }}>{q.text || 'Pas de texte'}</p>
                          <p style={{ fontSize: '12px', color: '#607089', marginTop: '8px', marginBottom: '12px' }}>
                            <strong>Créée par:</strong> {q.createdByName || '-'}
                          </p>
                          <button 
                            className="exam-btn-primary"
                            style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                            onClick={() => handleCopyQuestion(q.id)}
                          >
                            Copier cette Question
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <div className="exam-actions"><button type="button" className="exam-btn-primary" onClick={() => setActiveTab('Modèles')}>Continuer</button></div>
          </section>
        )}
        {activeTab === 'Questions' && (
          <section className="exam-card questions-section">
            <h2>Gestion des Questions</h2>
            
            {/* Display selected template */}
            {selectedTemplate && (
              <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '8px' }}>
                <p style={{ margin: '0', color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>
                  Modèle sélectionné: <strong>{allTemplates.find(t => t._id === selectedTemplate)?.nom || 'Modèle'}</strong>
                </p>
              </div>
            )}
            
            <div className="questions-add-section">
              <h3>Ajouter une Nouvelle Question</h3>
              <div className="question-input-wrapper">
                <textarea 
                  value={questionDraft} 
                  onChange={(e) => setQuestionDraft(e.target.value)} 
                  placeholder="Saisir votre question ici... Exemple: Qu'est-ce qu'un algorithme?"
                  className="question-textarea"
                />
                <button 
                  type="button" 
                  className="exam-btn-primary insert-btn" 
                  onClick={insertQuestion} 
                  disabled={!isQuestionDraftValid || isSavingQuestion}
                >
                  {isSavingQuestion ? 'Sauvegarde...' : 'Ajouter la Question'}
                </button>
              </div>
            </div>

            <div className="questions-list-section">
              <h3>Mes Questions ({questions.length})</h3>
              {questions.length === 0 ? (
                <div className="questions-empty-state">
                  <p>Aucune question ajoutée pour le moment.</p>
                  <p className="hint">Ajoutez des questions en utilisant le formulaire ci-dessus.</p>
                </div>
              ) : (
                <div className="questions-container">
                  {questions.map((q, i) => (
                    <div key={q.id} className="question-card">
                      <div className="question-number">{i + 1}</div>
                      <div className="question-body">
                        {q.isEditing ? (
                          <textarea 
                            value={q.editText} 
                            onChange={(e) => updateQuestionEdit(q.id, e.target.value)}
                            onBlur={() => saveQuestion(q.id)}
                            className="question-edit-textarea"
                          />
                        ) : (
                          <p className="question-text">{q.text}</p>
                        )}
                      </div>
                      <div className="question-actions">
                        <div className="question-checkbox-wrapper">
                          <input
                            type="checkbox"
                            id={`check-${q.id}`}
                            checked={q.selected !== false}
                            onChange={(e) => {
                              setQuestions((prev) => 
                                prev.map((item) => 
                                  item.id === q.id ? { ...item, selected: e.target.checked } : item
                                )
                              );
                            }}
                            className="question-checkbox"
                          />
                          <label htmlFor={`check-${q.id}`} className="checkbox-label">Inclure</label>
                        </div>
                        {q.isEditing ? (
                          <>
                            <button 
                              type="button" 
                              className="btn-action cancel-btn"
                              onClick={() => cancelQuestionEdit(q.id)}
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              type="button" 
                              className="btn-action edit-btn"
                              onClick={() => startQuestionEdit(q.id)}
                            >
                              Modifier
                            </button>
                          </>
                        )}
                        {!q.savedToBank && !q.isEditing && (
                          <button 
                            type="button" 
                            className="btn-action add-bank-btn"
                            onClick={() => addQuestionItemToBank(q.id)}
                          >
                            Ajouter à la Banque
                          </button>
                        )}
                        <button 
                          type="button" 
                          className="btn-action delete-btn"
                          onClick={() => deleteQuestion(q.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="questions-available-section">
              <h3>Questions Disponibles dans la Banque</h3>
              
              {/* Mes Questions */}
              {filteredMesQuestions.length > 0 && (
                <div className="questions-bank-subsection">
                  <h4 style={{ color: '#16a34a', marginBottom: '12px' }}>Mes Questions ({filteredMesQuestions.length})</h4>
                  <ul className="questions-bank-list">
                    {filteredMesQuestions.map((q) => (
                      <li key={q.id} className="questions-bank-item">
                        <div className="questions-bank-text">
                          <strong>Q:</strong> {q.text}
                          <small style={{ display: 'block', marginTop: '4px', color: '#7a8fa3' }}>
                            {q.matiere && `Matière: ${q.matiere}`}
                            {q.niveau && ` | Niveau: ${q.niveau}`}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="btn-add-to-exam"
                          onClick={() => {
                            // Ajouter la question à la liste de l'examen
                            setQuestions((prev) => [...prev, { 
                              id: q.id, 
                              text: q.text, 
                              editText: q.text, 
                              isEditing: false,
                              savedToBank: true,
                              selected: true,
                              fromBank: true
                            }]);
                          }}
                        >
                          Ajouter
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Autres Questions */}
              {filteredAutresQuestions.length > 0 && (
                <div className="questions-bank-subsection">
                  <h4 style={{ color: '#2a70b1', marginBottom: '12px' }}>Questions d'Autres Professeurs ({filteredAutresQuestions.length})</h4>
                  <ul className="questions-bank-list">
                    {filteredAutresQuestions.map((q) => (
                      <li key={q.id} className="questions-bank-item">
                        <div className="questions-bank-text">
                          <strong>Q:</strong> {q.text}
                          <small style={{ display: 'block', marginTop: '4px', color: '#7a8fa3' }}>
                            Par {q.createdByName || q.createdByEmail || 'Professeur'}
                            {q.matiere && ` | Matière: ${q.matiere}`}
                            {q.niveau && ` | Niveau: ${q.niveau}`}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="btn-add-to-exam btn-copy"
                          onClick={() => {
                            // Copier la question d'un autre professeur
                            handleCopyQuestion(q.id);
                          }}
                        >
                          📋 Copier
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {filteredMesQuestions.length === 0 && filteredAutresQuestions.length === 0 && (
                <div className="questions-empty-state">
                  <p>Aucune question disponible dans la banque.</p>
                  <p className="hint">Créez des questions en utilisant le formulaire ci-dessus.</p>
                </div>
              )}
            </div>

            <div className="exam-actions">
              <button type="button" className="exam-btn-secondary" onClick={() => setActiveTab('Modèles')}>
                ← Retour aux Modèles
              </button>
              <button type="button" className="exam-btn-primary" onClick={() => setActiveTab('Export')}>
                Continuer vers Export →
              </button>
            </div>
          </section>
        )}
        {activeTab === 'Modèles' && (
          <section className="exam-card">
            <h2>Modèles de Présentation</h2>
            
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderLeft: '4px solid #2a70b1', borderRadius: '8px' }}>
              <p style={{ margin: '0', color: '#0369a1', fontWeight: '600' }}>
                Choisissez un modèle pour définir la présentation de votre examen.
              </p>
            </div>

            {allTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 40px', background: 'linear-gradient(135deg, #f7f9fc 0%, #fbfcff 100%)', borderRadius: '12px', border: '2px dashed #dce2ed' }}>
                <p style={{ fontSize: '24px', margin: '0 0 12px' }}></p>
                <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1e3558' }}>Aucun modèle disponible</p>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#607089' }}>Contactez l'administrateur pour créer des modèles</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {allTemplates.map((template) => (
                  <div
                    key={template._id}
                    onClick={() => handleSelectTemplate(template._id)}
                    style={{
                      border: selectedTemplate === template._id ? '2px solid #2a70b1' : '1.5px solid #dce2ed',
                      borderRadius: '12px',
                      padding: '18px',
                      background: selectedTemplate === template._id ? 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: selectedTemplate === template._id ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: selectedTemplate === template._id ? '0 4px 12px rgba(42, 112, 177, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      {selectedTemplate === template._id && (
                        <span style={{ fontSize: '20px', color: '#10b981', fontWeight: 'bold' }}>●</span>
                      )}
                      <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#173b66', flex: 1 }}>
                        {template.nom || 'Modèle Sans Titre'}
                      </h3>
                    </div>

                    <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#607089' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: '600', minWidth: '80px' }}>Type:</span>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          background: template.type === 'final' ? '#eff6ff' : template.type === 'cc' ? '#f0fdf4' : '#fffbeb',
                          color: template.type === 'final' ? '#0369a1' : template.type === 'cc' ? '#16a34a' : '#d97706',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}>
                          {template.type === 'final' && 'Final'}
                          {template.type === 'cc' && 'CC'}
                          {template.type === 'rattrapage' && 'Rattrapage'}
                          {template.type === 'tp' && 'TP'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: '600', minWidth: '80px' }}>Langue:</span>
                        <span>{template.langue || 'Français'}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: '600', minWidth: '80px' }}>Statut:</span>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          background: template.actif ? '#f0fdf4' : '#fff5f5',
                          color: template.actif ? '#16a34a' : '#be4c4c',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {template.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>

                    {selectedTemplate === template._id && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(42, 112, 177, 0.2)', fontSize: '12px', color: '#2a70b1', fontWeight: '600' }}>
                        Ce modèle sera utilisé pour votre examen
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="exam-actions">
              <button type="button" className="exam-btn-secondary" onClick={() => setActiveTab('Bibliothèque')}>
                ← Retour
              </button>
              <button type="button" className="exam-btn-primary" onClick={() => setActiveTab('Questions')}>
                Continuer vers Questions →
              </button>
            </div>
          </section>
        )}
        {activeTab === 'Export' && (
          <section className="exam-card">
            <h2>Terminer et Sauvegarder l'Examen</h2>
            
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderLeft: '4px solid #2a70b1', borderRadius: '8px' }}>
              <p style={{ margin: '0', color: '#0369a1', fontWeight: '600' }}>
                Configurez les détails de votre examen et choisissez un statut avant de le sauvegarder.
              </p>
            </div>

            {/* Exam Configuration Form */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', color: '#2a4a6f', fontWeight: '600', marginBottom: '16px' }}>Détails de l'Examen</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label htmlFor="titre">Titre de l'Examen *</label>
                  <input 
                    id="titre" 
                    type="text" 
                    placeholder="Ex: Examen Final Algorithme" 
                    value={examForm.titre}
                    onChange={(e) => handleExamFormChange('titre', e.target.value)}
                    className="form-group-input"
                    style={{
                      border: '1.5px solid #dce2ed',
                      borderRadius: '10px',
                      background: '#fbfcff',
                      height: '44px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1e3558',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="matiere">Matière *</label>
                  <input 
                    id="matiere" 
                    type="text" 
                    placeholder="Ex: Algorithme" 
                    value={examForm.matiere}
                    onChange={(e) => handleExamFormChange('matiere', e.target.value)}
                    style={{
                      border: '1.5px solid #dce2ed',
                      borderRadius: '10px',
                      background: '#fbfcff',
                      height: '44px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1e3558',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="filiere">Filière</label>
                  <input 
                    id="filiere" 
                    type="text" 
                    placeholder="Ex: Informatique" 
                    value={examForm.filiere}
                    onChange={(e) => handleExamFormChange('filiere', e.target.value)}
                    style={{
                      border: '1.5px solid #dce2ed',
                      borderRadius: '10px',
                      background: '#fbfcff',
                      height: '44px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1e3558',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="niveau">Niveau</label>
                  <input 
                    id="niveau" 
                    type="text" 
                    placeholder="Ex: L2" 
                    value={examForm.niveau}
                    onChange={(e) => handleExamFormChange('niveau', e.target.value)}
                    style={{
                      border: '1.5px solid #dce2ed',
                      borderRadius: '10px',
                      background: '#fbfcff',
                      height: '44px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1e3558',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="type">Type d'Examen</label>
                  <input 
                    id="type" 
                    type="text" 
                    placeholder="Ex: Contrôle continu" 
                    value={examForm.type}
                    onChange={(e) => handleExamFormChange('type', e.target.value)}
                    style={{
                      border: '1.5px solid #dce2ed',
                      borderRadius: '10px',
                      background: '#fbfcff',
                      height: '44px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1e3558',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="duree">Durée (en minutes)</label>
                  <input 
                    id="duree" 
                    type="text" 
                    placeholder="Ex: 120" 
                    value={examForm.duree}
                    onChange={(e) => handleExamFormChange('duree', e.target.value)}
                    style={{
                      border: '1.5px solid #dce2ed',
                      borderRadius: '10px',
                      background: '#fbfcff',
                      height: '44px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1e3558',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="noteTotale">Note Totale</label>
                  <input 
                    id="noteTotale" 
                    type="number" 
                    placeholder="Ex: 20" 
                    value={examForm.noteTotale}
                    onChange={(e) => handleExamFormChange('noteTotale', e.target.value)}
                    style={{
                      border: '1.5px solid #dce2ed',
                      borderRadius: '10px',
                      background: '#fbfcff',
                      height: '44px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1e3558',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '2px solid #f0f3f8' }}>
              <h3 style={{ fontSize: '18px', color: '#2a4a6f', fontWeight: '600', marginBottom: '16px' }}>Statut de l'Examen</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <label style={{
                  border: examForm.statut === 'Brouillon' ? '2px solid #f59e0b' : '1.5px solid #dce2ed',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: examForm.statut === 'Brouillon' ? '#fffbeb' : '#fff',
                  transition: 'all 0.3s ease',
                }}>
                  <input 
                    type="radio" 
                    name="statut" 
                    value="Brouillon"
                    checked={examForm.statut === 'Brouillon'}
                    onChange={(e) => handleExamFormChange('statut', e.target.value)}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '600', color: '#1e3558' }}>Brouillon</span>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#607089' }}>Examen en cours d'édition, non finalisé</p>
                </label>

                <label style={{
                  border: examForm.statut === 'En cours' ? '2px solid #22c55e' : '1.5px solid #dce2ed',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: examForm.statut === 'En cours' ? '#f0fdf4' : '#fff',
                  transition: 'all 0.3s ease',
                }}>
                  <input 
                    type="radio" 
                    name="statut" 
                    value="En cours"
                    checked={examForm.statut === 'En cours'}
                    onChange={(e) => handleExamFormChange('statut', e.target.value)}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '600', color: '#1e3558' }}>En cours</span>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#607089' }}>Examen finalisé et prêt</p>
                </label>
              </div>
            </div>

            {/* Messages */}
            {exportMessage && <p style={{ color: '#16a34a', fontWeight: '600', marginBottom: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>{exportMessage}</p>}
            {exportError && <p style={{ color: '#be4c4c', fontWeight: '600', marginBottom: '12px', padding: '12px', background: '#fff5f5', borderRadius: '8px', borderLeft: '4px solid #f87171' }}>{exportError}</p>}

            {/* Actions */}
            <div className="exam-actions">
              <button 
                type="button" 
                className="exam-btn-secondary" 
                onClick={() => setActiveTab('Questions')}
                disabled={isSavingExam}
              >
                ← Retour
              </button>
              <button 
                type="button" 
                className="exam-btn-primary" 
                onClick={finishAndSaveExam}
                disabled={isSavingExam || questions.length === 0}
                style={{ minWidth: '200px' }}
              >
                {isSavingExam ? 'Sauvegarde...' : 'Terminer et Sauvegarder'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default CreateExam;
