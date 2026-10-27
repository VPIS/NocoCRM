# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Español](README.es-ES.md) | Português | [Русский](README.ru-RU.md) | [Bahasa Indonesia](README.id-ID.md) | [Tiếng Việt](README.vi-VN.md)

O NocoCRM é um CRM de código aberto para vendas B2B, construído sobre o [NocoBase 3](https://www.nocobase.com). Ele vem com 6 agentes de vendas e se integra ao seu e-mail e ao WhatsApp: acompanha leads e oportunidades, responde mensagens na hora e revisa aprovações com você. Os agentes sugerem; você decide.

https://github.com/user-attachments/assets/4ce7965d-f030-4239-b5f3-0dae7c975496

[Experimente online](https://solutions.nocobase.com/crm/) · [Site](https://www.nocobase.com/pt-BR/solution-crm/)

## O que ele faz

- **Nada fica para trás.** Um novo lead ou negócio, a resposta de um cliente, uma tarefa concluída, a verificação da manhã: um agente lê todo o contexto e coloca o próximo passo na sua caixa de entrada, com a recomendação, a confiança e os motivos. Os registros só mudam quando você aceita.
- **Todos os canais em uma só linha do tempo.** Cada pessoa conecta a própria caixa de e-mail, e a empresa o seu número do WhatsApp Business. As mensagens são associadas a leads e contatos, e as respostas são redigidas para sair da sua própria conta.
- **Uma equipe de agentes de vendas.** O Sales Expert para conversar, além de acompanhamento de leads, acompanhamento de oportunidades, análise de aprovação, preparação de tarefas e pesquisa de empresas, cada um com seus gatilhos, habilidades e um registro das execuções.
- **As aprovações não travam mais.** O agente de aprovações confronta um desconto ou uma condição com as suas regras e decisões anteriores, e redige uma recomendação e um comentário para quem aprova.
- **Suas regras, seu código.** Escreva seus preços, limites de desconto e ritmo de acompanhamento como orientação de negócio em texto simples, e todo agente segue. Peça a um agente de programação que altere o próprio código-fonte do CRM. Código aberto, auto-hospedado e seu.
- **O ciclo de vendas completo.** Leads, empresas, contatos, oportunidades, tarefas, aprovações e relatórios, com papéis aplicados pelo servidor registro a registro.

## Início rápido

### 1. Instalar

**Com um agente de programação.** O jeito mais fácil. Abra o Claude Code, o Codex ou o Cursor na pasta onde o NocoCRM vai ficar e diga:

```text
Instale o NocoCRM a partir de https://github.com/nocobase/NocoCRM e inicie-o, seguindo o AGENTS.md e o README do repositório.
```

**Manualmente.** Você precisa do Node.js 24 ou mais recente e do pnpm 11 (`corepack enable`). Os dados ficam por padrão em um arquivo SQLite; PostgreSQL e MySQL também funcionam.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Entrar

Abra o endereço `Local:` que o `pnpm dev` exibe, normalmente `http://127.0.0.1:13000/main/`, e entre como `nocobase` com a senha `admin123`.

### 3. Importar os dados de demonstração

O banner no topo oferece a importação, ou abra **Configurações → Dados de demonstração**. Eles trazem uma equipe de vendas com clientes, negócios, tarefas, aprovações, e-mails e conversas; remova-os na mesma página quando for usar de verdade.

### 4. Configurar um modelo de IA

Adicione um serviço de modelo com a chave em **Equipe de Agents → Modelos**, como DeepSeek, OpenAI, Claude, Gemini ou Qwen. O assistente e os agentes precisam dele; todo o resto funciona sem.

O [guia](guide.md) (em inglês) cobre os próximos passos, as contas de demonstração, os papéis, a configuração (IA, e-mail, WhatsApp, bancos de dados), a implantação e o desenvolvimento.

## Licença

[Apache License 2.0](../LICENSE)
