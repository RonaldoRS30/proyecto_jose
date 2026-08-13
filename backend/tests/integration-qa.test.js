/**
 * QA de integración — prueba endpoints críticos admin + cliente.
 * Ejecutar: node tests/integration-qa.test.js
 * No imprime códigos de acceso en consola.
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sistema.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const results = [];
let adminToken = null;
let clientToken = null;
let clientId = null;
let calculoId = null;
let calculoReciboId = null;
let electroId = null;
let reportePdfId = null;

function pass(name, detail = '') {
  results.push({ status: 'PASS', name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ status: 'FAIL', name, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, { token, body, formData, expectStatus } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.arrayBuffer();
  }
  if (expectStatus && res.status !== expectStatus) {
    const msg = typeof data === 'object' && data?.message ? data.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return { status: res.status, data, headers: res.headers };
}

async function test(name, fn) {
  try {
    await fn();
  } catch (e) {
    fail(name, e.message || String(e));
  }
}

async function main() {
  console.log('\n=== QA Integración ElectrixStudio ===\n');

  // --- AUTH ---
  await test('Health check', async () => {
    const h = await fetch(`${BASE}/health`);
    const hd = await h.json();
    if (!hd.success) throw new Error('health failed');
    pass('GET /api/health');
  });

  await test('Admin login', async () => {
    const { data } = await req('POST', '/admin/login', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      expectStatus: 200,
    });
    if (!data.data?.token) throw new Error('sin token');
    adminToken = data.data.token;
    pass('POST /admin/login');
  });

  // --- ADMIN: clientes ---
  await test('Admin listar clientes', async () => {
    const { data } = await req('GET', '/clientes?page=1&limit=5', { token: adminToken, expectStatus: 200 });
    const list = data.data?.clientes || data.data || [];
    if (!Array.isArray(list) || list.length === 0) throw new Error('sin clientes');
    clientId = list[0].id;
    pass('GET /clientes', `${list.length} cliente(s)`);
  });

  await test('Admin estadísticas', async () => {
    await req('GET', '/clientes/estadisticas', { token: adminToken, expectStatus: 200 });
    pass('GET /clientes/estadisticas');
  });

  await test('Admin detalle cliente', async () => {
    await req('GET', `/clientes/${clientId}/detalle`, { token: adminToken, expectStatus: 200 });
    pass('GET /clientes/:id/detalle');
  });

  await test('Admin export resumen', async () => {
    const { status, data } = await req('GET', '/clientes/export-resumen', { token: adminToken });
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const size = data?.byteLength ?? 0;
    if (size < 100) throw new Error('archivo muy pequeño');
    pass('GET /clientes/export-resumen', `${size} bytes`);
  });

  // --- ADMIN: códigos ---
  let codigoLogin = null;
  await test('Admin listar códigos', async () => {
    const { data } = await req('GET', '/codigos?limit=10', { token: adminToken, expectStatus: 200 });
    const list = data.data?.codigos || data.data || [];
    const usable = list.find((c) => c.activo !== false && c.cliente_id);
    if (usable) codigoLogin = usable.codigo;
    pass('GET /codigos', `${list.length} código(s)`);
  });

  // --- ADMIN: recomendaciones ---
  await test('Admin listar recomendaciones', async () => {
    const { data } = await req('GET', '/recomendaciones?limit=5', { token: adminToken, expectStatus: 200 });
    const list = data.data?.recomendaciones || data.data || [];
    if (!Array.isArray(list)) throw new Error('formato inválido');
    pass('GET /recomendaciones', `${list.length} registro(s)`);
  });

  await test('Admin búsqueda recomendaciones', async () => {
    const { data } = await req('GET', '/recomendaciones?q=luz&limit=5', { token: adminToken, expectStatus: 200 });
    pass('GET /recomendaciones?q=...');
  });

  // --- ADMIN: configuración ---
  await test('Admin configuraciones', async () => {
    await req('GET', '/configuraciones', { token: adminToken, expectStatus: 200 });
    pass('GET /configuraciones');
  });

  await test('Admin contacto PDF config', async () => {
    await req('GET', '/configuraciones/contacto-pdf', { token: adminToken, expectStatus: 200 });
    pass('GET /configuraciones/contacto-pdf');
  });

  await test('Contacto público (sin auth)', async () => {
    await req('GET', '/reportes/contacto-publico', { expectStatus: 200 });
    pass('GET /reportes/contacto-publico');
  });

  // --- CLIENTE login ---
  await test('Cliente login con código', async () => {
    if (!codigoLogin) {
      // generar código para el cliente
      const { data: gen } = await req('POST', '/codigos/generar', {
        token: adminToken,
        body: { cliente_id: clientId, cantidad: 1 },
        expectStatus: 201,
      });
      codigoLogin = gen.data?.codigos?.[0]?.codigo || gen.data?.[0]?.codigo;
    }
    if (!codigoLogin) throw new Error('no hay código disponible');
    const { data } = await req('POST', '/clientes/login-codigo', {
      body: { codigo: codigoLogin },
      expectStatus: 200,
    });
    if (!data.data?.token) throw new Error('sin token cliente');
    clientToken = data.data.token;
    pass('POST /clientes/login-codigo');
  });

  // --- CLIENTE: perfil ---
  await test('Cliente mi perfil', async () => {
    const { data } = await req('GET', '/clientes/mi-perfil', { token: clientToken, expectStatus: 200 });
    if (!data.data?.id) throw new Error('sin perfil');
    clientId = data.data.id;
    pass('GET /clientes/mi-perfil');
  });

  // --- Electrodomésticos ---
  await test('Catálogo marca/modelo', async () => {
    await req('GET', '/electrodomesticos/catalogo-marca-modelo', { token: clientToken, expectStatus: 200 });
    pass('GET /electrodomesticos/catalogo-marca-modelo');
  });

  await test('Listar electrodomésticos', async () => {
    const { data } = await req('GET', '/electrodomesticos?tipo=aparato', { token: clientToken, expectStatus: 200 });
    const list = data.data || [];
    if (list.length > 0) electroId = list[0].id;
    pass('GET /electrodomesticos', `${list.length} equipo(s)`);
  });

  await test('Listar iluminación', async () => {
    await req('GET', '/electrodomesticos?tipo=iluminacion', { token: clientToken, expectStatus: 200 });
    pass('GET /electrodomesticos?tipo=iluminacion');
  });

  await test('Listar fantasma', async () => {
    await req('GET', '/electrodomesticos?tipo=fantasma', { token: clientToken, expectStatus: 200 });
    pass('GET /electrodomesticos?tipo=fantasma');
  });

  // --- Cálculos ---
  await test('Preview cálculo', async () => {
    const { data } = await req('GET', '/calculos/preview', { token: clientToken, expectStatus: 200 });
    const preview = data.data;
    if (!preview || preview.consumo_mes_total == null) throw new Error('preview vacío o sin consumo');
    pass('GET /calculos/preview', `consumo mes ${preview.consumo_mes_total}`);
  });

  await test('Ejecutar cálculo', async () => {
    const { data } = await req('POST', '/calculos', { token: clientToken, expectStatus: 201 });
    calculoId = data.data?.id;
    if (!calculoId) throw new Error('sin id cálculo');
    pass('POST /calculos', `id=${calculoId}`);
  });

  await test('Listar historial cálculos', async () => {
    const { data } = await req('GET', '/calculos?limit=10', { token: clientToken, expectStatus: 200 });
    const list = data.data?.calculos || data.data || [];
    const recibo = list.find((c) => c.origen === 'recibo');
    if (recibo) calculoReciboId = recibo.id;
    pass('GET /calculos', `${list.length} registro(s)`);
  });

  await test('Obtener cálculo por id', async () => {
    await req('GET', `/calculos/${calculoId}`, { token: clientToken, expectStatus: 200 });
    pass('GET /calculos/:id');
  });

  // --- Reportes PDF / Excel ---
  await test('Generar PDF reporte', async () => {
    const { data } = await req('POST', '/reportes/pdf', {
      token: clientToken,
      body: { calculo_id: calculoId },
      expectStatus: 201,
    });
    reportePdfId = data.data?.id;
    if (!reportePdfId) throw new Error('sin id reporte');
    pass('POST /reportes/pdf', `id=${reportePdfId}`);
  });

  await test('Descargar PDF reporte', async () => {
    const { status, data } = await req('GET', `/reportes/${reportePdfId}/download`, { token: clientToken });
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const size = data?.byteLength ?? 0;
    if (size < 500) throw new Error(`PDF muy pequeño (${size} bytes)`);
    pass('GET /reportes/:id/download', `${size} bytes`);
  });

  await test('Descargar Excel reporte', async () => {
    const { status, data } = await req('GET', `/reportes/${calculoId}/excel`, { token: clientToken });
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const size = data?.byteLength ?? 0;
    if (size < 500) throw new Error(`Excel muy pequeño (${size} bytes)`);
    pass('GET /reportes/:calculoId/excel', `${size} bytes`);
  });

  // Comparación PDF (necesita 2 cálculos no-recibo)
  await test('Generar PDF comparación', async () => {
    const { data: listData } = await req('GET', '/calculos?limit=20&origen=calculo', { token: clientToken });
    const list = (listData.data?.calculos || listData.data || []).filter((c) => c.origen !== 'recibo');
    if (list.length < 2) {
      await req('POST', '/calculos', { token: clientToken, expectStatus: 201 });
      const { data: list2 } = await req('GET', '/calculos?limit=20', { token: clientToken });
      const l2 = (list2.data?.calculos || list2.data || []).filter((c) => c.origen !== 'recibo');
      if (l2.length < 2) throw new Error('menos de 2 cálculos para comparar');
      list.push(...l2);
    }
    const [a, b] = list.slice(0, 2);
    const { data } = await req('POST', '/reportes/pdf-comparacion', {
      token: clientToken,
      body: { calculo_id_actual: a.id, calculo_id_referencia: b.id },
      expectStatus: 201,
    });
    const compId = data.data?.id;
    if (!compId) throw new Error('sin id comparación');
    const { status, data: blob } = await req('GET', `/reportes/${compId}/download`, { token: clientToken });
    if (status !== 200 || (blob?.byteLength ?? 0) < 500) throw new Error('descarga comparación falló');
    pass('POST /reportes/pdf-comparacion + download');
  });

  // --- Recomendaciones cliente ---
  await test('Cliente listar recomendaciones', async () => {
    await req('GET', '/recomendaciones?limit=5', { token: clientToken, expectStatus: 200 });
    pass('GET /recomendaciones (cliente)');
  });

  // --- Admin reportes con cliente_id ---
  await test('Admin generar PDF para cliente', async () => {
    const { data } = await req('POST', '/reportes/pdf', {
      token: adminToken,
      body: { calculo_id: calculoId, cliente_id: clientId },
      expectStatus: 201,
    });
    if (!data.data?.id) throw new Error('sin reporte admin');
    pass('POST /reportes/pdf (admin)');
  });

  // --- Resumen ---
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL');
  console.log(`\n=== Resultados: ${passed} passed, ${failed.length} failed ===\n`);
  if (failed.length) {
    console.log('FALLAS DETECTADAS:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
