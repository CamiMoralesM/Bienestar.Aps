// Cambiar la firma de la función: quitar "export" para evitar export duplicado

// Antes (posible causa del error):
// export async function exportarGeneralExcelAdmin(fecha = null) {
//     ...
// }

// Después (corregido):
async function exportarGeneralExcelAdmin(fecha = null) {
    try {
        const fechaFiltro = fecha || new Date().toISOString().split('T')[0];
        const compras = await obtenerComprasPorTipo('gas', {
            fechaInicio: fechaFiltro,
            fechaFin: fechaFiltro
        });

        const comprasFormateadas = compras.map(data => {
            const compraFecha = data.fechaCompra?.slice?.(0,10) || data.fechaCompra || '';
            return {
                Fecha: compraFecha,
                Nombre: `${data.nombre} ${data.apellido || ''}`.trim(),
                Rut: data.rut,
                Teléfono: data.telefono,
                Correo: data.email,
                "Tipo de carga": `${data.tipoCarga || ''} kg`,
                Cantidad: data.cantidad || data.totalCargas || 0,
                Empresa: data.empresa || '',
                "Comprobante URL": data.comprobanteUrl || ''
            };
        });

        return comprasFormateadas;

    } catch (error) {
        console.error('Error al exportar General:', error);
        return [];
    }
}
export {
    // Constantes
    COLECCIONES,
    STORAGE_FOLDERS,
    PRECIOS_ENTRETENIMIENTO,
    
    // Funciones de guardado
    guardarCompraGas,
    guardarCompraEntretenimiento,
    guardarCompraUnificada,
    
    // Funciones de consulta
    obtenerComprasPorTipo,
    obtenerComprasPorRUT,      // <-- asegurarse que esté exportado
    obtenerComprasRecientes,
    
    // Funciones de estadísticas
    obtenerEstadisticasCompras,
    
    // Funciones de exportación (nombres admin si corresponde)
    exportarLipigasExcelAdmin,
    exportarAbastibleExcelAdmin,
    exportarGeneralExcelAdmin,
    
    // Función auxiliar
    subirComprobante
};
