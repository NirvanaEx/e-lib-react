FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace apps/web

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# Шаблон, а не готовый конфиг: entrypoint nginx подставит в него APP_PORT.
# NGINX_ENVSUBST_FILTER ограничивает подстановку одной переменной, иначе
# envsubst съел бы $host, $remote_addr и прочие переменные самого nginx.
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER=APP_PORT
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
