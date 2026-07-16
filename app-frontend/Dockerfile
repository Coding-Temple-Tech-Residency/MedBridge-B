FROM node:22-alpine
FROM node:22-alpine

WORKDIR /app-frontend

RUN npm install -g pnpm

COPY package*.json ./

RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]