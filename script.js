CKEDITOR.config.versionCheck = false;
CKEDITOR.replace('editor', {
    removePlugins: 'exportpdf,cloudservices,easyimage',
    height: 340
});

// ============================================================
//  SISTEMA DE TOASTS
// ============================================================
function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const contenedor = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-saliendo');
        toast.addEventListener('animationend', () => toast.remove());
    }, duracion);
}

// ============================================================
//  AUTOGUARDADO
// ============================================================
let autoguardadoTimer = null;
let ultimoContenidoAutoguardado = '';
let ultimoTituloAutoguardado = '';

function iniciarAutoguardado() {
    CKEDITOR.instances.editor.on('change', programarAutoguardado);
    CKEDITOR.instances.editor.on('key',    programarAutoguardado);
    document.getElementById('titulo').addEventListener('input', programarAutoguardado);
}

function programarAutoguardado() {
    clearTimeout(autoguardadoTimer);
    actualizarIndicador('esperando');
    autoguardadoTimer = setTimeout(ejecutarAutoguardado, 30000);
}

function ejecutarAutoguardado() {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    if (!titulo || !contenido) return;
    if (titulo === ultimoTituloAutoguardado && contenido === ultimoContenidoAutoguardado) return;
    try {
        localStorage.setItem('nota__' + titulo, contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        actualizarIndicador('guardado');
        mostrarToast('💾 Autoguardado: "' + titulo + '"', 'exito', 2000);
    } catch(e) {
        actualizarIndicador('error');
        mostrarToast('⚠️ Autoguardado falló. Almacenamiento lleno.', 'error');
    }
}

function actualizarIndicador(estado) {
    const indicador = document.getElementById('indicador-autoguardado');
    if (!indicador) return;
    const estados = {
        inactivo:  { texto: '',                        clase: '' },
        esperando: { texto: '○ Cambios sin guardar',   clase: 'ag-esperando' },
        guardado:  { texto: '✓ Guardado automáticamente', clase: 'ag-guardado' },
        error:     { texto: '✕ Error al autoguardar',  clase: 'ag-error' },
    };
    const { texto, clase } = estados[estado] || estados.inactivo;
    indicador.textContent = texto;
    indicador.className   = 'indicador-autoguardado ' + clase;
}

window.addEventListener('beforeunload', (e) => {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    const hayContenido  = titulo && contenido;
    const hayPendiente  = contenido !== ultimoContenidoAutoguardado || titulo !== ultimoTituloAutoguardado;
    if (hayContenido && hayPendiente) {
        e.preventDefault();
        e.returnValue = '';
    }
});

CKEDITOR.instances.editor.on('instanceReady', iniciarAutoguardado);

// ============================================================
//  GUARDAR NOTA
// ============================================================
function guardarNota() {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    if (!titulo)    { mostrarToast('⚠️ Escribe un título primero.', 'error'); return; }
    if (!contenido) { mostrarToast('⚠️ El editor está vacío.',      'error'); return; }
    try {
        localStorage.setItem('nota__' + titulo, contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        mostrarToast(`💾 "${titulo}" guardada correctamente.`, 'exito');
    } catch(e) {
        mostrarToast('❌ Error al guardar. Almacenamiento lleno.', 'error');
    }
}

// ============================================================
//  CARGAR NOTA
// ============================================================
function cargarNota() {
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) { abrirModalNotas(); return; }
    const contenido = localStorage.getItem('nota__' + titulo);
    if (contenido) {
        CKEDITOR.instances.editor.setData(contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
    } else {
        mostrarToast(`❌ No existe ninguna nota llamada "${titulo}".`, 'error');
    }
}

// ============================================================
//  ELIMINAR NOTA
// ============================================================
function eliminarNota() {
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) { mostrarToast('⚠️ Escribe el título a borrar.', 'error'); return; }
    const clave = 'nota__' + titulo;
    if (!localStorage.getItem(clave)) {
        mostrarToast(`❌ No existe una nota llamada "${titulo}".`, 'error');
        return;
    }
    mostrarConfirmacion(
        `¿Eliminar la nota "${titulo}"?`,
        'Esta acción no se puede deshacer.',
        () => {
            localStorage.removeItem(clave);
            CKEDITOR.instances.editor.setData('');
            ultimoContenidoAutoguardado = '';
            ultimoTituloAutoguardado    = '';
            clearTimeout(autoguardadoTimer);
            actualizarIndicador('inactivo');
            mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
        }
    );
}

// ============================================================
//  DIÁLOGO DE CONFIRMACIÓN
// ============================================================
function mostrarConfirmacion(titulo, subtexto, onConfirmar) {
    document.getElementById('dialogo-confirmacion')?.remove();
    const overlay = document.createElement('div');
    overlay.id        = 'dialogo-confirmacion';
    overlay.className = 'dialogo-overlay';
    overlay.innerHTML = `
        <div class="dialogo-box">
            <p class="dialogo-titulo">${titulo}</p>
            <p class="dialogo-sub">${subtexto}</p>
            <div class="dialogo-acciones">
                <button class="dialogo-cancelar"  id="dialogo-btn-cancelar">Cancelar</button>
                <button class="dialogo-confirmar" id="dialogo-btn-confirmar">Eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    const cerrar = () => {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };
    document.getElementById('dialogo-btn-cancelar').onclick  = cerrar;
    document.getElementById('dialogo-btn-confirmar').onclick = () => { cerrar(); onConfirmar(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// ============================================================
//  MODAL LISTA DE NOTAS
// ============================================================
function abrirModalNotas() {
    const contenedor = document.getElementById('lista-notas-contenido');
    contenedor.innerHTML = '';
    const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    if (claves.length === 0) {
        contenedor.innerHTML = '<p class="modal-vacio">No hay notas guardadas todavía.</p>';
    } else {
        claves.forEach(clave => {
            const tituloReal = clave.replace('nota__', '');
            const item = document.createElement('div');
            item.className = 'nota-item';
            item.innerHTML = `
                <span onclick="cargarDesdeModal('${tituloReal}')">📄 ${tituloReal}</span>
                <button class="nota-borrar" onclick="borrarDesdeModal('${tituloReal}', this.parentElement)">🗑</button>`;
            contenedor.appendChild(item);
        });
    }
    document.getElementById('modal-notas').classList.add('abierto');
}

function cargarDesdeModal(titulo) {
    document.getElementById('titulo').value = titulo;
    const contenido = localStorage.getItem('nota__' + titulo);
    if (contenido) {
        CKEDITOR.instances.editor.setData(contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
    }
    cerrarModalNotas();
}

function borrarDesdeModal(titulo, elemento) {
    localStorage.removeItem('nota__' + titulo);
    elemento.remove();
    mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
    const lista = document.getElementById('lista-notas-contenido');
    if (lista.children.length === 0)
        lista.innerHTML = '<p class="modal-vacio">No hay notas guardadas todavía.</p>';
}

function cerrarModalNotas()       { document.getElementById('modal-notas').classList.remove('abierto'); }
function cerrarModalSiFondo(e)    { if (e.target === document.getElementById('modal-notas')) cerrarModalNotas(); }

// ============================================================
//  UTILIDADES PDF
// ============================================================

/** Sanitiza el título para usarlo como nombre de archivo. */
function sanitizarNombreArchivo(nombre) {
    return nombre
        .replace(/[\/\\:*?"<>|]/g, '_')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/^\.+/, '')
        .trim() || 'Sin_Titulo';
}

/** Convierte <img> del elemento a base64 para que jsPDF las renderice. */
async function convertirImagenesABase64(elemento) {
    const imgs = elemento.querySelectorAll('img');
    const promesas = Array.from(imgs).map(img => new Promise(resolve => {
        if (!img.src || img.src.startsWith('data:')) { resolve(); return; }
        const canvas  = document.createElement('canvas');
        const ctx     = canvas.getContext('2d');
        const imagen  = new Image();
        imagen.crossOrigin = 'anonymous';
        imagen.onload = () => {
            canvas.width  = imagen.naturalWidth;
            canvas.height = imagen.naturalHeight;
            ctx.drawImage(imagen, 0, 0);
            try { img.src = canvas.toDataURL('image/png'); } catch (_) {}
            resolve();
        };
        imagen.onerror = resolve;
        imagen.src = img.src;
    }));
    await Promise.all(promesas);
}

// ============================================================
//  BARRA DE PROGRESO FLOTANTE
// ============================================================
function mostrarProgresoPDF(porcentaje, mensaje) {
    let c = document.getElementById('pdf-progreso');
    if (!c) {
        c = document.createElement('div');
        c.id = 'pdf-progreso';
        c.setAttribute('role', 'status');
        c.setAttribute('aria-live', 'polite');
        c.style.cssText = `
            position:fixed; bottom:1.5rem; right:1.5rem; width:260px;
            background:#fff; border:1px solid #d4c9b0; border-radius:10px;
            padding:14px 16px; box-shadow:0 4px 18px rgba(0,0,0,.13);
            font-family:Georgia,serif; z-index:9999; transition:opacity .4s;`;
        c.innerHTML = `
            <p id="pdf-prog-msg"   style="margin:0 0 8px;font-size:13px;color:#3a2e22;"></p>
            <div style="background:#f0ece3;border-radius:6px;height:8px;overflow:hidden;">
                <div id="pdf-prog-barra"
                     style="height:100%;width:0%;background:#8b6914;
                            border-radius:6px;transition:width .35s ease;"></div>
            </div>
            <p id="pdf-prog-pct"
               style="margin:6px 0 0;font-size:11px;color:#7a6a50;text-align:right;"></p>`;
        document.body.appendChild(c);
    }
    document.getElementById('pdf-prog-msg').textContent   = mensaje;
    document.getElementById('pdf-prog-barra').style.width = porcentaje + '%';
    document.getElementById('pdf-prog-pct').textContent   = porcentaje + '%';
}

function ocultarProgresoPDF() {
    const c = document.getElementById('pdf-progreso');
    if (!c) return;
    c.style.opacity = '0';
    setTimeout(() => c.remove(), 450);
}

// ============================================================
//  PORTADA DECORATIVA
// ============================================================
function agregarPortada(doc, titulo) {
    doc.insertPage(1);
    doc.setPage(1);
    const { width, height } = doc.internal.pageSize;

    doc.setFillColor(250, 246, 237);
    doc.rect(0, 0, width, height, 'F');

    doc.setFillColor(139, 105, 20);
    doc.rect(0, 0, width, 8, 'F');
    doc.rect(0, height - 8, width, 8, 'F');

    doc.setDrawColor(180, 150, 80);
    doc.setLineWidth(0.6);
    doc.line(60, height / 2 - 60, width - 60, height / 2 - 60);
    doc.line(60, height / 2 + 40, width - 60, height / 2 + 40);

    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(58, 46, 34);
    const lineas = doc.splitTextToSize(titulo, width - 120);
    doc.text(lineas, width / 2, height / 2 - 20, { align: 'center', baseline: 'middle' });

    const fecha = new Date().toLocaleDateString('es-ES', { year:'numeric', month:'long', day:'numeric' });
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(120, 100, 60);
    doc.text(fecha, width / 2, height / 2 + 60, { align: 'center' });
}

// ============================================================
//  METADATA DEL PDF
// ============================================================
function agregarMetadata(doc, titulo) {
    doc.setProperties({
        title:   titulo,
        subject: 'Nota exportada desde el editor',
        author:  'Cuaderno Digital INFRAMEN',
        keywords:'nota, editor, exportación, INFRAMEN',
        creator: 'Cuaderno Digital v2.0',
    });
}

// ============================================================
//  PIE DE PÁGINA
// ============================================================
function agregarPieDePagina(doc, nombreArchivo) {
    const total = doc.getNumberOfPages();
    const fecha = new Date().toLocaleDateString('es-ES', { year:'numeric', month:'long', day:'numeric' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 120, 90);
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        const { width, height } = doc.internal.pageSize;
        doc.setDrawColor(200, 185, 155);
        doc.setLineWidth(0.3);
        doc.line(40, height - 30, width - 40, height - 30);
        doc.text(nombreArchivo,             40,         height - 18);
        doc.text(fecha,                     width / 2,  height - 18, { align: 'center' });
        doc.text(`Pág. ${i} / ${total}`,    width - 40, height - 18, { align: 'right'  });
    }
}

// Nota: marca de agua eliminada — doc.GState({ opacity }) en jsPDF 2.5
// corrompe el estado gráfico global y borra el contenido renderizado por doc.html().

// ============================================================
//  VISTA PREVIA ANTES DE DESCARGAR
// ============================================================
function mostrarVistaPreviaPDF(pdfBlob, nombreArchivo, onDescargar) {
    document.getElementById('pdf-preview-overlay')?.remove();
    const url = URL.createObjectURL(pdfBlob);

    const overlay = document.createElement('div');
    overlay.id = 'pdf-preview-overlay';
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(30,20,10,.72);
        z-index:10000; display:flex; align-items:center;
        justify-content:center; animation:fadeInOv .25s ease;`;

    overlay.innerHTML = `
        <style>
            @keyframes fadeInOv { from{opacity:0} to{opacity:1} }
            #ppbox {
                background:#faf6ed; border-radius:12px;
                width:min(820px,96vw); height:min(680px,90vh);
                display:flex; flex-direction:column; overflow:hidden;
                box-shadow:0 20px 60px rgba(0,0,0,.4);
            }
            #pphead {
                display:flex; align-items:center; justify-content:space-between;
                padding:12px 18px; background:#3a2e22; color:#f5e8c8;
                font-family:Georgia,serif; font-size:14px;
            }
            #pphead button {
                background:none; border:none; cursor:pointer; color:#f5e8c8;
                font-size:20px; line-height:1; padding:0 4px;
                border-radius:4px; transition:background .15s;
            }
            #pphead button:hover { background:rgba(255,255,255,.15); }
            #ppfoot {
                display:flex; gap:10px; padding:12px 18px;
                background:#f0e8d5; border-top:1px solid #d4c9b0;
                justify-content:flex-end;
            }
            .ppbtn {
                font-family:Georgia,serif; font-size:13px;
                padding:8px 20px; border-radius:6px; cursor:pointer;
                border:1px solid #b09060; transition:background .15s,transform .1s;
            }
            .ppbtn:active { transform:scale(.97); }
            .ppbtn-ok  { background:#8b6914; color:#fff; border-color:#8b6914; }
            .ppbtn-ok:hover { background:#6d5010; }
            .ppbtn-no  { background:#fff; color:#3a2e22; }
            .ppbtn-no:hover { background:#f0e8d5; }
        </style>
        <div id="ppbox">
            <div id="pphead">
                <span>📄 Vista previa — <em>${nombreArchivo}</em></span>
                <button id="pp-x" title="Cerrar">&times;</button>
            </div>
            <iframe src="${url}#toolbar=0"
                    style="flex:1;border:none;width:100%;"></iframe>
            <div id="ppfoot">
                <button class="ppbtn ppbtn-no" id="pp-cancel">Cancelar</button>
                <button class="ppbtn ppbtn-ok" id="pp-dl">⬇ Descargar PDF</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    const cerrar = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity .2s';
        setTimeout(() => { URL.revokeObjectURL(url); overlay.remove(); }, 220);
    };
    document.getElementById('pp-x').onclick      = cerrar;
    document.getElementById('pp-cancel').onclick = cerrar;
    document.getElementById('pp-dl').onclick     = () => { cerrar(); onDescargar(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });
}

// ============================================================
//  GENERAR PDF  —  función principal
// ============================================================
const generarPDF = async () => {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();

    if (!titulo)    { mostrarToast('⚠️ Escribe un título primero.', 'error'); return; }
    if (!contenido) { mostrarToast('⚠️ El editor está vacío.',      'error'); return; }

    const nombreArchivo = sanitizarNombreArchivo(titulo);

    try {
        // jsPDF ya está cargado desde el <head> del HTML
        const { jsPDF } = window.jspdf;

        mostrarProgresoPDF(10, 'Preparando contenido…');

        // Dimensiones A4 en pt
        const A4_W = 595, A4_H = 842;
        const MX = 45, MT = 50, MB = 62;
        const AREA_W = A4_W - MX * 2;
        const AREA_H = A4_H - MT - MB;

        const el = document.createElement('div');
        el.innerHTML =
            `<h1 style="text-align:center;color:#3a2e22;font-family:Georgia,serif;
                        margin:0 0 8px;">${titulo}</h1>
             <hr style="border:none;border-top:1px solid #d4c9b0;margin:0 0 20px;">` +
            contenido;
        el.style.cssText = [
            `width:${AREA_W}px`,
            'padding:0',
            'font-family:Georgia,serif',
            'font-size:13px',
            'line-height:1.7',
            'color:#1a1a1a',
            'background:#ffffff',
            'box-sizing:border-box',
            'position:absolute',
            'left:-9999px',
            'top:0'
        ].join(';');
        document.body.appendChild(el);

        mostrarProgresoPDF(25, 'Procesando imágenes…');
        await convertirImagenesABase64(el);

        mostrarProgresoPDF(45, 'Capturando contenido…');

        const canvas = await html2canvas(el, {
            scale:           2,
            useCORS:         true,
            logging:         false,
            backgroundColor: '#ffffff',
            width:           AREA_W,
            windowWidth:     AREA_W,
        });

        mostrarProgresoPDF(65, 'Paginando…');

        const escala      = canvas.width / AREA_W;
        const alturaPagPx = AREA_H * escala;

        // Recopilar los cortes naturales entre bloques del DOM (p, h1-h6, li, tr, div)
        // para no partir una línea a la mitad. El elemento sigue en el DOM aquí.
        const cortesNaturales = [0];
        const elRect = el.getBoundingClientRect();
        const bloques = el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr, div, img');
        bloques.forEach(bloque => {
            const rect = bloque.getBoundingClientRect();
            const yRelativo = (rect.top - elRect.top) * escala;
            if (yRelativo > 0) cortesNaturales.push(Math.round(yRelativo));
        });
        cortesNaturales.push(canvas.height);

        document.body.removeChild(el);

        // Calcular los puntos de corte reales buscando el corte natural
        // más cercano (por arriba) a cada múltiplo de alturaPagPx
        const cortesPagina = [0];
        let paginaActual = 1;
        while (true) {
            const idealY = paginaActual * alturaPagPx;
            if (idealY >= canvas.height) break;
            // Buscar el corte natural justo antes de idealY
            let mejorCorte = idealY;
            for (let j = cortesNaturales.length - 1; j >= 0; j--) {
                if (cortesNaturales[j] <= idealY) {
                    mejorCorte = cortesNaturales[j];
                    break;
                }
            }
            // Si el corte natural está muy lejos del ideal (>20% de página),
            // preferir el corte ideal para no generar páginas demasiado cortas
            if (idealY - mejorCorte > alturaPagPx * 0.20) mejorCorte = idealY;
            cortesPagina.push(Math.round(mejorCorte));
            paginaActual++;
        }
        cortesPagina.push(canvas.height);

        const doc = new jsPDF('p', 'pt', 'a4');
        agregarMetadata(doc, titulo);

        for (let i = 0; i < cortesPagina.length - 1; i++) {
            if (i > 0) doc.addPage();
            const srcY = cortesPagina[i];
            const srcH = cortesPagina[i + 1] - srcY;
            if (srcH <= 0) continue;

            // Dibujar el trozo en un canvas del tamaño exacto de una página
            const trozo = document.createElement('canvas');
            trozo.width  = canvas.width;
            trozo.height = Math.ceil(alturaPagPx);
            const ctx = trozo.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, trozo.width, trozo.height);
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
            const imgData = trozo.toDataURL('image/jpeg', 0.93);
            doc.addImage(imgData, 'JPEG', MX, MT, AREA_W, AREA_H);
        }

        mostrarProgresoPDF(78, 'Añadiendo portada…');
        agregarPortada(doc, titulo);

        mostrarProgresoPDF(90, 'Añadiendo pies de página…');
        agregarPieDePagina(doc, nombreArchivo);

        mostrarProgresoPDF(98, 'Preparando vista previa…');
        const blob = doc.output('blob');
        ocultarProgresoPDF();

        const descargar = () => {
            doc.save(`${nombreArchivo}.pdf`);
            mostrarToast(`📄 "${nombreArchivo}.pdf" descargado.`, 'exito');
            ultimoTituloAutoguardado    = titulo;
            ultimoContenidoAutoguardado = contenido;
            clearTimeout(autoguardadoTimer);
            actualizarIndicador('guardado');
        };

        mostrarVistaPreviaPDF(blob, `${nombreArchivo}.pdf`, descargar);

    } catch (err) {
        ocultarProgresoPDF();
        if (err.message?.includes('QuotaExceededError')) {
            mostrarToast('❌ Almacenamiento lleno. Libera espacio e inténtalo.', 'error');
        } else {
            mostrarToast('❌ Error al generar el PDF. Revisa la consola.', 'error');
            console.error('[generarPDF]', err);
        }
    }
};

// ============================================================
//  LIBRO — CUADERNO ESPIRAL
// ============================================================
let paginasLibro       = [];
let paginaActualLibro  = 0;
let tapaAbierta        = false;

function generarEspiral() {
    const svg = document.getElementById('espiral-svg');
    if (!svg) return;
    svg.innerHTML = '';
    const total = 16, alturaTotal = 560, paso = alturaTotal / (total + 1);
    for (let i = 1; i <= total; i++) {
        const cy = paso * i;
        const arcAtras = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcAtras.setAttribute('d', `M 6 ${cy-7} A 7 7 0 0 0 6 ${cy+7}`);
        arcAtras.setAttribute('fill', 'none');
        arcAtras.setAttribute('stroke', '#555');
        arcAtras.setAttribute('stroke-width', '2');
        arcAtras.setAttribute('stroke-linecap', 'round');
        svg.appendChild(arcAtras);
        const arcFrente = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcFrente.setAttribute('d', `M 6 ${cy-7} A 7 7 0 0 1 6 ${cy+7}`);
        arcFrente.setAttribute('fill', 'none');
        arcFrente.setAttribute('stroke', '#b09060');
        arcFrente.setAttribute('stroke-width', '2.2');
        arcFrente.setAttribute('stroke-linecap', 'round');
        svg.appendChild(arcFrente);
    }
}

function renderPaginaLibro() {
    if (paginasLibro.length === 0) return;
    const p = paginasLibro[paginaActualLibro];
    document.getElementById('pagina-titulo').textContent = p.titulo;
    document.getElementById('pagina-cuerpo').innerHTML   = p.contenido;
    document.getElementById('pagina-numero').textContent = `${paginaActualLibro + 1}`;
    document.getElementById('nav-info').textContent      = `Pág ${paginaActualLibro + 1} / ${paginasLibro.length}`;
    document.getElementById('btn-prev').disabled = paginaActualLibro === 0;
    document.getElementById('btn-next').disabled = paginaActualLibro === paginasLibro.length - 1;
    document.querySelectorAll('.nav-dot').forEach((d, i) => d.classList.toggle('activo', i === paginaActualLibro));
}

function cambiarPaginaLibro(dir) {
    const nuevo = paginaActualLibro + dir;
    if (nuevo < 0 || nuevo >= paginasLibro.length) return;
    paginaActualLibro = nuevo;
    renderPaginaLibro();
}

function toggleTapa() {
    if (paginasLibro.length === 0) { mostrarToast('📖 No hay notas guardadas aún.', 'info'); return; }
    tapaAbierta = !tapaAbierta;
    const tapa      = document.getElementById('cuaderno-tapa');
    const paginas   = document.getElementById('cuaderno-paginas');
    const nav       = document.getElementById('libro-nav');
    const btnToggle = document.getElementById('btn-toggle-tapa');
    tapa.classList.toggle('abierta', tapaAbierta);
    btnToggle.textContent = tapaAbierta ? 'Cerrar cuaderno' : 'Abrir cuaderno';
    btnToggle.classList.toggle('abierto', tapaAbierta);
    if (tapaAbierta) {
        setTimeout(() => { paginas.classList.add('visible'); nav.classList.add('visible'); }, 380);
    } else {
        paginas.classList.remove('visible');
        nav.classList.remove('visible');
    }
}

function abrirLibro() {
    const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    if (claves.length === 0) { mostrarToast('📖 El cuaderno está vacío. Guarda algunas notas primero.', 'info'); return; }
    paginasLibro = claves.map(clave => ({
        titulo:   clave.replace('nota__', ''),
        contenido: localStorage.getItem(clave)
    }));
    paginaActualLibro = 0;
    tapaAbierta       = false;
    const tapa      = document.getElementById('cuaderno-tapa');
    const paginas   = document.getElementById('cuaderno-paginas');
    const nav       = document.getElementById('libro-nav');
    const btnToggle = document.getElementById('btn-toggle-tapa');
    tapa.classList.remove('abierta');
    paginas.classList.remove('visible');
    nav.classList.remove('visible');
    btnToggle.textContent = 'Abrir cuaderno';
    btnToggle.classList.remove('abierto');
    const dotsContainer = document.getElementById('nav-dots');
    dotsContainer.innerHTML = '';
    paginasLibro.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'nav-dot' + (i === 0 ? ' activo' : '');
        dot.setAttribute('aria-label', `Página ${i + 1}`);
        dot.onclick = () => { paginaActualLibro = i; renderPaginaLibro(); };
        dotsContainer.appendChild(dot);
    });
    generarEspiral();
    renderPaginaLibro();
    const seccion = document.getElementById('seccion-libro');
    seccion.style.display = 'block';
    seccion.scrollIntoView({ behavior: 'smooth' });
}

function cerrarLibro() {
    if (tapaAbierta) {
        toggleTapa();
        setTimeout(() => { document.getElementById('seccion-libro').style.display = 'none'; }, 800);
    } else {
        document.getElementById('seccion-libro').style.display = 'none';
    }
}

// ============================================================
//  GUÍA DE INGLÉS
// ============================================================
function toggleIngles() {
    const seccion = document.getElementById('seccion-ingles');
    const visible = seccion.style.display === 'block';
    seccion.style.display = visible ? 'none' : 'block';
    if (!visible) seccion.scrollIntoView({ behavior: 'smooth' });
}

function cambiarTab(evt, tabId) {
    document.querySelectorAll('.contenido-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

function verificarRespuestas() {
    const respuestas = [
        { id:'ex1', correcta:'is'      },
        { id:'ex2', correcta:'are'     },
        { id:'ex3', correcta:'are'     },
        { id:'ex4', correcta:'was'     },
        { id:'ex5', correcta:'will be' },
    ];
    let correctas = 0;
    respuestas.forEach(({ id, correcta }) => {
        const input = document.getElementById(id);
        const valor = input.value.trim().toLowerCase();
        if (valor === correcta) {
            input.classList.remove('incorrecto');
            input.classList.add('correcto');
            correctas++;
        } else {
            input.classList.remove('correcto');
            input.classList.add('incorrecto');
        }
    });
    if (correctas === respuestas.length) {
        mostrarToast('🎉 ¡Todas correctas! Excelente trabajo.', 'exito', 4000);
    } else {
        mostrarToast(`✏️ ${correctas}/${respuestas.length} correctas. ¡Revisa las marcadas en rojo!`, 'error', 4000);
    }
}