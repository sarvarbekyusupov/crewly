# nginx

SSL termination, reverse proxy, rate limiting, security headers.

Config: `nginx/nginx.conf`

---

## Routing Rules

```
HTTP :80
  └── All traffic → 301 redirect to HTTPS

HTTPS :443 (crewly.uz)
  ├── www.crewly.uz → 301 redirect to crewly.uz
  ├── /health → backend:3000 (no rate limit)
  ├── /(api|webhooks)/  → backend:3000
  │     rate limit: 30 req/min, burst 20
  │     proxy timeout: 1h (for SSE/long-poll)
  │     chunked transfer enabled
  ├── /__og-image__/ → frontend:3000 (cache 1 day)
  ├── static files (*.png, *.jpg, *.ico, *.svg, *.webp) → frontend:3000 (cache 30 days)
  └── / → frontend:3000 (WebSocket upgrade enabled)
```

---

## Full Configuration

```nginx
worker_processes auto;

events {
  worker_connections 1024;
}

http {
  # Rate limiting zone
  limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

  # Upstream targets
  upstream backend  { server backend:3000; }
  upstream frontend { server frontend:3000; }

  # Compression
  gzip on;
  gzip_min_length 1024;
  gzip_comp_level 5;
  gzip_types text/plain text/css application/json application/javascript
             application/xml text/xml application/x-www-form-urlencoded;

  # HTTP → HTTPS redirect
  server {
    listen 80;
    server_name _;
    location /health { proxy_pass http://backend; }
    location / { return 301 https://$host$request_uri; }
  }

  # Main HTTPS server
  server {
    listen 443 ssl http2;
    server_name crewly.uz;

    # SSL
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-CHACHA20-POLY1305;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 25m;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           DENY always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           strict-origin-when-cross-origin always;

    # API + Webhooks (with rate limiting)
    location ~ ^/(api|webhooks)/ {
      limit_req zone=api burst=20 nodelay;
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      # SSE / long connections
      proxy_read_timeout    3600s;
      proxy_connect_timeout 60s;
      proxy_send_timeout    3600s;
      proxy_buffering       off;            # required for SSE
      chunked_transfer_encoding on;
    }

    # Health check (no rate limit)
    location /health {
      proxy_pass http://backend;
    }

    # OG images (1-day cache)
    location /__og-image__/ {
      proxy_pass http://frontend;
      proxy_cache_valid 200 86400s;
      add_header Cache-Control "public, max-age=86400";
    }

    # Static files (30-day cache)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp|woff2|woff|ttf)$ {
      proxy_pass http://frontend;
      add_header Cache-Control "public, max-age=2592000";
    }

    # Everything else → frontend (with WebSocket support)
    location / {
      proxy_pass http://frontend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade    $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host       $host;
    }
  }

  # www redirect
  server {
    listen 443 ssl http2;
    server_name www.crewly.uz;
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    return 301 https://crewly.uz$request_uri;
  }
}
```

---

## Rate Limiting Details

Zone: `api` — tracks by client IP (`$binary_remote_addr`).

```
rate=30r/m    → 1 request per 2 seconds average
burst=20      → up to 20 excess requests queued
nodelay        → queue processed immediately (no artificial delay)
```

When burst queue full → `429 Too Many Requests`.

Endpoints excluded from rate limit:
- `/health` — used by Docker healthcheck (unlimited)

---

## Security Headers

| Header | Value | Effect |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | HTTPS enforced for 2 years (browsers remember) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking (no embedding in iframes) |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter (modern browsers use CSP) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer header leakage |

---

## SSL Configuration

Protocol: TLSv1.2 + TLSv1.3 (TLSv1.0 and 1.1 disabled).

Cipher priority (strongest first):
1. `ECDHE-ECDSA-AES256-GCM-SHA384`
2. `ECDHE-RSA-AES256-GCM-SHA384`
3. `ECDHE-CHACHA20-POLY1305`
4. `ECDHE-RSA-AES128-GCM-SHA256`

Session resumption: shared cache, 1-day timeout (reduces TLS handshake overhead for returning clients).

---

## SSE Considerations

Server-Sent Events require special nginx config:

```nginx
proxy_buffering off;          # must be off — nginx would buffer until response completes
proxy_read_timeout 3600s;     # keep connection open for 1 hour
chunked_transfer_encoding on; # required for streaming
```

Without `proxy_buffering off`, SSE messages are buffered until nginx closes the connection — real-time updates would never arrive.

---

## Testing nginx Config

```bash
# Test config syntax without restarting
docker compose exec -T nginx nginx -t

# Reload config (no downtime)
docker compose exec -T nginx nginx -s reload

# View nginx access log
docker compose -f docker-compose.prod.yml logs -f nginx
```
