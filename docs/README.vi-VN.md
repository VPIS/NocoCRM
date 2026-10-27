# NocoCRM

[English](../README.MD) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Español](README.es-ES.md) | [Português](README.pt-BR.md) | [Русский](README.ru-RU.md) | [Bahasa Indonesia](README.id-ID.md) | Tiếng Việt

NocoCRM là CRM bán hàng B2B mã nguồn mở, xây dựng trên [NocoBase 3](https://www.nocobase.com). Có sẵn 6 agent bán hàng và kết nối email, WhatsApp của bạn: theo dõi khách hàng tiềm năng và cơ hội, trả lời tin nhắn ngay lập tức, cùng bạn xem xét phê duyệt. Agent đề xuất, bạn quyết định.

https://github.com/user-attachments/assets/4ce7965d-f030-4239-b5f3-0dae7c975496

[Dùng thử trực tuyến](https://solutions.nocobase.com/crm/) · [Trang web](https://www.nocobase.com/vi-VN/solution-crm/)

## Làm được gì

- **Không bỏ sót việc gì.** Khách hàng tiềm năng hay cơ hội mới, phản hồi của khách hàng, công việc vừa xong, lượt kiểm tra buổi sáng: agent đọc toàn bộ bối cảnh rồi đưa bước tiếp theo vào hộp thư của bạn, kèm kết luận, mức độ chắc chắn và lý do. Bản ghi chỉ thay đổi khi bạn chấp nhận.
- **Mọi kênh trên một dòng thời gian.** Mỗi người kết nối hộp thư của riêng mình, công ty kết nối số WhatsApp Business. Tin nhắn được gắn với khách hàng tiềm năng và liên hệ, câu trả lời được soạn sẵn để gửi từ chính tài khoản của bạn.
- **Một đội agent bán hàng.** Sales Expert để trò chuyện, cùng theo dõi khách hàng tiềm năng, theo dõi cơ hội, xem xét phê duyệt, chuẩn bị công việc và nghiên cứu công ty, mỗi agent có điều kiện kích hoạt, kỹ năng và nhật ký chạy riêng.
- **Phê duyệt không còn bị tắc.** Agent phê duyệt đối chiếu mức chiết khấu hay điều khoản với quy tắc và các quyết định trước đây của bạn, rồi soạn đề xuất và ý kiến cho người phê duyệt.
- **Quy tắc của bạn, mã nguồn của bạn.** Viết giá, hạn mức chiết khấu và nhịp theo dõi thành hướng dẫn kinh doanh bằng văn bản thường, mọi agent đều làm theo. Nhờ agent lập trình sửa chính mã nguồn của CRM. Mã nguồn mở, tự lưu trữ và hoàn toàn thuộc về bạn.
- **Trọn chu trình bán hàng.** Khách hàng tiềm năng, công ty, liên hệ, cơ hội, công việc, phê duyệt và báo cáo, với vai trò được máy chủ áp dụng cho từng bản ghi.

## Bắt đầu nhanh

### 1. Cài đặt

**Bằng agent lập trình.** Cách dễ nhất. Mở Claude Code, Codex hoặc Cursor trong thư mục sẽ chứa NocoCRM và đưa cho nó yêu cầu này:

```text
Cài đặt NocoCRM từ https://github.com/nocobase/NocoCRM và khởi chạy, làm theo AGENTS.md và README của kho mã.
```

**Cài thủ công.** Bạn cần Node.js 24 trở lên và pnpm 11 (`corepack enable`). Dữ liệu mặc định được lưu trong một tệp SQLite; PostgreSQL và MySQL cũng dùng được.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Đăng nhập

Mở địa chỉ `Local:` mà `pnpm dev` in ra, thường là `http://127.0.0.1:13000/main/`, rồi đăng nhập bằng `nocobase` với mật khẩu `admin123`.

### 3. Nhập dữ liệu mẫu

Biểu ngữ ở đầu trang sẽ gợi ý, hoặc mở **Cài đặt → Dữ liệu mẫu**. Dữ liệu này mang đến một đội bán hàng với khách hàng, cơ hội, công việc, phê duyệt, email và các cuộc trò chuyện; xóa nó ở cùng trang khi bạn bắt đầu dùng thật.

### 4. Thiết lập mô hình AI

Thêm một dịch vụ mô hình cùng khóa của nó trong **Đội ngũ Agent → Mô hình**, chẳng hạn DeepSeek, OpenAI, Claude, Gemini hoặc Qwen. Trợ lý và các agent cần nó; mọi tính năng khác vẫn chạy được khi không có.

[Hướng dẫn](guide.md) (tiếng Anh) trình bày các bước tiếp theo, tài khoản mẫu, vai trò, cấu hình (AI, email, WhatsApp, cơ sở dữ liệu), triển khai và phát triển.

## Giấy phép

[Apache License 2.0](../LICENSE)
