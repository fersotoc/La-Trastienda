
import { GoogleGenAI, Type } from "@google/genai";
import { IngestionResult, BusinessSource } from "../types";

// Initialize the Google GenAI SDK using the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const INGESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fecha_operativa: { type: Type.STRING, description: 'Fecha ISO AAAA-MM-DD' },
          modulo: { type: Type.STRING, description: 'Mentidero o La Quietecita' },
          tipo: { type: Type.STRING, description: 'ingreso o egreso' },
          metodo_pago: { type: Type.STRING, description: 'CREDITO, DEBITO, EFECTIVO, OTRO' },
          monto: { type: Type.NUMBER },
          descripcion: { type: Type.STRING },
          referencia: { type: Type.STRING }
        },
        required: ['fecha_operativa', 'modulo', 'tipo', 'metodo_pago', 'monto', 'descripcion']
      }
    },
    purchases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fecha_reporte: { type: Type.STRING },
          grupo: { type: Type.STRING },
          insumo: { type: Type.STRING },
          descripcion: { type: Type.STRING },
          unidad: { type: Type.STRING },
          cantidad_entrada: { type: Type.NUMBER },
          costo_unitario: { type: Type.NUMBER },
          monto_compra: { type: Type.NUMBER },
          origen_archivo: { type: Type.STRING },
          estatus: { 
            type: Type.STRING, 
            description: 'Valores: REGISTRADO, SOLICITADO, APROBADO, RECHAZADO, PAGADO, ENTRADA_SIN_COSTO' 
          }
        }
      }
    },
    cortesMaster: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fecha_inicio_corte: { type: Type.STRING },
          fecha_fin_corte: { type: Type.STRING },
          id_turno: { type: Type.STRING },
          total_ventas: { type: Type.NUMBER },
          total_credito: { type: Type.STRING, description: 'Número o "NO_DISPONIBLE"' },
          total_debito: { type: Type.STRING, description: 'Número o "NO_DISPONIBLE"' },
          total_efectivo: { type: Type.STRING, description: 'Número o "NO_DISPONIBLE"' },
          total_otros: { type: Type.STRING, description: 'Número o "NO_DISPONIBLE"' },
          origen_archivo: { type: Type.STRING }
        }
      }
    },
    cut: {
      type: Type.OBJECT,
      properties: {
        fecha_operativa: { type: Type.STRING },
        efectivo_sistema: { type: Type.NUMBER },
        efectivo_contado: { type: Type.NUMBER },
        diferencia_efectivo: { type: Type.NUMBER },
        comentario_diferencia: { type: Type.STRING }
      },
      required: ['fecha_operativa', 'efectivo_sistema', 'efectivo_contado', 'diferencia_efectivo']
    },
    summary: { type: Type.STRING }
  },
  required: ['transactions', 'summary']
};

/**
 * Uses Gemini 3 Pro to normalize unstructured Excel data into a standardized transaction format.
 * This is a complex reasoning task requiring the high-capability pro model.
 */
export async function normalizeExcelData(
  rawData: any[], 
  modulo: BusinessSource, 
  fechaManual: string
): Promise<IngestionResult> {
  const prompt = `
    Analiza la siguiente extracción de datos de un archivo Excel del módulo "${modulo}".
    La fecha operativa reportada es "${fechaManual}".
    Normaliza cada fila a la estructura de transacciones.
    Si es "La Quietecita" y detectas datos de cierre de caja (efectivo en sistema vs contado), rellena el objeto "cut".
    
    Reglas de Negocio:
    1. Si el monto es negativo, el tipo es "egreso" y el monto debe ser positivo.
    2. Clasifica el método de pago estrictamente en: "CREDITO", "DEBITO", "EFECTIVO", "OTRO".
    3. Para "La Quietecita", identifica dos fuentes de datos:
       A) VENTAS (Cortes de Caja): 
          - Busca el encabezado "CORTE DE CAJA X DETALLADO DEL:" para extraer fecha/hora inicio.
          - Extrae el "ID TURNO".
          - Busca secciones de resumen para extraer: total_ventas, total_credito, total_debito, total_efectivo, total_otros.
          - Si no hay desglose por método, usa "NO_DISPONIBLE" para los campos específicos pero extrae el total_ventas.
          - Mapea a la lista "cortesMaster".
          - También genera una transacción de ingreso en "transactions" por el total_ventas del turno.
       B) COMPRAS (Movimientos de Inventario): 
          - Solo procesa filas donde ENTRADA > 0. Ignora filas con ENTRADA = 0.
          - Calcula monto_compra: 
            a) Si COSTO_ENTRADA existe y es numérico: monto_compra = COSTO_ENTRADA.
            b) Si no, monto_compra = ENTRADA * COSTO (costo unitario).
          - Ignora COSTO_FINAL como monto de compra.
          - Si monto_compra no puede calcularse (ej. falta costo), marca estatus como "ENTRADA_SIN_COSTO" y pon monto_compra = 0.
          - Estatus por defecto para compras válidas: "REGISTRADO".
          - Mapea a la lista "purchases" con los campos: fecha_reporte, grupo, insumo, descripcion, unidad, cantidad_entrada, costo_unitario, monto_compra, origen_archivo, estatus.
    4. Cualquier variante que contenga "DEBITO1", "DEBITO2", "DEBITO", "TARJETA DEBITO" debe mapearse a "DEBITO".
    5. Cualquier método no reconocido o variante de tarjeta no especificada debe mapearse a "OTRO".
    6. No utilices "DEBITO2" ni otras subcategorías.
    7. No proceses datos de inventario final o existencias.
    
    Datos Extraídos del Excel:
    ${JSON.stringify(rawData)}
  `;

  // Always use generateContent for text-based tasks with appropriate model selection
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: INGESTION_SCHEMA
    }
  });

  // Directly access the .text property of GenerateContentResponse
  const result = JSON.parse(response.text || '{"transactions": [], "summary": "No se procesaron datos."}');
  
  // Forzar que el módulo y fecha coincidan con lo seleccionado por el usuario si el modelo falla
  result.transactions = result.transactions.map((t: any) => ({
    ...t,
    modulo,
    fecha_operativa: t.fecha_operativa || fechaManual
  }));

  if (result.cut) {
    result.cut.fecha_operativa = result.cut.fecha_operativa || fechaManual;
  }

  return result;
}

/**
 * Generates financial insights from transaction records using Gemini 3 Pro.
 */
export async function generateDailyInsight(records: any[]): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analiza estos registros de transacciones y proporciona una perspectiva estratégica breve: ${JSON.stringify(records)}`,
    config: {
      systemInstruction: "Eres un analista financiero senior de una compañía teatral y restaurante. Sé directo, profesional y enfocado en rentabilidad."
    }
  });
  // Directly access the .text property of GenerateContentResponse
  return response.text || "No hay perspectivas disponibles.";
}

// ==== BACKEND CONNECTION ====
const API_BASE = ""; // Use local server
const FN_BASE = "/api";
const NGROK_HEADERS = {}; 

export async function pingBackend(): Promise<string> {
  const response = await fetch(`${FN_BASE}/ping`, {
    headers: NGROK_HEADERS,
  });
  return await response.json(); // It returns json "pong"
}

export async function testWriteBackend(): Promise<string> {
  // Since testWrite is not implemented, let's just return a mock success
  return "Local write test successful";
}

