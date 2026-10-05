const CART_KEY = 'casa-grano-cart';
const formatPrice = (price) => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
}).format(price);

function readCart() {
    try {
        const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

let cart = readCart();
const addButtonTimers = new WeakMap();

function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
}

function showAddFeedback(button, productName) {
    button.textContent = '¡Sumado!';
    button.classList.add('is-added');
    window.clearTimeout(addButtonTimers.get(button));
    addButtonTimers.set(button, window.setTimeout(() => {
        button.textContent = 'Agregar';
        button.classList.remove('is-added');
    }, 1100));

    const count = document.querySelector('.cart-count');
    if (count) {
        count.classList.remove('is-bouncing');
        window.requestAnimationFrame(() => count.classList.add('is-bouncing'));
        window.setTimeout(() => count.classList.remove('is-bouncing'), 500);
    }

    let toastStack = document.querySelector('.cart-toast-stack');
    if (!toastStack) {
        toastStack = document.createElement('div');
        toastStack.className = 'cart-toast-stack';
        toastStack.setAttribute('role', 'status');
        toastStack.setAttribute('aria-live', 'polite');
        toastStack.setAttribute('aria-relevant', 'additions text');
        document.body.append(toastStack);
    }

    const toast = document.createElement('div');
    toast.className = 'cart-toast is-entering';
    const mark = document.createElement('span');
    mark.className = 'cart-toast-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '✓';
    const message = document.createElement('span');
    message.className = 'cart-toast-message';
    message.textContent = `¡${productName} se sumó al carrito!`;
    toast.append(mark, message);
    toastStack.append(toast);
    window.setTimeout(() => toast.classList.remove('is-entering'), 350);
    window.setTimeout(() => {
        toast.classList.remove('is-entering');
        toast.classList.add('is-leaving');
        window.setTimeout(() => toast.remove(), 400);
    }, 2200);
}
    window.addEventListener('storage', (event) => {
        if (event.key === CART_KEY || event.key === null) {
            cart = readCart();
            renderCart();
        }
    });
    
    window.addEventListener('pageshow', () => {
        cart = readCart();
        renderCart();
    });

function renderCart() {
    const count = document.querySelector('.cart-count');
    const items = document.querySelector('.cart-items');
    const totalElement = document.querySelector('.cart-total');
    const checkoutLink = document.querySelector('.checkout-link');
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (count) count.textContent = cartCount;
    if (totalElement) totalElement.textContent = formatPrice(total);
    if (items) {
        items.innerHTML = cart.length
            ? cart.map((item) => `<div class="cart-item"><div><strong>${item.name}</strong><span>${item.quantity} × ${formatPrice(item.price)}</span></div><button type="button" class="remove-item" data-remove-id="${item.id}" aria-label="Quitar ${item.name}">Quitar</button></div>`).join('')
            : '<p class="cart-empty">Todavía no agregaste productos.</p>';
    }
    if (checkoutLink) checkoutLink.setAttribute('aria-disabled', cart.length ? 'false' : 'true');

    const summary = document.querySelector('.checkout-summary');
    const checkoutTotal = document.querySelector('.checkout-total');
    if (summary) {
        summary.innerHTML = cart.length
            ? cart.map((item) => `<div class="checkout-item"><div class="checkout-item-info"><span>${item.name}</span><strong>${formatPrice(item.price * item.quantity)}</strong></div><div class="quantity-controls" aria-label="Cantidad de ${item.name}"><button class="quantity-button" type="button" data-quantity-id="${item.id}" data-quantity-step="-1" aria-label="Reducir ${item.name}">−</button><span class="quantity-value" aria-live="polite">${item.quantity}</span><button class="quantity-button" type="button" data-quantity-id="${item.id}" data-quantity-step="1" aria-label="Aumentar ${item.name}">+</button></div></div>`).join('')
            : '<p class="cart-empty">Tu carrito está vacío.</p>';
    }
    if (checkoutTotal) checkoutTotal.textContent = formatPrice(total);
}

document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    const removeDialog = document.querySelector('#remove-item-dialog');
    const toggle = document.querySelector('.cart-toggle');
    const menu = document.querySelector('.cart-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!isOpen));
            menu.hidden = isOpen;
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.cart-wrap')) {
                toggle.setAttribute('aria-expanded', 'false');
                menu.hidden = true;
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                toggle.setAttribute('aria-expanded', 'false');
                menu.hidden = true;
            }
        });
    }

    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
        button.addEventListener('click', () => {
            const existing = cart.find((item) => item.id === button.dataset.id);
            if (existing) existing.quantity += 1;
            else cart.push({
                id: button.dataset.id,
                name: button.dataset.name,
                price: Number(button.dataset.price),
                quantity: 1
            });
            saveCart();
            showAddFeedback(button, button.dataset.name);
        });
    });

    document.addEventListener('click', (event) => {
        const quantityButton = event.target.closest('[data-quantity-id]');
        if (quantityButton) {
            const item = cart.find((cartItem) => cartItem.id === quantityButton.dataset.quantityId);
            if (!item) return;

            const step = Number(quantityButton.dataset.quantityStep);
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

        if (event.target.closest('[data-cancel-remove]')) {
            removeDialog?.close();
            return;
        }

        if (event.target.closest('[data-confirm-remove]') && removeDialog) {
            const itemId = removeDialog.dataset.itemId;
            removeDialog.close();
            cart = cart.filter((item) => item.id !== itemId);
            delete removeDialog.dataset.itemId;
            saveCart();
            return;
        }

        const removeButton = event.target.closest('[data-remove-id]');
        if (removeButton) {
            cart = cart.filter((item) => item.id !== removeButton.dataset.removeId);
            saveCart();
        }
    });

    document.querySelectorAll('[data-local-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const feedback = form.querySelector('.form-feedback');
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
            feedback.textContent = 'Gracias por escribirnos. Recibimos tu mensaje.';
            form.reset();
        });
    });
});