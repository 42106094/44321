// Esta constante define la clave exacta bajo la cual se guarda el carrito en localStorage.
// La idea es reutilizar la misma clave en todas las páginas para que el estado del carrito sea persistente
// aunque el usuario navegue entre Home, Productos, Contacto, Nosotros y Checkout.
const CART_KEY = 'casa-grano-cart';

// Esta función convierte un valor numérico en un texto con formato monetario argentino.
// Se usa porque en toda la tienda los productos se muestran con precio visible y se requieren cálculos sin decimales.
// Intl.NumberFormat es más robusto que concatenar strings manualmente porque toma la configuración regional correcta.
const formatPrice = (price) => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
}).format(price);

// readCart comprueba si existe un carrito anterior en el almacenamiento local del navegador.
// Si el dato no existe o está corrupto, devuelve un arreglo vacío para evitar errores de ejecución.
// Esta validación es importante porque la tienda debe seguir funcionando aunque el navegador no tenga datos guardados todavía.
function readCart() {
    try {
        // localStorage.getItem busca la clave del carrito; si no existe, devuelve null, que se reemplaza por '[]'.
        const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        // Se asegura de que el valor realmente sea un array y no un objeto, un string o cualquier otra estructura.
        return Array.isArray(cart) ? cart : [];
    } catch {
        // Si JSON.parse falla, se confirma que el carrito no tiene un formato válido y se reinicia a estado vacío.
        return [];
    }
}

// cart representa el estado activo del carrito en memoria durante la sesión actual del navegador.
// Se inicializa con lo que exista guardado, así la tienda refleja el mismo estado en cada página.
let cart = readCart();

// WeakMap guarda temporizadores de tiempo asociados a cada botón para que cada botón tenga su propio timeout.
// Esto evita que dos botones compartan un mismo temporizador o que la animación de un botón se mezcle con otra.
const addButtonTimers = new WeakMap();

// saveCart guarda el estado del carrito en localStorage y luego vuelve a renderizar la interfaz.
// Este flujo se repite en todas las páginas para mantener siempre visibles el contador, el menú y el total actualizado.
function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
}

// showAddFeedback produce la retroalimentación visual cuando el usuario hace click en "Agregar".
// El objetivo es dar un feedback inmediato al usuario y confirmar que el producto fue incorporado correctamente al carrito.
function showAddFeedback(button, productName) {
    // Este texto cambia el contenido visible del botón para informar claramente que el producto ya fue agregado.
    button.textContent = '¡Sumado!';
    // La clase CSS is-added activa una breve transformación visual del botón para reforzar la interacción.
    button.classList.add('is-added');

    // Se limpia el timeout anterior para evitar que si el usuario hace clicks rápidos se mezclen dos tiempos de restauración.
    window.clearTimeout(addButtonTimers.get(button));

    // Se programa la restauración del botón a su estado original tras 1100 ms para volver a “Agregar”.
    addButtonTimers.set(button, window.setTimeout(() => {
        button.textContent = 'Agregar';
        button.classList.remove('is-added');
    }, 1100));

    // Se obtiene el indicador del carrito observable en la cabecera para animar el contador de cantidad.
    const count = document.querySelector('.cart-count');
    if (count) {
        // El contador se reinicia para que la animación se reproduzca siempre con la misma lógica.
        count.classList.remove('is-bouncing');
        // requestAnimationFrame espera al siguiente frame del navegador para disparar la animación con mejor sincronización visual.
        window.requestAnimationFrame(() => count.classList.add('is-bouncing'));
        // Después de 500 ms se quita la clase para que la animación pueda volver a ejecutarse en otra suma.
        window.setTimeout(() => count.classList.remove('is-bouncing'), 500);
    }

    // Se intenta localizar una pila de toasts ya creada; si no existe, se crea una sola vez para toda la página.
    let toastStack = document.querySelector('.cart-toast-stack');
    if (!toastStack) {
        // La creación del contenedor ocurre solo si aún no existe, evitando generar varios stacks por cada producto agregado.
        toastStack = document.createElement('div');
        toastStack.className = 'cart-toast-stack';
        toastStack.setAttribute('role', 'status');
        toastStack.setAttribute('aria-live', 'polite');
        toastStack.setAttribute('aria-relevant', 'additions text');
        document.body.append(toastStack);
    }

    // Se crea un aviso individual para mostrar un mensaje textual del producto agregado.
    const toast = document.createElement('div');
    toast.className = 'cart-toast is-entering';

    // El icono marca visualmente la acción como confirmada y tiene accesibilidad visual desactivada para no duplicar lectura.
    const mark = document.createElement('span');
    mark.className = 'cart-toast-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '✓';

    // El mensaje contiene el nombre del producto agregado para que el usuario identifique exactamente qué item entró al carrito.
    const message = document.createElement('span');
    message.className = 'cart-toast-message';
    message.textContent = `¡${productName} se sumó al carrito!`;

    // El toast se adjunta a la pila para que aparezca en la esquina inferior derecha de la página.
    toast.append(mark, message);
    toastStack.append(toast);

    // Luego de 350 ms se elimina la clase de entrada para iniciar la transición de permanencia.
    window.setTimeout(() => toast.classList.remove('is-entering'), 350);

    // Después de 2200 ms se activa la salida del toast con una clase de cierre, luego se elimina del DOM.
    window.setTimeout(() => {
        toast.classList.remove('is-entering');
        toast.classList.add('is-leaving');
        window.setTimeout(() => toast.remove(), 400);
    }, 2200);
}

// Este listener escucha cambios del almacenamiento local en otras pestañas del mismo origen.
// Cuando cambia el carrito desde otra ventana, actualiza la vista para no desincronizar la información.
window.addEventListener('storage', (event) => {
    // Si la clave del carrito cambia o el almacenamiento local se limpia, se vuelve a leer el estado.
    if (event.key === CART_KEY || event.key === null) {
        cart = readCart();
        renderCart();
    }
});

// Este listener se ejecuta cuando la página vuelve a mostrarse desde caché o historial del navegador.
// Garantiza que el carrito no quede desactualizado si el usuario vuelve a una página sin recargar.
window.addEventListener('pageshow', () => {
    cart = readCart();
    renderCart();
});

// renderCart es la función central que dibuja toda la información del carrito en la interfaz.
// Es reutilizada por todas las páginas porque los distintos HTML tienen elementos con los mismos nombres de clase.
function renderCart() {
    // count apunta al contador visible del carrito en la cabecera de cada página.
    const count = document.querySelector('.cart-count');
    // items apunta al lugar donde se renderiza la lista de productos dentro del menú desplegable.
    const items = document.querySelector('.cart-items');
    // totalElement muestra el monto total general en el menú flotante del carrito.
    const totalElement = document.querySelector('.cart-total');
    // checkoutLink apunta al enlace del checkout; si el carrito está vacío, se deshabilita visualmente.
    const checkoutLink = document.querySelector('.checkout-link');

    // cartCount suma la cantidad total de unidades almacenadas en todos los productos del carrito.
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    // total calcula el valor conjunto del carrito multiplicando precio por cantidad para cada item.
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Si el contador existe, se actualiza para reflejar la cantidad total de productos agregados.
    if (count) count.textContent = cartCount;
    // Si hay un total visible en el carrito flotante, se muestra la suma final formateada como moneda.
    if (totalElement) totalElement.textContent = formatPrice(total);

    // Si el contenedor de items existe, se pinta la lista dinámica del carrito.
    if (items) {
        // Si hay productos, se genera un bloque HTML por cada item con su nombre, cantidad y precio individual.
        // Si no hay nada, se muestra un mensaje vacío para avisar al usuario que todavía no agrego productos.
        items.innerHTML = cart.length
            ? cart.map((item) => `<div class="cart-item"><div><strong>${item.name}</strong><span>${item.quantity} × ${formatPrice(item.price)}</span></div><button type="button" class="remove-item" data-remove-id="${item.id}" aria-label="Quitar ${item.name}">Quitar</button></div>`).join('')
            : '<p class="cart-empty">Todavía no agregaste productos.</p>';
    }

    // Si existe el enlace de checkout, se habilita o deshabilita según haya productos en el carrito.
    if (checkoutLink) checkoutLink.setAttribute('aria-disabled', cart.length ? 'false' : 'true');

    // summary busca el resumen del pedido en la página de checkout para dibujar la lista de artículos ahí también.
    const summary = document.querySelector('.checkout-summary');
    const checkoutTotal = document.querySelector('.checkout-total');
    if (summary) {
        // Cuando hay productos, se dibujan filas con su subtotal y controles para sumar o quitar unidades.
        // Cuando no hay productos, se muestra que el carrito está vacío.
        summary.innerHTML = cart.length
            ? cart.map((item) => `<div class="checkout-item"><div class="checkout-item-info"><span>${item.name}</span><strong>${formatPrice(item.price * item.quantity)}</strong></div><div class="quantity-controls" aria-label="Cantidad de ${item.name}"><button class="quantity-button" type="button" data-quantity-id="${item.id}" data-quantity-step="-1" aria-label="Reducir ${item.name}">−</button><span class="quantity-value" aria-live="polite">${item.quantity}</span><button class="quantity-button" type="button" data-quantity-id="${item.id}" data-quantity-step="1" aria-label="Aumentar ${item.name}">+</button></div></div>`).join('')
            : '<p class="cart-empty">Tu carrito está vacío.</p>';
    }

    // Si existe el total del checkout, se actualiza con el total general calculado.
    if (checkoutTotal) checkoutTotal.textContent = formatPrice(total);
}

// Este bloque se ejecuta cuando el DOM ya está cargado y el navegador puede interactuar con todos los elementos HTML.
// Es el punto de entrada de la lógica de interactividad para toda la tienda.
document.addEventListener('DOMContentLoaded', () => {
    // Primero se dibuja el estado inicial del carrito para que la cabecera y el menú coincidan con lo guardado.
    renderCart();

    // removeDialog hace referencia al modal que confirma la eliminación de un producto cuando se baja la cantidad a cero.
    const removeDialog = document.querySelector('#remove-item-dialog');
    const toggle = document.querySelector('.cart-toggle');
    const menu = document.querySelector('.cart-menu');

    // Este bloque controla la apertura y cierre del menú del carrito con comportamiento accesible.
    if (toggle && menu) {
        // Cuando se hace click en el botón del carrito, se alterna el estado abierto/cerrado y se actualiza aria-expanded.
        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!isOpen));
            menu.hidden = isOpen;
        });

        // Cuando se hace clic fuera del contenedor del carrito, se cierra para evitar que quede abierto accidentalmente.
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.cart-wrap')) {
                toggle.setAttribute('aria-expanded', 'false');
                menu.hidden = true;
            }
        });

        // La tecla Escape cierra el menú del carrito, siguiendo la conveniencia esperada de cualquier diálogo desplegable.
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                toggle.setAttribute('aria-expanded', 'false');
                menu.hidden = true;
            }
        });
    }

    // Este bloque selecciona todos los botones que agregan productos y les asigna un listener de click.
    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
        button.addEventListener('click', () => {
            // Se busca si el producto ya estaba dentro del carrito para actualizar su cantidad en lugar de duplicarlo.
            const existing = cart.find((item) => item.id === button.dataset.id);
            if (existing) existing.quantity += 1;
            else cart.push({
                id: button.dataset.id,
                name: button.dataset.name,
                price: Number(button.dataset.price),
                quantity: 1
            });

            // Luego de agregar, se guarda el estado y se ejecuta la retroalimentación visual del botón.
            saveCart();
            showAddFeedback(button, button.dataset.name);
        });
    });

    // El siguiente evento delegado maneja todos los clics sobre controles que se crean dinámicamente después de renderCart.
    document.addEventListener('click', (event) => {
        // quantityButton detecta cualquier botón con data-quantity-id, usado en la página de checkout para sumar o restar cantidades.
        const quantityButton = event.target.closest('[data-quantity-id]');
        if (quantityButton) {
            const item = cart.find((cartItem) => cartItem.id === quantityButton.dataset.quantityId);
            if (!item) return;

            const step = Number(quantityButton.dataset.quantityStep);
            // Si se intenta restar una unidad y la cantidad actual es 1, se abre confirmación en lugar de quitarlo directamente.
            if (step < 0 && item.quantity === 1) {
                if (!removeDialog) return;
                removeDialog.dataset.itemId = item.id;
                removeDialog.querySelector('[data-remove-product-name]').textContent = item.name;
                removeDialog.showModal();
            } else {
                item.quantity += step;
                saveCart();
            }
            return;
        }

        // Si el usuario decide conservar un producto del cuadro de confirmación, simplemente se cierra el dialog.
        if (event.target.closest('[data-cancel-remove]')) {
            removeDialog?.close();
            return;
        }

        // Si el usuario confirma la eliminación del elemento, se borra del carrito y se actualiza el total.
        if (event.target.closest('[data-confirm-remove]') && removeDialog) {
            const itemId = removeDialog.dataset.itemId;
            removeDialog.close();
            cart = cart.filter((item) => item.id !== itemId);
            delete removeDialog.dataset.itemId;
            saveCart();
            return;
        }

        // removeButton trata la acción directa de quitar un item desde el menú del carrito.
        const removeButton = event.target.closest('[data-remove-id]');
        if (removeButton) {
            cart = cart.filter((item) => item.id !== removeButton.dataset.removeId);
            saveCart();
        }
    });

    // Se aplica a todos los formularios que tengan el atributo data-local-form para evitar recarga de página.
    document.querySelectorAll('[data-local-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            // preventDefault evita navegación, ya que la validación es local y no se envía a un backend real.
            event.preventDefault();
            const feedback = form.querySelector('.form-feedback');

            // Si el formulario corresponde al checkout, exige que haya productos cargados antes de confirmar el pedido.
            if (form.matches('[data-checkout-form]')) {
                if (!cart.length) {
                    feedback.textContent = 'Agregá al menos un producto antes de continuar.';
                    return;
                }
                feedback.textContent = '¡Gracias! Recibimos tu pedido de prueba.';
                cart = [];
                saveCart();
                form.reset();
                return;
            }

            // En el resto de formularios, por ejemplo contacto, muestra un mensaje de confirmación y limpia el formulario.
            feedback.textContent = 'Gracias por escribirnos. Recibimos tu mensaje.';
            form.reset();
        });
    });
});