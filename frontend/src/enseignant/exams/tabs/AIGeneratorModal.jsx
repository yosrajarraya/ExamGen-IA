import React, { useState } from 'react';
import { FiX, FiCpu, FiLoader, FiPlus, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import '../../../styles/AIGeneratorModal.css';

const AIGeneratorModal = ({ isOpen, onClose, onInsertQuestions, examForm }) => {
    const [prompt, setPrompt] = useState('');
    const [type, setType] = useState('qcm');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [error, setError] = useState('');
    const [matiere, setMatiere] = useState(examForm?.matiere || '');
    const [isInserting, setIsInserting] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError('');
        setResults([]);
        setSelectedIndices([]);

        try {
            const response = await axios.post('http://localhost:5000/api/enseignant/ai/generate', {
                prompt,
                type,
                matiere: matiere || examForm?.matiere || '',
                niveau: examForm?.niveau || ''
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.data && response.data.questions) {
                setResults(response.data.questions);
            } else {
                setError('Aucune question générée.');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Erreur lors de la génération.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (idx) => {
        setSelectedIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const handleInsert = async () => {
        if (isInserting) return;
        const selected = results.filter((_, i) => selectedIndices.includes(i));
        if (selected.length === 0) return;

        setIsInserting(true);
        try {
            await onInsertQuestions(selected);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsInserting(false);
        }
    };

    return (
        <div className="ai-modal-overlay" onClick={onClose}>
            <div className="ai-modal-container" onClick={e => e.stopPropagation()}>
                <div className="ai-modal-header">
                    <h2><FiCpu /> Générateur d'IA Académique</h2>
                    <button className="ai-modal-close" onClick={onClose}><FiX size={20} /></button>
                </div>

                <div className="ai-modal-body">
                    <div className="ai-generator-form">
                        <div className="ai-form-group">
                            <label>Sujet ou texte source</label>
                            <textarea
                                className="ai-input"
                                rows={4}
                                placeholder="Ex: Les bases de la programmation Python, ou collez un texte ici..."
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                            />
                        </div>
                        <div className="ai-form-row">
                            <div className="ai-form-group">
                                <label>Type de questions</label>
                                <select className="ai-select" value={type} onChange={e => setType(e.target.value)}>
                                    <option value="qcm">QCM</option>
                                    <option value="vrai_faux">Vrai / Faux</option>
                                    <option value="ouverte">Question ouverte</option>
                                    <option value="pratique">Exercice pratique</option>
                                </select>
                            </div>
                            <div className="ai-form-group">
                                <label>Matière</label>
                                <input
                                    type="text"
                                    className="ai-input"
                                    placeholder="Ex: Mathématiques, Histoire..."
                                    value={matiere}
                                    onChange={e => setMatiere(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="ai-btn-container">
                            <button
                                className="ai-generate-btn"
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim()}
                            >
                                {loading ? <FiLoader className="ai-loading-spinner" /> : <FiCpu />}
                                {loading ? 'Génération en cours...' : 'Générer des questions'}
                            </button>
                        </div>
                    </div>

                    {error && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

                    {results.length > 0 && (
                        <div className="ai-results">
                            <div className="ai-results-header">
                                <h3>Questions générées ({results.length})</h3>
                                <button
                                    className="ai-btn-text"
                                    onClick={() => setSelectedIndices(results.map((_, i) => i))}
                                    style={{ background: 'none', border: 'none', color: '#0e2b50', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Tout sélectionner
                                </button>
                            </div>
                            <div className="ai-question-list">
                                {results.map((q, idx) => (
                                    <div
                                        key={idx}
                                        className={`ai-question-card ${selectedIndices.includes(idx) ? 'ai-question-card--selected' : ''}`}
                                        onClick={() => toggleSelect(idx)}
                                    >
                                        <div className="ai-q-meta-row">
                                            <span className="ai-q-type">{q.type}</span>
                                            {q.points && <span className="ai-q-points">{q.points} pts</span>}
                                        </div>
                                        {q.imageUrl && <img src={q.imageUrl} alt="AI Generated" className="ai-q-image" referrerPolicy="no-referrer" />}
                                        <p className="ai-q-text">{q.text}</p>
                                        {q.options && q.options.length > 0 && (
                                            <div className="ai-q-options">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className={`ai-q-option ${opt.correct ? 'ai-q-option--correct' : ''}`}>
                                                        {opt.correct ? <FiCheck size={12} /> : <span>•</span>}
                                                        {opt.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="ai-modal-footer">
                    <button className="ai-btn-cancel" onClick={onClose}>Annuler</button>
                    <button
                        className="ai-btn-insert"
                        disabled={selectedIndices.length === 0 || isInserting}
                        onClick={handleInsert}
                    >
                        {isInserting ? <FiLoader className="ai-loading-spinner" /> : <FiPlus />}
                        {isInserting ? 'Insertion...' : `Insérer les questions (${selectedIndices.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIGeneratorModal;
