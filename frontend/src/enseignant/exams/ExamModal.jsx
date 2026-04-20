// src/pages/enseignant/exams/ExamModal.jsx
import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import './ExamBank.css';

const ExamModal = ({ 
  isOpen, 
  onClose, 
  exam, 
  currentUserEmail, 
  onDownload, 
  onCopy, 
  onDelete 
}) => {
  const [contentHtml, setContentHtml] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState('');

  // Nettoyage quand le modal se ferme
  useEffect(() => {
    if (!isOpen) {
      setContentHtml('');
      setLoadingContent(false);
      setContentError('');
      return;
    }
  }, [isOpen]);

  // Conversion du fichier Word en HTML
  useEffect(() => {
    if (!isOpen || !exam?.fileData) return;

    let isMounted = true;

    const loadExamContent = async () => {
      setLoadingContent(true);
      setContentError('');
      setContentHtml('');

      try {
        let arrayBuffer = exam.fileData;

        // Conversion Buffer MongoDB → ArrayBuffer
        if (arrayBuffer instanceof Buffer) {
          arrayBuffer = arrayBuffer.buffer.slice(
            arrayBuffer.byteOffset,
            arrayBuffer.byteOffset + arrayBuffer.byteLength
          );
        }

        const result = await mammoth.convertToHtml({ arrayBuffer });

        if (isMounted) {
          setContentHtml(result.value || '<p>Aucun contenu détecté dans le document.</p>');
        }

        if (result.messages?.length > 0) {
          console.warn('Mammoth warnings:', result.messages);
        }
      } catch (err) {
        console.error('Erreur conversion DOCX:', err);
        if (isMounted) {
          setContentError('Impossible d’afficher le contenu. Veuillez télécharger le fichier.');
        }
      } finally {
        if (isMounted) setLoadingContent(false);
      }
    };

    loadExamContent();

    return () => {
      isMounted = false;
    };
  }, [isOpen, exam?.fileData]);

  // Early return après tous les hooks
  if (!isOpen || !exam) {
    return null;
  }

  const isOwner = String(exam.createdByEmail || '').toLowerCase() === 
                 String(currentUserEmail || '').toLowerCase();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content exam-modal-large" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2>{exam.title || 'Examen sans titre'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Informations de l'examen */}
        <div className="modal-info-bar">
          <div className="detail-grid compact">
            <div><strong>Filière :</strong> {exam.filiere || '—'}</div>
            <div><strong>Matière :</strong> {exam.matiere || '—'} • {exam.niveau || '—'}</div>
            <div><strong>Durée :</strong> {exam.duree || '—'} min</div>
            <div><strong>Note totale :</strong> {exam.noteTotale || 0} pts</div>
          </div>
        </div>

        {/* Contenu complet de l'examen (Word → HTML) */}
        <div className="modal-body exam-content-body">
          <h3 className="content-title">Contenu complet de l’examen</h3>

          {loadingContent && (
            <div className="loading-content">Conversion du document en cours...</div>
          )}

          {contentError && (
            <div className="exam-bank-alert error">{contentError}</div>
          )}

          {!loadingContent && !contentError && contentHtml && (
            <div 
              className="docx-content"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          )}
        </div>

        {/* Footer - Actions */}
        <div className="modal-footer">
          <button onClick={() => onDownload(exam)} className="btn download">
             Télécharger le fichier .docx
          </button>
          
          {isOwner ? (
            <button onClick={() => onDelete(exam)} className="btn delete">
               Supprimer
            </button>
          ) : (
            <button onClick={() => onCopy(exam)} className="btn copy">
               Copier cet examen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamModal;