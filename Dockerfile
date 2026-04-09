# ---- 1. Base image ------------------------------------------------
FROM node:lts-alpine

# ---- 2. Runtime layer ---------------------------------------------
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# ---- 3. Container runtime settings --------------------------------
# ENV NODE_ENV=production
ENV PORT=9000
EXPOSE 9000

# ---- 4. Start the NestJS server -----------------------------------
CMD [ "node", "dist/main" ]