# 🚀 Pasos para Subir TWERKHUB a GitHub

## Paso 1: Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `twerkhub`
3. Descripción: `TWERKHUB - Plataforma de Contenido Twerk Premium`
4. Click en "Create repository"
5. Copia la URL (algo como `https://github.com/tu-usuario/twerkhub.git`)

---

## Paso 2: Hacer push desde tu computadora

Abre **PowerShell** o **CMD** y ejecuta ESTO:

```powershell
cd C:\Users\Claudio\OneDrive\Desktop\proyectos\twerkhub

git init

git config user.email "alexiatwerkoficial@gmail.com"
git config user.name "Alexia"

git add .

git commit -m "TWERKHUB v1.0 - Backend 100% Complete"

git remote add origin https://github.com/TU-USUARIO/twerkhub.git

git branch -M main

git push -u origin main
```

**IMPORTANTE**: Reemplaza `TU-USUARIO` con tu usuario de GitHub

---

## Si pide contraseña:

En lugar de contraseña, necesitas un **Personal Access Token**:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens
2. Click en "Generate new token"
3. Selecciona: `repo`, `write:packages`
4. Click en "Generate token"
5. Copia el token (aparece una sola vez)
6. Cuando pida contraseña, pega el token

---

## Verificar que subió:

- Ve a https://github.com/tu-usuario/twerkhub
- Deberías ver todos los archivos listados

**¡Listo!** 🎉

