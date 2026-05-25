# ViewportsLocater

> Plataforma colaborativa de descubrimiento de miradores naturales en España.

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular)](https://angular.dev)
[![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel)](https://laravel.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://www.mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com)

**Demo en producción:** [lucasgc26.iesmontenaranco.com](https://lucasgc26.iesmontenaranco.com)

---

## ¿Qué es ViewportsLocater?

ViewportsLocater es una aplicación web fullstack que permite descubrir, explorar y compartir miradores naturales. Los usuarios pueden buscar miradores con filtros avanzados, consultar rutas de acceso con trazado GPX, ver el clima actual en cada ubicación y recibir recomendaciones personalizadas a través de un chatbot con inteligencia artificial.

Desarrollado como Proyecto Final de Ciclo del CFGS Desarrollo de Aplicaciones Web (DAW) en el IES Monte Naranco — Oviedo, Asturias.

---

## Funcionalidades

### Usuario no registrado
- Ver los 6 miradores mejor valorados
- Consultar el detalle de cualquier mirador: fotos, descripción, rutas, clima y valoraciones
- Visualizar el trazado GPX de rutas en el mapa interactivo

### Usuario registrado
- Búsqueda y filtrado avanzado: provincia, dificultad, proximidad, etiquetas y valoración mínima
- Crear, editar y eliminar miradores propios
- Añadir rutas con fichero GPX descargable
- Subir hasta 5 fotos por mirador
- Valorar miradores con puntuación del 1 al 5
- Gestionar lista de favoritos
- Chatbot de recomendación con IA en lenguaje natural
- Perfil con estadísticas propias

### Administrador
- Panel de administración con estadísticas globales y gráfico mensual
- Gestión completa de usuarios, miradores, rutas y etiquetas

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 21 · TypeScript · Leaflet.js · Chart.js · RxJS |
| Backend | Laravel 12 · PHP 8.2 · Sanctum · Spatie Permission · Eloquent |
| Base de datos | MySQL 8.0 |
| Despliegue | Docker · Docker Compose · Nginx · PHP-FPM |
| APIs externas | OpenAI GPT-4o-mini · OpenWeatherMap v2.5 |

---

## Estructura del repositorio

```
├── ViewportsLocater-LucasGarcia-Front/   # SPA Angular 21
└── ViewportsLocater-LucasGarcia-Back/    # API REST Laravel 12
docker-compose.yml                        # Orquestación de los tres contenedores
```

---

## Credenciales de prueba

| Tipo | Email | Contraseña |
|------|-------|-----------|
| Usuario registrado | test@test.com | 12345678 |

---

## Instalación local con Docker

### Requisitos previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución
- [Git](https://git-scm.com/)

### Pasos

**1. Clonar el repositorio**
```bash
git clone https://github.com/LucasGarciaCortina/Proyecto-Final
cd Proyecto-Final
```

**2. Configurar las variables de entorno del backend**

Copia el archivo de ejemplo y rellena tus claves:
```bash
cp ViewportsLocater-LucasGarcia-Back/.env.example ViewportsLocater-LucasGarcia-Back/.env
```

Variables necesarias:
```env
APP_ENV=local
APP_DEBUG=true
DB_HOST=mysql
DB_DATABASE=viewports_locater
DB_USERNAME=lucas
DB_PASSWORD=tu_password
OPENAI_API_KEY=sk-...
OPENWEATHER_API_KEY=tu_clave
```

**3. Construir y levantar los contenedores**
```bash
docker-compose build
docker-compose up -d
```

El script de arranque ejecuta automáticamente las migraciones, seeders y configuración de caché.

**4. Verificar que todo está corriendo**
```bash
docker ps
```

Deberías ver tres contenedores activos: `frontend`, `backend` y `mysql`.

**5. Acceder a la aplicación**

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000/api |

---

## Arquitectura

```
Navegador
    │
    ▼
┌─────────────────────────────────────────┐
│           Docker Compose                │
│                                         │
│  ┌─────────────┐    ┌────────────────┐  │
│  │  Frontend   │    │    Backend     │  │
│  │ Angular+Nginx│◄──►│ Laravel+Nginx  │  │
│  │  Puerto 80  │    │  Puerto 8000   │  │
│  └─────────────┘    └───────┬────────┘  │
│                             │           │
│                    ┌────────▼────────┐  │
│                    │     MySQL 8.0   │  │
│                    │ Volumen persist.│  │
│                    └─────────────────┘  │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   OpenWeatherMap          OpenAI
      API v2.5           GPT-4o-mini
```

El frontend y el backend comparten un volumen Docker (`storage_data`) para que las imágenes y ficheros GPX sean accesibles directamente desde Nginx sin pasar por PHP.

---

## Decisiones técnicas destacadas

**Filtrado en cliente.** Los filtros avanzados (provincia, dificultad, tags, proximidad, valoración) se aplican en el frontend sobre la lista completa de miradores, evitando múltiples peticiones al servidor y garantizando respuesta instantánea.

**Tags con lógica AND.** Al seleccionar varias etiquetas, el sistema devuelve solo los miradores que tienen todas las etiquetas seleccionadas simultáneamente, no cualquiera de ellas.

**Chatbot estructurado.** GPT-4o-mini no devuelve texto libre sino JSON estricto con los criterios de búsqueda extraídos de la consulta. El backend parsea ese JSON y construye la query a la base de datos, garantizando que los resultados son siempre datos reales.

**Autenticación Bearer.** Laravel Sanctum gestiona los tokens. Un interceptor funcional de Angular los añade automáticamente en cada petición saliente sin que los servicios individuales tengan que gestionarlo.

**Índice compuesto.** La tabla `miradores` tiene un índice compuesto sobre `(latitud, longitud)` para optimizar las búsquedas por proximidad con la fórmula de Haversine.

---

## Autor

**Lucas García Cortina**  
CFGS Desarrollo de Aplicaciones Web · IES Monte Naranco · Oviedo, Asturias  
Tutora: Ana Belén Macías Arévalo · Curso 2025-2026

---

## Licencia

Proyecto académico. Todos los derechos reservados.
