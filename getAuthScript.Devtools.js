// ================================================
//   🔥 TINDER SUPER TOOL AUTH DEVTOOLS SCRIPT 🔥
//   © 2024 by kunkeypr - All Rights Reserved 🚀
//   "Hack the planet, but with style 😎"
// ------------------------------------------------
//   Hướng dẫn sử dụng (2024):
//   1. Mở Tinder web, đăng nhập và vào trang hồ sơ cá nhân.
//   2. Mở DevTools Console (F12 hoặc Ctrl+Shift+I).
//   3. Dán toàn bộ script này rồi Enter.
//   4. Copy kết quả JSON "📦 TINDER SESSION JSON" để cấu hình.
// ------------------------------------------------
//   Github: https://github.com/kunkey
// ================================================

(() => {
    const _fetch = window.fetch;

    window.fetch = async (...args) => {
        const [url, options] = args;

        if (typeof url === "string" && url.includes("api.gotinder.com/v2/profile")) {
            const headers =
                options?.headers instanceof Headers
                    ? Object.fromEntries(options.headers.entries())
                    : (options?.headers || {});

            // console.log("HEADERS:", headers);

            const result = {
                meID: null,
                "app-session-id": headers["app-session-id"] || headers["App-Session-Id"],
                "app-session-time-elapsed": headers["app-session-time-elapsed"] || headers["App-Session-Time-Elapsed"] || headers["App-Session-Time-Elapsed"],
                "persistent-device-id": headers["persistent-device-id"] || headers["Persistent-Device-Id"],
                "user-session-id": headers["user-session-id"] || headers["User-Session-Id"],
                "user-session-time-elapsed": headers["user-session-time-elapsed"] || headers["User-Session-Time-Elapsed"],
                "x-auth-token": headers["x-auth-token"] || headers["X-Auth-Token"],
                locale: "vi"
            };

            const response = await _fetch(...args);
            const clone = response.clone();

            try {
                const json = await clone.json();
                result.meID = json?.data?.user?._id || null;

                console.log("📦 TINDER SESSION JSON");
                console.log(JSON.stringify(result, null, 2));

                // Lưu tạm để dùng lại
                window.__TINDER_SESSION__ = result;

                // fetch("https://tinder.discordvn.net/api/update-auth", {
                //     method: "POST",
                //     headers: {
                //       "Content-Type": "application/json"
                //     },
                //     body: JSON.stringify(result)
                //   })
                //   .then(res => {
                //     console.log("HTTP STATUS:", res.status);
                //     return res.text();
                //   })
                //   .then(text => {
                //     console.log("RESPONSE BODY:", text);
                //   })
                //   .catch(err => {
                //     console.error("FETCH ERROR:", err);
                //   });

            } catch (e) {
                console.error("Parse response error", e);
            }

            return response;
        }

        return _fetch(...args);
    };
})();
