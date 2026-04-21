import { useState } from 'react';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { adminNavItems, buildAdminProfile } from '../../components/sidebar/sidebarConfigs';
import ModelsList from './ModelsList';
import ModelEditor from './ModelEditor';
import './WordTemplate.css';

const WordTemplate = () => {
  const { user, logout } = useAuth();

  const [view, setView] = useState('list'); // 'list' ou 'edit'
  const [selectedModel, setSelectedModel] = useState(null);

  const handleSelectModel = (model) => {
    setSelectedModel(model);
    setView('edit');
  };

  const handleCreateModel = (model) => {
    setSelectedModel(model);
    setView('edit');
  };

  const handleModelUpdate = (updatedModel) => {
    setSelectedModel(updatedModel);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedModel(null);
  };

  return (
    <div className="new-admin-layout">
      <Sidebar
        roleLabel="Administration"
        navItems={adminNavItems}
        profile={buildAdminProfile(user)}
        onLogout={logout}
      />

      <main className="new-admin-main">
        <div className="wt-page-header">
          <div className="wt-page-header__text">
            <h1 className="wt-page-title">Modèles Word</h1>
    
          </div>


        </div>

        <div className="new-admin-body wt-body">
          {view === 'list' ? (
            <ModelsList
              onSelectModel={handleSelectModel}
              onEditModel={handleSelectModel}
              onCreateModel={handleCreateModel}
            />
          ) : (
            selectedModel && (
              <ModelEditor
                model={selectedModel}
                onBack={handleBackToList}
                onModelUpdate={handleModelUpdate}
              />
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default WordTemplate;

