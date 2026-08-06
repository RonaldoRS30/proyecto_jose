const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { Calculo, DetalleCalculo } = require('../models');

const EXCEL_UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'excel');

if (!fs.existsSync(EXCEL_UPLOADS_DIR)) {
  fs.mkdirSync(EXCEL_UPLOADS_DIR, { recursive: true });
}

const resolvePythonCommand = () => {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  return process.platform === 'win32' ? 'python' : 'python3';
};

const generarExcel = async (calculoId) => {
  const calculo = await Calculo.findByPk(calculoId, {
    include: [{ model: DetalleCalculo, as: 'detalles' }],
  });

  if (!calculo) throw new Error('Cálculo no encontrado');

  const detalles = calculo.detalles.map((d) => ({
    nombre: d.nombre,
    modulo: d.modulo,
    categoria: d.categoria,
    potencia_w: parseFloat(d.potencia_w),
    horas_uso_dia: parseFloat(d.horas_uso_dia),
    consumo_mes: parseFloat(d.consumo_mes),
    gasto_mensual: parseFloat(d.gasto_mensual),
    gasto_anual: parseFloat(d.gasto_anual),
  }));

  const data = { detalles };
  const uid = crypto.randomUUID();
  const inputJsonPath = path.join(EXCEL_UPLOADS_DIR, `input_${uid}.json`);
  const outputExcelPath = path.join(EXCEL_UPLOADS_DIR, `calculo_${uid}.xlsx`);

  fs.writeFileSync(inputJsonPath, JSON.stringify(data, null, 2), 'utf-8');

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'scripts', 'generate_excel.py');
    const pythonCmd = resolvePythonCommand();
    const child = spawn(pythonCmd, [pythonScript, inputJsonPath, outputExcelPath]);

    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => {
      try {
        fs.unlinkSync(inputJsonPath);
      } catch (e) {}
      reject(
        new Error(
          `No se pudo ejecutar Python (${pythonCmd}). En el VPS instale: apt install python3 python3-pip && pip3 install xlsxwriter. Detalle: ${err.message}`
        )
      );
    });

    child.on('close', (code) => {
      try {
        fs.unlinkSync(inputJsonPath);
      } catch (e) {}
      if (code !== 0) {
        return reject(new Error(`Error al generar Excel: ${stderr || `código ${code}`}`));
      }
      resolve(outputExcelPath);
    });
  });
};

module.exports = { generarExcel };
