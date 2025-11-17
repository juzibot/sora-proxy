FROM i.juzibot.com/node:20.11.1-alpine3.19 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM i.juzibot.com/node:20.11.1-alpine3.19

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

