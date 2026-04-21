import { useState, useCallback } from 'react';
import iitLogo from '../../assets/iit2.png';
import './WordTemplate.css';

const LANGUAGES = ['Français', 'Arabe', 'Bilingue'];
const FONTS = ['Arial', 'Times New Roman', 'Calibri', 'Georgia', 'Helvetica', 'Cambria'];
const SIZES = ['10pt', '11pt', '12pt', '13pt', '14pt'];

const MODEL_TYPES = [
  { id: 'final', label: 'Examen Final' },
  { id: 'cc', label: 'Contrôle Continu' },
  { id: 'rattrapage', label: 'Rattrapage' },
  { id: 'tp', label: 'TP / Projet' },
];

const SECTION_LABELS = {
  zoneNomPrenom: 'Zone Nom & Prénom',
  zoneGroupe: 'Zone Groupe',
  blocNote: 'Bloc Note',
  blocCommentaires: 'Bloc Commentaires',
  blocSignature: 'Bloc Signature',
  blocRemarques: 'Bloc Remarques',
};

const DEFAULT_SECTIONS = {
  zoneNomPrenom: true,
  zoneGroupe: true,
  blocNote: true,
  blocCommentaires: true,
  blocSignature: true,
  blocRemarques: true,
};

const normalizeFromServer = (t, existingLocalId = null) => ({
  ...t,
  _localId: existingLocalId || t._id,
  _id: t._id,
  margeH: String(t.margeH ?? 2),
  margeV: String(t.margeV ?? 2),
  sections: t.sections || { ...DEFAULT_SECTIONS },
  exercices: t.exercices || [],
});

const ExamPreview = ({ model }) => {

  const universityLeft1 = 'North American';
  const universityLeft2 = 'Private University';
  const universityLeft3 = 'SFAX | TUNISIA';
  const universityLeft4 = 'TECHNOLOGY · BUSINESS · ARCHITECTURE';

  const universityAr = model?.universiteAr || 'الجامعة الشمالية الأمريكية الخاصة';
  const universityFr = model?.universiteFr || 'Université Nord-Américaine Privée';
  const institute = model?.institutFr || 'Institut International de Technologie';
  const department = model?.departementFr || 'Département Informatique';

  const subject = model?.matiere || 'Fouille de données';
  const discipline = model?.discipline || '2ème année Génie Informatique';
  const teachers = model?.enseignants || 'Tarek Ben Said / Taoufik Ben Abdallah';
  const documentsAllowed = model?.documentsAutorises || 'PC & Internet non autorisés';

  const academicYear = model?.anneeUniversitaire || '2024-2025';
  const semester = model?.semestre ? `${model.semestre} (${model.dateExamen})` : '1 (07/11/2024)';
  const duration = model?.duree || '1h30';

  const note1 = 'Le barème est fourni à titre indicatif et peut être ajusté';
  const note2 = `La durée de l'examen est de ${duration}`;
  const note3 = "Les ordinateurs, l'accès à Internet et l'utilisation d'IDE Python sont strictement interdits";

  return (
    <div className="a4-sheet exam-paper">
      {/* En-tête université */}
      <div className="exam-top-header">
        <div className="exam-top-header__left">
          <div>{universityLeft1}</div>
          <div>{universityLeft2}</div>
          <div>{universityLeft3}</div>
          <div className="mini-muted">{universityLeft4}</div>
        </div>

        <div className="exam-top-header__center">
          <div>{universityAr}</div>
          <div>{universityFr}</div>
          <div>{institute}</div>
          <div>{department}</div>
        </div>

        <div className="exam-top-header__right">
          <div className="exam-logo-frame">
            <img src={iitLogo} alt="IIT Logo" className="exam-logo-img" />
          </div>
        </div>
      </div>

      {/* Bloc principal */}
      <div className="exam-box">
        <div className="exam-box__title">
          <div className="exam-box__title-left">
            {model?.titreExamen || 'DEVOIR SURVEILLÉ'} 
          </div>
          <div className="exam-box__title-right" />
        </div>

        <div className="exam-meta-grid">
          <div className="exam-meta-col">
            <div>
              <strong>Matière :</strong> {subject}
            </div>
            <div>
              <strong>Discipline :</strong> {discipline}
            </div>
            <div>
              <strong>Enseignants :</strong> {teachers}
            </div>
            <div>
              <strong>Documents autorisés :</strong> {documentsAllowed}
            </div>
          </div>

          <div className="exam-meta-col">
            <div>
              <strong>Année Universitaire :</strong> {academicYear}
            </div>
            <div>
              <strong>Semestre :</strong> {semester}
            </div>
      
      
            <div>
              <strong>Feuille d'énoncé / Durée :</strong> {duration}
            </div>
          </div>
        </div>

        {(model?.sections?.zoneNomPrenom || model?.sections?.zoneGroupe) && (
          <div className="exam-student-line">
            {model?.sections?.zoneNomPrenom && (
              <div>
                <strong>Prénom & Nom :</strong> <span className="line-fill long-line" />
              </div>
            )}
            {model?.sections?.zoneGroupe && (
              <div className="group-line">
                <strong>Groupe</strong> <span className="line-fill short-line" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note / commentaires / signature */}
      {(model?.sections?.blocNote || model?.sections?.blocCommentaires || model?.sections?.blocSignature) && (
        <div className="exam-score-row">
          {model?.sections?.blocNote && (
            <div className="score-box">
              <div className="score-box-title">Note /20</div>
            </div>
          )}

          {model?.sections?.blocCommentaires && (
            <div className="score-box">
              <div className="score-box-title">Commentaires</div>
            </div>
          )}

          {model?.sections?.blocSignature && (
            <div className="score-box">
              <div className="score-box-title">Signature</div>
            </div>
          )}
        </div>
      )}

      {/* Bloc NB */}
      {model?.sections?.blocRemarques && (
        <div className="exam-note-block">
          <div className="exam-note-title">NB.</div>
          <div>— {note1}</div>
          <div>— {note2}</div>
          <div>— {note3}</div>
        </div>
      )}

      {/* Section questions/exercices */}
      {model?.exercices?.length > 0 && (
        <div className="exam-questions-start">
          <div className="question-instruction">
            <em>Cocher la ou les réponse(s) correcte(s) (Une réponse incorrecte sera notée 0 pour cette question)</em>
          </div>

          {model.exercices
            .filter((ex) => ex.contenu && ex.contenu.trim() && ex.numero)
            .sort((a, b) => parseInt(a.numero) - parseInt(b.numero))
            .map((ex) => (
              <div key={ex.numero} className="question-block">
                <div className="question-title">
                  <strong>Question {ex.numero} {ex.points && `(${ex.points} pts)`}</strong>
                </div>
                <div className="question-text">{ex.contenu}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};


const ModelEditor = ({ model, onBack, onModelUpdate }) => {
  const [current, setCurrent] = useState(model);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const update = useCallback((key, val) => {
    setCurrent((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
    setError('');
  }, []);

  const updateSection = useCallback((key, val) => {
    setCurrent((prev) => ({
      ...prev,
      sections: { ...(prev.sections || {}), [key]: val },
    }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const payload = {
        nom: current.nom,
        type: current.type,
        actif: current.actif,
        langue: current.langue,
        universiteFr: current.universiteFr,
        institutFr: current.institutFr,
        departementFr: current.departementFr,
        universiteAr: current.universiteAr || '',
        institutAr: current.institutAr || '',
        departementAr: current.departementAr || '',
        titreExamen: current.titreExamen,
        matiere: current.matiere,
        discipline: current.discipline,
        enseignants: current.enseignants,
        anneeUniversitaire: current.anneeUniversitaire,
        semestre: current.semestre,
        dateExamen: current.dateExamen,
        duree: current.duree,
        documentsAutorises: current.documentsAutorises,
        feuilleType: current.feuilleType,
        sections: current.sections,
        police: current.police,
        taille: current.taille,
        margeH: parseFloat(current.margeH) || 2,
        margeV: parseFloat(current.margeV) || 2,
        exercices: current.exercices || [],
      };

      const isNew = !current._id;
      const url = isNew
        ? 'http://localhost:5000/api/admin/word-template'
        : `http://localhost:5000/api/admin/word-template/${current._id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || `Erreur ${res.status}`);
      }

      const data = await res.json();
      const updated = normalizeFromServer(data, current._localId);

      setCurrent(updated);
      onModelUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="model-editor-container">
      <div className="editor-header">
        <button className="wt-btn-secondary" onClick={onBack}>
          ← Retour à la liste
        </button>
        <h2 style={{ flex: 1, marginLeft: '16px' }}>{current.nom}</h2>
      </div>

      <section className="wt-editor">
        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Configuration</div>
              <h3 className="wt-card-title">Informations générales</h3>
            </div>
          </div>

          <div className="wt-grid wt-grid-2">
            <div className="wt-field">
              <label className="wt-label">Nom du modèle</label>
              <input
                className="wt-input"
                value={current.nom}
                onChange={(e) => update('nom', e.target.value)}
              />
            </div>

            <div className="wt-field">
              <label className="wt-label">Langue</label>
              <select
                className="wt-select"
                value={current.langue}
                onChange={(e) => update('langue', e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="wt-field">
              <label className="wt-label">Type</label>
              <select
                className="wt-select"
                value={current.type}
                onChange={(e) => update('type', e.target.value)}
              >
                {MODEL_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Institution</div>
              <h3 className="wt-card-title">En-tête institutionnel</h3>
            </div>
          </div>

          <div className="wt-grid wt-grid-2">
            <div className="wt-field">
              <label className="wt-label">Université (FR)</label>
              <div className="wt-static-field">
                {current.universiteFr}
              </div>
            </div>

            <div className="wt-field">
              <label className="wt-label">Institut (FR)</label>
              <div className="wt-static-field">
                {current.institutFr}
              </div>
            </div>

            <div className="wt-field">
              <label className="wt-label">Département (FR)</label>
              <input
                className="wt-input"
                value={current.departementFr}
                onChange={(e) => update('departementFr', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Examen</div>
              <h3 className="wt-card-title">Bloc examen</h3>
            </div>
          </div>

          <div className="wt-grid wt-grid-2">
            <div className="wt-field">
              <label className="wt-label">Titre examen</label>
              <input
                className="wt-input"
                value={current.titreExamen}
                onChange={(e) => update('titreExamen', e.target.value)}
              />
            </div>

           

            <div className="wt-field">
              <label className="wt-label">Matière</label>
              <input
                className="wt-input"
                value={current.matiere}
                onChange={(e) => update('matiere', e.target.value)}
              />
            </div>

            <div className="wt-field">
              <label className="wt-label">Discipline</label>
              <input
                className="wt-input"
                value={current.discipline}
                onChange={(e) => update('discipline', e.target.value)}
              />
            </div>

            <div className="wt-field wt-field-full">
              <label className="wt-label">Enseignants</label>
              <input
                className="wt-input"
                value={current.enseignants}
                onChange={(e) => update('enseignants', e.target.value)}
              />
            </div>

            <div className="wt-field wt-field-full">
              <label className="wt-label">Documents autorisés</label>
              <input
                className="wt-input"
                value={current.documentsAutorises}
                onChange={(e) => update('documentsAutorises', e.target.value)}
              />
            </div>

            <div className="wt-field">
              <label className="wt-label">Année universitaire</label>
              <input
                className="wt-input"
                value={current.anneeUniversitaire}
                onChange={(e) => update('anneeUniversitaire', e.target.value)}
              />
            </div>

            <div className="wt-field">
              <label className="wt-label">Semestre</label>
              <input
                className="wt-input"
                value={current.semestre}
                onChange={(e) => update('semestre', e.target.value)}
              />
            </div>

            <div className="wt-field">
              <label className="wt-label">Date examen</label>
              <input
                className="wt-input"
                value={current.dateExamen}
                onChange={(e) => update('dateExamen', e.target.value)}
              />
            </div>

            
            <div className="wt-field">
              <label className="wt-label">Durée</label>
              <input
                className="wt-input"
                value={current.duree}
                onChange={(e) => update('duree', e.target.value)}
              />
            </div>

            <div className="wt-field">
              <label className="wt-label">Type de feuille</label>
              <input
                className="wt-input"
                value={current.feuilleType}
                onChange={(e) => update('feuilleType', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Affichage</div>
              <h3 className="wt-card-title">Sections affichées</h3>
            </div>
          </div>

          <div className="wt-toggle-grid">
            {Object.entries(current.sections || {}).map(([key, value]) => (
              <label key={key} className="wt-switch-card">
                <div>
                  <div className="wt-switch-card__title">
                    {SECTION_LABELS[key] || key}
                  </div>
                  <div className="wt-switch-card__sub">
                    Activer ou masquer cette zone dans le modèle
                  </div>
                </div>

                <input
                  type="checkbox"
                  className="wt-switch-input"
                  checked={!!value}
                  onChange={(e) => updateSection(key, e.target.checked)}
                />
                <span className="wt-switch-slider" />
              </label>
            ))}
          </div>
        </div>

        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Style</div>
              <h3 className="wt-card-title">Mise en page</h3>
            </div>
          </div>

          <div className="wt-grid wt-grid-2">
            <div className="wt-field">
              <label className="wt-label">Police</label>
              <select
                className="wt-select"
                value={current.police}
                onChange={(e) => update('police', e.target.value)}
              >
                {FONTS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="wt-field">
              <label className="wt-label">Taille</label>
              <select
                className="wt-select"
                value={current.taille}
                onChange={(e) => update('taille', e.target.value)}
              >
                {SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="wt-field">
              <label className="wt-label">Marge H (cm)</label>
              <input
                className="wt-input"
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={current.margeH}
                onChange={(e) => update('margeH', e.target.value)}
              />
            </div>

            <div className="wt-field">
              <label className="wt-label">Marge V (cm)</label>
              <input
                className="wt-input"
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={current.margeV}
                onChange={(e) => update('margeV', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="wt-card">
          <div className="wt-card-header">
            <div>
              <div className="wt-card-eyebrow">Contenu</div>
              <h3 className="wt-card-title">Exercices et questions</h3>
            </div>
            <button
              type="button"
              className="wt-btn-small"
              onClick={() => {
                const newExercice = {
                  numero: '',
                  contenu: '',
                  points: '',
                };
                setCurrent((prev) => ({
                  ...prev,
                  exercices: [...(prev.exercices || []), newExercice],
                }));
                setSaved(false);
              }}
            >
              + Ajouter exercice
            </button>
          </div>

          <div className="wt-exercises-container">
            {current.exercices?.map((ex, idx) => (
              <div key={idx} className="wt-exercise-card">
                <div className="wt-exercise-header">
                  <label className="wt-label">Numéro</label>
                  <button
                    type="button"
                    className="wt-btn-remove"
                    onClick={() => {
                      setCurrent((prev) => ({
                        ...prev,
                        exercices: prev.exercices.filter((_, i) => i !== idx),
                      }));
                      setSaved(false);
                    }}
                    title="Supprimer cet exercice"
                  >
                    ✕
                  </button>
                </div>
                <input
                  className="wt-input wt-input-numero"
                  type="number"
                  placeholder="Ex: 1, 2, 3..."
                  min="1"
                  value={ex.numero}
                  onChange={(e) => {
                    const newExercices = [...(current.exercices || [])];
                    newExercices[idx] = { ...ex, numero: e.target.value };
                    setCurrent((prev) => ({ ...prev, exercices: newExercices }));
                    setSaved(false);
                  }}
                />
                <label className="wt-label" style={{ marginTop: '10px' }}>Contenu</label>
                <textarea
                  className="wt-textarea"
                  placeholder="Contenu de l'exercice..."
                  value={ex.contenu}
                  onChange={(e) => {
                    const newExercices = [...(current.exercices || [])];
                    newExercices[idx] = { ...ex, contenu: e.target.value };
                    setCurrent((prev) => ({ ...prev, exercices: newExercices }));
                    setSaved(false);
                  }}
                  rows="4"
                />
                <label className="wt-label" style={{ marginTop: '10px' }}>Points (optionnel)</label>
                <input
                  className="wt-input wt-input-small"
                  type="number"
                  placeholder="Points"
                  value={ex.points}
                  onChange={(e) => {
                    const newExercices = [...(current.exercices || [])];
                    newExercices[idx] = { ...ex, points: e.target.value };
                    setCurrent((prev) => ({ ...prev, exercices: newExercices }));
                    setSaved(false);
                  }}
                />
              </div>
            ))}
          </div>

          {(!current.exercices || current.exercices.length === 0) && (
            <div className="wt-empty-state">
              Aucun exercice ajouté. Cliquez sur "Ajouter exercice" pour commencer.
            </div>
          )}
        </div>

        {error && <div className="wt-error">{error}</div>}
      </section>

      <div className="wt-footer-actions">
        <button
          className="wt-btn-secondary"
          onClick={() => setShowPreview(true)}
        >
          Aperçu A4
        </button>

        <button
          className="wt-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      {showPreview && (
        <div
          className="preview-modal-overlay"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {current.nom}</div>
              <button
                className="preview-modal-close"
                onClick={() => setShowPreview(false)}
              >
                ✕
              </button>
            </div>

            <div className="preview-modal-content">
              <ExamPreview model={current} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelEditor;
