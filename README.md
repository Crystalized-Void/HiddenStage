# HiddenStage

Plataforma web de comunidad gamer para publicar contenido, gestionar perfil y explorar temas de videojuegos.

Este README fue actualizado con base en el estado actual de esta rama (frontend estatico + backend Node.js/Express + MySQL).

## Resumen Del Proyecto

HiddenStage combina:

- Frontend en HTML/CSS/JavaScript con multiples vistas.
- Backend en Node.js con API REST.
- Persistencia en MySQL para usuarios, perfiles y publicaciones.

Flujo principal:

1. El servidor inicia y redirige la raiz a la pantalla de login.
2. Login/registro consumen la API.
3. La sesion se guarda en localStorage bajo la clave hiddenstageUser.
4. Perfil y publicaciones se consultan/actualizan por API.

## Stack Tecnologico

- Node.js
- Express
- MySQL 8+
- mysql2
- bcryptjs
- dotenv
- cors
- HTML5, CSS3 y JavaScript vanilla
- Font Awesome + Google Fonts (Lato)

## Estructura Principal

```text
HiddenStage/
|-- server.js
|-- package.json
|-- README.md
|-- inicio_de_sesion/
|   |-- index.html
|   |-- java.js
|   `-- style.css
|-- pagina_principal/
|   |-- pagina_principal.html
|   |-- generos.html
|   |-- principal.css
|   `-- README.md
|-- perfil/
|   |-- perfil.html
|   |-- crear-post.html
|   |-- perfil.css
|   `-- crear-post.css
|-- configuracion/
|   |-- configuracion.html
|   `-- configuracion.css
|-- database/
|   |-- hiddenstage_schema.sql
|   `-- MANUAL_INSTALACION.md
`-- img/
```

## Funcionalidades Actuales En Esta Rama

- Registro de usuario por email y password.
- Inicio de sesion con validacion de credenciales.
- Migracion automatica de password plano a bcrypt al primer login valido.
- Acceso como invitado desde login.
- Edicion de perfil:
  - username
  - biografia
  - pronombres
  - hasta 5 enlaces sociales
  - foto de perfil (base64)
  - banner de perfil (base64)
- Validacion de peso de imagen en backend (maximo 1MB para foto y banner).
- Creacion y consulta de posts por usuario.
- Cambio de tema claro/oscuro en vistas principales.

## Pantallas Del Frontend

- Login y registro: inicio_de_sesion/index.html
- Home principal: pagina_principal/pagina_principal.html
- Vista de generos: pagina_principal/generos.html
- Perfil de usuario: perfil/perfil.html
- Crear post: perfil/crear-post.html
- Configuracion: configuracion/configuracion.html

## API Disponible

Base URL local: <http://localhost:3000>

### Salud

- GET /api/health

### Autenticacion

- POST /api/register
- POST /api/login

### Perfil

- PUT /api/profile

### Publicaciones

- GET /api/posts/:id_usuario
- POST /api/posts

## Base De Datos

Script principal: database/hiddenstage_schema.sql

Entidades definidas en script:

- roles
- usuarios

Campos de perfil persistidos en usuarios:

- biografia
- pronombres
- red_social_1 a red_social_5
- foto_perfil
- banner_perfil

Nota importante: la API de publicaciones usa la tabla publicaciones, pero el script principal no la crea actualmente. Si estas levantando desde cero, agrega una tabla compatible antes de usar endpoints de posts.

## Instalacion Rapida

1. Instala dependencias:

```bash
npm install
```

1. Crea un archivo .env en la raiz con este formato:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_PASSWORD
DB_NAME=usuarios_hiddenstage
```

1. Aplica el esquema SQL:

```bash
mysql -u root -p < database/hiddenstage_schema.sql
```

1. Inicia el servidor:

```bash
npm start
```

1. Abre en navegador:

<http://localhost:3000>

## Scripts NPM

- npm start
- npm run dev

Ambos ejecutan server.js en el estado actual del proyecto.

## Estado Tecnico Actual

- Backend y frontend estan integrados via fetch a la API local.
- El frontend puede correr desde archivo local o desde localhost.
- Existe una carpeta database/mysql-data con datos locales de MySQL para entorno de desarrollo.

## Autores

- Gomez Tinoco Fernando
- Guerrero Garcia Alvaro Alberto
- Guzman Lizama Iara Samantha
- Membrila Gonzalez Fernando Ezequiel
- Sanchez Garcia Oscar Alberto

Proyecto academico en desarrollo activo.
