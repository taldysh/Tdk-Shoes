"use strict";

const BOT_TOKEN = "8918446220:AAHVN891CgnGYXmJcqZCmKF_QKteN0LCTK8";
const ADMIN_CHAT_ID = "320554605"; // Ваш Telegram ID (администратор)
const ADMIN_PANEL_PASSWORD = "admin123"; // Пароль для входа в админ-панель

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

// ХРАНИЛИЩЕ ЗАКАЗОВ
let orders = [];
let nextOrderId = 1;

// ГЛОБАЛЬНЫЙ СТЕЙТ
const state = {
    currentCategory: 'all',
    searchQuery: '',
    selectedSize: null,
    selectedColor: null,
    currentProduct: null,
    currentImageIndex: 0,
    currentOrder: null
};

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
const formatCurrency = (num) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(num).trim();
};

const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
};

// ОТПРАВКА ЗАКАЗА АДМИНИСТРАТОРУ С КНОПКАМИ
async function sendOrderToAdmin(orderData) {
    const message = `
🏛️ <b>НОВЫЙ ЗАКАЗ #${orderData.id}</b>
────────────────────────
🔥 <b>Бренд:</b> ${orderData.brand}
📦 <b>Модель:</b> ${orderData.productName}
🔢 <b>Артикул:</b> ${orderData.sku}
🎨 <b>Цвет:</b> ${orderData.color}
📏 <b>Размер:</b> ${orderData.size}
────────────────────────
💰 <b>Сумма:</b> ${formatCurrency(orderData.price)}
👤 <b>Покупатель:</b> ${orderData.customerName}
📞 <b>Телефон:</b> ${orderData.customerPhone}
📍 <b>Адрес:</b> ${orderData.customerAddress}
────────────────────────
⏰ <b>Время:</b> ${new Date().toLocaleString()}
    `.trim();

    // Отправляем сообщение с InlineKeyboard кнопками
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "✅ ПРИНЯТЬ ЗАКАЗ", callback_data: `accept_${orderData.id}` },
                    { text: "❌ ОТКЛОНИТЬ ЗАКАЗ", callback_data: `reject_${orderData.id}` }
                ]
            ]
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (error) {
        console.error('Ошибка отправки:', error);
        return false;
    }
}

// УВЕДОМЛЕНИЕ ПОКУПАТЕЛЯ О СТАТУСЕ
async function notifyCustomer(chatId, orderId, status, customerName) {
    const message = status === 'accepted' 
        ? `✅ <b>Заказ #${orderId} ПРИНЯТ!</b>\n\nУважаемый(ая) ${customerName}, ваш заказ передан в службу доставки. Ожидайте звонка оператора в ближайшее время.`
        : `❌ <b>Заказ #${orderId} ОТКЛОНЕН</b>\n\nУважаемый(ая) ${customerName}, ваш заказ был отклонён. Свяжитесь с поддержкой для уточнения деталей.`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        });
    } catch (error) {
        console.error('Ошибка уведомления:', error);
    }
}

// ОБРАБОТКА КНОПОК ОТ ТЕЛЕГРАМ (Webhook)
// Этот код нужно запустить на сервере, но для демо можно polling
function setupTelegramWebhook() {
    // Проверяем наличие обновлений каждые 3 секунды
    let lastUpdateId = 0;
    
    async function pollUpdates() {
        try {
            const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    lastUpdateId = update.update_id;
                    
                    // Обработка callback_query (нажатие на кнопку)
                    if (update.callback_query) {
                        const callback = update.callback_query;
                        const callbackData = callback.data;
                        const adminId = callback.from.id;
                        
                        // Проверяем, что нажал администратор
                        if (adminId.toString() !== ADMIN_CHAT_ID) {
                            await answerCallbackQuery(callback.id, "⛔ У вас нет прав для этого действия!", true);
                            continue;
                        }
                        
                        if (callbackData.startsWith('accept_')) {
                            const orderId = parseInt(callbackData.split('_')[1]);
                            const order = orders.find(o => o.id === orderId);
                            
                            if (order && order.status === 'pending') {
                                order.status = 'accepted';
                                await answerCallbackQuery(callback.id, `✅ Заказ #${orderId} принят!`);
                                
                                // Уведомляем покупателя
                                if (order.customerChatId) {
                                    await notifyCustomer(order.customerChatId, orderId, 'accepted', order.customerName);
                                }
                                
                                // Обновляем сообщение у администратора
                                await editOrderMessage(callback.message, order, 'accepted');
                                updateAdminPanel();
                            } else {
                                await answerCallbackQuery(callback.id, `❌ Заказ #${orderId} уже обработан!`, true);
                            }
                        } 
                        else if (callbackData.startsWith('reject_')) {
                            const orderId = parseInt(callbackData.split('_')[1]);
                            const order = orders.find(o => o.id === orderId);
                            
                            if (order && order.status === 'pending') {
                                order.status = 'rejected';
                                await answerCallbackQuery(callback.id, `❌ Заказ #${orderId} отклонён!`);
                                
                                if (order.customerChatId) {
                                    await notifyCustomer(order.customerChatId, orderId, 'rejected', order.customerName);
                                }
                                
                                await editOrderMessage(callback.message, order, 'rejected');
                                updateAdminPanel();
                            } else {
                                await answerCallbackQuery(callback.id, `❌ Заказ #${orderId} уже обработан!`, true);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
        
        setTimeout(pollUpdates, 3000);
    }
    
    async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type':application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
        });
    }
    
    async function editOrderMessage(message, order, status) {
        const statusText = status === 'accepted' ? '✅ ПРИНЯТ' : '❌ ОТКЛОНЁН';
        const statusColor = status === 'accepted' ? 'green' : 'red';
        
        let newText = message.text.replace(/Статус: .+/, `Статус: <b style="color:${statusColor}">${statusText}</b>`);
        if (!message.text.includes('Статус:')) {
            newText += `\n\n📊 <b>Статус:</b> <b style="color:${statusColor}">${statusText}</b>`;
        }
        
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: newText,
                parse_mode: 'HTML'
            })
        });
    }
    
    pollUpdates();
}

// АДМИН-ПАНЕЛЬ (ВЕБ-ИНТЕРФЕЙС)
let adminLoggedIn = false;

function showAdminLogin() {
    const password = prompt("🔐 Введите пароль администратора:");
    if (password === ADMIN_PANEL_PASSWORD) {
        adminLoggedIn = true;
        showAdminPanel();
    } else if (password !== null) {
        alert("❌ Неверный пароль!");
    }
}

function showAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (!panel) return;
    
    panel.style.display = 'block';
    updateAdminPanel();
}

function updateAdminPanel() {
    const ordersList = document.getElementById('admin-orders-list');
    if (!ordersList) return;
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<div class="admin-empty">📭 Нет заказов</div>';
        return;
    }
    
    ordersList.innerHTML = orders.map(order => `
        <div class="admin-order-card ${order.status}">
            <div class="admin-order-header">
                <span class="admin-order-id">Заказ #${order.id}</span>
                <span class="admin-order-status status-${order.status}">
                    ${order.status === 'pending' ? '⏳ Ожидает' : order.status === 'accepted' ? '✅ Принят' : '❌ Отклонён'}
                </span>
            </div>
            <div class="admin-order-info">
                <div><strong>👤 Покупатель:</strong> ${escapeHTML(order.customerName)}</div>
                <div><strong>📞 Телефон:</strong> ${escapeHTML(order.customerPhone)}</div>
                <div><strong>📍 Адрес:</strong> ${escapeHTML(order.customerAddress)}</div>
                <div><strong>📦 Товар:</strong> ${escapeHTML(order.brand)} ${escapeHTML(order.productName)}</div>
                <div><strong>🎨 Цвет:</strong> ${order.color} | <strong>📏 Размер:</strong> ${order.size}</div>
                <div><strong>💰 Сумма:</strong> ${formatCurrency(order.price)}</div>
                <div><strong>⏰ Время:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
            </div>
            ${order.status === 'pending' ? `
                <div class="admin-order-actions">
                    <button class="admin-btn accept" onclick="processOrder(${order.id}, 'accept')">✅ Принять</button>
                    <button class="admin-btn reject" onclick="processOrder(${order.id}, 'reject')">❌ Отклонить</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function processOrder(orderId, action) {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== 'pending') return;
    
    if (action === 'accept') {
        order.status = 'accepted';
        alert(`✅ Заказ #${orderId} принят!`);
        if (order.customerChatId) {
            notifyCustomer(order.customerChatId, orderId, 'accepted', order.customerName);
        }
    } else {
        order.status = 'rejected';
        alert(`❌ Заказ #${orderId} отклонён!`);
        if (order.customerChatId) {
            notifyCustomer(order.customerChatId, orderId, 'rejected', order.customerName);
        }
    }
    
    updateAdminPanel();
}

// ОСНОВНЫЕ ФУНКЦИИ МАГАЗИНА
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

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    
    // Запускаем polling Telegram
    setupTelegramWebhook();

    // Поиск
    document.getElementById('search-input')?.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value;
        renderProducts();
    }));

    // Кнопка админ-панели
    const adminBtn = document.createElement('button');
    adminBtn.innerHTML = '👑 АДМИН ПАНЕЛЬ';
    adminBtn.id = 'admin-panel-btn';
    adminBtn.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#1a1a2e; color:white; border:none; padding:12px 20px; border-radius:30px; cursor:pointer; z-index:1000; font-weight:bold; box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    adminBtn.onclick = showAdminLogin;
    document.body.appendChild(adminBtn);
    
    // Создаём контейнер админ-панели
    const adminPanel = document.createElement('div');
    adminPanel.id = 'admin-panel';
    adminPanel.style.cssText = 'display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:90%; max-width:800px; max-height:80vh; background:#0f0f1a; border-radius:20px; padding:20px; z-index:2000; overflow-y:auto; border:1px solid #333; box-shadow:0 10px 40px rgba(0,0,0,0.5);';
    adminPanel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 style="margin:0;">👑 Админ-панель</h2>
            <button id="close-admin-panel" style="background:#333; border:none; color:white; padding:8px 15px; border-radius:20px; cursor:pointer;">✖ Закрыть</button>
        </div>
        <div id="admin-orders-list" style="display:flex; flex-direction:column; gap:15px;"></div>
    `;
    document.body.appendChild(adminPanel);
    
    document.getElementById('close-admin-panel')?.addEventListener('click', () => {
        adminPanel.style.display = 'none';
        adminLoggedIn = false;
    });

    // Оформление заказа
    document.getElementById('to-payment-btn')?.addEventListener('click', () => {
        if (!state.selectedColor) {
            alert("Пожалуйста, выберите ЦВЕТ товара!");
            return;
        }
        if (!state.selectedSize) {
            alert("Пожалуйста, выберите РАЗМЕР товара!");
            return;
        }

        const customerName = document.getElementById('order-name').value.trim();
        const customerPhone = document.getElementById('order-phone').value.trim();
        const customerAddress = document.getElementById('order-address').value.trim();

        if (!customerName || !customerPhone || !customerAddress) {
            alert("Заполните поля ФИО, телефон и адрес для формирования чека доставки.");
            return;
        }

        // Сохраняем заказ
        const newOrder = {
            id: nextOrderId++,
            brand: state.currentProduct.brand,
            productName: state.currentProduct.name,
            sku: state.currentProduct.sku,
            color: state.selectedColor,
            size: state.selectedSize,
            price: state.currentProduct.price,
            customerName: customerName,
            customerPhone: customerPhone,
            customerAddress: customerAddress,
            customerChatId: null, // Здесь можно получить chatId пользователя Telegram
            status: 'pending',
            createdAt: Date.now()
        };
        
        orders.unshift(newOrder);
        
        // Отправляем админу
        sendOrderToAdmin(newOrder);
        
        alert("✅ Заказ оформлен! Ожидайте подтверждения от администратора.");
        closeProductModal();
        
        // Очищаем форму
        document.getElementById('telegram-checkout-form').reset();
        
        updateAdminPanel();
    });
});

// Глобальные функции для админ-панели
window.processOrder = processOrder;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.toggleWishlist = toggleWishlist;
window.changeCategory = changeCategory;
window.showAdminLogin = showAdminLogin;
