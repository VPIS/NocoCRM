# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | Deutsch | [Français](README.fr-FR.md) | [Español](README.es-ES.md) | [Português](README.pt-BR.md) | [Русский](README.ru-RU.md) | [Bahasa Indonesia](README.id-ID.md) | [Tiếng Việt](README.vi-VN.md)

NocoCRM ist ein Open-Source-CRM für den B2B-Vertrieb, gebaut auf [NocoBase 3](https://www.nocobase.com). Es bringt 6 Vertriebs-Agenten mit und bindet Ihre E-Mail und WhatsApp ein: Die Agenten fassen bei Leads und Deals nach, beantworten Nachrichten sofort und prüfen Freigaben gemeinsam mit Ihnen. Agenten schlagen vor, Sie entscheiden.

https://github.com/user-attachments/assets/4ce7965d-f030-4239-b5f3-0dae7c975496

[Online testen](https://solutions.nocobase.com/crm/) · [Website](https://www.nocobase.com/de-DE/solution-crm/)

## Was es kann

- **Nichts geht verloren.** Ein neuer Lead oder Deal, die Antwort eines Kunden, eine erledigte Aufgabe, der Check am Morgen: Ein Agent liest den ganzen Zusammenhang und legt den nächsten Schritt in Ihren Posteingang, mit Empfehlung, Sicherheit und Begründung. Datensätze ändern sich erst, wenn Sie annehmen.
- **Alle Kanäle auf einer Zeitleiste.** Jede Person verbindet ihr eigenes Postfach, das Unternehmen seine WhatsApp-Business-Nummer. Nachrichten werden Leads und Kontakten zugeordnet, Antworten vorformuliert und von Ihrem eigenen Konto gesendet.
- **Ein Team von Vertriebs-Agenten.** Sales Expert für das Gespräch, dazu Lead nachfassen, Verkaufschance nachfassen, Genehmigungsprüfung, Aufgabenvorbereitung und Unternehmensrecherche, jeder mit seinen Auslösern, Skills und einer Übersicht seiner Läufe.
- **Freigaben stocken nicht mehr.** Der Freigabe-Agent prüft einen Rabatt oder eine Bedingung gegen Ihre Regeln und frühere Entscheidungen und formuliert eine Empfehlung und einen Kommentar für die genehmigende Person.
- **Ihre Regeln, Ihr Code.** Schreiben Sie Preise, Rabattgrenzen und Nachfassrhythmus als Geschäftsrichtlinien in Klartext, und jeder Agent hält sich daran. Lassen Sie einen Coding-Agenten den Quellcode des CRM selbst ändern. Open Source, selbst gehostet und ganz Ihres.
- **Der ganze Vertriebszyklus.** Leads, Unternehmen, Kontakte, Verkaufschancen, Aufgaben, Freigaben und Berichte, mit Rollen, die der Server für jeden Datensatz durchsetzt.

## Schnellstart

### 1. Installieren

**Mit einem Coding-Agenten.** Der einfachste Weg. Öffnen Sie Claude Code, Codex oder Cursor im Ordner, in den NocoCRM soll, und geben Sie ihm dies:

```text
Installiere NocoCRM von https://github.com/nocobase/NocoCRM und starte es; folge dabei der AGENTS.md und der README des Repositorys.
```

**Von Hand.** Sie brauchen Node.js 24 oder neuer und pnpm 11 (`corepack enable`). Die Daten liegen standardmäßig in einer SQLite-Datei; PostgreSQL und MySQL funktionieren ebenfalls.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Anmelden

Öffnen Sie die `Local:`-Adresse, die `pnpm dev` ausgibt, normalerweise `http://127.0.0.1:13000/main/`, und melden Sie sich als `nocobase` mit dem Passwort `admin123` an.

### 3. Demodaten importieren

Das Banner oben bietet sie an, oder öffnen Sie **Einstellungen → Demodaten**. Sie bringen ein Vertriebsteam mit Kunden, Deals, Aufgaben, Freigaben, E-Mails und Gesprächen mit; entfernen Sie sie dort, wenn Sie richtig loslegen.

### 4. Ein KI-Modell einrichten

Fügen Sie unter **Agent-Team → Modelle** einen Modelldienst mit seinem Schlüssel hinzu, etwa DeepSeek, OpenAI, Claude, Gemini oder Qwen. Der Assistent und die Agenten brauchen ihn; alles andere funktioniert ohne.

Der [Leitfaden](guide.md) (Englisch) beschreibt die nächsten Schritte, die Demokonten, Rollen, die Konfiguration (KI, E-Mail, WhatsApp, Datenbanken), das Deployment und die Entwicklung.

## Lizenz

[Apache License 2.0](../LICENSE)
