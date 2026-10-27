# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Español](README.es-ES.md) | [Português](README.pt-BR.md) | [Русский](README.ru-RU.md) | Bahasa Indonesia | [Tiếng Việt](README.vi-VN.md)

NocoCRM adalah CRM penjualan B2B open source yang dibangun di atas [NocoBase 3](https://www.nocobase.com). Dilengkapi 6 agen penjualan dan terhubung dengan email serta WhatsApp Anda: menindaklanjuti prospek dan peluang, langsung membalas pesan, dan meninjau persetujuan bersama Anda. Agen memberi saran, Anda yang memutuskan.

https://github.com/user-attachments/assets/4ce7965d-f030-4239-b5f3-0dae7c975496

[Coba online](https://solutions.nocobase.com/crm/) · [Situs web](https://www.nocobase.com/id-ID/solution-crm/)

## Apa yang bisa dilakukan

- **Tidak ada yang terlewat.** Prospek atau peluang baru, balasan pelanggan, tugas yang selesai, pemeriksaan pagi: agen membaca seluruh konteks lalu menaruh langkah berikutnya di kotak masuk Anda, lengkap dengan keputusan, tingkat keyakinan, dan alasannya. Data baru berubah setelah Anda menerimanya.
- **Semua kanal dalam satu linimasa.** Setiap orang menghubungkan kotak suratnya sendiri, dan perusahaan menghubungkan nomor WhatsApp Business-nya. Pesan dicocokkan ke prospek dan kontak, dan balasan disiapkan untuk dikirim dari akun Anda sendiri.
- **Tim agen penjualan.** Sales Expert untuk diajak bicara, ditambah tindak lanjut prospek, tindak lanjut peluang, tinjauan persetujuan, persiapan tugas, dan riset perusahaan, masing-masing dengan pemicu, keahlian, dan catatan eksekusinya.
- **Persetujuan tidak lagi macet.** Agen persetujuan memeriksa diskon atau ketentuan terhadap aturan dan keputusan Anda sebelumnya, lalu menyusun rekomendasi dan komentar untuk pemberi persetujuan.
- **Aturan Anda, kode Anda.** Tulis harga, batas diskon, dan ritme tindak lanjut sebagai panduan bisnis dalam teks biasa, dan setiap agen mengikutinya. Minta agen pemrograman mengubah kode sumber CRM itu sendiri. Open source, di-host sendiri, dan milik Anda.
- **Seluruh siklus penjualan.** Prospek, perusahaan, kontak, peluang, tugas, persetujuan, dan laporan, dengan peran yang ditegakkan server untuk setiap data.

## Mulai cepat

### 1. Instal

**Dengan agen pemrograman.** Cara termudah. Buka Claude Code, Codex, atau Cursor di folder tempat NocoCRM akan disimpan, lalu berikan ini:

```text
Instal NocoCRM dari https://github.com/nocobase/NocoCRM dan jalankan, dengan mengikuti AGENTS.md dan README repositori.
```

**Secara manual.** Anda memerlukan Node.js 24 atau lebih baru dan pnpm 11 (`corepack enable`). Data secara bawaan disimpan dalam file SQLite; PostgreSQL dan MySQL juga bisa dipakai.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Masuk

Buka alamat `Local:` yang ditampilkan `pnpm dev`, biasanya `http://127.0.0.1:13000/main/`, lalu masuk sebagai `nocobase` dengan kata sandi `admin123`.

### 3. Impor data demo

Spanduk di bagian atas menawarkannya, atau buka **Pengaturan → Data demo**. Data ini membawa tim penjualan lengkap dengan pelanggan, peluang, tugas, persetujuan, email, dan percakapan; hapus di halaman yang sama saat Anda mulai menggunakan secara nyata.

### 4. Siapkan model AI

Tambahkan layanan model beserta kuncinya di **Tim Agent → Model**, misalnya DeepSeek, OpenAI, Claude, Gemini, atau Qwen. Asisten dan para agen memerlukannya; fitur lainnya tetap berjalan tanpanya.

[Panduan](guide.md) (bahasa Inggris) membahas langkah selanjutnya, akun demo, peran, konfigurasi (AI, email, WhatsApp, basis data), deployment, dan pengembangan.

## Lisensi

[Apache License 2.0](../LICENSE)
