# Meta Ads Manager — Vercel

Panel completo para gestionar campañas de Meta Ads, desplegado en Vercel con backend seguro.

## 🚀 Deploy en 5 pasos

### 1. Clona o sube a GitHub
```bash
git init
git add .
git commit -m "feat: meta ads manager"
git remote add origin https://github.com/TU_USUARIO/meta-ads-manager.git
git push -u origin main
```

### 2. Conecta con Vercel
- Ve a [vercel.com](https://vercel.com) → New Project
- Importa tu repositorio de GitHub
- Vercel detectará automáticamente la configuración

### 3. Configura las variables de entorno en Vercel
En Vercel → Tu proyecto → Settings → Environment Variables, agrega:

| Variable | Valor |
|---|---|
| `META_ACCESS_TOKEN` | Tu token de larga duración |
| `META_ACCOUNT_ID` | act_XXXXXXXXX |
| `META_API_VERSION` | v19.0 |
| `API_SECRET_KEY` | Clave aleatoria (ver abajo) |

Generar API_SECRET_KEY:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# o
openssl rand -hex 32
```

### 4. Deploy
Vercel hace el deploy automáticamente al hacer push. También puedes:
```bash
npx vercel --prod
```

### 5. Listo 🎉
Tu app estará en: `https://tu-proyecto.vercel.app`

---

## 🛠 Desarrollo local

```bash
# 1. Instala Vercel CLI
npm i -g vercel

# 2. Copia variables de entorno
cp .env.example .env.local
# Edita .env.local con tus valores reales

# 3. Corre localmente
vercel dev
# App disponible en http://localhost:3000
```

## 📁 Estructura del proyecto

```
meta-ads-vercel/
├── public/
│   └── index.html          # Frontend completo
├── api/
│   ├── campaigns.js        # GET/POST/DELETE campañas
│   ├── adsets.js           # GET/POST ad sets
│   ├── insights.js         # GET métricas
│   └── status.js           # Health check + verificación de env vars
├── .env.example            # Plantilla de variables de entorno
├── vercel.json             # Configuración de rutas
└── README.md
```

## 🔐 Seguridad

- El token de Meta **nunca** se expone al navegador
- Todas las llamadas a la API de Meta se hacen desde el servidor (Vercel Functions)
- Las variables de entorno solo existen en el servidor
- Nunca subas `.env.local` a Git (ya está en `.gitignore`)

## 📋 Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/status` | Verificar configuración y conexión |
| GET | `/api/campaigns` | Listar campañas |
| POST | `/api/campaigns` | Crear campaña |
| DELETE | `/api/campaigns?id=XXX` | Eliminar campaña |
| GET | `/api/adsets` | Listar ad sets |
| POST | `/api/adsets` | Crear ad set |
| GET | `/api/insights` | Obtener métricas |
