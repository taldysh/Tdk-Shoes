"use strict";

require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const Database = require("better-sqlite3");
const express = require("express");
const path = require("path");

// ─── КОНФИГУРАЦИЯ СИСТЕМЫ ─────────────────────────────────────
const BOT_TOKEN      = process.env.BOT_TOKEN || "8918446220:AAHVN891CgnGYXmJcqZCmKF_QKteN0LCTK8";
const ADMIN_CHAT_ID  = process.env.ADMIN_CHAT_ID || "320554605";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "321321Tdk";
const PORT           = process.env.PORT || 3000;

if (!BOT_TOKEN) throw new Error("Критическая ошибка: BOT_TOKEN не задан!");

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// Сессия для хранения chat_id администраторов, вошедших в панель
const adminSessions = new Set(); 

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── ПОЛНАЯ БАЗА ДАННЫХ ТОВАРОВ (ВЕСЬ ТВОЙ ШМОТ) ───────────────
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
        name: "Cargo Sneaker Black Mesh & Nylon",
        sku: "739346 W2DB1-1000",
        category: "shoes",
        price: 580000,
        installment: 24160,
        images: [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Matt Black", "Dirty Grey"],
        sizes: { "41": 5, "42": 2, "43": 4, "44": 0 },
        badge: "NEW COLLECTION"
    },
    {
        id: 3,
        brand: "BALENCIAGA",
        name: "Triple S Clear Sole Grey Sneaker",
        sku: "541624 W2FB1-9000",
        category: "shoes",
        price: 495000,
        installment: 20625,
        images: [
            "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Grey Luxe", "White Cream"],
        sizes: { "40": 2, "41": 1, "42": 0 },
        badge: "BEST SELLER"
    },
    {
        id: 4,
        brand: "BALENCIAGA",
        name: "Track.2 Trainer White & Neon",
        sku: "568614 W2GN1-9000",
        category: "shoes",
        price: 530000,
        installment: 22080,
        images: [
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["White Glow", "Full Neon"],
        sizes: { "42": 4, "43": 3 },
        badge: "LIMITED"
    },
    {
        id: 5,
        brand: "BALENCIAGA",
        name: "Torba na ramię Rodeo Medium Smooth",
        sku: "783214 TZO01-1000",
        category: "bags",
        price: 1420000,
        installment: 59160,
        images: [
            "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80"
        ],
        colors: ["Black Gold", "Burgundy Luxe"],
        sizes: { "ONESIZE": 2 },
        badge: "VIP CHOICE"
    }
];

// API эндпоинт, чтобы твой сайт мог получать актуальный массив шмоток
app.get("/api/products", (req, res) => {
  res.json(PRODUCTS_DATA);
});

// ─── ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ SQLite ─────────────────────────
const db = new Database(path.join(__dirname, "orders.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_message_id INTEGER,
    brand         TEXT,
    model         TEXT,
    sku           TEXT,
    color         TEXT,
    size          TEXT,
    price         INTEGER,
    client_name   TEXT,
    client_phone  TEXT,
    client_address TEXT,
    status        TEXT DEFAULT 'pending',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT,
    phone        TEXT UNIQUE,
    address      TEXT,
    first_order  DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_orders INTEGER DEFAULT 0
  );
`);

const dbRepo = {
  saveOrder(data) {
    const stmt = db.prepare(`
      INSERT INTO orders (tg_message_id, brand, model, sku, color, size, price, client_name, client_phone, client_address, status)
      VALUES (@tg_message_id, @brand, @model, @sku, @color, @size, @price, @client_name, @client_phone, @client_address, 'pending')
    `);
    const result = stmt.run(data);
    this.upsertClient({ name: data.client_name, phone: data.client_phone, address: data.client_address });
    return result.lastInsertRowid;
  },
  updateOrderStatus(orderId, status) {
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
  },
  getAllOrders() { return db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all(); },
  getAllClients() { return db.prepare("SELECT * FROM clients ORDER BY total_orders DESC").all(); },
  getOrderStats() {
    return db.prepare(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
             SUM(CASE WHEN status = 'rejected'  THEN 1 ELSE 0 END) AS rejected,
             SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN status = 'confirmed' THEN price ELSE 0 END) AS revenue
      FROM orders
    `).get();
  },
  upsertClient({ name, phone, address }) {
    const existing = db.prepare("SELECT id FROM clients WHERE phone = ?").get(phone);
    if (existing) {
      db.prepare("UPDATE clients SET total_orders = total_orders + 1 WHERE phone = ?").run(phone);
    } else {
      db.prepare("INSERT INTO clients (name, phone, address, total_orders) VALUES (?, ?, ?, 1)").run(name, phone, address);
    }
  }
};

function formatKZT(num) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(num);
}

// ─── EXPRESS API ДЛЯ ПРИЕМА ЗАКАЗОВ С САЙТА ───────────────────
app.post("/api/new-order", async (req, res) => {
  try {
    const orderData = req.body;
    const orderId = dbRepo.saveOrder({ tg_message_id: 0, ...orderData });

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Подтвердить", `confirm_${orderId}`),
        Markup.button.callback("❌ Отклонить",   `reject_${orderId}`)
      ]
    ]);

    const adminMsg = await bot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      formatOrderForAdmin(orderId, orderData),
      { parse_mode: "HTML", ...keyboard }
    );

    db.prepare("UPDATE orders SET tg_message_id = ? WHERE id = ?").run(adminMsg.message_id, orderId);
    return res.status(200).json({ success: true, orderId });
  } catch (err) {
    console.error("Ошибка API:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
});

// ─── ЛОГИКА TELEGRAM БОТА И СКРЫТОЙ АДМИН-ПАНЕЛИ ──────────────
bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  const chatId = String(ctx.chat.id);

  // Секретный вызов панели
  if (text === "/panel") {
    if (adminSessions.has(chatId)) return showPanel(ctx);
    return ctx.reply("🔐 Введите секретный пароль для доступа к системе:");
  }

  // Проверка ввода пароля
  if (text === ADMIN_PASSWORD) {
    adminSessions.add(chatId);
    await ctx.reply("✅ Доступ разрешён!");
    return showPanel(ctx);
  }
});

// Обработка интерактивных кнопок
bot.action(/^confirm_(\d+)$/, async (ctx) => {
  const orderId = parseInt(ctx.match[1]);
  dbRepo.updateOrderStatus(orderId, "confirmed");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✅ <b>ЗАКАЗ ПОДТВЕРЖДЁН</b>", { parse_mode: "HTML" });
  await ctx.answerCbQuery("Подтверждено!");
});

bot.action(/^reject_(\d+)$/, async (ctx) => {
  const orderId = parseInt(ctx.match[1]);
  dbRepo.updateOrderStatus(orderId, "rejected");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n❌ <b>ЗАКАЗ ОТКЛОНЁН</b>", { parse_mode: "HTML" });
  await ctx.answerCbQuery("Отклонено.");
});

// ЭТИ КОМАНДЫ ДЕАКТИВИРОВАНЫ, ПОКА ПОЛЬЗОВАТЕЛЬ НЕ ВОЙДЕТ ЧЕРЕЗ /PANEL
bot.command("orders", async (ctx) => { 
  if (!adminSessions.has(String(ctx.chat.id))) return; // Полный игнор, бот "не знает" команду
  await showOrders(ctx); 
});

bot.command("clients", async (ctx) => { 
  if (!adminSessions.has(String(ctx.chat.id))) return; 
  await showClients(ctx); 
});

bot.command("stats", async (ctx) => { 
  if (!adminSessions.has(String(ctx.chat.id))) return; 
  await showStats(ctx); 
});

bot.command("logout", async (ctx) => { 
  if (!adminSessions.has(String(ctx.chat.id))) return;
  adminSessions.delete(String(ctx.chat.id)); 
  ctx.reply("👋 Вы вышли из админки. Список команд скрыт."); 
});

// Отрисовка скрытой панели управления с выручкой
async function showPanel(ctx) {
  const stats = dbRepo.getOrderStats();
  ctx.reply(`🛍️ <b>ADMIN PANEL — TDK SHOES</b>\n━━━━━━━━━━━━━━━━━━━━\n📊 Всего заказов: <b>${stats.total}</b>\n✅ Подтверждено: <b>${stats.confirmed}</b>\n⏳ Ожидают: <b>${stats.pending}</b>\n💰 <b>ВЫРУЧКА С ПРОДАЖ: ${formatKZT(stats.revenue || 0)}</b>\n━━━━━━━━━━━━━━━━━━━━\nСекретные команды доступны:\n/orders — Последние заказы\n/clients — Клиентская база\n/stats — Расширенная статистика\n/logout — Закрыть сессию`, { parse_mode: "HTML" });
}

async function showOrders(ctx) {
  const orders = dbRepo.getAllOrders().slice(0, 10);
  if (!orders.length) return ctx.reply("Заказов нет.");
  const text = orders.map(o => `<b>#${o.id}</b> | ${o.brand} ${o.model}\n👤 ${o.client_name} (${o.client_phone})\n💰 ${formatKZT(o.price)} [${o.status === 'confirmed' ? '✅' : o.status === 'rejected' ? '❌' : '⏳'}]`).join("\n\n");
  ctx.reply(`📋 <b>Последние 10 заказов:</b>\n\n${text}`, { parse_mode: "HTML" });
}

async function showClients(ctx) {
  const clients = dbRepo.getAllClients();
  if (!clients.length) return ctx.reply("Клиентов нет.");
  const text = clients.map(c => `👤 <b>${c.name}</b>\n📞 ${c.phone}\n🛒 Заказов: <b>${c.total_orders}</b>`).join("\n\n");
  ctx.reply(`👥 <b>Список клиентов:</b>\n\n${text}`, { parse_mode: "HTML" });
}

async function showStats(ctx) {
  const stats = dbRepo.getOrderStats();
  ctx.reply(`📊 <b>ДЕТАЛЬНАЯ СТАТИСТИКА</b>\n━━━━━━━━━━━━━━━━━━━━\n📦 Заказов: <b>${stats.total}</b>\n💰 Выручка интернет-магазина: <b>${formatKZT(stats.revenue || 0)}</b>`, { parse_mode: "HTML" });
}

function formatOrderForAdmin(orderId, order) {
  return `🏛️ <b>NEW LUXURY ORDER [TDK_SHOES]</b> <code>#${orderId}</code>\n────────────────────────\n🔥 <b>Бренд:</b> ${order.brand}\n📦 <b>Модель:</b> ${order.model}\n🔢 <b>Артикул:</b> ${order.sku}\n🎨 <b>Цвет:</b> ${order.color}\n📏 <b>Размер:</b> ${order.size}\n────────────────────────\n💰 <b>Сумма к оплате:</b> ${formatKZT(order.price)}\n👤 <b>Покупатель:</b> ${order.client_name}\n📞 <b>Связь:</b> ${order.client_phone}\n📍 <b>Адрес в РК:</b> ${order.client_address}`.trim();
}

// ─── ЗАПУСК ОДНОГО ОБЩЕГО СЕРВЕРА ────────────────────────────
app.listen(PORT, () => {
  console.log(`🌐 Сайт запущен на http://localhost:${PORT}`);
});

bot.launch().then(() => {
  console.log("🤖 Бот успешно запущен!");
});

process.once("SIGINT",  () => { bot.stop("SIGINT"); process.exit(0); });
process.once("SIGTERM", () => { bot.stop("SIGTERM"); process.exit(0); });
