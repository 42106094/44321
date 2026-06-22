function mostrarOculto() {
    var cuerpo = document.querySelector('.cuerpo-oculto');
    var texto = document.querySelector('.texto');

    if (cuerpo.style.display === 'none') {
        cuerpo.style.display = 'block';
        texto.style.display = 'none';
    } else {
        cuerpo.style.display = 'none';
        texto.style.display = 'block';
    }
}