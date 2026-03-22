
## 🚀 Fonctionnalités détaillées

### Dashboard Administrateur (30/70)
| Zone | Contenu |
|------|---------|
| **Colonne gauche (30%)** | Recherche avancée, Catégories (checkboxes), Statistiques, Accès rapide (6 liens), Barre stockage |
| **Colonne droite (70%)** | Barre actions (sélection multiple), Filtres dates, Grille fichiers (4 colonnes), Bouton upload |

### Overlay Upload (30/30/40)
| Colonne | Contenu |
|---------|---------|
| **30%** | Choix catégorie (radio), Liste fichiers en attente |
| **30%** | Instructions, format, règles |
| **40%** | Éditeur correction (matricule, lettre, nom, désignation), boutons Appliquer/Ignorer, actions |

### Overlay Catégories (33/33/34)
| Colonne | Contenu |
|---------|---------|
| **33%** | Ajouter une catégorie |
| **33%** | Liste catégories (checkboxes), suppression groupée |
| **34%** | Instructions, exemples, avertissements |

### Overlay Aperçu PDF (30/70)
| Colonne | Contenu |
|---------|---------|
| **30%** | Métadonnées modifiables (matricule, nom, prénom, désignation), taille, date, catégorie |
| **70%** | Aperçu PDF (Google Docs Viewer), actions (télécharger, supprimer, plein écran) |

### Page VU (30/70)
| Zone | Contenu |
|------|---------|
| **Colonne gauche (30%)** | Recherche, Statistiques (total, stagiaires uniques, mois), Détails du téléchargement sélectionné |
| **Colonne droite (70%)** | Filtres dates (pills), Grille 4 colonnes avec cartes téléchargement, Actions WhatsApp/Appel |

### Page Paramètres (30/70)
| Zone | Contenu |
|------|---------|
| **Colonne gauche (30%)** | Informations admin (prénom, nom, email), Statistiques, Mode nuit/jour, Accès rapide, Déconnexion |
| **Colonne droite (70%)** | Guide d'utilisation complet (6 sections) |

## 🔐 Sécurité
| Protection | Description |
|------------|-------------|
| **Authentification** | Supabase Auth (email/mot de passe) |
| **Code secret** | `ipote233@` (table `code_secret_unique`) |
| **RLS** | Row Level Security sur toutes les tables |
| **Lecture fichiers** | Limitée au matricule du stagiaire |
| **Propriété matricule** | Un utilisateur ne voit que son propre fichier |
| **Filière définitive** | Non modifiable après enregistrement |
| **Session unique** | Vérification au chargement, pas de revérification en navigation |

## 📦 Base de données

### Tables
| Table | Colonnes | Description |
|-------|----------|-------------|
| `securite` | id, matricule, telephone, filiere, nom, prenom, date_creation | Stagiaires |
| `dossiers` | id, user_id, nom, parent_id, date_creation | Catégories |
| `fichiers` | id, user_id, nom, taille, chemin_storage, bucket, date_upload | Métadonnées PDF |
| `dossier_fichiers` | dossier_id, fichier_id, date_association | Liaison |
| `telechargements` | id, user_id, date_telechargement, categorie, filiere | Historique |
| `attente` | id, user_id, fichier_nom, chemin_storage, categorie_id, date_expiration | Upload temporaire |
| `publications` | id, admin_id, type, texte, contenu, vu_count, likes_count, created_at | Flux info |
| `code_secret_unique` | id, code | Code secret admin |

## 🌙 Mode nuit
- Sauvegarde : `localStorage.setItem('aej_theme', 'night')`
- Synchronisation entre tous les onglets via `storage` event
- Appliqué automatiquement sur toutes les pages
- Variables CSS pour mode jour/nuit

## 📱 Responsive
| Écran | Comportement |
|-------|--------------|
| Desktop (>1200px) | Layout 30/70, grille 4 colonnes |
| Tablet (800-1200px) | Grille 3-4 colonnes |
| Mobile (<800px) | Colonne unique, grille adaptative |

## 🔧 Installation

### 1. Cloner le dépôt
```bash
git clone https://github.com/votre-compte/aej.git
cd aej
2. Configurer Supabase
Créer un projet sur Supabase

Exécuter les scripts SQL dans l'ordre :

sql/tables.sql

sql/policies.sql

sql/bucket.sql

Créer le bucket fichiers (public)

Configurer les politiques Storage

3. Mettre à jour les clés
Dans tous les fichiers JS, remplacer :

javascript
const SUPABASE_URL = 'votre_url_supabase';
const SUPABASE_ANON_KEY = 'votre_anon_key';
4. Déployer
Uploader tous les fichiers sur votre serveur web (Apache, Nginx, Vercel, Netlify...)

📝 Format des fichiers
Les fichiers PDF doivent respecter le format :

text
[Matricule] [Lettre] [Nom] [Désignation].pdf
Matricule : 8 chiffres

Lettre : 1 majuscule (A-Z)

Nom : au moins 2 lettres (maj/min acceptées)

Désignation : texte libre

Exemple : 19167122 F IPOTE fiche.pdf

⚙️ Variables d'environnement
Variable	Description
SUPABASE_URL	URL du projet Supabase
SUPABASE_ANON_KEY	Clé anonyme Supabase
📊 Statistiques
Indicateur	Calcul
Total fichiers	COUNT(*) FROM fichiers
Total catégories	COUNT(*) FROM dossiers
Total téléchargements	COUNT(*) FROM telechargements
Stagiaires uniques	COUNT(*) FROM securite
Stockage	Calcul via bucket storage
🐛 Dépannage
Erreur "new row violates row-level security policy"
Vérifier que les politiques RLS sont actives

Vérifier que l'utilisateur est connecté

Vérifier la table securite

Boucle infinie index ↔ auth
Vérifier la fonction checkSession() dans index.js

La redirection ne doit se faire que si pas d'utilisateur

Fichier non trouvé
Vérifier le format du nom (espaces, majuscules)

Vérifier que le matricule en base correspond

Vérifier la politique RLS de lecture

👨‍💻 Auteur
Développé pour l'Agence Emploi Jeune (AEJ)

Email : contact@emploi-jeune.ci

Site : https://agenceemploijeunes.ci

📄 Licence
Propriétaire - Tous droits réservés
© 2024 Agence Emploi Jeune

🙏 Remerciements
Supabase pour l'infrastructure

Font Awesome pour les icônes

Google Fonts pour la police Inter

text
