// Script de DIAGNÓSTICO para encontrar tus imágenes PNG
class DiagnosticoImagenes {
    constructor() {
        this.rutasPosibles = [
            // Rutas relativas comunes
            'formulario-prestamos.png',
            'formulario-prestamos-libre-disposicion.png',
            
            // En subcarpeta assets
            'assets/formulario-prestamos.png',
            'assets/formulario-prestamos-libre-disposicion.png',
            
            // En subcarpeta formularios
            'formularios/formulario-prestamos.png',
            'formularios/formulario-prestamos-libre-disposicion.png',
            
            // En subcarpeta assets/formularios
            'assets/formularios/formulario-prestamos.png',
            'assets/formularios/formulario-prestamos-libre-disposicion.png',
            
            // Con punto (ruta actual)
            './formulario-prestamos.png',
            './formulario-prestamos-libre-disposicion.png',
            
            // Nivel superior
            '../formulario-prestamos.png',
            '../formulario-prestamos-libre-disposicion.png',
            
            // Otras variaciones comunes
            'img/formulario-prestamos.png',
            'images/formulario-prestamos.png',
            'docs/formulario-prestamos.png'
        ];
        
        console.log('🔍 Iniciando diagnóstico de imágenes...');
    }

    async diagnosticar() {
        console.log('=' * 50);
        console.log('🔍 DIAGNÓSTICO DE IMÁGENES PNG');
        console.log('=' * 50);
        
        const resultados = [];
        
        for (const ruta of this.rutasPosibles) {
            const resultado = await this.probarRuta(ruta);
            resultados.push({
                ruta: ruta,
                existe: resultado.existe,
                tamaño: resultado.tamaño,
                error: resultado.error
            });
        }
        
        // Mostrar resultados
        console.log('\n📊 RESULTADOS:');
        console.log('-'.repeat(60));
        
        const encontradas = resultados.filter(r => r.existe);
        const noEncontradas = resultados.filter(r => !r.existe);
        
        if (encontradas.length > 0) {
            console.log('✅ IMÁGENES ENCONTRADAS:');
            encontradas.forEach(img => {
                console.log(`   ✓ ${img.ruta} (${img.tamaño})`);
            });
        }
        
        if (noEncontradas.length > 0) {
            console.log('\n❌ IMÁGENES NO ENCONTRADAS:');
            noEncontradas.slice(0, 10).forEach(img => { // Solo mostrar las primeras 10
                console.log(`   ✗ ${img.ruta}`);
            });
            if (noEncontradas.length > 10) {
                console.log(`   ... y ${noEncontradas.length - 10} más`);
            }
        }
        
        // Recomendaciones
        this.mostrarRecomendaciones(encontradas);
        
        return encontradas;
    }

    async probarRuta(ruta) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    existe: true,
                    tamaño: `${img.width}x${img.height}`,
                    error: null
                });
            };
            
            img.onerror = (error) => {
                resolve({
                    existe: false,
                    tamaño: null,
                    error: error.message || 'No encontrada'
                });
            };
            
            img.src = ruta;
            
            // Timeout después de 2 segundos
            setTimeout(() => {
                resolve({
                    existe: false,
                    tamaño: null,
                    error: 'Timeout'
                });
            }, 2000);
        });
    }

    mostrarRecomendaciones(encontradas) {
        console.log('\n💡 RECOMENDACIONES:');
        console.log('-'.repeat(30));
        
        if (encontradas.length === 0) {
            console.log('❌ No se encontraron imágenes en ninguna ubicación.');
            console.log('');
            console.log('🔧 SOLUCIONES:');
            console.log('1. Asegúrate de que las imágenes existan');
            console.log('2. Verifica los nombres exactos:');
            console.log('   - formulario-prestamos.png');
            console.log('   - formulario-prestamos-libre-disposicion.png');
            console.log('3. Coloca las imágenes en la misma carpeta que el HTML');
            console.log('4. O actualiza las rutas en el código JavaScript');
        } else {
            console.log('✅ Se encontraron imágenes!');
            console.log('');
            console.log('🔧 SIGUIENTE PASO:');
            console.log('Actualiza el código JavaScript para usar estas rutas:');
            console.log('');
            encontradas.forEach(img => {
                console.log(`   '${img.ruta}' // ✓ Funciona`);
            });
        }
        
        console.log('');
        console.log('📍 UBICACIÓN ACTUAL: ' + window.location.href);
        console.log('📁 CARPETA BASE: ' + window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/'));
    }

    // Método para generar código JavaScript con las rutas correctas
    generarCodigo(imagenesEncontradas) {
        if (imagenesEncontradas.length === 0) return null;
        
        // Buscar las imágenes específicas que necesitamos
        const prestamos = imagenesEncontradas.find(img => 
            img.ruta.includes('formulario-prestamos.png') && 
            !img.ruta.includes('libre')
        );
        
        const libreDisposicion = imagenesEncontradas.find(img => 
            img.ruta.includes('libre')
        );
        
        if (!prestamos) {
            console.warn('⚠️ No se encontró: formulario-prestamos.png');
            return null;
        }
        
        const codigo = `
// CÓDIGO GENERADO AUTOMÁTICAMENTE - Rutas correctas encontradas
this.formularios = {
    'medico': {
        archivo: '${prestamos.ruta}',
        nombre: 'Formulario_Prestamo_Medico.pdf',
        titulo: 'Préstamos Médicos'
    },
    'emergencia': {
        archivo: '${prestamos.ruta}',
        nombre: 'Formulario_Prestamo_Emergencia.pdf',
        titulo: 'Préstamos de Emergencia'
    },
    'libre-disposicion': {
        archivo: '${libreDisposicion ? libreDisposicion.ruta : prestamos.ruta}',
        nombre: 'Formulario_Prestamo_Libre_Disposicion.pdf',
        titulo: 'Préstamos de Libre Disposición'
    },
    'fondo-solidario': {
        archivo: '${prestamos.ruta}',
        nombre: 'Formulario_Fondo_Solidario.pdf',
        titulo: 'Fondo Solidario'
    }
};`;
        
        console.log('\n🚀 CÓDIGO JAVASCRIPT CORREGIDO:');
        console.log(codigo);
        
        return codigo;
    }
}

// Función para ejecutar diagnóstico
async function diagnosticarImagenes() {
    const diagnostico = new DiagnosticoImagenes();
    const encontradas = await diagnostico.diagnosticar();
    
    if (encontradas.length > 0) {
        diagnostico.generarCodigo(encontradas);
    }
    
    return encontradas;
}

// Ejecutar automáticamente cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Diagnóstico automático iniciado...');
    setTimeout(diagnosticarImagenes, 1000);
});

// Función global para ejecutar manualmente
window.diagnosticarImagenes = diagnosticarImagenes;

console.log('🔍 Diagnóstico cargado. Ejecuta: diagnosticarImagenes() para buscar imágenes');
