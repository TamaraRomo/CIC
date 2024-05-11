# Usa la imagen base de Node.js versión 14
FROM node:20.12-alpine

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia el archivo package.json y package-lock.json al directorio de trabajo
COPY package*.json ./


# Instala las dependencias
RUN npm install

# Copia los archivos de la base de datos
COPY database ./database

# Copia el archivo de configuración de variables de entorno
COPY env/.env .

# Copia los módulos Node.js
COPY node_modules ./node_modules

# Copia los archivos de los módulos de la aplicación
COPY modules ./modules

# Copia los archivos de las vistas
COPY views ./views

# Copia los archivos de la aplicación
COPY app.js .
COPY middleware.js .
# Expone el puerto 3000 (o cualquier puerto que tu aplicación Node.js utilice)
EXPOSE 3000

USER node

# Especifica el comando a ejecutar cuando se inicie el contenedor
CMD ["node", "app.js"]
