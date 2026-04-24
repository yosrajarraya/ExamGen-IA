import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeightRule, TableLayoutType } from 'docx';
import { useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  addExamToBank,
  addQuestionToBank,
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


      /* ══════════════════════════════════════════════════════════════
         Build docx — structure identique à l'aperçu admin ExamPreview
         ══════════════════════════════════════════════════════════════ */
      const docChildren = [];

      const tpl = selectedTpl;

      /* helpers borders */
      const bSingle = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
      const bNone   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' };
      const bordersAll  = { top: bSingle, bottom: bSingle, left: bSingle, right: bSingle };
      const bordersNone = { top: bNone,   bottom: bNone,   left: bNone,   right: bNone   };

      /* valeurs depuis le template sélectionné (ou examForm si pas de tpl) */
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

      const sec       = tpl?.sections;
      const showNP    = !sec || sec.zoneNomPrenom;
      const showGrp   = !sec || sec.zoneGroupe;
      const showNote  = !sec || sec.blocNote;
      const showComm  = !sec || sec.blocCommentaires;
      const showSign  = !sec || sec.blocSignature;
      const showNB    = !sec || sec.blocRemarques;

      if (tpl) {
        /* ── 1. EN-TÊTE UNIVERSITÉ (3 colonnes) ── */
        docChildren.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: bNone, bottom: bNone, left: bNone, right: bNone, insideH: bNone, insideV: bNone },
          rows: [new TableRow({ children: [

            /* Colonne gauche : texte anglais */
            new TableCell({
              width: { size: 27, type: WidthType.PERCENTAGE },
              borders: bordersNone,
              children: [
                new Paragraph({ children: [new TextRun({ text: 'North American',                         size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Private University',                     size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'SFAX | TUNISIA',                         size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'TECHNOLOGY · BUSINESS · ARCHITECTURE',  size: 14, color: '888888' })] }),
              ],
            }),

            /* Colonne centre : noms arabe / français */
            new TableCell({
              width: { size: 53, type: WidthType.PERCENTAGE },
              borders: bordersNone,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.universiteAr  || 'الجامعة الشمالية الأمريكية الخاصة', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.universiteFr  || 'Université Nord-Américaine Privée',   size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.institutFr    || 'Institut International de Technologie',size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.departementFr || 'Département Informatique',             size: 18 })] }),
              ],
            }),

            /* Colonne droite : encadré IIT */
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              borders: bordersAll,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 },
                  children: [new TextRun({ text: 'IIT', bold: true, size: 32 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Institut International', size: 14, color: '444444' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
                  children: [new TextRun({ text: 'de Technologie',         size: 14, color: '444444' })] }),
              ],
            }),

          ]})],
        }));

        docChildren.push(new Paragraph({ text: '', spacing: { after: 120 } }));

        /* ── 2. TITRE : DEVOIR SURVEILLÉ (2 cellules) ── */
        docChildren.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({
            height: { value: 550, rule: HeightRule.ATLEAST },
            children: [
              new TableCell({
                width: { size: 68, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [new TextRun({ text: tplTitre, bold: true, size: 34, allCaps: true })],
                })],
              }),
              new TableCell({
                width: { size: 32, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [new Paragraph({ text: '' })],
              }),
            ],
          })],
        }));

        /* ── 3. GRILLE MÉTA (2 colonnes, pas de bordure top car suite du titre) ── */
        docChildren.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: [

            /* Colonne gauche */
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: bNone, bottom: bSingle, left: bSingle, right: bNone },
              children: [
                new Paragraph({ spacing: { before: 60, after: 40 }, children: [new TextRun({ text: 'Matière : ',           bold: true, size: 20 }), new TextRun({ text: tplMatiere,    size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Discipline : ',        bold: true, size: 20 }), new TextRun({ text: tplDiscipline, size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Enseignants : ',       bold: true, size: 20 }), new TextRun({ text: tplTeachers,   size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 60 }, children: [new TextRun({ text: 'Documents autorisés : ', bold: true, size: 20 }), new TextRun({ text: tplDocs,  size: 20 })] }),
              ],
            }),

            /* Colonne droite */
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: bNone, bottom: bSingle, left: bSingle, right: bSingle },
              children: [
                new Paragraph({ spacing: { before: 60, after: 40 }, children: [new TextRun({ text: 'Année Universitaire : ',     bold: true, size: 20 }), new TextRun({ text: tplAnnee,    size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Semestre : ',                bold: true, size: 20 }), new TextRun({ text: tplSemestre, size: 20 })] }),
                new Paragraph({ spacing: { before: 40, after: 60 }, children: [new TextRun({ text: "Feuille d'énoncé / Durée : ", bold: true, size: 20 }), new TextRun({ text: tplDuree,   size: 20 })] }),
              ],
            }),

          ]})],
        }));

        /* ── 4. LIGNE ÉTUDIANT (Prénom & Nom | Groupe) ── */
        if (showNP || showGrp) {
          docChildren.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              height: { value: 480, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 68, type: WidthType.PERCENTAGE },
                  borders: { top: bNone, bottom: bSingle, left: bSingle, right: bNone },
                  children: [new Paragraph({
                    spacing: { before: 80, after: 80 },
                    children: [new TextRun({ text: showNP ? 'Prénom & Nom :   _______________________________________' : '', size: 20 })],
                  })],
                }),
                new TableCell({
                  width: { size: 32, type: WidthType.PERCENTAGE },
                  borders: { top: bNone, bottom: bSingle, left: bSingle, right: bSingle },
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 80, after: 80 },
                    children: [new TextRun({ text: showGrp ? 'Groupe   ________' : '', size: 20 })],
                  })],
                }),
              ],
            })],
          }));
        }

        docChildren.push(new Paragraph({ text: '', spacing: { after: 140 } }));

        /* ── 5. CASES NOTE / COMMENTAIRES / SIGNATURE ── */
        if (showNote || showComm || showSign) {
          const boxes = [];
          if (showNote) boxes.push('Note /20');
          if (showComm) boxes.push('Commentaires');
          if (showSign) boxes.push('Signature');
          const pct = Math.floor(100 / boxes.length);

          docChildren.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
              height: { value: 1100, rule: HeightRule.ATLEAST },
              children: boxes.map((label, idx) => new TableCell({
                width: { size: pct, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [new TextRun({ text: label, bold: true, size: 20 })],
                })],
              })),
            })],
          }));
        }

        docChildren.push(new Paragraph({ text: '', spacing: { after: 140 } }));

        /* ── 6. BLOC NB ── */
        if (showNB) {
          docChildren.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: [new TableCell({
              borders: bordersAll,
              children: [
                new Paragraph({ spacing: { before: 80 },         children: [new TextRun({ text: 'NB.', bold: true, size: 20 })] }),
                new Paragraph({ spacing: { before: 60, after: 40 }, children: [new TextRun({ text: '— Le barème est fourni à titre indicatif et peut être ajusté', size: 18 })] }),
                new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: `— La durée de l'examen est de ${tplDuree}`, size: 18 })] }),
                new Paragraph({ spacing: { before: 40, after: 80 }, children: [new TextRun({ text: "— Les ordinateurs, l'accès à Internet et l'utilisation d'IDE Python sont strictement interdits", size: 18 })] }),
              ],
            })]})],
          }));
        }

        docChildren.push(new Paragraph({ text: '', spacing: { after: 300 } }));

      } else {
        /* Pas de template sélectionné → en-tête minimal */
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: titre, bold: true, size: 32 })],
        }));
        [
          examForm.matiere    && `Matière : ${examForm.matiere}`,
          examForm.filiere    && `Filière : ${examForm.filiere}`,
          examForm.niveau     && `Niveau : ${examForm.niveau}`,
          examForm.type       && `Type : ${examForm.type}`,
          examForm.duree      && `Durée : ${examForm.duree} min`,
          examForm.noteTotale && `Barème : /${examForm.noteTotale}`,
          `Date : ${new Date().toLocaleDateString('fr-FR')}`,
        ].filter(Boolean).forEach(line =>
          docChildren.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: line, size: 18 })] }))
        );
        docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }


      /* ── SECTIONS / EXERCICES / QUESTIONS ── */
      sections.forEach((sec, si) => {
        docChildren.push(new Paragraph({
          spacing: { before: 280, after: 100 },
          children: [new TextRun({ text: sec.title || `Partie ${si + 1}`, bold: true, size: 24 })],
        }));

        sec.exercises.forEach((exo, ei) => {
          const exoPts = exo.points ? ` (${exo.points} pts)` : '';
          docChildren.push(new Paragraph({
            spacing: { before: 160, after: 80 },
            children: [new TextRun({ text: `${exo.title || `Exercice ${ei + 1}`}${exoPts}`, bold: true, size: 22, underline: {} })],
          }));

          exo.questions.forEach((q, qi) => {
            const pts = q.points ? ` [${q.points} pts]` : '';
            docChildren.push(new Paragraph({
              spacing: { before: 100, after: 60 },
              children: [new TextRun({ text: `${qi + 1}. ${q.text || ''}${pts}`, size: 20 })],
            }));

            if ((q.type === 'qcm' || q.type === 'vrai_faux') && q.options?.length) {
              q.options.forEach((opt, oi) => {
                docChildren.push(new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: `   ${String.fromCharCode(97 + oi)}) ${opt.text || ''}`, size: 18 })],
                }));
              });
            }

            if (['ouverte', 'calcul', 'definition'].includes(q.type)) {
              for (let li = 0; li < 3; li++) {
                docChildren.push(new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: '         ___________________________________________', size: 16, color: 'AAAAAA' })],
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

      /* ── Sauvegarder chaque question dans la banque de questions ── */
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
              ).catch(() => {/* ignorer les erreurs individuelles */})
            )
        )
      );
      await Promise.all(questionSavePromises);

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
        <header className="teacher-header">
          <div className="teacher-header-left">
            <p className="teacher-header-greeting">Conception</p>
            <h1 className="teacher-header-title">
              Création d'<span>examen</span>
            </h1>
            <p className="teacher-header-sub">Configurez votre sujet, ajoutez des questions et exportez en .docx</p>
          </div>
          <div className="teacher-header-badge">
            Éditeur actif
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