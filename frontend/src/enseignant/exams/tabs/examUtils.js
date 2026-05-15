export const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const normalizeType = (t) => (t === 'qcm' ? 'qcm_multiple' : t);

export const isQcmType = (t) => t === 'qcm_unique' || t === 'qcm_multiple' || t === 'qcm';

export const getDefaultOptions = (type) => {
    if (isQcmType(type) || type === 'vrai_faux') {
        const base = type === 'vrai_faux'
            ? [{ id: uid(), text: 'Vrai', correct: false }, { id: uid(), text: 'Faux', correct: false }]
            : [{ id: uid(), text: 'Option A', correct: false }, { id: uid(), text: 'Option B', correct: false }];
        return base;
    }
    return [];
};

export const makeQuestion = (type = 'ouverte') => ({
    id: uid(),
    type: normalizeType(type),
    text: '',
    points: '',
    answerLines: 3,
    image: null,
    imageUrl: null,
    options: getDefaultOptions(type),
});

export const makeExercise = (num) => ({
    id: uid(),
    title: `Exercice ${num}`,
    points: '',
    questions: [makeQuestion()],
    collapsed: false,
});

export const makeSection = (num) => ({
    id: uid(),
    title: `Partie ${num}`,
    exercises: [makeExercise(1)],
    collapsed: false,
});
