# HiddenStage

Plataforma web de comunidad gamer para publicar contenido, gestionar perfil y explorar temas de videojuegos.

Este README fue actualizado con base en el estado actual de esta rama (frontend estatico + backend Node.js/Express + MySQL).

<<<<<<< HEAD
## Resumen Del Proyecto
=======
[Visita mi sitio web](https://hiddenstage.io/pagina_principal/pagina_principal.html#reciente)

## 📁 Descripción del Proyecto
>>>>>>> 5a463d3b6658ad345d6d19af3a717a8525ebed29

HiddenStage combina:

- Frontend en HTML/CSS/JavaScript con multiples vistas.
- Backend en Node.js con API REST.
- Persistencia en MySQL para usuarios, perfiles y publicaciones.

Flujo principal:

<<<<<<< HEAD
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
=======
## ✨ Objetivo del Proyecto
>>>>>>> 5a463d3b6658ad345d6d19af3a717a8525ebed29

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

<<<<<<< HEAD
### Perfil
=======
## 💡 Funcionalidades Principales
>>>>>>> 5a463d3b6658ad345d6d19af3a717a8525ebed29

- PUT /api/profile

<<<<<<< HEAD
### Publicaciones
=======
Modo oscuro
El modo oscuro mejora la accesibilidad y reduce la fatiga visual. Al ofrecer ambas versiones, garantizamos que nuestra interfaz sea cómoda, adaptándose a las preferencias del usuario.

<img width="1528" height="1091" alt="image" src="https://github.com/user-attachments/assets/5ad1d5f8-9447-4ccc-9870-ebc65067721c" />

Creación de publicaciones
Los usuarios pueden compartir contenido relacionado con videojuegos, como reseñas, recomendaciones, noticias o experiencias personales.
>>>>>>> 5a463d3b6658ad345d6d19af3a717a8525ebed29

- GET /api/posts/:id_usuario
- POST /api/posts

<<<<<<< HEAD
## Base De Datos

Script principal: database/hiddenstage_schema.sql

Entidades definidas en script:

- roles
- usuarios
=======
<img width="1688" height="874" alt="image" src="https://github.com/user-attachments/assets/82e526b6-70d5-45fc-aaa8-73ed24f28031" />

Foro o sistema de chat
Permite que los usuarios participen en discusiones, respondan a publicaciones y compartan opiniones con otros miembros de la comunidad.

<img width="1537" height="992" alt="image" src="https://github.com/user-attachments/assets/ee5512de-8578-4629-8e1c-02efc42aa0d4" />

Edición de perfil
Los usuarios pueden modificar información básica de su cuenta para mantener su perfil actualizado.

<img width="1595" height="1078" alt="image" src="https://github.com/user-attachments/assets/e99f3a6c-ae76-431d-8bc9-1f666cf19fac" />

Exploración de contenido
Los visitantes pueden navegar por distintas publicaciones, descubrir nuevos juegos y ver las opiniones de otros jugadores.

<img width="1528" height="1053" alt="image" src="https://github.com/user-attachments/assets/a73519be-e7b4-4e91-8552-2912f0062342" />

## 💻 Tecnologías Utilizadas

El proyecto fue desarrollado utilizando tecnologías básicas de desarrollo web:

-HTML 
    Se utiliza para construir la estructura del sitio web, organizar el contenido y definir los elementos principales de        cada página.
    
-CSS
    Se encarga del diseño visual de la plataforma, incluyendo estilos, colores, distribución de los elementos y adaptación      de la interfaz para que sea más atractiva y fácil de usar.

-JavaScript
    Permite agregar interactividad y funcionalidades dinámicas al sitio, como la creación de publicaciones, interacción         dentro del foro, manejo de perfiles de usuario y otras acciones dentro de la página.

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)

## 👩‍💻👨‍💻 AUTORES:

* [GÓMEZ TINOCO FERNANDO](https://github.com/FernandoG5)
* [GUERRERO GARCÍA ÁLVARO ALBERTO](https://github.com/aguerrero29-creator)
* [GUZMÁN LIZAMA IARA SAMANTHA](https://github.com/IaraLizama)
* [MEMBRILA GONZÁLEZ FERNANDO EZEQUIEL](https://github.com/EzequielFie)
* [SANCHEZ GARCÍA OSCAR ALBERTO](https://github.com/Oscar2434)

>>>>>>> 5a463d3b6658ad345d6d19af3a717a8525ebed29

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
