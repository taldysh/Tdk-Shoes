"use strict";

/**
 * БАЗА ДАННЫХ ТОВАРОВ (Премиум-сегмент)
 * Добавлены цвета, новые люксовые кроссовки и живые медиаданные
 */
const PRODUCTS_DATA = [
    {
        id: 1,
        brand: "BALENCIAGA",
        name: "Jasnoniebieskie jeansy z szerokimi nogawkami",
        sku: "871354 TDW14-4200",
        category: "jeans",
        price: 601900, 
        installment: 25540, 
        images: [
            "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Light Blue", "Vintage Ash"],
        sizes: { "29": 1, "30": 3, "31": 0 },
        badge: "ОСТАЛСЯ ПОСЛЕДНИЙ" 
    },
    {
        id: 2,
        brand: "BALENCIAGA",
        name: "Кроссовки Balenciaga Cargo Sneaker Black M",
        sku: "739346 W2DB1-1000",
        category: "shoes",
        price: 580000,
        installment: 24650,
        images: [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Matte Black", "Triple White"],
        sizes: { "41": 2, "42": 4, "43": 1 },
        badge: "NEW ARRIVAL"
    },
    {
        id: 3,
        brand: "BALENCIAGA",
        name: "Массивные кроссовки Triple S Clear Sole Grey",
        sku: "541624 W2FB1-9000",
        category: "shoes",
        price: 495000,
        installment: 21000,
        images: [
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Steel Grey", "Neon Yellow Edition"],
        sizes: { "39": 1, "41": 2, "42": 1 },
        badge: "BESTSELLER"
    },
    {
        id: 4,
        brand: "BALENCIAGA",
        name: "Эксклюзивные кроссовки Track.2 Trainer White",
        sku: "568614 W2GN1-9000",
        category: "shoes",
        price: 530000,
        installment: 22500,
        images: [
            "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Pure White", "Ghost Grey"],
        sizes: { "40": 2, "42": 3, "44": 1 },
        badge: null
    },
    {
        id: 5,
        brand: "BALENCIAGA",
        name: "Czarna skórzana torba na ramię Rodeo",
        sku: "783214 TZO01-1000",
        category: "bags",
        price: 1420000,
        installment: 60310,
        images: [
            "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Noir Black"],
        sizes: { "UNI": 2 },
        badge: null
    }
];

// Глобальный стейт
const state = {
    currentCategory: 'all',
    searchQuery: '',
    selectedSize: null,
    selectedColor: null,
    currentProduct: null,
    currentImageIndex: 0
};

const formatCurrency = (num) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(num).trim();
};

const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
};

function renderProducts() {
    const container = document.getElementById('products-container');
    const countElement = document.getElementById('products-count');
    if (!container) return;

    let filtered = [...PRODUCTS_DATA];

    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === state.currentCategory);
    }

    const query = state.searchQuery.trim().toLowerCase();
    if (query) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.brand.toLowerCase().includes(query)
        );
    }

    if (countElement) countElement.textContent = filtered.length;

    container.innerHTML = filtered.length 
        ? filtered.map(product => `
            <div class="product-card" onclick="openProductModal(${product.id})">
                <div class="product-image-container">
                    <img src="${escapeHTML(product.images[0])}" alt="${escapeHTML(product.name)}" class="product-main-img" loading="lazy">
                    <button class="wishlist-btn" onclick="toggleWishlist(event)">
                        <svg viewBox="0 0 24 24" class="heart-icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                    ${product.badge ? `<span class="card-badge">${product.badge}</span>` : ''}
                </div>
                <div class="product-details">
                    <h3 class="brand-title">${escapeHTML(product.brand)}</h3>
                    <p class="product-short-name">${escapeHTML(product.name)}</p>
                    <div class="price-box">
                        <span class="price-main">${formatCurrency(product.price)}</span>
                        ${product.installment ? `<span class="price-installment">рассрочка от ${formatCurrency(product.installment)}/мес</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('')
        : `<div class="no-results-message">По вашему запросу ничего не найдено.</div>`;
}

function changeCategory(category) {
    state.currentCategory = category;
    state.searchQuery = '';
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${category}`);
    if (activeNav) activeNav.classList.add('active');

    const breadcrumb = document.getElementById('breadcrumb-category');
    if (breadcrumb) {
        const catNames = { all: "Все товары", shoes: "Обувь", bags: "Сумки", jeans: "Джинсы" };
        breadcrumb.textContent = catNames[category] || category;
    }

    renderProducts();
}

function openProductModal(productId) {
    const product = PRODUCTS_DATA.find(p => p.id === productId);
    if (!product) return;

    state.currentProduct = product;
    state.selectedSize = null;
    state.selectedColor = null;
    state.currentImageIndex = 0;

    // Сброс шагов оформления до Шага 1
    document.getElementById('checkout-step-fields').style.display = 'block';
    document.getElementById('checkout-step-requisites').style.display = 'none';

    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    modal.querySelector('.modal-brand').textContent = product.brand;
    modal.querySelector('.modal-product-name').textContent = product.name;
    modal.querySelector('.modal-price').textContent = formatCurrency(product.price);
    modal.querySelector('.modal-sku').textContent = `АРТИКУЛ: ${product.sku}`;
    
    const instElem = modal.querySelector('.modal-installment');
    if (instElem) instElem.textContent = product.installment ? `РАССРОЧКА: от ${formatCurrency(product.installment)} / месяц` : '';

    updateModalImages();

    // Генерация цветов
    const colorsContainer = document.getElementById('modal-colors-selector');
    if (colorsContainer) {
        colorsContainer.innerHTML = '';
        product.colors.forEach(color => {
            const btn = document.createElement('div');
            btn.className = 'color-option-item';
            btn.textContent = color;
            btn.onclick = () => {
                colorsContainer.querySelectorAll('.color-option-item').forEach(el => el.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedColor = color;
            };
            colorsContainer.appendChild(btn);
        });
    }

    // Генерация размеров
    const sizesContainer = modal.querySelector('.modal-sizes-selector');
    if (sizesContainer) {
        sizesContainer.innerHTML = '';
        Object.entries(product.sizes).forEach(([size, quantity]) => {
            const btn = document.createElement('div');
            btn.className = `size-option-item ${quantity <= 0 ? 'disabled' : ''}`;
            btn.textContent = size;
            if (quantity > 0) {
                btn.onclick = () => {
                    sizesContainer.querySelectorAll('.size-option-item').forEach(el => el.classList.remove('selected'));
                    btn.classList.add('selected');
                    state.selectedSize = size;
                };
            }
            sizesContainer.appendChild(btn);
        });
    }

    modal.classList.add('open');
    document.body.classList.add('modal-blur');
}

function updateModalImages() {
    const product = state.currentProduct;
    const mainImg = document.getElementById('modal-main-preview');
    const thumbs = document.getElementById('modal-thumbnails');
    if (!product || !mainImg || !thumbs) return;

    mainImg.src = product.images[state.currentImageIndex];
    thumbs.innerHTML = product.images.map((img, idx) => `
        <div class="thumb-wrapper ${idx === state.currentImageIndex ? 'active' : ''}" onclick="state.currentImageIndex=${idx}; updateModalImages();">
            <img src="${img}" alt="thumb">
        </div>
    `).join('');
}

function closeProductModal() {
    document.getElementById('product-detail-modal')?.classList.remove('open');
    document.body.classList.remove('modal-blur');
}

function toggleWishlist(e) {
    e.stopPropagation();
    e.currentTarget.classList.toggle('in-wishlist');
}

function debounce(func, timeout = 150) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}

// Слушатели событий формы
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();

    document.getElementById('search-input')?.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value;
        renderProducts();
    }));

    // Логика перехода К ОПЛАТЕ (Шаг 1 -> Шаг 2)
    document.getElementById('to-payment-btn')?.addEventListener('click', () => {
        if (!state.selectedColor) {
            alert("Пожалуйста, выберите ЦВЕТ товара!");
            return;
        }
        if (!state.selectedSize) {
            alert("Пожалуйста, выберите РАЗМЕР товара!");
            return;
        }

        const name = document.getElementById('order-name').value.trim();
        const phone = document.getElementById('order-phone').value.trim();
        const addr = document.getElementById('order-address').value.trim();

        if (!name || !phone || !addr) {
            alert("Заполните поля ФИО, телефон и адрес для формирования чека доставки.");
            return;
        }

        // Переключаем интерфейс на блок с реквизитами
        document.getElementById('checkout-step-fields').style.display = 'none';
        document.getElementById('checkout-step-requisites').style.display = 'block';
    });

    // Назад к изменению полей
    document.getElementById('back-to-fields-btn')?.addEventListener('click', () => {
        document.getElementById('checkout-step-fields').style.display = 'block';
        document.getElementById('checkout-step-requisites').style.display = 'none';
    });

    // Финальная отправка в Telegram
    document.getElementById('telegram-checkout-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const botToken = "8918446220:AAHVN891CgnGYXmJcqZCmKF_QKteN0LCTK8";
        const chatId = "320554605";

        const message = `
🏛️ <b>NEW LUXURY ORDER [TDK_SHOES]</b>
────────────────────────
🔥 <b>Бренд:</b> ${state.currentProduct.brand}
📦 <b>Модель:</b> ${state.currentProduct.name}
🔢 <b>Артикул:</b> ${state.currentProduct.sku}
🎨 <b>Цвет:</b> ${state.selectedColor}
📏 <b>Размер:</b> ${state.selectedSize}
────────────────────────
💰 <b>Сумма к оплате:</b> ${formatCurrency(state.currentProduct.price)}
💳 <b>Статус:</b> Ожидает проверки перевода (Kaspi)
────────────────────────
👤 <b>Покупатель:</b> ${document.getElementById('order-name').value}
📞 <b>Связь:</b> ${document.getElementById('order-phone').value}
📍 <b>Адрес в РК:</b> ${document.getElementById('order-address').value}
        `.trim();

        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        })
        .then(res => {
            if (res.ok) {
                alert("Успешно оплачено и оформлено! ✅\nБайер принял ваш заказ в обработку.");
                closeProductModal();
                document.getElementById('telegram-checkout-form').reset();
            } else {
                alert("Ошибка соединения с сервером отправки чеков.");
            }
        })
        .catch(() => alert("Проверьте подключение к интернету."));
    });
});
