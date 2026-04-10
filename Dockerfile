# ── NutriTrack — Dockerfile ──────────────────
# Serves static files (index.html, style.css, app.js)
# via Nginx on Cloud Run

FROM nginx:alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy your static files
COPY index.html /usr/share/nginx/html/
COPY style.css  /usr/share/nginx/html/
COPY app.js     /usr/share/nginx/html/

# Cloud Run sends traffic on PORT env var (default 8080)
# Nginx config to respect that
RUN printf 'server {\n\
    listen $PORT;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / { try_files $uri $uri/ /index.html; }\n\
}\n' > /etc/nginx/templates/default.conf.template

EXPOSE 8080