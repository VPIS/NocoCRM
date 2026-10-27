# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | 日本語 | [한국어](README.ko-KR.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Español](README.es-ES.md) | [Português](README.pt-BR.md) | [Русский](README.ru-RU.md) | [Bahasa Indonesia](README.id-ID.md) | [Tiếng Việt](README.vi-VN.md)

NocoCRM は [NocoBase 3](https://www.nocobase.com) で構築されたオープンソースの B2B 営業 CRM です。6 種の営業エージェントを搭載し、メールと WhatsApp に連携します。リードや商談を自動でフォローし、届いたメッセージにすぐ返信し、承認では一緒に検討します。エージェントが提案し、人が判断します。

https://github.com/user-attachments/assets/575c9b19-4437-47a8-9c59-d428f90efa5a

[オンラインで試す](https://solutions.nocobase.com/crm/) · [公式サイト](https://www.nocobase.com/ja-JP/solution-crm/)

## できること

- **フォロー漏れをなくす。** 新しいリードや商談、顧客からの返信、タスクの完了、毎朝のチェックをきっかけに、エージェントが経緯をすべて読み、判断・確度・理由を添えて次の一手を受信トレイに届けます。レコードが変わるのは、あなたが採用したときだけです。
- **すべてのチャネルを 1 本のタイムラインに。** メールボックスは各自が、WhatsApp Business の番号は会社が接続します。メッセージはリードや連絡先に自動でひも付き、返信の下書きはあなた自身のアカウントから送信されます。
- **営業エージェントチーム。** 対話できる Sales Expert に加え、リードのフォローアップ、商談のフォローアップ、承認レビュー、タスクの準備、企業リサーチ。それぞれにトリガー、スキル、実行記録があります。
- **承認が止まらない。** 承認エージェントが値引きや条件をあなたのルールや過去の判断と照らし合わせ、承認者のために推奨とコメントを下書きします。
- **ルールもコードも、あなたのもの。** 価格、値引きの上限、フォローの頻度をビジネスガイダンスに平易な文章で書けば、すべてのエージェントがそれに従います。コーディングエージェントに CRM のソースコードそのものを変更させることもできます。オープンソースでセルフホスト可能です。
- **営業サイクル全体を。** リード、会社、連絡先、商談、タスク、承認、レポート。ロールに応じた権限はサーバーがレコードごとに適用します。

## クイックスタート

### 1. インストール

**コーディングエージェントでインストール。** いちばん簡単な方法です。NocoCRM を置くフォルダで Claude Code、Codex または Cursor を開き、次のように伝えます。

```text
https://github.com/nocobase/NocoCRM から NocoCRM をインストールして起動してください。リポジトリの AGENTS.md と README に従ってください。
```

**手動でインストール。** Node.js 24 以降と pnpm 11（`corepack enable`）が必要です。データは既定で SQLite ファイルに保存されます。PostgreSQL と MySQL も使えます。

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. サインイン

`pnpm dev` が表示する `Local:` のアドレス（通常は `http://127.0.0.1:13000/main/`）を開き、ユーザー名 `nocobase`、パスワード `admin123` でサインインします。

### 3. デモデータをインポート

画面上部のバナーから、または **設定 → デモデータ** からインポートします。顧客、商談、タスク、承認、メール、会話を持つ営業チームが追加されます。本番運用を始めるときは同じページで削除します。

### 4. AI モデルを設定

**Agent チーム → モデル** で、DeepSeek、OpenAI、Claude、Gemini、Qwen などのモデルサービスをキーとともに追加します。アシスタントとエージェントに必要です。それ以外の機能はなくても動きます。

[ガイド](guide.md)（英語）では、その後の手順、デモアカウント、ロール、設定（AI、メール、WhatsApp、データベース）、デプロイ、開発を説明しています。

## ライセンス

[Apache License 2.0](../LICENSE)
