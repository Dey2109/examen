/* ═══════════════════════════════════════════════════════════
       CUESTIONARIO — Lógica de arrastre
       Se arrastran los CHIPS (opciones) hacia la ZONA de respuesta.

       Bugs corregidos:
       1. dragover en zona llena corregido (permite re-drag).
       2. origenBloque guardado en dragstart.
       3. Unificación de data-valor.
       4. Clase CSS .vacia en lugar de :empty.
       5. Bloques como hermanos directos de .notebook-page.
    ═══════════════════════════════════════════════════════════ */

    let chipArrastrado  = null;   // .opcion que se mueve
    let origenBloque    = null;   // .bloque de donde vino el chip
    let origenEsZona    = false;  // true si venía de una zona-respuesta

    /* ── Inicializar todos los chips ── */
    document.querySelectorAll('.opcion').forEach(activarChip);

    function activarChip(chip) {
        chip.addEventListener('dragstart', e => {
            chipArrastrado = chip;
            origenBloque   = chip.closest('.bloque');
            origenEsZona   = chip.parentElement.classList.contains('zona-respuesta');

            chip.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            /* Necesario en Firefox para que el drag funcione */
            e.dataTransfer.setData('text/plain', chip.dataset.valor);
        });

        chip.addEventListener('dragend', () => {
            chip.classList.remove('dragging');
            chipArrastrado = null;
            origenBloque   = null;
            origenEsZona   = false;
            /* Limpiar resaltados de hover que puedan haber quedado */
            document.querySelectorAll('.drop-over, .pool-over')
                    .forEach(el => el.classList.remove('drop-over', 'pool-over'));
        });
    }

    /* ── Zonas de respuesta como drop targets ── */
    document.querySelectorAll('.zona-respuesta').forEach(zona => {

        zona.addEventListener('dragover', e => {
            if (!chipArrastrado) return;
            const chipActual = zona.querySelector('.opcion');

            /*
              Permitir drop si:
              a) la zona está vacía, o
              b) el chip que hay dentro ES el que estamos arrastrando
                 (re-drag desde la misma zona).
              Bloquear si la zona ya tiene un chip diferente al arrastrado.
            */
            if (chipActual && chipActual !== chipArrastrado) return;

            e.preventDefault();
            zona.classList.add('drop-over');
        });

        zona.addEventListener('dragleave', e => {
            /* Solo quitar el resaltado si salimos completamente del elemento */
            if (!zona.contains(e.relatedTarget)) {
                zona.classList.remove('drop-over');
            }
        });

        zona.addEventListener('drop', e => {
            e.preventDefault();
            zona.classList.remove('drop-over');
            if (!chipArrastrado) return;

            /* Si hay otro chip diferente en la zona, devolverlo al pool */
            const chipActual = zona.querySelector('.opcion');
            if (chipActual && chipActual !== chipArrastrado) {
                const poolDestino = zona.closest('.bloque').querySelector('.opciones-pool');
                poolDestino.appendChild(chipActual);
            }

            /* Insertar el chip arrastrado antes del span de feedback */
            const feedback = zona.querySelector('.zona-feedback');
            zona.insertBefore(chipArrastrado, feedback);

            /* Quitar placeholder y limpiar estado de corrección */
            zona.classList.remove('vacia', 'correcta', 'incorrecta');
        });
    });

    /* ── Pools como drop targets (devolver chips) ── */
    document.querySelectorAll('.opciones-pool').forEach(pool => {

        pool.addEventListener('dragover', e => {
            if (!chipArrastrado) return;
            /*
              Solo aceptar chips cuyo bloque origen sea ESTE bloque.
              Usar origenBloque (guardado en dragstart) para no perder
              la referencia cuando el chip ya está en el DOM de la zona.
            */
            if (origenBloque !== pool.closest('.bloque')) return;

            e.preventDefault();
            pool.classList.add('pool-over');
        });

        pool.addEventListener('dragleave', e => {
            if (!pool.contains(e.relatedTarget)) {
                pool.classList.remove('pool-over');
            }
        });

        pool.addEventListener('drop', e => {
            e.preventDefault();
            pool.classList.remove('pool-over');
            if (!chipArrastrado) return;
            if (origenBloque !== pool.closest('.bloque')) return;

            pool.appendChild(chipArrastrado);

            /* Si venía de una zona, marcarla como vacía de nuevo */
            if (origenEsZona) {
                const zona = origenBloque.querySelector('.zona-respuesta');
                if (!zona.querySelector('.opcion')) {
                    zona.classList.add('vacia');
                    zona.classList.remove('correcta', 'incorrecta');
                }
            }
        });
    });

    /* ── Calificar ── */
    function calcularNota() {
        const bloques = document.querySelectorAll('.bloque');
        let correctas  = 0;
        let respondidas = 0;
        const total    = bloques.length;

        bloques.forEach(bloque => {
            const respuestaCorrecta = bloque.dataset.correcta;
            const zona  = bloque.querySelector('.zona-respuesta');
            const chip  = zona.querySelector('.opcion');

            /* Limpiar estado visual anterior */
            zona.classList.remove('correcta', 'incorrecta');
            const fb = zona.querySelector('.zona-feedback');
            fb.textContent = '';

            if (!chip) {
                /* Sin respuesta: marcar zona como vacía */
                zona.classList.add('vacia');
                return;
            }

            respondidas++;
            zona.classList.remove('vacia');

            if (chip.dataset.valor === respuestaCorrecta) {
                zona.classList.add('correcta');
                fb.textContent = '✓';
                correctas++;
            } else {
                zona.classList.add('incorrecta');
                fb.textContent = '✗';
            }
        });

        const porcentaje = Math.round((correctas / total) * 100);
        const nota10     = ((correctas / total) * 10).toFixed(1);

        let emoji = '😔';
        if      (porcentaje >= 90) emoji = '🏆';
        else if (porcentaje >= 70) emoji = '🎉';
        else if (porcentaje >= 50) emoji = '👍';
        else if (porcentaje >= 30) emoji = '📚';

        document.getElementById('resultado').textContent =
            `${emoji}  ${correctas} / ${total} — Nota: ${nota10}`;

        const sinRespuesta = total - respondidas;
        let detalle = `${porcentaje}% de acierto`;
        if (sinRespuesta > 0) detalle += `  ·  ${sinRespuesta} pregunta(s) sin responder`;
        document.getElementById('resultado-detalle').textContent = detalle;

        document.getElementById('resultado')
                .scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
