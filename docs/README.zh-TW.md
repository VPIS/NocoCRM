# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | 繁體中文 | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Español](README.es-ES.md) | [Português](README.pt-BR.md) | [Русский](README.ru-RU.md) | [Bahasa Indonesia](README.id-ID.md) | [Tiếng Việt](README.vi-VN.md)

NocoCRM 是基於 [NocoBase 3](https://www.nocobase.com) 的開源 B2B 銷售 CRM。它內建 6 個銷售 Agent，並整合郵箱與 WhatsApp：自動跟進線索與商機，即時回覆來信，審批時幫你分析。Agent 給建議，人來拍板。

https://github.com/user-attachments/assets/4ce7965d-f030-4239-b5f3-0dae7c975496

[線上體驗](https://solutions.nocobase.com/crm/) · [官網介紹](https://www.nocobase.com/zh-TW/solution-crm/)

## 能做什麼

- **不用靠人惦記。** 新線索、新商機、客戶回信、任務完成、每天早上的巡檢，Agent 都會自動觸發，讀完上下文後把下一步建議送進收件匣，寫明結論、把握和依據。只有你採納後才會修改記錄。
- **所有管道歸到一條時間線。** 每個人連接自己的郵箱，公司連接 WhatsApp Business 號碼。來信自動對應到線索和聯絡人，回覆已起草好，由你的帳號發出。
- **一支銷售 Agent 團隊。** 可以對話的銷售專家，加上跟進線索、跟進商機、審批輔助、任務準備和公司情報，各有觸發條件、技能和執行記錄。
- **審批不再卡關。** 審批 Agent 對照你的規則和過往同類案例，核算折扣和條款，為審批人起草建議和審批意見。
- **規矩你定，程式碼你有。** 用幾句話把價格、折扣上限和跟進節奏寫進業務指導，每個 Agent 都照著做；讓程式設計 Agent 直接修改 CRM 的原始碼。開源、可自行部署，完全屬於你。
- **從線索到成交。** 線索、公司、聯絡人、商機、任務、審批和報表，依角色由伺服器逐筆控制記錄權限。

## 快速開始

### 1. 安裝

**用程式設計 Agent 安裝。** 最簡單的方式。在要放 NocoCRM 的目錄裡打開 Claude Code、Codex 或 Cursor，告訴它：

```text
從 https://github.com/nocobase/NocoCRM 安裝 NocoCRM 並啟動，依照儲存庫的 AGENTS.md 和 README 操作。
```

**手動安裝。** 需要 Node.js 24 或更新版本和 pnpm 11（`corepack enable`）。資料預設存在一個 SQLite 檔案裡，也可以用 PostgreSQL 和 MySQL。

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. 登入

打開 `pnpm dev` 印出的 `Local:` 位址（通常是 `http://127.0.0.1:13000/main/`），用 `nocobase` 和密碼 `admin123` 登入。

### 3. 匯入示範資料

頁面頂部的橫幅會提示匯入，也可以打開 **設定 → 示範資料**。它會加入一個銷售團隊，帶有客戶、商機、任務、審批、郵件和對話；正式使用前在同一頁移除。

### 4. 設定 AI 模型

在 **Agent 團隊 → 模型** 裡新增一個模型服務並填入金鑰，例如 DeepSeek、OpenAI、Claude、Gemini 或通義千問。助手和各個 Agent 需要它，其他功能都不需要。

[使用指南](guide.md)（英文）介紹後續步驟、示範帳號、角色、設定（AI、郵件、WhatsApp、資料庫）、部署和開發。

## 授權條款

[Apache License 2.0](../LICENSE)
