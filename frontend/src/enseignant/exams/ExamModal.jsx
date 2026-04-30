// // src/pages/enseignant/exams/ExamModal.jsx
// import React, { useState, useEffect } from 'react';
// import mammoth from 'mammoth';
// import './ExamBank.css';

// const ExamModal = ({ 
//   isOpen, 
//   onClose, 
//   exam, 
//   currentUserEmail, 
//   onDownload, 
//   onCopy, 
//   onDelete 
// }) => {
//   const [contentHtml, setContentHtml] = useState('');
//   const [loadingContent, setLoadingContent] = useState(false);
//   const [contentError, setContentError] = useState('');
//   const [loadingQuestions, setLoadingQuestions] = useState(false);

//   // Conversion DOCX → HTML
//   useEffect(() => {
//     if (!isOpen || !exam?.fileData) {
//       setContentHtml('');
//       return;
//     }

//     let isMounted = true;

//     const loadContent = async () => {
//       setLoadingContent(true);
//       setContentError('');

//       try {
//         let arrayBuffer = exam.fileData;
//         if (arrayBuffer instanceof Buffer) {
//           arrayBuffer = arrayBuffer.buffer.slice(
//             arrayBuffer.byteOffset,
//             arrayBuffer.byteOffset + arrayBuffer.byteLength
//           );
//         }

//         const result = await mammoth.convertToHtml({ arrayBuffer });
//         if (isMounted) {
//           setContentHtml(result.value || '<p>Aucun contenu détecté.</p>');
//         }
//       } catch (err) {
//         console.error(err);
//         if (isMounted) setContentError('Impossible d’afficher le contenu du document.');
//       } finally {
//         if (isMounted) setLoadingContent(false);
//       }
//     };

//     loadContent();

//     return () => { isMounted = false; };
//   }, [isOpen, exam?.fileData]);

//   // Early return
//   if (!isOpen || !exam) return null;

//   const isOwner = String(exam.createdByEmail || '').toLowerCase() === 
//                  String(currentUserEmail || '').toLowerCase();

//   const questions = exam.questions || []; // tableau d'objets si tu as fait populate

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal-content exam-modal-large" onClick={e => e.stopPropagation()}>
        
//         {/* Header */}
//         <div className="modal-header">
//           <h2>{exam.title || 'Examen sans titre'}</h2>
//           <button className="modal-close" onClick={onClose}>×</button>
//         </div>

//         {/* Info bar */}
//         <div className="modal-info-bar">
//           <div className="detail-grid compact">
//             <div><strong>Filière :</strong> {exam.filiere || '—'}</div>
//             <div><strong>Matière :</strong> {exam.matiere || '—'} • {exam.niveau || '—'}</div>
//             <div><strong>Durée :</strong> {exam.duree || '—'} min</div>
//             <div><strong>Note totale :</strong> {exam.noteTotale || 0} pts</div>
//             <div><strong>Questions :</strong> {questions.length}</div>
//           </div>
//         </div>

//         {/* Contenu DOCX */}
//         <div className="modal-body exam-content-body">
//           <h3 className="content-title">Contenu complet de l’examen (fichier Word)</h3>

//           {loadingContent && <div className="loading-content">Conversion en cours...</div>}
//           {contentError && <div className="exam-bank-alert error">{contentError}</div>}

//           {!loadingContent && !contentError && contentHtml && (
//             <div className="docx-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
//           )}
//         </div>

//         {/* === SECTION QUESTIONS === */}
//         <div className="modal-body questions-section">
//           <h3 className="content-title">
//             Questions de l’examen ({questions.length})
//           </h3>

//           {questions.length === 0 ? (
//             <div className="no-questions">
//               Aucune question associée à cet examen.
//             </div>
//           ) : (
//             <div className="questions-list">
//               {questions.map((q, index) => (
//                 <div key={q._id || q.id || index} className="question-item">
//                   <div className="question-number">Question {index + 1}</div>
//                   <div 
//                     className="question-text"
//                     dangerouslySetInnerHTML={{ __html: q.text || q }} 
//                   />
//                   {(q.matiere || q.niveau) && (
//                     <div className="question-meta">
//                       {q.matiere && <span className="tag">{q.matiere}</span>}
//                       {q.niveau && <span className="tag">{q.niveau}</span>}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="modal-footer">
//           <button onClick={() => onDownload(exam)} className="btn download">
//             Télécharger le fichier .docx
//           </button>
          
//           {isOwner ? (
//             <button onClick={() => onDelete(exam)} className="btn delete">
//               Supprimer
//             </button>
//           ) : (
//             <button onClick={() => onCopy(exam)} className="btn copy">
//               Copier cet examen
//             </button>
//           )}
//           <button onClick={onClose} className="btn cancel">Fermer</button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ExamModal;