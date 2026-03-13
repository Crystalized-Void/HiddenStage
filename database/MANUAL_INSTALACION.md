# HiddenStage — Manual de instalación (paso a paso)

Este proyecto usa:
- Frontend HTML/CSS/JS
- Backend Node.js + Express
- Base de datos MySQL

Todo lo puedes hacer desde la terminal de VS Code, copiando y pegando comandos.

---

## 1) Requisitos

Necesitas tener instalado:
- Node.js 18 o superior
- MySQL Server
- (Opcional) MySQL Workbench

Para comprobar versiones en terminal:

```powershell
node -v
npm -v
```

---

## ¿Qué es Node.js y para qué sirve?

`Node.js` es el entorno que permite ejecutar JavaScript fuera del navegador.

En este proyecto se usa para:
- Levantar el servidor backend (`server.js`)
- Crear endpoints de login/registro/perfil
- Conectar con MySQL

### Cómo descargar e instalar Node.js (Windows)

1. Entra a: `https://nodejs.org`
2. Descarga la versión **LTS** (recomendada).
3. Ejecuta el instalador `.msi` y deja las opciones por defecto.
4. Reinicia VS Code (para que reconozca `node` y `npm`).
5. Verifica instalación:

```powershell
node -v
npm -v
```

Si ambos comandos muestran versión, ya quedó instalado.

---

## ¿Qué es Express y para qué sirve?

`Express` es un framework de Node.js para crear servidores web y APIs de forma simple.

En este proyecto se usa para:
- Definir rutas como `/api/login`, `/api/register`, `/api/profile`
- Recibir JSON desde el frontend
- Responder datos al navegador

### Cómo instalar Express (y dependencias del proyecto)

Desde la carpeta del proyecto en terminal de VS Code:

```powershell
cd c:\Users\iaral\Desktop\HiddenStage-main
npm install
```

Ese comando instala todo lo que está en `package.json`, incluyendo `express`.

Si solo quisieras instalar Express manualmente:

```powershell
npm install express
```

---

## 2) Abrir el proyecto en terminal

En VS Code abre una terminal y entra a la carpeta:

```powershell
cd c:\Users\iaral\Desktop\HiddenStage-main
```

---

## 3) Instalar dependencias

```powershell
npm install
```

---

## 4) Configurar variables de entorno

Si no existe `.env`, créalo copiando el ejemplo:

```powershell
copy .env.example .env
```

Abre `.env` y revisa estos datos:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_PASSWORD
DB_NAME=usuarios_hiddenstage
```

---

## 5) Crear o actualizar la base de datos

### Opción A (rápida por terminal)

```powershell
mysql -u root -p < database/hiddenstage_schema.sql
```

### Opción B (MySQL Workbench)
1. Abre Workbench.
2. Conéctate a tu servidor local.
3. Abre el archivo [database/hiddenstage_schema.sql](database/hiddenstage_schema.sql).
4. Ejecuta todo el script.

---

## 6) Iniciar el servidor

```powershell
npm start
```

Si todo va bien, verás algo como:

`Servidor activo en http://localhost:3000`

---

## 7) Abrir la app

En el navegador entra a:

`http://localhost:3000`

---

## 8) Comandos útiles (copiar y pegar)

### Revisar si el puerto 3000 está encendido
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

### Probar salud de API
```powershell
curl http://localhost:3000/api/health
```

### Reiniciar backend rápido
1. Detén con `Ctrl + C`
2. Ejecuta de nuevo:

```powershell
npm start
```

---

## 9) ¿Qué guarda el perfil en la base de datos?

En la tabla `usuarios` se guardan:
- `username`
- `biografia`
- `pronombres`
- `red_social_1` a `red_social_5`
- `foto_perfil`
- `banner_perfil`

---

## 10) Endpoints principales

- `POST /api/register` → crea usuario
- `POST /api/login` → inicia sesión y devuelve datos de perfil
- `PUT /api/profile` → actualiza datos del perfil

---

## 11) Límites de imágenes

- Foto de perfil: máximo 1MB
- Banner de perfil: máximo 1MB

Se valida en frontend y backend.

---

## Nota

El registro asigna el rol `Usuario registrado` desde la tabla `roles`.