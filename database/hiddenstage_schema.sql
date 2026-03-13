-- =============================================================
-- HiddenStage: script principal de base de datos
-- ¿Para qué sirve?
-- 1) Crea la base de datos si no existe.
-- 2) Crea las tablas principales (roles y usuarios).
-- 3) Inserta el rol base "Usuario registrado".
-- 4) Aplica migraciones para proyectos ya existentes.
-- 5) Incluye consultas de verificación.
--
-- Cómo ejecutarlo (terminal de VS Code):
-- mysql -u root -p < database/hiddenstage_schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS usuarios_hiddenstage
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Selecciona la base donde se crearán/editarán las tablas
USE usuarios_hiddenstage;

-- Tabla de roles de usuario (catálogo)
CREATE TABLE IF NOT EXISTS roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla principal de usuarios y perfil
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(160) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  biografia TEXT NULL,
  pronombres VARCHAR(80) NULL,
  red_social_1 VARCHAR(255) NULL,
  red_social_2 VARCHAR(255) NULL,
  red_social_3 VARCHAR(255) NULL,
  red_social_4 VARCHAR(255) NULL,
  red_social_5 VARCHAR(255) NULL,
  foto_perfil LONGTEXT NULL,
  banner_perfil LONGTEXT NULL,
  id_rol INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_roles
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

-- Inserta rol por defecto si todavía no existe
INSERT INTO roles (nombre_rol)
VALUES ('Usuario registrado')
ON DUPLICATE KEY UPDATE nombre_rol = VALUES(nombre_rol);

-- -------------------------------------------------------------
-- MIGRACIONES (para proyectos que ya tenían tabla "usuarios")
-- Estas líneas agregan columnas nuevas sin romper datos previos.
-- -------------------------------------------------------------

-- Agrega biografía si la tabla antigua no la tenía
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS biografia TEXT NULL AFTER password;

-- Agrega campos extendidos de perfil (pronombres, redes, foto, banner)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS pronombres VARCHAR(80) NULL AFTER biografia,
  ADD COLUMN IF NOT EXISTS red_social_1 VARCHAR(255) NULL AFTER pronombres,
  ADD COLUMN IF NOT EXISTS red_social_2 VARCHAR(255) NULL AFTER red_social_1,
  ADD COLUMN IF NOT EXISTS red_social_3 VARCHAR(255) NULL AFTER red_social_2,
  ADD COLUMN IF NOT EXISTS red_social_4 VARCHAR(255) NULL AFTER red_social_3,
  ADD COLUMN IF NOT EXISTS red_social_5 VARCHAR(255) NULL AFTER red_social_4,
  ADD COLUMN IF NOT EXISTS foto_perfil LONGTEXT NULL AFTER red_social_5,
  ADD COLUMN IF NOT EXISTS banner_perfil LONGTEXT NULL AFTER foto_perfil;

-- -------------------------------------------------------------
-- CONSULTAS DE VERIFICACIÓN
-- Úsalas para comprobar que todo quedó bien.
-- -------------------------------------------------------------
SELECT id_usuario, username, email, biografia, pronombres,
  red_social_1, red_social_2, red_social_3, red_social_4, red_social_5,
  IF(foto_perfil IS NULL OR foto_perfil = '', 'SIN FOTO', 'CON FOTO') AS estado_foto,
  IF(banner_perfil IS NULL OR banner_perfil = '', 'SIN BANNER', 'CON BANNER') AS estado_banner,
       id_rol
FROM usuarios
ORDER BY id_usuario DESC;

SELECT id_rol, nombre_rol
FROM roles
ORDER BY id_rol;

-- -------------------------------------------------------------
-- EJEMPLOS MANUALES (opcionales)
-- -------------------------------------------------------------

-- Ejemplo simple: actualizar solo biografía
-- UPDATE usuarios
-- SET biografia = 'Mi nueva biografía'
-- WHERE id_usuario = 1;

-- Ejemplo completo: actualizar varios campos de perfil
-- UPDATE usuarios
-- SET biografia = 'Mi nueva biografía',
--     pronombres = 'Ella/Elle',
--     red_social_1 = 'https://x.com/miusuario',
--     red_social_2 = 'https://instagram.com/miusuario'
-- WHERE id_usuario = 1;
