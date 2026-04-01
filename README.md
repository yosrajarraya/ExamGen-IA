#  ExamGen-IA

Application web pour la génération et la gestion d'examens assistée par intelligence artificielle.

---

##  Description

**ExamGen-IA** est une plateforme permettant aux enseignants de :

* Créer et gérer des examens
* Gérer une banque de questions
* Générer des examens automatiquement
* Gérer des modèles (templates Word)

Elle comprend également un espace administrateur pour gérer les enseignants et les modèles.

---

##  Architecture du projet

```
ExamGen-IA/
│
├── Backend/        # API Node.js (Express)
│   ├── src/
│   │   ├── admin/
│   │   ├── enseignant/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── utils/
│   └── server.js
│
├── frontend/       # Application React (Vite)
│   ├── src/
│   │   ├── admin/
│   │   ├── enseignant/
│   │   ├── components/
│   │   ├── api/
│   │   ├── context/
│   │   └── routes/
│
└── README.md
```

---

##  Technologies utilisées

### Backend

* Node.js
* Express.js
* MongoDB (Mongoose)
* JWT (authentification)

### Frontend

* React.js
* Vite
* Axios
* CSS

---

##  Installation

### 1. Cloner le projet

```bash
git clone https://github.com/ton-username/ExamGen-IA.git
cd ExamGen-IA
```

---

### 2. Backend

```bash
cd Backend
npm install
```

Créer un fichier `.env` :

```
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
EMAIL_USER=your_email
EMAIL_PASS=your_password
```

Lancer le serveur :

```bash
npm run dev
```

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

##  Fonctionnalités principales

###  Enseignant

* Authentification
* Gestion du profil
* Gestion des examens
* Banque de questions
* Génération d’examens

###  Admin

* Gestion des enseignants
* Gestion des templates Word

---

## Scripts utiles

Backend :

```bash
npm run dev
```

Frontend :

```bash
npm run dev
```

---

##  Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Crée une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m "ajout feature"`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvre une Pull Request

---

##  Licence

Ce projet est sous licence MIT.

---

##  Auteur

Projet réalisé par **[yosra jarraya , Mariem mlik , nassim mallouli , maissa ben amar]**

---
