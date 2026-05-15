import { useEffect, useRef, useState } from 'react';
import {
  FiX, FiSearch, FiCornerDownRight, FiDatabase, FiLoader, FiCheck
} from 'react-icons/fi';
import { getExerciseBank } from '../../../api/enseignant/Enseignant.api';
import '../../../styles/QuestionBankModal.css';

/**
 * Modal professionnelle pour la Banque d'Exercices
 * Affichage complet avec recherche, filtrage et insertion d'exercices
 */
const QuestionBankModal = ({ isOpen, onClose, onInsertFromBank }) => {
  const [bankItems, setBankItems] = useState({ mes: [], autres: [] });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTypeFilter, setBankTypeFilter] = useState('');
  const [bankTab, setBankTab] = useState('mes');
  const [selectedIds, setSelectedIds] = useState([]);
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);

  /* Charge la banque au premier accès */
  useEffect(() => {
    if (!isOpen || bankItems.mes.length > 0 || bankItems.autres.length > 0) return;
    
    (async () => {
      setBankLoading(true);
      try {
        const data = await getExerciseBank();
        const mes = Array.isArray(data?.mesExercices) ? data.mesExercices : [];
        const autres = Array.isArray(data?.autresExercices) ? data.autresExercices : [];
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

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
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

  const toggleSelection = (exerciseId) => {
    setSelectedIds((prev) => (
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    ));
  };

  const clearSelection = () => setSelectedIds([]);

  const handleInsertSelected = async () => {
    const allExercises = [...(bankItems.mes || []), ...(bankItems.autres || [])];
    const exercisesToInsert = allExercises.filter((exercise) => selectedIds.includes(exercise.id));

    if (exercisesToInsert.length === 0) return;

    for (const exercise of exercisesToInsert) {
      // on insère un exercice à la fois pour garder le flux existant côté éditeur
      // eslint-disable-next-line no-await-in-loop
      await onInsertFromBank(exercise);
    }

    clearSelection();
    onClose();
  };

  /* Filtrer la liste */
  const currentList = (bankItems[bankTab] || []).filter(q => {
    const s = bankSearch.trim().toLowerCase();
    const type = (bankTypeFilter || '').trim();
    
    if (type) {
      const exerciseType = Array.isArray(q.questions) && q.questions.length > 1 ? 'multiple' : 'single';
      if (exerciseType !== type) return false;
    }

    const haystack = [q.title, q.matiere, q.niveau, q.anneeUniversitaire, ...(Array.isArray(q.questions) ? q.questions.map((question) => question.text) : [])].join(' ').toLowerCase();
    return !s || haystack.includes(s);
  });

  const selectedCount = selectedIds.length;

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
              <h2 className="qbm-title">Banque d'Exercices</h2>
              <p className="qbm-subtitle">Sélectionnez et insérez des exercices existants</p>
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
              <span>Mes Exercices</span>
              <span className="qbm-tab-count">{bankItems.mes.length}</span>
            </button>
            <button
              className={`qbm-tab ${bankTab === 'autres' ? 'qbm-tab--active' : ''}`}
              onClick={() => setBankTab('autres')}
            >
              <span>Exercices Partagés</span>
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
                placeholder="Rechercher un exercice…"
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
              <option value="">Tous les formats</option>
              <option value="single">Exercice simple</option>
              <option value="multiple">Exercice multi-questions</option>
            </select>
          </div>

          {selectedCount > 0 && (
            <div className="qbm-selection-bar">
              <span>{selectedCount} exercice{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}</span>
              <button type="button" className="qbm-selection-clear" onClick={clearSelection}>
                Effacer la sélection
              </button>
            </div>
          )}

          {/* Liste des exercices */}
          <div className="qbm-list">
            {bankLoading ? (
              <div className="qbm-loading">
                <FiLoader size={24} className="qbm-loading-icon" />
                <p>Chargement des exercices…</p>
              </div>
            ) : currentList.length === 0 ? (
              <div className="qbm-empty">
                <div className="qbm-empty-icon">
                  <FiDatabase size={40} />
                </div>
                <p className="qbm-empty-title">
                  {bankSearch ? 'Aucun résultat' : 'Aucun exercice disponible'}
                </p>
                <p className="qbm-empty-text">
                  {bankSearch
                    ? 'Essayez une autre recherche ou un autre filtre'
                    : 'Commencez par créer des exercices'}
                </p>
              </div>
            ) : (
              <div className="qbm-items">
                {currentList.map((q) => {
                  const questionsCount = Array.isArray(q.questions) ? q.questions.length : 0;
                  const preview = questionsCount > 0 ? q.questions[0]?.text || '' : '';
                  return (
                  <div
                    key={q.id}
                    className={`qbm-item${selectedIds.includes(q.id) ? ' qbm-item--selected' : ''}`}
                    onClick={() => toggleSelection(q.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSelection(q.id);
                      }
                    }}
                  >
                    <div className="qbm-item-header">
                      <button
                        type="button"
                        className={`qbm-item-select${selectedIds.includes(q.id) ? ' qbm-item-select--on' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(q.id);
                        }}
                        title={selectedIds.includes(q.id) ? 'Retirer de la sélection' : 'Sélectionner cet exercice'}
                      >
                        <FiCheck size={12} />
                      </button>
                      <span className="qbm-item-type">
                        {questionsCount > 1 ? '🧩 Exercice multi-questions' : '🧩 Exercice simple'}
                      </span>
                      {q.matiere && <span className="qbm-item-subject">{q.matiere}</span>}
                    </div>
                    <p className="qbm-item-text">{q.title || 'Exercice sans titre'}</p>
                    <p className="qbm-item-text" style={{ opacity: 0.8 }}>
                      {preview || 'Aucune question disponible'}
                    </p>
                    <button
                      className="qbm-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInsertFromBank(q);
                      }}
                      title="Insérer cet exercice dans l'examen actif"
                    >
                      <FiCornerDownRight size={14} />
                      <span>Insérer</span>
                    </button>
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>

        {/* Pied de page avec info */}
        <div className="qbm-footer">
          <p className="qbm-footer-info">
            {currentList.length > 0
              ? `${currentList.length} exercice${currentList.length > 1 ? 's' : ''} trouvé${currentList.length > 1 ? 's' : ''}`
              : bankLoading
              ? 'Chargement…'
              : 'Aucun exercice'}
          </p>
          <div className="qbm-footer-actions">
            <button
              type="button"
              className="qbm-footer-btn qbm-footer-btn--ghost"
              onClick={clearSelection}
              disabled={selectedCount === 0}
            >
              Tout effacer
            </button>
            <button
              type="button"
              className="qbm-footer-btn qbm-footer-btn--primary"
              onClick={handleInsertSelected}
              disabled={selectedCount === 0}
            >
              Insérer la sélection{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankModal;
