FROM node:20-alpine

RUN apk add --no-cache openssl font-noto

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
