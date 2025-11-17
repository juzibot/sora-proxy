FROM 789252305933.dkr.ecr.cn-northwest-1.amazonaws.com.cn/node:20.11.1-alpine3.19 AS builder

# Build-time env for Next.js (NEXT_PUBLIC_* are inlined during `next build`)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT
ARG NEXT_PUBLIC_AZURE_OPENAI_API_VERSION
ARG NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT=${NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT}
ENV NEXT_PUBLIC_AZURE_OPENAI_API_VERSION=${NEXT_PUBLIC_AZURE_OPENAI_API_VERSION}
ENV NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT=${NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT}

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p public
RUN npm run build

FROM 789252305933.dkr.ecr.cn-northwest-1.amazonaws.com.cn/node:20.11.1-alpine3.19

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]

