# Sistema de Cálculo de Consumo Eléctrico

Sistema web profesional para calcular el consumo eléctrico residencial, replicando **exactamente** las fórmulas del archivo Excel `CÁLCULO - CONSUMO ELÉCTRICO.xlsx`.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + React Router + Recharts |
| Backend | Node.js + Express |
| Base de Datos | MySQL + Sequelize ORM |
| Seguridad | JWT, Bcrypt, middlewares de auth/autorización |
| Reportes | PDFKit |

## Arquitectura

```
proyecto_jose/
├── backend/                 # API REST modular
│   ├── config/              # DB y variables de entorno
│   ├── controllers/         # Controladores ligeros
│   ├── middlewares/         # Auth JWT + roles
│   ├── models/              # Modelos Sequelize
│   ├── routes/              # Rutas REST
│   ├── services/            # Lógica de negocio
│   │   └── calculationEngine.js  # ★ Motor de cálculo (réplica Excel)
│   ├── pdf/                 # Generación de reportes
│   └── tests/               # Tests del motor de cálculo
└── frontend/                # SPA React
    ├── components/          # UI reutilizable
    ├── contexts/            # Auth + Theme (dark mode)
    ├── layouts/             # Admin + Cliente
    ├── pages/               # Vistas por rol
    └── services/            # Cliente HTTP (axios)
```

## Fórmulas del Excel (Motor de Cálculo)

Fuente: 4 hojas analizadas — `CALCULADORA`, `1.CONSUMO APARATOS`, `2.CONSUMO FANTASMA`, `3.CONSUMO LUCES`.

### Por dispositivo

| Celda Excel | Fórmula | JavaScript |
|-------------|---------|------------|
| F | `=(C*E*D)/1000` | `consumoDia = (cantidad × potenciaW × horasDiarias) / 1000` |
| G | `=F*30` | `consumoMes = consumoDia × 30` |
| H | `=F*365` | `consumoAnio = consumoDia × 365` |
| I | `=$J$1*F` | `gastoDiario = precioKwh × consumoDia` |
| J | `=$J$1*G` | `gastoMensual = precioKwh × consumoMes` |
| K | `=$J$1*H` | `gastoAnual = precioKwh × consumoAnio` |

### Facturación mensual (hoja CALCULADORA)

| Concepto | Valor Excel |
|----------|-------------|
| Consumo Energía | Total kWh mes × precio kWh |
| Cargo Fijo | S/ 2.26 |
| Mant. Reposición | S/ 1.68 |
| Alumbrado Público | S/ 17.64 |
| Interés Compensatorio | S/ 0.82 |
| SUBTOTAL | Suma anterior |
| IGV | SUBTOTAL × 0.18 |
| Electrificación Rural | S/ 5.01 |
| **TOTAL MES** | IGV + Elect. Rural + SUBTOTAL |

Precio kWh por defecto: **S/ 0.613** (celda J1).

## Roles

### Administrador
- Login con email/contraseña
- CRUD de clientes, códigos, configuración
- Dashboard con estadísticas

### Cliente
- Acceso **solo con código** (sin usuario/contraseña)
- Dashboard, electrodomésticos, fantasma, iluminación
- Historial, reportes PDF, perfil

## Instalación

### Requisitos
- Node.js 18+
- MySQL 8+

### 1. Base de datos

```sql
CREATE DATABASE consumo_electrico CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Editar .env con credenciales MySQL
npm install
npm run dev
```

Al iniciar, Sequelize sincroniza tablas y crea el admin por defecto:
- **Email:** admin@sistema.com
- **Password:** Admin123!

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173

## API REST

| Método | Endpoint | Rol |
|--------|----------|-----|
| POST | `/api/admin/login` | Público |
| POST | `/api/clientes/login-codigo` | Público |
| GET/POST/PUT/DELETE | `/api/clientes` | Admin |
| POST | `/api/codigos/generar` | Admin |
| GET/POST/PUT/DELETE | `/api/electrodomesticos` | Admin/Cliente |
| GET | `/api/calculos/preview` | Admin/Cliente |
| POST | `/api/calculos` | Admin/Cliente |
| POST | `/api/reportes/pdf` | Admin/Cliente |
| PUT | `/api/configuraciones` | Admin |

## Tests del motor

```bash
cd backend
npm run test:calc
```

## Flujo del cliente

1. Admin registra cliente → genera código
2. Cliente paga → recibe código
3. Cliente ingresa código en `/login`
4. Registra equipos en los 3 módulos
5. Ejecuta cálculo → ve resultados y gráficos
6. Descarga reporte PDF desde Historial/Reportes

## Decisiones de arquitectura

1. **Motor desacoplado** (`calculationEngine.js`): Sin dependencias de Express ni Sequelize. Testeable de forma aislada.
2. **Servicios vs Controladores**: Controladores solo orquestan HTTP; toda lógica en servicios.
3. **Preview en tiempo real**: `GET /calculos/preview` recalcula sin persistir — la UI se actualiza al modificar datos.
4. **Módulos separados**: `aparato`, `fantasma`, `iluminacion` mapean a las 3 hojas del Excel.
5. **Configuración dinámica**: Precio kWh y cargos de factura editables desde panel admin.
