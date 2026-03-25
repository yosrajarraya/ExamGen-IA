import { useState } from 'react';
import { createEnseignant } from '../../api/admin/Enseignant.api';
import './CreateEnseignant.css';

const EMPTY_FORM = {
  Prenom: '',
  Nom: '',
  Email: '',
  Telephone: '',
  Grade: '',
  Departement: '',
  Specialite: '',
  Active: true,
};

const CreateEnseignant = ({ isOpen, onClose, onCreated, onError, showToast }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.Prenom.trim() || !form.Nom.trim() || !form.Email.trim()) {
      setError('Prenom, Nom et Email sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      await createEnseignant(form);
      setForm(EMPTY_FORM);
      showToast?.('Enseignant créé avec succès');
      onCreated?.();
    } catch (err) {
      const message = err?.response?.data?.message || 'Erreur lors de la création';
      setError(message);
      onError?.(message);
      console.error('CreateEnseignant error', err);
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Créer un enseignant"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Créer un enseignant</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer" type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>

          {/* Prénom + Nom */}
          <div className="form-row">
            <div className="form-group">
              <label>Prénom <span className="req">*</span></label>
              <input
                type="text"
                value={form.Prenom}
                onChange={set('Prenom')}
                placeholder="Ines"
              />
            </div>
            <div className="form-group">
              <label>Nom <span className="req">*</span></label>
              <input
                type="text"
                value={form.Nom}
                onChange={set('Nom')}
                placeholder="Kessemtini"
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email <span className="req">*</span></label>
            <input
              type="email"
              value={form.Email}
              onChange={set('Email')}
              placeholder="ines.kessemtini@iit.tn"
            />
          </div>

          {/* Téléphone + Grade */}
          <div className="form-row">
            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="text"
                value={form.Telephone}
                onChange={set('Telephone')}
                placeholder="2X XXX XXX"
              />
            </div>
            <div className="form-group">
              <label>Grade</label>
              <input
                type="text"
                value={form.Grade}
                onChange={set('Grade')}
                placeholder="Maître Assistant"
              />
            </div>
          </div>

          {/* Département + Spécialité */}
          <div className="form-row">
            <div className="form-group">
              <label>Département</label>
              <input
                type="text"
                value={form.Departement}
                onChange={set('Departement')}
                placeholder="Informatique"
              />
            </div>
            <div className="form-group">
              <label>Spécialité</label>
              <input
                type="text"
                value={form.Specialite}
                onChange={set('Specialite')}
                placeholder="Algorithmique"
              />
            </div>
          </div>

          {/* Checkbox */}
          <div className="form-group form-check">
            <label>
              <input
                type="checkbox"
                checked={form.Active}
                onChange={(e) => setForm({ ...form, Active: e.target.checked })}
              />
              Compte actif immédiatement
            </label>
          </div>

          {/* Error */}
          {error && <div className="form-error" role="alert">{error}</div>}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Création...' : 'Créer le compte'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateEnseignant;