import { useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import useAuth from '../../context/useAuth';
import { adminNavItems, buildAdminProfile } from '../../components/sidebar/sidebarConfigs';
import ModelsList from './ModelsList';
import ModelEditor from './ModelEditor';
import { normalizeTemplate, makeDefaultModel } from '../../utils/template.utils';
import './WordTemplate.css';

const WordTemplate = () => {
  const { user, logout } = useAuth();
  const [view,          setView]          = useState('list');   // 'list' | 'editor'
  const [editingModel,  setEditingModel]  = useState(null);

  /* Ouvre l'éditeur sur un modèle existant */
  const handleEditModel = (model) => {
    setEditingModel(normalizeTemplate(model));
    setView('editor');
  };

  /* Ouvre l'éditeur sur un nouveau modèle vide */
  const handleCreateModel = (model) => {
    setEditingModel(model || makeDefaultModel());
    setView('editor');
  };

  /* Retour à la liste après sauvegarde */
  const handleModelUpdate = () => {
    setView('list');
    setEditingModel(null);
  };

  /* Retour à la liste sans sauvegarder */
  const handleBack = () => {
    setView('list');
    setEditingModel(null);
  };

  return (
    <div className="profil-layout">
      <Sidebar
        roleLabel="Espace administrateur"
        navItems={adminNavItems}
        profile={buildAdminProfile(user)}
        onLogout={logout}
      />

      <main className="profil-main">
        {view === 'list' ? (
          <ModelsList
            onEditModel={handleEditModel}
            onCreateModel={handleCreateModel}
          />
        ) : (
          <ModelEditor
            model={editingModel}
            onBack={handleBack}
            onModelUpdate={handleModelUpdate}
          />
        )}
      </main>
    </div>
  );
};

export default WordTemplate;
