#!/usr/bin/env bash
# fix-server.sh — Telegram webhook muammosini hal qiladi
# Run: bash ~/crewly/fix-server.sh

set -e

KEY=~/Downloads/crewly.pem
HOST=ubuntu@16.171.40.119
WEBHOOK_SECRET="0e26d77229135fe185cbbd6ab4ac0b354864a771278ffb2a9963a252cc56a5a7"

echo "🔑 PEM key permissions tuzatilmoqda..."
chmod 400 "$KEY"

echo "🚀 Serverga ulanmoqda va env vars tuzatilmoqda..."
ssh -i "$KEY" -o StrictHostKeyChecking=no "$HOST" << ENDSSH

set -e

# Loyiha papkasini topish
PROJECT=\$(find /home/ubuntu -name "docker-compose.prod.yml" -maxdepth 4 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
if [ -z "\$PROJECT" ]; then
  PROJECT="/home/ubuntu/crewly"
fi
echo "📁 Project: \$PROJECT"
cd "\$PROJECT"

# .env.production mavjudligini tekshirish
if [ ! -f .env.production ]; then
  echo "❌ .env.production topilmadi: \$PROJECT/.env.production"
  exit 1
fi

echo "✏️  PUBLIC_URL va TELEGRAM_WEBHOOK_SECRET tuzatilmoqda..."
sed -i 's|^PUBLIC_URL=.*|PUBLIC_URL=https://crewly.uz|' .env.production
sed -i 's|^TELEGRAM_WEBHOOK_SECRET=.*|TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}|' .env.production

echo ""
echo "=== Yangilangan env vars ==="
grep -E "PUBLIC_URL|TELEGRAM_WEBHOOK_SECRET|NODE_ENV" .env.production

echo ""
echo "🔄 Backend restart qilinmoqda..."
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend

echo ""
echo "⏳ Backend start bo'lishini kutish (20 sek)..."
sleep 20

echo ""
echo "=== Webhook holati ==="
curl -s https://api.telegram.org/bot\$(grep TELEGRAM_BOT_TOKEN .env.production | cut -d= -f2)/getWebhookInfo | python3 -m json.tool 2>/dev/null || \
curl -s https://api.telegram.org/bot\$(grep TELEGRAM_BOT_TOKEN .env.production | cut -d= -f2)/getWebhookInfo

ENDSSH

echo ""
echo "✅ Tugadi!"
