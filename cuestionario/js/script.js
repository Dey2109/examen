let arrastre;

document.querySelectorAll('.pregunta').forEach(p =>{
    p.addEventListener('dragstart', e => {
        arrastre = p;
    });
});


document.querySelectorAll('.respuesta').forEach(s =>{
    s.addEventListener('dragover', e =>{
        e.preventDefault();
        s.classList.add('over')
    });

    s.addEventListener('dragleave', e=>{
        s.classList.remove('over')
    })

    s.addEventListener('drop', e =>{
        s.classList.remove('over')
        if(!s.querySelector('.pregunta')){
            s.appendChild(arrastre);
        }
    });
});

function calcularNota(){
    let nota = 0;
    document.querySelectorAll('.respuesta').forEach(s =>{
        const pieza =  s.querySelector('.pregunta');
        if(pieza && pieza.dataset.respuesta === s.dataset.correcta){
            nota++;
        }
    })
    document.getElementById('resultado').textContent = `Tu nota es: ${nota}/10`;
}