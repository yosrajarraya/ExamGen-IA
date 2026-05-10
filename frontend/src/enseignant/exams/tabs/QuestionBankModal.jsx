import { useEffect, useRef, useState } from 'react';
import {
  FiX, FiSearch, FiCornerDownRight, FiDatabase, FiLoader
} from 'react-icons/fi';
import { getQuestionBank } from '../../../api/enseignant/Enseignant.api';
import '../../../styles/QuestionBankModal.css';

/**
 * Modal professionnelle pour la Banque de Questions
 * Affichage complet avec recherche, filtrage et insertion de questions
 */
const QuestionBankModal = ({ isOpen, onClose, onInsertFromBank }) => {
  const [bankItems, setBankItems] = useState({ mes: [], autres: [] });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTypeFilter, setBankTypeFilter] = useState('');
  const [bankTab, setBankTab] = useState('mes');
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);

  /* Charge la banque au premier accès */
  useEffect(() => {
    if (!isOpen || bankItems.mes.length > 0 || bankItems.autres.length > 0) return;
    
    (async () => {
      setBankLoading(true);
      try {
        const data = await getQuestionBank();
        const mes = Array.isArray(data?.mesQuestions) ? data.mesQuestions : [];
        const autres = Array.isArray(data?.autresQuestions) ? data.autresQuestions : [];
        setBankItems({ mes, autres });
      } catch (err) {
        console.error('Erreur chargement banque:', err);
        setBankItems({ mes: [], autres: [] });
      } finally {
        setBankLoading(false);
      }
    })();
  }, [isOpen, bankItems]);

  /* Focus sur la barre de recherche */
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  /* Fermeture par Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /* Fermeture au clic en dehors */
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  /* Filtrer la liste */
  const currentList = (bankItems[bankTab] || []).filter(q => {
    const s = bankSearch.trim().toLowerCase();
    const type = (bankTypeFilter || '').trim();
    
    if (type) {
      const qType = q.type || (Array.isArray(q.options) && q.options.length ? 'qcm' : 'ouverte');
      const normalized = (qType === 'qcm' || qType === 'qcm_multiple' || qType === 'qcm_unique') ? 'qcm' : qType;
      if (normalized !== type) return false;
    }
    
    return !s || (q.text || '').toLowerCase().includes(s) || (q.matiere || '').toLowerCase().includes(s);
  });

  if (!isOpen) return null;

  return (
    <div className="qbm-backdrop" ref={modalRef} onClick={handleBackdropClick}>
      <div className="qbm-modal">
        {/* En-tête */}
        <div className="qbm-header">
          <div className="qbm-header-content">
            <div className="qbm-header-icon">
              <FiDatabase size={24} />
            </div>
            <div>
              <h2 className="qbm-title">Banque de Questions</h2>
              <p className="qbm-subtitle">Sélectionnez et insérez des questions existantes</p>
            </div>
          </div>
          <button className="qbm-close-btn" onClick={onClose} title="Fermer (Esc)">
            <FiX size={22} />
          </button>
        </div>

        {/* Contenu */}
        <div className="qbm-content">
          {/* Onglets */}
          <div className="qbm-tabs">
            <button
              className={`qbm-tab ${bankTab === 'mes' ? 'qbm-tab--active' : ''}`}
              onClick={() => setBankTab('mes')}
            >
              <span>Mes Questions</span>
              <span className="qbm-tab-count">{bankItems.mes.length}</span>
            </button>
            <button
              className={`qbm-tab ${bankTab === 'autres' ? 'qbm-tab--active' : ''}`}
              onClick={() => setBankTab('autres')}
            >
              <span>Questions Partagées</span>
              <span className="qbm-tab-count">{bankItems.autres.length}</span>
            </button>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="qbm-search-bar">
            <div className="qbm-search-wrapper">
              <FiSearch size={16} className="qbm-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher une question…"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="qbm-search-input"
              />
              {bankSearch && (
                <button
                  className="qbm-search-clear"
                  onClick={() => setBankSearch('')}
                  title="Effacer"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
            <select
              className="qbm-type-filter"
              value={bankTypeFilter}
              onChange={(e) => setBankTypeFilter(e.target.value)}
            >
              <option value="">Tous les types</option>
              <option value="ouverte">Ouverte</option>
              <option value="qcm">QCM</option>
              <option value="vrai_faux">Vrai / Faux</option>
              <option value="pratique">Pratique</option>
              <option value="enonce">Énoncé</option>
            </select>
          </div>

          {/* Liste des questions */}
          <div className="qbm-list">
            {bankLoading ? (
              <div className="qbm-loading">
                <FiLoader size={24} className="qbm-loading-icon" />
                <p>Chargement des questions…</p>
              </div>
            ) : currentList.length === 0 ? (
              <div className="qbm-empty">
                <div className="qbm-empty-icon">
                  <FiDatabase size={40} />
                </div>
                <p className="qbm-empty-title">
                  {bankSearch ? 'Aucun résultat' : 'Aucune question disponible'}
                </p>
                <p className="qbm-empty-text">
                  {bankSearch
                    ? 'Essayez une autre recherche ou un autre filtre'
                    : 'Commencez par créer des questions'}
                </p>
              </div>
            ) : (
              <div className="qbm-items">
                {currentList.map((q) => (
                  <div key={q.id} className="qbm-item">
                    <div className="qbm-item-header">
                      <span className="qbm-item-type">
                        {q.type === 'qcm_unique' || q.type === 'qcm_multiple' || q.type === 'qcm'
                          ? '📋 QCM'
                          : q.type === 'vrai_faux'
                          ? '✓ Vrai/Faux'
                          : q.type === 'ouverte'
                          ? '✎ Ouverte'
                          : q.type === 'pratique'
                          ? '⚙ Pratique'
                          : '📄 Énoncé'}
                      </span>
                      {q.matiere && <span className="qbm-item-subject">{q.matiere}</span>}
                    </div>
                    <p className="qbm-item-text">
                      {(q.text || '').length > 120 ? q.text.slice(0, 120) + '…' : q.text}
                    </p>
                    <button
                      className="qbm-item-btn"
                      onClick={() => onInsertFromBank(q)}
                      title="Insérer cette question dans l'exercice actif"
                    >
                      <FiCornerDownRight size={14} />
                      <span>Insérer</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pied de page avec info */}
        <div className="qbm-footer">
          <p className="qbm-footer-info">
            {currentList.length > 0
              ? `${currentList.length} question${currentList.length > 1 ? 's' : ''} trouvée${currentList.length > 1 ? 's' : ''}`
              : bankLoading
              ? 'Chargement…'
              : 'Aucune question'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankModal;
