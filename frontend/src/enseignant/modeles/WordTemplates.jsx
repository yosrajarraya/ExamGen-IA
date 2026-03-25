import { useState, useEffect } from 'react';
import { getWordTemplates } from '../../api/enseignant/Enseignant.api';
import Sidebar from '../../components/sidebar/Sidebar';
import useAuth from '../../context/useAuth';
import '../../components/sidebar/Sidebar.css';
import '../profil/Profil.css';
import '../../admin/modeles/WordTemplate.css';
/* L'import suivant stabilise le clickable row et le modal déjà définis ci-dessous */
import './WordTemplates.css';

const A4Preview = ({ config }) => (
  <div className="a4-sheet" style={{
    fontFamily: config.police || 'Arial',
    fontSize: config.taille || '11pt',
    paddingLeft: `${config.margeH || 2}cm`,
    paddingRight: `${config.margeH || 2}cm`,
    paddingTop: `${config.margeV || 2}cm`,
    paddingBottom: `${config.margeV || 2}cm`,
  }}>
    <div className="exam-header-top">
      <div className="exam-header-left">
        <div className="small-header">{config.universiteFr || 'Université'}</div>
        <div className="small-header">{config.institutFr || 'Institut'}</div>
      </div>
      <div className="exam-header-center">
        <div className="header-fr">{config.universiteFr || 'Université'}</div>
        <div className="header-fr">{config.institutFr || 'Institut'}</div>
        <div className="header-fr">{config.departementFr || 'Département'}</div>
      </div>
      <div className="exam-header-right">
        <div className="iit-logo-box">IIT</div>
      </div>
    </div>
    <div className="exam-main-box">
      <div className="exam-title-row">
        <div className="exam-title-left">{config.titreExamen || 'Examen'} {config.codeExamen || ''}</div>
        <div className="exam-title-right">{config.langue || ''}</div>
      </div>
      <div className="exam-info-grid">
        <div className="exam-info-left">
          <div><strong>Matière :</strong> {config.matiere || '-'}</div>
          <div><strong>Discipline :</strong> {config.discipline || '-'}</div>
          <div><strong>Enseignants :</strong> {config.enseignants || '-'}</div>
          <div><strong>Documents :</strong> {config.documentsAutorises || '-'}</div>
        </div>
        <div className="exam-info-right">
          <div><strong>Année :</strong> {config.anneeUniversitaire || '-'}</div>
          <div><strong>Semestre :</strong> {config.semestre || '-'}</div>
          <div><strong>Date :</strong> {config.dateExamen || '-'}</div>
        </div>
      </div>
      <div className="exam-student-row">
        <div><strong>Nom :</strong> ________________________</div>
        <div><strong>Groupe :</strong> _________________</div>
      </div>
      <div className="exam-marking-row">
        <div className="mark-box">Exercice 1</div>
        <div className="mark-box large">Enoncé...</div>
        <div className="mark-box">/20</div>
      </div>
    </div>
  </div>
);

const WordTemplates = () => {
  const { user, logout } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const NAV_ITEMS = [
    { label: 'Mon profil',   path: '/enseignant/profil' },
    { label: 'Modèles Word', path: '/enseignant/modeles-word' },
  ];

  const initiales = user
    ? `${user.Prenom?.[0] ?? ''}${user.Nom?.[0] ?? ''}`.toUpperCase()
    : 'E';

  const profile = {
    name: `${user?.Prenom || ''} ${user?.Nom || ''}`.trim() || 'Enseignant',
    email: user?.Email || '',
    avatar: initiales,
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getWordTemplates();
        setTemplates(data);
      } catch (err) {
        console.error('Erreur getWordTemplates:', err);
        setError(err.response?.data?.message || err.message || 'Erreur lors du chargement des modèles');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="profil-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={NAV_ITEMS}
        profile={profile}
        onLogout={logout}
      />
      <main className="profil-main">
        <div className="profil-topbar">
          <h1 className="profil-page-title">Modèles Word</h1>
          <p>{templates.length} modèle{templates.length > 1 ? 's' : ''}</p>
        </div>

        <div className="profil-content">
          {loading ? (
            <div className="state-empty">Chargement...</div>
          ) : error ? (
            <div className="state-empty">{error}</div>
          ) : templates.length === 0 ? (
            <div className="state-empty">Aucun modèle trouvé.</div>
          ) : (
            <div className="table-wrapper">
              <table className="ens-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Langue</th>
                    <th>Actif</th>
                    <th>Dernière mise à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr
                      key={t._id}
                      className="wt-row-clickable"
                      onClick={() => { setSelected(t); setShowPreview(true); }}
                    >
                      <td>{t.nom}</td>
                      <td>{t.type}</td>
                      <td>{t.langue}</td>
                      <td>{t.actif ? 'Oui' : 'Non'}</td>
                      <td>{new Date(t.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showPreview && selected && (
        <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-modal-title">Aperçu — {selected.nom}</div>
              <button className="preview-modal-close" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="preview-modal-content">
              <A4Preview config={selected} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WordTemplates;
