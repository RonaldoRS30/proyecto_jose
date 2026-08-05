import sys
import json
import xlsxwriter

def main():
    if len(sys.argv) < 3:
        print("Uso: python generate_excel.py <input.json> <output.xlsx>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    detalles = data.get('detalles', [])

    workbook = xlsxwriter.Workbook(output_file)
    ws_datos = workbook.add_worksheet("Datos")
    ws_graficos = workbook.add_worksheet("Dashboard")

    # Formatos
    header_format = workbook.add_format({'bold': True, 'bg_color': '#1A4AB0', 'font_color': 'white'})
    currency_format = workbook.add_format({'num_format': '"S/"#,##0.00'})
    num_format = workbook.add_format({'num_format': '#,##0.00'})

    headers = ['Equipo', 'Módulo', 'Categoría', 'Potencia (W)', 'Horas/día', 'Consumo mes (kWh)', 'Gasto mes (S/)', 'Gasto anual (S/)']
    for col, h in enumerate(headers):
        ws_datos.write(0, col, h, header_format)
        ws_datos.set_column(col, col, 15)

    ws_datos.set_column(0, 0, 25) # Equipo más ancho
    ws_datos.set_column(2, 2, 20) # Categoría más ancho

    row_count = len(detalles)
    for i, d in enumerate(detalles, start=1):
        ws_datos.write_string(i, 0, d.get('nombre', ''))
        ws_datos.write_string(i, 1, d.get('modulo', ''))
        ws_datos.write_string(i, 2, d.get('categoria', 'Sin categoría'))
        ws_datos.write_number(i, 3, float(d.get('potencia_w', 0)), num_format)
        ws_datos.write_number(i, 4, float(d.get('horas_uso_dia', 0)), num_format)
        ws_datos.write_number(i, 5, float(d.get('consumo_mes', 0)), num_format)
        ws_datos.write_number(i, 6, float(d.get('gasto_mensual', 0)), currency_format)
        ws_datos.write_number(i, 7, float(d.get('gasto_anual', 0)), currency_format)

    if row_count > 0:
        # Gráfico 1: Consumo por equipo
        chart1 = workbook.add_chart({'type': 'bar'})
        chart1.add_series({
            'name': 'Consumo Mensual (kWh)',
            'categories': ['Datos', 1, 0, row_count, 0],
            'values':     ['Datos', 1, 5, row_count, 5],
            'fill':       {'color': '#10b981'}
        })
        chart1.set_title({'name': 'Consumo por Equipo (kWh/mes)'})
        chart1.set_x_axis({'name': 'kWh'})
        chart1.set_legend({'none': True})
        ws_graficos.insert_chart('B2', chart1, {'x_scale': 1.5, 'y_scale': 1.5})

        # Gráfico 2: Gasto mensual por equipo
        chart2 = workbook.add_chart({'type': 'column'})
        chart2.add_series({
            'name': 'Gasto Mensual (S/)',
            'categories': ['Datos', 1, 0, row_count, 0],
            'values':     ['Datos', 1, 6, row_count, 6],
            'fill':       {'color': '#ef4444'}
        })
        chart2.set_title({'name': 'Gasto Mensual por Equipo (S/)'})
        chart2.set_y_axis({'name': 'S/'})
        chart2.set_legend({'none': True})
        ws_graficos.insert_chart('K2', chart2, {'x_scale': 1.5, 'y_scale': 1.5})

        # Gráfico 3: Gasto anual vs diario (en Excel no hay diario, usamos anual y mensual como barras comparativas)
        chart3 = workbook.add_chart({'type': 'column'})
        chart3.add_series({
            'name': 'Gasto Anual (S/)',
            'categories': ['Datos', 1, 0, row_count, 0],
            'values':     ['Datos', 1, 7, row_count, 7],
            'fill':       {'color': '#8b5cf6'}
        })
        chart3.add_series({
            'name': 'Gasto Mensual (S/)',
            'categories': ['Datos', 1, 0, row_count, 0],
            'values':     ['Datos', 1, 6, row_count, 6],
            'fill':       {'color': '#f59e0b'}
        })
        chart3.set_title({'name': 'Comparativa de Gastos Anual vs Mensual (S/)'})
        chart3.set_y_axis({'name': 'S/'})
        ws_graficos.insert_chart('B25', chart3, {'x_scale': 2.4, 'y_scale': 1.5})

    ws_graficos.activate()
    workbook.close()
    print("OK")

if __name__ == '__main__':
    main()
