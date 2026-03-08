# Chạy app dạng Electron (khung desktop)

## Cách chạy (khuyên dùng)

**Terminal 1 – Next.js:**
```bash
npm run dev
```
Chờ đến khi thấy `Ready on http://localhost:3301`.

**Terminal 2 – Electron:**
```bash
npm run electron
```

Cửa sổ Electron sẽ mở và load `http://localhost:3301`. Sửa code React/Next → hot reload như bình thường, không cần tắt Electron.

## Lưu ý

- Chỉ cần **restart Electron** khi sửa `electron/main.js` hoặc config Electron.
- Nếu mở Electron trước khi chạy `npm run dev`, cửa sổ sẽ hiện thông báo “Chưa chạy Next.js” → chạy `npm run dev` rồi Ctrl+R trong cửa sổ Electron.
