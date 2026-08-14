FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
