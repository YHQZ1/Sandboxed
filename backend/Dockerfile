FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

RUN npm rebuild bcrypt --build-from-source

COPY . .

RUN npm run build

RUN npm prune --production
RUN apk del python3 make g++

EXPOSE 4000

CMD ["node", "dist/server.js"]