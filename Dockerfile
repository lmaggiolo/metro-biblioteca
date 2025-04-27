# --- Base image -------------------------------------------------------------
FROM node:20.16.0

# --- Application metadata ---------------------------------------------------
LABEL maintainer="lmaggiolo <lorenzo.maggiolo01@gmail.com>"
LABEL org.opencontainers.image.source="https://github.com/lmaggiolo/metro-biblioteca"

# --- Environment ------------------------------------------------------------
ENV NODE_ENV=production \
    PORT=3000

# --- Working directory ------------------------------------------------------
WORKDIR /opt/metro-biblioteca

# --- Dependency installation (cached layer) ---------------------------------
# Copia in anticipo solo i file manifest così da sfruttare la cache Docker
COPY package*.json ./

# Installa solo le dipendenze di produzione
RUN npm ci --omit=dev

# --- Application source code ------------------------------------------------
COPY . .

# --- Network ----------------------------------------------------------------
EXPOSE 3000

# --- Startup command --------------------------------------------------------
CMD ["npm", "start"]