import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/sidebar/Sidebar';
import useAuth from '../../context/useAuth';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  FiSearch,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiEye,
  FiTrash2,
  FiPlus,
  FiAlertCircle
} from 'react-icons/fi';
import '../../styles/TemplateSelector.css';

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Normalize string for comparison (lowercase, remove accents)
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Format date
const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '–';
  }
};

// Template type labels
const TEMPLATE_TYPES = {
  final: 'Examen Final',
  cc: 'Contrôle Continu',
  rattrapage: 'Examen Rattrapage'
};

const PER_PAGE = 9; // 3 columns × 3 rows

/* ── TemplateCard Component ── */
const TemplateCard = ({ template, onSelect, onPreview, onDelete, isAdmin }) => {
  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <span className="ts-card-type">{TEMPLATE_TYPES[template.type] || template.type}</span>
        {template.actif ? (
          <span style={{ fontSize: '.68rem', color: '#0d7a55', fontWeight: 600 }}>✓ Actif</span>
        ) : (
          <span style={{ fontSize: '.68rem', color: '#c0334a', fontWeight: 600 }}>✗ Inactif</span>
        )}
      </div>

      <h3 className="ts-card-title">{template.nom || 'Modèle sans titre'}</h3>

      <div className="ts-card-description">
        {template.matiere && `${template.matiere} • `}
        {template.discipline && `${template.discipline}`}
      </div>

      <div className="ts-card-metadata">
        {template.matiere && <span>📚 {template.matiere}</span>}
        {template.duree && <span>⏱ {template.duree}</span>}
        {template.examCount > 0 && <span>📊 {template.examCount} examen(s)</span>}
      </div>

      <div className="ts-card-footer">
        <span className="ts-card-date">{formatDate(template.createdAt)}</span>
        <div className="ts-card-actions">
          <button
            className="ts-card-btn"
            onClick={() => onSelect(template)}
            title="Sélectionner ce modèle"
          >
            <FiCheck size={14} /> Sélectionner
          </button>
          <button
            className="ts-card-btn"
            onClick={() => onPreview(template)}
            title="Aperçu du modèle"
          >
            <FiEye size={14} />
          </button>
          {isAdmin && (
            <button
              className="ts-card-btn ts-card-btn--delete"
              onClick={() => onDelete(template.id)}
              title="Supprimer ce modèle"
            >
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Pagination Component ── */
const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;

  return (
    <div className="ts-pagination">
      <button
        className="ts-page-btn"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        title="Page précédente"
      >
        <FiChevronLeft size={16} />
      </button>

      <div className="ts-page-nums">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={`ts-page-num ${p === page ? 'ts-page-num--active' : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        className="ts-page-btn"
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        title="Page suivante"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
};

/* ── TemplateSelectionModal Component ── */
const TemplateSelectionModal = ({ template, isOpen, onClose, onGenerate }) => {
  const [formData, setFormData] = useState({
    title: '',
    matiere: '',
    departement: '',
    niveau: '',
    duree: '',
    noteTotale: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.titreExamen || '',
        matiere: template.matiere || '',
        departement: template.departementFr || '',
        niveau: template.semestre || '',
        duree: template.duree || '',
        noteTotale: '20'
      });
      setErrors({});
    }
  }, [template]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Le titre est requis';
    if (!formData.matiere.trim()) newErrors.matiere = 'La matière est requise';
    if (!formData.departement.trim()) newErrors.departement = 'Le département est requis';
    if (!formData.niveau.trim()) newErrors.niveau = 'Le niveau est requis';
    if (!formData.duree.trim()) newErrors.duree = 'La durée est requise';
    if (!formData.noteTotale || isNaN(formData.noteTotale)) newErrors.noteTotale = 'La note totale doit être un nombre';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onGenerate(formData);
    }
  };

  if (!isOpen || !template) return null;

  return (
    <div className="ts-modal-overlay" onClick={onClose}>
      <div className="ts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ts-modal-header">
          <div>
            <h2 className="ts-modal-title">{template.nom}</h2>
            <div className="ts-modal-meta">
              {template.matiere && <span className="ts-modal-chip">{template.matiere}</span>}
              {template.discipline && <span className="ts-modal-chip">{template.discipline}</span>}
              {template.duree && <span className="ts-modal-chip">⏱ {template.duree}</span>}
            </div>
          </div>
          <button className="ts-modal-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className="ts-modal-body">
          <div className="ts-modal-preview">
            <strong>Aperçu du modèle:</strong>
            <p style={{ marginTop: '8px', fontSize: '.8rem' }}>
              {template.universiteFr && `${template.universiteFr} • `}
              {template.institutFr && `${template.institutFr}`}
            </p>
            <p style={{ marginTop: '4px', fontSize: '.8rem', color: '#6b7a99' }}>
              {template.enseignants && `Enseignant(s): ${template.enseignants}`}
            </p>
          </div>

          <div className="ts-modal-form">
            <div className="ts-form-group">
              <label className="ts-form-label">Titre de l'examen *</label>
              <input
                type="text"
                className={`ts-form-input ${errors.title ? 'ts-form-error' : ''}`}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Examen de Mathématiques"
              />
              {errors.title && <span className="ts-form-error-msg">{errors.title}</span>}
            </div>

            <div className="ts-form-group">
              <label className="ts-form-label">Matière *</label>
              <input
                type="text"
                className={`ts-form-input ${errors.matiere ? 'ts-form-error' : ''}`}
                value={formData.matiere}
                onChange={(e) => setFormData({ ...formData, matiere: e.target.value })}
                placeholder="Ex: Mathématiques"
              />
              {errors.matiere && <span className="ts-form-error-msg">{errors.matiere}</span>}
            </div>

            <div className="ts-form-group">
              <label className="ts-form-label">Département *</label>
              <input
                type="text"
                className={`ts-form-input ${errors.departement ? 'ts-form-error' : ''}`}
                value={formData.departement}
                onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                placeholder="Ex: Département Informatique"
              />
              {errors.departement && <span className="ts-form-error-msg">{errors.departement}</span>}
            </div>

            <div className="ts-form-group">
              <label className="ts-form-label">Niveau/Année *</label>
              <input
                type="text"
                className={`ts-form-input ${errors.niveau ? 'ts-form-error' : ''}`}
                value={formData.niveau}
                onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                placeholder="Ex: 2ème année"
              />
              {errors.niveau && <span className="ts-form-error-msg">{errors.niveau}</span>}
            </div>

            <div className="ts-form-group">
              <label className="ts-form-label">Durée *</label>
              <input
                type="text"
                className={`ts-form-input ${errors.duree ? 'ts-form-error' : ''}`}
                value={formData.duree}
                onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
                placeholder="Ex: 1h30"
              />
              {errors.duree && <span className="ts-form-error-msg">{errors.duree}</span>}
            </div>

            <div className="ts-form-group">
              <label className="ts-form-label">Note totale *</label>
              <input
                type="number"
                className={`ts-form-input ${errors.noteTotale ? 'ts-form-error' : ''}`}
                value={formData.noteTotale}
                onChange={(e) => setFormData({ ...formData, noteTotale: e.target.value })}
                placeholder="Ex: 20"
              />
              {errors.noteTotale && <span className="ts-form-error-msg">{errors.noteTotale}</span>}
            </div>
          </div>
        </div>

        <div className="ts-modal-footer">
          <button className="ts-btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button className="ts-btn-generate" onClick={handleSubmit}>
            <FiCheck size={16} /> Générer l'examen
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export default function TemplateSelector() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      // TODO: Replace with actual API call
      // const response = await fetch('/api/enseignant/templates');
      // const data = await response.json();
      // setTemplates(data);

      // Mock data for now
      setTemplates([
        {
          id: '1',
          nom: 'Modèle Examen Final - Informatique',
          type: 'final',
          matiere: 'Informatique',
          discipline: 'Informatique',
          duree: '2h',
          semestre: '2ème année',
          titreExamen: 'EXAMEN FINAL',
          departementFr: 'Département Informatique',
          universiteFr: 'Université Nord-Américaine',
          institutFr: 'Institut International',
          enseignants: 'Dr. Ahmed Ben Ali',
          actif: true,
          examCount: 5,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          nom: 'Modèle Contrôle Continu - Mathématiques',
          type: 'cc',
          matiere: 'Mathématiques',
          discipline: 'Sciences',
          duree: '1h30',
          semestre: '1ère année',
          titreExamen: 'DEVOIR SURVEILLÉ',
          departementFr: 'Département Sciences',
          universiteFr: 'Université Nord-Américaine',
          institutFr: 'Institut International',
          enseignants: 'Pr. Fatima Zahra',
          actif: true,
          examCount: 12,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (err) {
      setError('Impossible de charger les modèles. Veuillez réessayer.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const q = norm(searchQuery);
      const matchesSearch =
        !q ||
        norm(template.nom).includes(q) ||
        norm(template.matiere).includes(q) ||
        norm(template.discipline).includes(q);

      const matchesType = !filterType || template.type === filterType;
      const matchesSubject = !filterSubject || norm(template.matiere) === norm(filterSubject);
      const matchesLevel = !filterLevel || norm(template.semestre) === norm(filterLevel);

      return matchesSearch && matchesType && matchesSubject && matchesLevel;
    });
  }, [templates, searchQuery, filterType, filterSubject, filterLevel]);

  // Pagination
  const totalPages = Math.ceil(filteredTemplates.length / PER_PAGE);
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE;
    return filteredTemplates.slice(start, start + PER_PAGE);
  }, [filteredTemplates, currentPage]);

  // Get unique values for filters
  const uniqueSubjects = useMemo(
    () => [...new Set(templates.map((t) => t.matiere).filter(Boolean))].sort(),
    [templates]
  );

  const uniqueLevels = useMemo(
    () => [...new Set(templates.map((t) => t.semestre).filter(Boolean))].sort(),
    [templates]
  );

  // Handlers
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleGenerateExam = (formData) => {
    navigate('/enseignant/ai-generator', {
      state: {
        selectedTemplate,
        headerInfo: formData
      }
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType('');
    setFilterSubject('');
    setFilterLevel('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterType || filterSubject || filterLevel;

  // Toast effect
  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    return () => clearTimeout(timer);
  }, [toast.message]);

  return (
    <div className="ts-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="ts-main">
        {/* Header */}
        <header className="ts-header">
          <div className="ts-header-content">
            <h2>
              Choisissez un modèle d'<span>examen</span>
            </h2>
            <p className="ts-header-sub">
              Sélectionnez un modèle pour commencer la génération d'examen par IA
            </p>
          </div>
          <button className="ts-btn-new" onClick={() => navigate('/enseignant/templates/create')}>
            <FiPlus size={16} /> Nouveau modèle
          </button>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="ts-alert ts-alert--error">
            <FiAlertCircle size={16} style={{ marginRight: '8px' }} />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="ts-filters">
          <div className="ts-search-wrap">
            <span className="ts-search-icon">⌕</span>
            <input
              className="ts-search"
              type="text"
              placeholder="Nom, matière, discipline…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                className="ts-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="ts-select"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tous les types</option>
            <option value="final">Examen Final</option>
            <option value="cc">Contrôle Continu</option>
            <option value="rattrapage">Examen Rattrapage</option>
          </select>

          <select
            className="ts-select"
            value={filterSubject}
            onChange={(e) => {
              setFilterSubject(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Toutes les matières</option>
            {uniqueSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <select
            className="ts-select"
            value={filterLevel}
            onChange={(e) => {
              setFilterLevel(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tous les niveaux</option>
            {uniqueLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button className="ts-btn-reset" onClick={handleResetFilters}>
              <FiX size={14} /> Réinitialiser
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="ts-loading">
            <div className="ts-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>Chargement des modèles…</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTemplates.length === 0 && (
          <div className="ts-empty">
            <div className="ts-empty-icon">📭</div>
            <div className="ts-empty-msg">Aucun modèle ne correspond à vos critères</div>
            <div className="ts-empty-hint">
              {hasActiveFilters ? 'Essayez de réinitialiser les filtres' : 'Aucun modèle disponible'}
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {!loading && filteredTemplates.length > 0 && (
          <>
            <div className="ts-cards-grid">
              {paginatedTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  onPreview={() => {
                    /* TODO: Implement preview */
                  }}
                  onDelete={() => {
                    /* TODO: Implement delete */
                  }}
                  isAdmin={false}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination page={currentPage} total={totalPages} onChange={setCurrentPage} />

            <div className="ts-count-label">
              Affichage {(currentPage - 1) * PER_PAGE + 1} à{' '}
              {Math.min(currentPage * PER_PAGE, filteredTemplates.length)} sur{' '}
              {filteredTemplates.length} modèle(s)
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      <TemplateSelectionModal
        template={selectedTemplate}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerateExam}
      />

      {/* Toast */}
      {toast.message && <div className={`ts-toast ts-toast--${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
