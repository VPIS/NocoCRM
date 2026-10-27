# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | [Deutsch](README.de-DE.md) | Français | [Español](README.es-ES.md) | [Português](README.pt-BR.md) | [Русский](README.ru-RU.md) | [Bahasa Indonesia](README.id-ID.md) | [Tiếng Việt](README.vi-VN.md)

NocoCRM est un CRM open source pour la vente B2B, construit sur [NocoBase 3](https://www.nocobase.com). Il intègre 6 agents commerciaux et se connecte à votre messagerie et à WhatsApp : ils relancent leads et opportunités, répondent aux messages sans attendre et examinent les validations avec vous. Les agents proposent, vous décidez.

https://github.com/user-attachments/assets/4ce7965d-f030-4239-b5f3-0dae7c975496

[Essayer en ligne](https://solutions.nocobase.com/crm/) · [Site web](https://www.nocobase.com/fr-FR/solution-crm/)

## Ce qu’il fait

- **Rien ne passe entre les mailles.** Un nouveau lead ou une nouvelle affaire, la réponse d’un client, une tâche terminée, la revue du matin : un agent lit tout le contexte et dépose la prochaine étape dans votre boîte de réception, avec sa recommandation, son degré de confiance et ses raisons. Les fiches ne changent que lorsque vous acceptez.
- **Tous les canaux sur une même chronologie.** Chacun connecte sa propre boîte mail, l’entreprise son numéro WhatsApp Business. Les messages sont rattachés aux leads et aux contacts, et les réponses rédigées partent de votre propre compte.
- **Une équipe d’agents commerciaux.** Sales Expert pour échanger, plus le suivi des prospects, le suivi des opportunités, l’analyse des approbations, la préparation des tâches et la veille sur les entreprises, chacun avec ses déclencheurs, ses compétences et l’historique de ses exécutions.
- **Les validations ne bloquent plus.** L’agent de validation confronte une remise ou une condition à vos règles et aux décisions passées, puis rédige une recommandation et un commentaire pour la personne qui valide.
- **Vos règles, votre code.** Écrivez vos prix, vos plafonds de remise et votre rythme de relance en texte simple dans les consignes métier, et chaque agent les suit. Demandez à un agent de code de modifier le code source du CRM lui-même. Open source, auto-hébergé, et à vous.
- **Tout le cycle de vente.** Leads, entreprises, contacts, opportunités, tâches, validations et rapports, avec des rôles appliqués fiche par fiche par le serveur.

## Démarrage rapide

### 1. Installer

**Avec un agent de code.** Le plus simple. Ouvrez Claude Code, Codex ou Cursor dans le dossier qui doit accueillir NocoCRM, et donnez-lui ceci :

```text
Installe NocoCRM depuis https://github.com/nocobase/NocoCRM et démarre-le, en suivant le AGENTS.md et le README du dépôt.
```

**À la main.** Il vous faut Node.js 24 ou plus récent et pnpm 11 (`corepack enable`). Les données vont par défaut dans un fichier SQLite ; PostgreSQL et MySQL fonctionnent aussi.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Se connecter

Ouvrez l’adresse `Local:` qu’affiche `pnpm dev`, en général `http://127.0.0.1:13000/main/`, et connectez-vous avec `nocobase` et le mot de passe `admin123`.

### 3. Importer les données de démonstration

Le bandeau en haut de page les propose, ou ouvrez **Paramètres → Données de démonstration**. Elles apportent une équipe commerciale avec ses clients, affaires, tâches, validations, e-mails et conversations ; supprimez-les au même endroit quand vous démarrez pour de bon.

### 4. Configurer un modèle d’IA

Ajoutez un service de modèle avec sa clé dans **Équipe d’Agents → Modèles**, par exemple DeepSeek, OpenAI, Claude, Gemini ou Qwen. L’assistant et les agents en ont besoin ; tout le reste fonctionne sans.

Le [guide](guide.md) (en anglais) couvre les étapes suivantes, les comptes de démonstration, les rôles, la configuration (IA, e-mail, WhatsApp, bases de données), le déploiement et le développement.

## Licence

[Apache License 2.0](../LICENSE)
