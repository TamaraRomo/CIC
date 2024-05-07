# Usa la imagen base de Node.js versión 14
FROM node:20.12-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia el archivo package.json y package-lock.json al directorio de trabajo
COPY package*.json ./

# application files are owned by the non-root node user
USER node
# Instala las dependencias
RUN npm install

# Copia el contenido actual del directorio de trabajo al directorio /app del contenedor
COPY --chown=node:node . .
# Expone el puerto 3000 (o cualquier puerto que tu aplicación Node.js utilice)
EXPOSE 3000

# Especifica el comando a ejecutar cuando se inicie el contenedor
CMD ["node", "app.js"]
