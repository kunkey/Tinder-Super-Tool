# Tinder Super Tool

Công cụ tự động hóa Tinder (like/dislike, gửi tin nhắn, quản lý match). Giao diện Next.js + Electron.

## Cài đặt

```bash
npm install
```

Tạo file `.env` (hoặc copy từ `.env.local.example`), điền `PORT` nếu cần (mặc định 3000).

## Chạy

**Cách 1 – Trình duyệt**

```bash
npm run dev
```

Mở `http://localhost:3000` (hoặc port trong `.env`).

**Cách 2 – Electron (app desktop)**

```bash
npm run dev
```

Trong terminal khác:

```bash
npm run electron
```

Hoặc dùng `run.bat` (Windows): tự chạy dev server rồi Electron sẽ tự mở cửa sổ app.

## Sử dụng nhanh

1. **Auth**: Lấy token bằng script trong **Hướng dẫn** (nút sách) → Copy script, chạy trong DevTools Console của Tinder → Copy JSON vào **Cấu hình** → Áp dụng JSON → Cập nhật Auth.
2. **Cấu hình**: Nút bánh răng → thiết lập like, tin nhắn, vị trí.
3. **Chạy**: Nút Play (xanh) để bắt đầu tự động; nút Chat để xem/gửi tin nhắn.

## Build

```bash
npm run build
npm start
```

**Ghi chú:** Để sử dụng công cụ hiệu quả hơn, bạn nên sử dụng gói Tinder Plus hoặc cao cấp.  
[Tham khảo mã giảm giá Tinder tại đây](https://www.codashop.com/vi-vn/tinder-voucher-code)

---

## Bản quyền & Ủng hộ

**© 2024 [Tinder Super Tool](https://github.com/kunkey/Tinder-Super-Tool)**  
Dự án này dùng mục đích cá nhân. Vui lòng không sử dụng cho mục đích thương mại.

Nếu công cụ này hữu ích, bạn có thể ủng hộ tác giả một ly cà phê ❤️

> ☕ **Ủng hộ tác giả:**  
> **MbBank:** `9728622201289`  
> hoặc tặng 1 ⭐️ cho dự án!

**Khi chia sẻ công khai dự án này, tôi KHÔNG chịu trách nhiệm đối với bất kỳ nội dung nào mà người dùng đăng tải lên các nền tảng khác.**