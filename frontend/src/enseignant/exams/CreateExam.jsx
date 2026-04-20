import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  addExamToBank,
  getExamBank,
  getExamBankItem,
  getFilteredExams,
  getFilteredQuestions,
  getWordTemplates,
} from '../../api/enseignant/Enseignant.api';

import ModelesTab from './tabs/ModelesTab';
import QuestionsTab, { makeSection } from './tabs/QuestionsTab';
import ExportTab from './tabs/ExportTab';
import './CreateExam.css';

const TABS = ['Modèles', 'Questions', 'Export'];

const CreateExam = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState('Modèles'); // Changé pour correspondre à TABS

  /* ── Library / filter state ── */
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

  /* ── UI flags ── */
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* ── Templates ── */
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  /* ── Sections (questions structure) ── */
  const [sections, setSections] = useState([makeSection(1)]);

  /* ── Exam form ── */
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

  /* ── Export ── */
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [editingExamId, setEditingExamId] = useState(null);

  /* ── Gestionnaire de changement du formulaire (utilisé par ModelesTab et ExportTab) ── */
  const onFormChange = (field, value) => {
    setExamForm(prev => ({ ...prev, [field]: value }));
  };

  /* ── Load all data on mount ── */
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

  /* ── Handle ?editExam=id ── */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('editExam');
    if (!id || editingExamId) return;

    (async () => {
      try {
        const { exam } = await getExamBankItem(id);
        if (!exam) {
          setError('Examen introuvable');
          return;
        }
        setEditingExamId(id);
        setExamForm({
          titre: exam.title || '',
          filiere: exam.filiere || '',
          matiere: exam.matiere || '',
          niveau: exam.niveau || '',
          type: exam.type || '',
          duree: exam.duree || '',
          noteTotale: String(exam.noteTotale || ''),
          statut: exam.status || 'Brouillon',
          templateId: exam.templateId || null,
        });
        setSections([makeSection(1)]);
        setActiveTab('Questions');
        setSuccessMessage(`"${exam.title}" chargé. Ajoutez vos questions.`);
      } catch {
        setError("Erreur lors du chargement de l'examen");
      }
    })();
  }, [location, editingExamId]);

  /* ── Auto-clear success ── */
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  /* ── Filter handlers ── */
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

  /* ── Template selection ── */
  const handleSelectTemplate = (id) => {
    const next = selectedTemplate === id ? null : id;
    setSelectedTemplate(next);
    setExamForm(p => ({ ...p, templateId: next }));
  };

  /* ── Build & save exam ── */
  const finishAndSaveExam = async () => {
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

    setIsSavingExam(true);
    setExportError('');
    setExportMessage('Génération du document…');

    try {
      const selectedTpl = examForm.templateId
        ? allTemplates.find(t => t._id === examForm.templateId)
        : null;

      /* Build docx children */
      const docChildren = [];

      if (selectedTpl) {
        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              children: [
                new TableCell({
                  width: { size: 60, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: selectedTpl.universiteFr || '', bold: true, size: 20 })] }),
                    new Paragraph({ children: [new TextRun({ text: selectedTpl.institutFr || '', bold: true, size: 18 })] }),
                    new Paragraph({ children: [new TextRun({ text: selectedTpl.departementFr || '', size: 16 })] }),
                  ],
                }),
                new TableCell({
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: selectedTpl.nom || '', bold: true, size: 22 })] })],
                }),
              ],
            })],
          })
        );
        docChildren.push(new Paragraph({ text: '' }));
      }

      /* Title */
      docChildren.push(new Paragraph({
        children: [new TextRun({ text: titre, bold: true, size: 32 })],
        alignment: 'center',
        spacing: { before: 200, after: 100 },
      }));

      /* Meta */
      const metaLines = [
        examForm.matiere && `Matière : ${examForm.matiere}`,
        examForm.filiere && `Filière : ${examForm.filiere}`,
        examForm.niveau && `Niveau : ${examForm.niveau}`,
        examForm.type && `Type : ${examForm.type}`,
        examForm.duree && `Durée : ${examForm.duree} min`,
        examForm.noteTotale && `Barème : /${examForm.noteTotale}`,
        `Date : ${new Date().toLocaleDateString('fr-FR')}`,
      ].filter(Boolean);

      metaLines.forEach(line => docChildren.push(
        new Paragraph({ children: [new TextRun({ text: line, size: 18 })], spacing: { after: 80 } })
      ));

      docChildren.push(new Paragraph({ text: '' }));

      /* Student header */
      docChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Nom & Prénom : ________________________', size: 20 })] })],
              borders: { top: { style: BorderStyle.SINGLE, size: 6 }, bottom: { style: BorderStyle.SINGLE, size: 6 }, left: { style: BorderStyle.SINGLE, size: 6 }, right: { style: BorderStyle.SINGLE, size: 6 } },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Groupe : ________________', size: 20 })] })],
              borders: { top: { style: BorderStyle.SINGLE, size: 6 }, bottom: { style: BorderStyle.SINGLE, size: 6 }, left: { style: BorderStyle.SINGLE, size: 6 }, right: { style: BorderStyle.SINGLE, size: 6 } },
            }),
          ],
        })],
      }));
      docChildren.push(new Paragraph({ text: '' }));

      /* Sections, exercises, questions */
      sections.forEach((sec, si) => {
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: `${sec.title || `Partie ${si + 1}`}`, bold: true, size: 24 })],
          spacing: { before: 240, after: 100 },
        }));

        sec.exercises.forEach((exo, ei) => {
          const exoPts = exo.points ? ` (${exo.points} pts)` : '';
          docChildren.push(new Paragraph({
            children: [new TextRun({ text: `${exo.title || `Exercice ${ei + 1}`}${exoPts}`, bold: true, size: 22, underline: {} })],
            spacing: { before: 160, after: 80 },
          }));

          exo.questions.forEach((q, qi) => {
            const pts = q.points ? ` [${q.points} pts]` : '';
            docChildren.push(new Paragraph({
              children: [new TextRun({ text: `${qi + 1}. ${q.text || ''}${pts}`, size: 20 })],
              spacing: { before: 100, after: 60 },
            }));

            if ((q.type === 'qcm' || q.type === 'vrai_faux') && q.options?.length) {
              q.options.forEach((opt, oi) => {
                docChildren.push(new Paragraph({
                  children: [new TextRun({ text: `   ${String.fromCharCode(97 + oi)}) ${opt.text || ''}`, size: 18 })],
                  spacing: { before: 40, after: 40 },
                }));
              });
            }

            if (['ouverte', 'calcul', 'definition'].includes(q.type)) {
              for (let li = 0; li < 3; li++) {
                docChildren.push(new Paragraph({
                  children: [new TextRun({ text: '         ___________________________________________', size: 16, color: 'AAAAAA' })],
                  spacing: { before: 40, after: 40 },
                }));
              }
            }
          });
        });
      });

      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
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
        noteTotale: Number(examForm.noteTotale) || 0,
        questionsCount: allQuestions.length,
        status: examForm.statut,
        fileName: filename,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileContentBase64: b64,
        anneeUniversitaire: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        ...(examForm.templateId && { templateId: examForm.templateId }),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const tplInfo = selectedTpl ? ` avec le modèle "${selectedTpl.nom}"` : '';
      setExportMessage(`Examen "${titre}" sauvegardé${tplInfo} — ${allQuestions.length} question(s) · téléchargement en cours.`);

      setTimeout(() => {
        setExamForm({
          titre: '', filiere: '', matiere: '', niveau: '', type: '', duree: '', noteTotale: '',
          statut: 'Brouillon', templateId: null
        });
        setSections([makeSection(1)]);
        setSelectedTemplate(null);
        setExportMessage('');
        setExportError('');
      }, 4000);
    } catch (err) {
      setExportMessage('');
      setExportError(err?.response?.data?.message || err?.message || "Erreur lors de la sauvegarde");
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
        {/* Header */}
        <header className="exam-create-header">
          <div className="exam-create-header-left">
            <h2 className="eb-header-title">Création d'<span>examen</span></h2>
          </div>
        </header>

        {/* Tabs */}
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

        {/* Tab content */}
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