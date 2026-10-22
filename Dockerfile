# ---- 1. Base image ------------------------------------------------
# Pinned on purpose. Node.js validates outbound TLS against the root store
# compiled into the Node.js binary, not against the OS ca-certificates, so the
# Node.js release defines which CAs the service trusts. Raise the version
# deliberately. 24.22.1 distrusts the compromised eMudhra/emSign CAs (2026-10-21).
FROM node:24.22.1-alpine3.24

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