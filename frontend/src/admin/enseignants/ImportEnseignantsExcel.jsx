import { useState } from 'react';
import './ImportEnseignantsExcel.css';

const ImportEnseignantsExcel = ({ isOpen, onClose, onImported, showToast }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState([]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      setError('');
      // Ici on pourrait ajouter une prévisualisation du fichier
      // Pour l'instant, on affiche juste le nom du fichier
      setPreview([selectedFile.name]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier Excel');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/enseignants/import-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();

      const imported = Number(result.imported || 0);
      const errorsList = Array.isArray(result.errors) ? result.errors : [];

      if (errorsList.length > 0) {
        // afficher directement l'erreur dans la modal, pas seulement en toast
        if (imported > 0) {
          setError(`Import partiel : ${imported} enregistré(s), ${errorsList.length} erreur(s). ${errorsList.slice(0, 4).join(' | ')}${errorsList.length > 4 ? '...' : ''}`);
          showToast?.(`${imported} enseignants importés, ${errorsList.length} erreurs détectées`);
        } else {
          setError(`Aucun enseignant importé : ${errorsList.length} erreur(s). ${errorsList.slice(0, 6).join(' | ')}${errorsList.length > 6 ? '...' : ''}`);
        }

        // Si vous voulez rafraîchir la liste des enseignants pour les importations partielles, vous pouvez appeler onImported ici aussi.
        if (imported > 0) {
          onImported?.();
        }
        return;
      }

      showToast?.(`${imported} enseignants importés avec succès`);
      onImported?.();
      onClose();
    } catch (err) {
      const message = err.message || 'Erreur lors de l\'importation';
      setError(message);
      console.error('Import error:', err);
    } finally {
      setLoading(false);
    }
  };

//   const downloadTemplate = () => {
//     // Télécharger le template depuis le serveur
//     const link = document.createElement('a');
//     link.href = 'http://localhost:5000/api/admin/templates/enseignants-template';
//     link.download = 'template-enseignants.xlsx';
//     link.click();
//   };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Importer des enseignants via Excel"
    >
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Importer des enseignants</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer" type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          
          <div className="form-group">
            <label>Fichier Excel <span className="req">*</span></label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="file-input"
            />
            {file && (
              <div className="file-info">
                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {preview.length > 0 && (
            <div className="preview-section">
              <h4>Aperçu du fichier</h4>
              <div className="preview-content">
                {preview.map((item, index) => (
                  <div key={index} className="preview-item">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !file}>
              {loading ? 'Importation...' : 'Importer les enseignants'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportEnseignantsExcel;