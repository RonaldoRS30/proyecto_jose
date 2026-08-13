/** QA extendido — recibos, filtros, admin CRUD read-only checks */
const BASE = 'http://127.0.0.1:5000/api';
const ADMIN = { email: 'admin@sistema.com', password: 'Admin123!' };

const issues = [];

function issue(modulo, proceso, detalle) {
  issues.push({ modulo, proceso, detalle });
  console.log(`  ✗ [${modulo}] ${proceso}: ${detalle}`);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

async function json(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, data };
}

async function main() {
  console.log('\n=== QA Extendido ===\n');

  const { data: adminRes } = await json('POST', '/admin/login', { body: ADMIN });
  const adminToken = adminRes.data.token;

  const { data: codesRes } = await json('GET', '/codigos?limit=5', { token: adminToken });
  const codigo = (codesRes.data || []).find((c) => c.activo !== false)?.codigo;
  if (!codigo) {
    issue('Auth', 'Cliente login', 'No hay código activo');
    return summarize();
  }

  const { data: clientRes } = await json('POST', '/clientes/login-codigo', { body: { codigo } });
  const clientToken = clientRes.data.token;

  // List calculos with pagination structure
  const { data: paginated } = await json('GET', '/calculos?page=1&limit=8', { token: clientToken });
  if (!paginated.data || paginated.total == null) {
    issue('Historial', 'Paginación', 'GET /calculos?page=1&limit=8 no devuelve data+total');
  } else {
    ok(`Paginación historial: ${paginated.data.length} de ${paginated.total}`);
  }

  // Filters
  for (const q of [
    'mes=8&anio=2026',
    'origen=recibo',
    'origen=calculo',
    'fecha_desde=2026-01-01&fecha_hasta=2026-12-31',
  ]) {
    const { status, data } = await json('GET', `/calculos?${q}&limit=5`, { token: clientToken });
    if (status !== 200) issue('Historial', `Filtro ${q}`, `HTTP ${status}`);
    else ok(`Filtro ${q}: ${(data.data || []).length} registro(s)`);
  }

  const { data: allCalcs } = await json('GET', '/calculos?limit=50', { token: clientToken });
  const calculos = allCalcs.data || [];
  const recibos = calculos.filter((c) => c.origen === 'recibo');
  const calculosNorm = calculos.filter((c) => c.origen !== 'recibo');

  if (recibos.length) {
    const recibo = recibos[0];
    const { status: exSt } = await json('GET', `/reportes/${recibo.id}/excel`, { token: clientToken });
    if (exSt === 500 || exSt === 404) {
      issue(
        'Reportes',
        'Excel en registro recibo',
        `GET /reportes/${recibo.id}/excel → HTTP ${exSt}. En Reportes el cliente puede pulsar Excel en filas recibo (sin filtro origen).`,
      );
    } else if (exSt === 200) {
      ok(`Excel recibo id=${recibo.id} OK`);
    }

    const { status: pdfSt, data: pdfData } = await json('POST', '/reportes/pdf', {
      token: clientToken,
      body: { calculo_id: recibo.id },
    });
    if (pdfSt >= 400) {
      issue('Reportes', 'PDF en registro recibo', pdfData?.message || `HTTP ${pdfSt}`);
    } else {
      ok(`PDF recibo id=${recibo.id} generado`);
    }
  }

  // Preview structure for dashboard
  const { data: preview } = await json('GET', '/calculos/preview', { token: clientToken });
  if (!preview.data?.resumenGeneral?.consumoMes) {
    issue('Dashboard', 'Preview cálculo', 'Falta resumenGeneral.consumoMes en preview');
  } else {
    ok(`Preview consumo mes: ${preview.data.resumenGeneral.consumoMes} kWh`);
  }

  // Admin recomendaciones search
  const { data: recSearch } = await json('GET', '/recomendaciones?q=horno&limit=5', { token: adminToken });
  const recList = recSearch.data?.recomendaciones || recSearch.data || [];
  if (!Array.isArray(recList)) {
    issue('Admin', 'Búsqueda recomendaciones', 'Respuesta inválida');
  } else {
    ok(`Búsqueda recomendaciones "horno": ${recList.length} resultado(s)`);
  }

  // Admin export resumen (JSON → CSV en frontend)
  const { data: exportData } = await json('GET', '/clientes/export-resumen', { token: adminToken });
  if (!Array.isArray(exportData.data) || !exportData.data.length) {
    issue('Admin', 'Exportar clientes CSV', 'Sin datos en export-resumen');
  } else {
    ok(`Export resumen: ${exportData.data.length} cliente(s)`);
  }

  // Comparación needs 2 calculos
  if (calculosNorm.length >= 2) {
    const [a, b] = calculosNorm.slice(0, 2);
    const { status, data } = await json('POST', '/reportes/pdf-comparacion', {
      token: clientToken,
      body: { calculo_id_actual: a.id, calculo_id_referencia: b.id },
    });
    if (status !== 201) issue('Comparación', 'PDF comparación', data?.message || `HTTP ${status}`);
    else ok('PDF comparación cliente OK');
  }

  // CalculoContext behavior: ultimoCalculo should skip recibo
  const latestNonRecibo = calculos.find((c) => c.origen !== 'recibo');
  if (recibos.length && calculos[0]?.origen === 'recibo' && latestNonRecibo) {
    ok('CalculoContext: hay recibo más reciente pero existe cálculo estimado para dashboard');
  }

  // Electrodomesticos CRUD dry-run read
  const { data: electros } = await json('GET', '/electrodomesticos', { token: clientToken });
  if (!electros.data?.length) {
    issue('Electrodomésticos', 'Listado', 'Cliente sin equipos — preview/dashboard limitados');
  } else {
    ok(`${electros.data.length} electrodoméstico(s) activos`);
  }

  // Comparación incluye recibos — puede confundir métricas de gasto energía
  if (recibos.length && calculosNorm.length) {
    const recibo = recibos[0];
    const calc = calculosNorm[0];
    const reciboGasto = parseFloat(recibo.gasto_mensual_total ?? 0);
    const reciboConsumo = parseFloat(recibo.consumo_mes_total ?? recibo.resumen_json?.consumo_kwh ?? 0);
    if (reciboConsumo > 0 && reciboGasto === 0) {
      issue(
        'Comparación',
        'Selector incluye recibos reales',
        `Registro recibo id=${recibo.id} tiene consumo ${reciboConsumo} kWh pero gasto_mensual_total=0. ComparacionPage lista recibos y puede mostrar S/ 0 en gasto energía vs cálculo estimado.`,
      );
    }
  }

  summarize();
}

function summarize() {
  console.log(`\n=== Fallas reales detectadas: ${issues.length} ===\n`);
  issues.forEach((i, n) => {
    console.log(`${n + 1}. Módulo: ${i.modulo}`);
    console.log(`   Proceso/botón: ${i.proceso}`);
    console.log(`   Detalle: ${i.detalle}\n`);
  });
  if (issues.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
