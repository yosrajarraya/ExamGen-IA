import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiX, FiEye } from 'react-icons/fi';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import { getExamDrafts, deleteExamDraft } from '../../api/enseignant/Enseignant.api';
import '../../styles/ExamBank.css';

const Drafts = () => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true); setError('');
      const res = await getExamDrafts();
      setDrafts(Array.isArray(res?.drafts) ? res.drafts : []);
    } catch (e) {
      setError(e?.message || 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteExamDraft(id);
      setDeleteConfirm(null);
      load();
    } catch (e) { setError(e?.message || 'Erreur'); }
  };

  return (
    <div className="eb-layout">
      <Sidebar navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} />
      
      {/* Popup de visualisation de l'examen */}
      {selectedExam && (
        <div className="eb-modal-overlay">
          <div className="eb-modal">
            {/* Header du popup */}
            <div className="eb-modal-header">
              <div className="eb-modal-header-left">
                <div>
                  <div className="eb-modal-title">{selectedExam.title || 'Examen sans titre'}</div>
                  <div className="eb-modal-meta-row">
                    {selectedExam.matiere && <span className="eb-modal-chip">{selectedExam.matiere}</span>}
                    {selectedExam.niveau && <span className="eb-modal-chip">{selectedExam.niveau}</span>}
                    {selectedExam.duree && <span className="eb-modal-chip">{selectedExam.duree}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="eb-modal-close"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="eb-modal-body eb-modal-body--doc">
              <div className="eb-word-doc">
                {/* Header Table - Exam Info */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '16px',
                  border: '1.5px solid #000'
                }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', fontWeight: 'bold', width: '50%' }}>
                        <strong>Matière :</strong> {selectedExam.matiere || '...'}
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', fontWeight: 'bold' }}>
                        <strong>Classe :</strong> {selectedExam.niveau || '...'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px' }}>
                        <strong>Enseignant :</strong> {selectedExam.createdByName || user?.Prenom + ' ' + user?.Nom}
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px' }}>
                        <strong>Durée :</strong> {selectedExam.duree || '2 heures'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Student Info Table */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '16px',
                  border: '1.5px solid #000'
                }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', width: '50%' }}>
                        <strong>Prénom & Nom :</strong> _________________________________
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px' }}>
                        <strong>Groupe :</strong> _______
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Grading Table */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '16px',
                  border: '1.5px solid #000'
                }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', fontWeight: 'bold', width: '33.33%' }}>
                        <strong>Note /20</strong>
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', fontWeight: 'bold', width: '33.33%' }}>
                        <strong>Commentaires</strong>
                      </td>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', fontWeight: 'bold', width: '33.33%' }}>
                        <strong>Signature</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1.5px solid #000', padding: '20px 10px', height: '60px' }}></td>
                      <td style={{ border: '1.5px solid #000', padding: '20px 10px', height: '60px' }}></td>
                      <td style={{ border: '1.5px solid #000', padding: '20px 10px', height: '60px' }}></td>
                    </tr>
                  </tbody>
                </table>

                {/* Instructions */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '16px',
                  border: '1.5px solid #000'
                }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', fontWeight: 'bold' }}>
                        <strong>N.B.</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1.5px solid #000', padding: '8px 10px', minHeight: '60px' }}>
                        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                          • Le barème est fourni à titre indicatif et peut être ajusté<br />
                          • La durée de l'examen est de {selectedExam.duree || '2h'}<br />
                          • Les ordinateurs, l'accès à internet sont strictement interdits
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Sections and Questions */}
                {selectedExam.sections?.map((section, secIdx) => (
                  <div key={secIdx} style={{ marginBottom: '16px' }}>
                    <h2 style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      margin: '12px 0 8px',
                      color: '#000'
                    }}>
                      Partie {secIdx + 1} — {section.title}
                    </h2>

                    {section.exercises?.map((exercise, exoIdx) => (
                      <div key={exoIdx} style={{ marginBottom: '12px' }}>
                        <p style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          margin: '8px 0 4px',
                          color: '#000'
                        }}>
                          {exercise.title} {exercise.points && `(${exercise.points} pts)`}
                        </p>

                        {exercise.questions?.map((question, qIdx) => (
                          <div key={qIdx} style={{ marginBottom: '10px', marginLeft: '18px' }}>
                            <p style={{
                              fontSize: '11px',
                              margin: '4px 0',
                              fontWeight: 'bold',
                              color: '#000'
                            }}>
                              {qIdx + 1}. {question.text} {question.points && `[${question.points} pts]`}
                            </p>

                            {/* QCM Options */}
                            {question.options && question.options.length > 0 && (
                              <div style={{ marginLeft: '18px', marginBottom: '8px' }}>
                                {question.options.map((opt, optIdx) => (
                                  <p key={optIdx} style={{
                                    fontSize: '10px',
                                    margin: '2px 0',
                                    color: '#000'
                                  }}>
                                    ☐ {String.fromCharCode(97 + optIdx)}) {opt.text}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Answer Lines for Open Questions */}
                            {question.type === 'ouverte' && (
                              <div style={{ marginLeft: '18px', marginTop: '6px', marginBottom: '8px' }}>
                                {Array.from({ length: question.answerLines || 3 }).map((_, i) => (
                                  <div key={i} style={{
                                    borderBottom: '1px dotted #999',
                                    height: '14px',
                                    marginBottom: '3px'
                                  }} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer avec boutons d'action */}
            <div className="eb-modal-footer">
              <button
                onClick={() => setSelectedExam(null)}
                className="eb-modal-btn eb-modal-btn--ghost"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setSelectedExam(null);
                  navigate(`/enseignant/exams/create?editDraft=${selectedExam.id}`);
                }}
                className="eb-modal-btn eb-modal-btn--copy"
              >
                <FiEdit2 size={16} /> Modifier
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main className="eb-main">
        <div className="eb-header">
          <div>
            <div className="eb-header-eyebrow">Banque</div>
            <div className="eb-header-title">Brouillons</div>
            <div className="eb-header-sub">Gérez vos brouillons sauvegardés</div>
          </div>
        </div>

        <section className="eb-section">
          {error && <div className="eb-alert eb-alert--error">{error}</div>}
          {loading && <div className="eb-loading"><div className="eb-loading-dots"><span/><span/><span/></div><div>Chargement…</div></div>}

          <div className="eb-cards-grid">
            {!loading && drafts.length === 0 && (
              <div className="eb-empty" style={{ gridColumn: '1 / -1' }}>
                <div className="eb-empty-icon">📝</div>
                <div className="eb-empty-msg">Aucun brouillon</div>
                <div className="eb-header-sub">Vos brouillons sauvegardés apparaîtront ici</div>
              </div>
            )}
            {drafts.map((d) => (
              <div key={d.id} className="eb-card" onClick={() => setSelectedExam(d)}>
                <div className="eb-card-top">
                  <span className={`eb-card-status eb-status--draft`}>Brouillon</span>
                  <span className="eb-card-author">{d.createdByName || 'Vous'}</span>
                </div>
                
                <h3 className="eb-card-title">{d.title || 'Sans titre'}</h3>
                
                <div className="eb-card-tags">
                  {d.matiere && <span className="eb-tag eb-tag--blue">{d.matiere}</span>}
                  {d.filiere && <span className="eb-tag">{d.filiere}</span>}
                  {d.niveau && <span className="eb-tag eb-tag--level">{d.niveau}</span>}
                </div>
                
                <div className="eb-card-meta">
                  <div className="eb-card-meta-item">
                    <span className="eb-card-meta-label">Durée</span>
                    <span className="eb-card-meta-value">{d.duree || 'Non définie'}</span>
                  </div>
                  <div className="eb-card-meta-item">
                    <span className="eb-card-meta-label">Note totale</span>
                    <span className="eb-card-meta-value">{d.noteTotale ? `${d.noteTotale} pts` : 'N/A'}</span>
                  </div>
                  <div className="eb-card-meta-item">
                    <span className="eb-card-meta-label">Questions</span>
                    <span className="eb-card-meta-value">{d.sections?.flatMap(s => (s.exercises||[]).flatMap(e => e.questions||[])).length || 0}</span>
                  </div>
                  <div className="eb-card-meta-item">
                    <span className="eb-card-meta-label">Sections</span>
                    <span className="eb-card-meta-value">{d.sections?.length || 0}</span>
                  </div>
                </div>
                
                <div className="eb-card-footer">
                  <span className="eb-card-date">
                    📅 {new Date(d.createdAt).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className="eb-modal-btn eb-modal-btn--dl" 
                      style={{ padding: '6px 10px' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedExam(d); }}
                      title="Visualiser"
                    >
                      <FiEye size={14}/>
                    </button>
                    <button 
                      className="eb-modal-btn eb-modal-btn--copy" 
                      style={{ padding: '6px 10px' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/enseignant/exams/create?editDraft=${d.id}`); }}
                      title="Modifier"
                    >
                      <FiEdit2 size={14}/>
                    </button>
                    <button 
                      className="eb-modal-btn eb-modal-btn--del" 
                      style={{ padding: '6px 10px' }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                      title="Supprimer"
                    >
                      <FiTrash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Drafts;
