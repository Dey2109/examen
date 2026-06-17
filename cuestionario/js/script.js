/* ═══════════════════════════════════════════════════════════
   CUESTIONARIO — Lógica de arrastre
   ═══════════════════════════════════════════════════════════ */

let chipArrastrado = null;
let origenBloque = null;
let origenEsZona = false;

/* ──────────────────────────────────────────────────────────
   CARGA INICIAL
────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    const formularioRespondido =
        localStorage.getItem("formularioEnviado");

    if (formularioRespondido === "true") {

        const respuestasGuardadas = JSON.parse(
            localStorage.getItem("respuestasUsuario") || "{}"
        );

        document.querySelectorAll(".bloque").forEach((bloque, index) => {

            const valorGuardado = respuestasGuardadas[index];

            if (!valorGuardado) return;

            const pool = bloque.querySelector(".opciones-pool");
            const zona = bloque.querySelector(".zona-respuesta");

            const chip = pool.querySelector(
                `.opcion[data-valor="${valorGuardado}"]`
            );

            if (chip) {
                const feedback = zona.querySelector(".zona-feedback");

                zona.insertBefore(chip, feedback);
                zona.classList.remove("vacia");
            }
        });

        // BLOQUEAR TODOS LOS CHIPS
        document.querySelectorAll(".opcion").forEach(chip => {
            chip.removeAttribute("draggable");
            chip.style.cursor = "default";
        });

        calcularNota(true);

        const botonCalificar =
            document.querySelector('button[onclick="calcularNota()"]');

        if (botonCalificar) {
            botonCalificar.disabled = true;
            botonCalificar.textContent =
                "Cuestionario ya respondido";
        }

    } else {

        document
            .querySelectorAll(".opcion")
            .forEach(activarChip);

        inicializarZonasYPools();
    }
});

/* ──────────────────────────────────────────────────────────
   ACTIVAR CHIPS
────────────────────────────────────────────────────────── */
function activarChip(chip) {

    chip.setAttribute("draggable", "true");

    chip.addEventListener("dragstart", e => {

        chipArrastrado = chip;
        origenBloque = chip.closest(".bloque");
        origenEsZona =
            chip.parentElement.classList.contains(
                "zona-respuesta"
            );

        chip.classList.add("dragging");

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
            "text/plain",
            chip.dataset.valor
        );
    });

    chip.addEventListener("dragend", () => {

        chip.classList.remove("dragging");

        chipArrastrado = null;
        origenBloque = null;
        origenEsZona = false;

        document
            .querySelectorAll(".drop-over, .pool-over")
            .forEach(el => {
                el.classList.remove(
                    "drop-over",
                    "pool-over"
                );
            });
    });
}

/* ──────────────────────────────────────────────────────────
   ZONAS Y POOLS
────────────────────────────────────────────────────────── */
function inicializarZonasYPools() {

    document
        .querySelectorAll(".zona-respuesta")
        .forEach(zona => {

            zona.addEventListener("dragover", e => {

                if (!chipArrastrado) return;

                const chipActual =
                    zona.querySelector(".opcion");

                if (
                    chipActual &&
                    chipActual !== chipArrastrado
                ) {
                    return;
                }

                e.preventDefault();

                zona.classList.add("drop-over");
            });

            zona.addEventListener("dragleave", e => {

                if (!zona.contains(e.relatedTarget)) {
                    zona.classList.remove("drop-over");
                }
            });

            zona.addEventListener("drop", e => {

                e.preventDefault();

                zona.classList.remove("drop-over");

                if (!chipArrastrado) return;

                const chipActual =
                    zona.querySelector(".opcion");

                if (
                    chipActual &&
                    chipActual !== chipArrastrado
                ) {

                    const poolDestino =
                        zona.closest(".bloque")
                            .querySelector(".opciones-pool");

                    poolDestino.appendChild(chipActual);
                }

                const feedback =
                    zona.querySelector(".zona-feedback");

                zona.insertBefore(
                    chipArrastrado,
                    feedback
                );

                zona.classList.remove(
                    "vacia",
                    "correcta",
                    "incorrecta"
                );
            });
        });

    document
        .querySelectorAll(".opciones-pool")
        .forEach(pool => {

            pool.addEventListener("dragover", e => {

                if (!chipArrastrado) return;

                if (
                    origenBloque !==
                    pool.closest(".bloque")
                ) {
                    return;
                }

                e.preventDefault();

                pool.classList.add("pool-over");
            });

            pool.addEventListener("dragleave", e => {

                if (!pool.contains(e.relatedTarget)) {
                    pool.classList.remove("pool-over");
                }
            });

            pool.addEventListener("drop", e => {

                e.preventDefault();

                pool.classList.remove("pool-over");

                if (!chipArrastrado) return;

                if (
                    origenBloque !==
                    pool.closest(".bloque")
                ) {
                    return;
                }

                pool.appendChild(chipArrastrado);

                if (origenEsZona) {

                    const zona =
                        origenBloque.querySelector(
                            ".zona-respuesta"
                        );

                    if (!zona.querySelector(".opcion")) {

                        zona.classList.add("vacia");

                        zona.classList.remove(
                            "correcta",
                            "incorrecta"
                        );
                    }
                }
            });
        });
}

/* ──────────────────────────────────────────────────────────
   BLOQUEAR CUESTIONARIO
────────────────────────────────────────────────────────── */
function bloquearCuestionario() {

    document
        .querySelectorAll(".opcion")
        .forEach(chip => {

            chip.removeAttribute("draggable");
            chip.style.cursor = "default";
        });

    const botonCalificar =
        document.querySelector(
            'button[onclick="calcularNota()"]'
        );

    if (botonCalificar) {

        botonCalificar.disabled = true;
        botonCalificar.textContent =
            "Cuestionario respondido";
    }
}

/* ──────────────────────────────────────────────────────────
   CALIFICAR
────────────────────────────────────────────────────────── */
function calcularNota(esCargaBloqueo = false) {

    const bloques =
        document.querySelectorAll(".bloque");

    let correctas = 0;
    let respondidas = 0;

    const total = bloques.length;

    const respuestasParaGuardar = {};

    bloques.forEach((bloque, index) => {

        const respuestaCorrecta =
            bloque.dataset.correcta;

        const zona =
            bloque.querySelector(".zona-respuesta");

        const chip =
            zona.querySelector(".opcion");

        zona.classList.remove(
            "correcta",
            "incorrecta"
        );

        const fb =
            zona.querySelector(".zona-feedback");

        fb.textContent = "";

        if (!chip) {

            zona.classList.add("vacia");
            return;
        }

        respondidas++;

        zona.classList.remove("vacia");

        respuestasParaGuardar[index] =
            chip.dataset.valor;

        if (
            chip.dataset.valor ===
            respuestaCorrecta
        ) {

            zona.classList.add("correcta");

            fb.textContent = "✓";

            correctas++;

        } else {

            zona.classList.add("incorrecta");

            fb.textContent = "✗";
        }
    });

    const porcentaje =
        Math.round(
            (correctas / total) * 100
        );

    const nota10 =
        ((correctas / total) * 10)
        .toFixed(1);

    let emoji = "😔";

    if (porcentaje >= 90) emoji = "🏆";
    else if (porcentaje >= 70) emoji = "🎉";
    else if (porcentaje >= 50) emoji = "👍";
    else if (porcentaje >= 30) emoji = "📚";

    document.getElementById("resultado")
        .textContent =
        `${emoji} ${correctas} / ${total} — Nota: ${nota10}`;

    const sinRespuesta =
        total - respondidas;

    let detalle =
        `${porcentaje}% de acierto`;

    if (sinRespuesta > 0) {
        detalle +=
            ` · ${sinRespuesta} pregunta(s) sin responder`;
    }

    document.getElementById(
        "resultado-detalle"
    ).textContent = detalle;

    if (!esCargaBloqueo) {

        localStorage.setItem(
            "formularioEnviado",
            "true"
        );

        localStorage.setItem(
            "respuestasUsuario",
            JSON.stringify(
                respuestasParaGuardar
            )
        );

        bloquearCuestionario();
    }

    document
        .getElementById("resultado")
        .scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
}