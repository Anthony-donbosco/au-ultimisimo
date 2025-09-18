#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import get_db

db = get_db()

# Verificar la estructura de la tabla gastos para ver que campos tiene
print('Campos de la tabla gastos relacionados con categoria:')
desc = db.fetch_all('DESCRIBE gastos')
for col in desc:
    if 'categor' in col['Field'].lower():
        print(f'- {col["Field"]}: {col["Type"]}')

# Ver algunos gastos existentes
print('\nGastos existentes con sus categorias:')
gastos = db.fetch_all('SELECT id, concepto, categoria_id, monto FROM gastos LIMIT 3')
for gasto in gastos:
    print(f'- ID {gasto["id"]}: {gasto["concepto"]} (Categoria ID: {gasto["categoria_id"]}, Monto: ${gasto["monto"]})')

# Buscar todas las tablas que pueden tener categorias de gastos
print('\nBuscando categorias apropiadas para gastos...')
tables = db.fetch_all('SHOW TABLES')
for table in tables:
    table_name = list(table.values())[0]
    if 'categor' in table_name.lower() or 'gasto' in table_name.lower():
        print(f'Tabla: {table_name}')
        try:
            sample = db.fetch_all(f'SELECT * FROM {table_name} LIMIT 2')
            if sample:
                keys = list(sample[0].keys())
                print(f'  Campos: {keys}')
                for row in sample:
                    print(f'  - {row}')
        except:
            print(f'  Error leyendo tabla {table_name}')
        print()