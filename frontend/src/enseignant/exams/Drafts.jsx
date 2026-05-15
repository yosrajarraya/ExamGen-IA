import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
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
    if (!window.confirm('Supprimer ce brouillon ?')) return;
    try {
      await deleteExamDraft(id);
      load();
    } catch (e) { setError(e?.message || 'Erreur'); }
  };

  return (
    <div className="eb-layout">
      <Sidebar navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} />
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 18 }}>
            {!loading && drafts.length === 0 && (
              <div className="eb-empty-row">Aucun brouillon.</div>
            )}
            {drafts.map((d) => (
              <div key={d.id} className="eb-card" onClick={() => navigate(`/enseignant/exams/create?editDraft=${d.id}`)}>
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
                <div className="eb-card-meta" style={{ marginTop: 10 }}>
                  <span>Questions: {d.sections?.flatMap(s => (s.exercises||[]).flatMap(e => e.questions||[])).length || 0}</span>
                </div>
                <div className="eb-card-footer" style={{ marginTop: 12 }}>
                  <span className="eb-card-date">{new Date(d.createdAt).toLocaleString()}</span>
                  <div>
                    <button className="eb-modal-btn eb-modal-btn--copy" style={{ marginRight: 8 }} onClick={(e) => { e.stopPropagation(); navigate(`/enseignant/exams/create?editDraft=${d.id}`); }}><FiEdit2 size={14}/> Editer</button>
                    <button className="eb-modal-btn eb-modal-btn--del" onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}><FiTrash2 size={14}/> Supprimer</button>
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
