FROM node:24-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/var/lib/nusaklik/data
ENV STORAGE_DIR=/var/lib/nusaklik/storage

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.ts ./
COPY server ./server
COPY migrations ./migrations
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["npm", "start"]
