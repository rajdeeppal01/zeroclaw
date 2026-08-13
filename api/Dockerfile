FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Non-root user for security
USER node

EXPOSE 3000

CMD ["npm", "start"]
