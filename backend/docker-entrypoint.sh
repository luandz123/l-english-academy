#!/bin/sh
# Chạy trong container production (Render). Áp migration lên Neon rồi mới khởi động app.
# prisma.config.ts dùng DATABASE_URL_UNPOOLED (kết nối trực tiếp, cần cho advisory lock của migrate),
# thiếu thì rơi về DATABASE_URL.
# SKIP_MIGRATIONS=true để bỏ qua (ví dụ khi cần chạy image mà không đụng DB).
set -e

if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "Applying database migrations..."
  ./node_modules/.bin/prisma migrate deploy
fi

exec node dist/main.js
