import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class TelegramShopBot {
    
    // ===== КОНФИГУРАЦИЯ =====
    private static final String BOT_TOKEN = "8918446220:AAHVN891CgnGYXmJcqZCmKF_QKteN0LCTK8";
    private static final String ADMIN_CHAT_ID = "320554605";
    private static final String API_URL = "https://api.telegram.org/bot" + BOT_TOKEN + "/";
    
    // ===== ХРАНИЛИЩА =====
    private static Map<Long, UserSession> sessions = new ConcurrentHashMap<>();
    private static Map<Long, Order> orders = new ConcurrentHashMap<>();
    private static long nextOrderId = 1;
    
    // ===== ТОВАРЫ =====
    private static List<Product> products = new ArrayList<>();
    
    static {
        products.add(new Product(1, "BALENCIAGA", "Jasnoniebieskie jeansy z szerokimi nogawkami", 
            "871354 TDW14-4200", "jeans", 601900, 25540,
            Arrays.asList("Light Blue", "Vintage Ash"),
            new HashMap<String, Integer>() {{ put("29", 1); put("30", 3); put("31", 0); }},
            "ОСТАЛСЯ ПОСЛЕДНИЙ"));
        products.add(new Product(2, "BALENCIAGA", "Кроссовки Balenciaga Cargo Sneaker Black M",
            "739346 W2DB1-1000", "shoes", 580000, 24650,
            Arrays.asList("Matte Black", "Triple White"),
            new HashMap<String, Integer>() {{ put("41", 2); put("42", 4); put("43", 1); }},
            "NEW ARRIVAL"));
        products.add(new Product(3, "BALENCIAGA", "Массивные кроссовки Triple S Clear Sole Grey",
            "541624 W2FB1-9000", "shoes", 495000, 21000,
            Arrays.asList("Steel Grey", "Neon Yellow Edition"),
            new HashMap<String, Integer>() {{ put("39", 1); put("41", 2); put("42", 1); }},
            "BESTSELLER"));
        products.add(new Product(4, "BALENCIAGA", "Эксклюзивные кроссовки Track.2 Trainer White",
            "568614 W2GN1-9000", "shoes", 530000, 22500,
            Arrays.asList("Pure White", "Ghost Grey"),
            new HashMap<String, Integer>() {{ put("40", 2); put("42", 3); put("44", 1); }},
            null));
        products.add(new Product(5, "BALENCIAGA", "Czarna skórzana torba na ramię Rodeo",
            "783214 TZO01-1000", "bags", 1420000, 60310,
            Arrays.asList("Noir Black"),
            new HashMap<String, Integer>() {{ put("UNI", 2); }},
            null));
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    private static String formatCurrency(double num) {
        return String.format("%,.0f KZT", num).replace(",", " ");
    }
    
    private static String sendRequest(String method, String jsonBody) {
        try {
            URL url = new URL(API_URL + method);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            
            if (jsonBody != null) {
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }
            }
            
            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
            br.close();
            return response.toString();
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            return null;
        }
    }
    
    private static void sendMessage(long chatId, String text) {
        String json = String.format("{\"chat_id\":%d,\"text\":\"%s\",\"parse_mode\":\"Markdown\"}", 
            chatId, text.replace("\"", "\\\"").replace("\n", "\\n"));
        sendRequest("sendMessage", json);
    }
    
    private static void sendKeyboard(long chatId, String text, List<List<Button>> buttons) {
        StringBuilder keyboardJson = new StringBuilder();
        keyboardJson.append("{\"inline_keyboard\":[");
        for (int i = 0; i < buttons.size(); i++) {
            keyboardJson.append("[");
            for (int j = 0; j < buttons.get(i).size(); j++) {
                Button btn = buttons.get(i).get(j);
                keyboardJson.append(String.format("{\"text\":\"%s\",\"callback_data\":\"%s\"}", 
                    btn.text, btn.callbackData));
                if (j < buttons.get(i).size() - 1) keyboardJson.append(",");
            }
            keyboardJson.append("]");
            if (i < buttons.size() - 1) keyboardJson.append(",");
        }
        keyboardJson.append("]}");
        
        String json = String.format("{\"chat_id\":%d,\"text\":\"%s\",\"reply_markup\":%s}", 
            chatId, text.replace("\"", "\\\""), keyboardJson.toString());
        sendRequest("sendMessage", json);
    }
    
    private static void editMessage(long chatId, int messageId, String text, List<List<Button>> buttons) {
        StringBuilder keyboardJson = new StringBuilder();
        if (buttons != null) {
            keyboardJson.append("{\"inline_keyboard\":[");
            for (int i = 0; i < buttons.size(); i++) {
                keyboardJson.append("[");
                for (int j = 0; j < buttons.get(i).size(); j++) {
                    Button btn = buttons.get(i).get(j);
                    keyboardJson.append(String.format("{\"text\":\"%s\",\"callback_data\":\"%s\"}", 
                        btn.text, btn.callbackData));
                    if (j < buttons.get(i).size() - 1) keyboardJson.append(",");
                }
                keyboardJson.append("]");
                if (i < buttons.size() - 1) keyboardJson.append(",");
            }
            keyboardJson.append("]}");
        }
        
        String json;
        if (buttons != null) {
            json = String.format("{\"chat_id\":%d,\"message_id\":%d,\"text\":\"%s\",\"reply_markup\":%s}", 
                chatId, messageId, text.replace("\"", "\\\""), keyboardJson.toString());
        } else {
            json = String.format("{\"chat_id\":%d,\"message_id\":%d,\"text\":\"%s\"}", 
                chatId, messageId, text.replace("\"", "\\\""));
        }
        sendRequest("editMessageText", json);
    }
    
    private static void answerCallback(String callbackId, String text) {
        String json = String.format("{\"callback_query_id\":\"%s\",\"text\":\"%s\"}", callbackId, text);
        sendRequest("answerCallbackQuery", json);
    }
    
    // ===== ОБРАБОТЧИКИ =====
    private static void sendMainMenu(long chatId) {
        List<List<Button>> buttons = Arrays.asList(
            Arrays.asList(new Button("👟 Обувь", "category_shoes"), new Button("👜 Сумки", "category_bags")),
            Arrays.asList(new Button("👖 Джинсы", "category_jeans"), new Button("👕 Все товары", "category_all"))
        );
        sendKeyboard(chatId, "🛍️ Добро пожаловать в BALENCIAGA STORE!\n\nВыберите категорию:", buttons);
    }
    
    private static void showProducts(long chatId, int messageId, String category) {
        List<List<Button>> buttons = new ArrayList<>();
        for (Product p : products) {
            if (category.equals("all") || p.category.equals(category)) {
                buttons.add(Arrays.asList(new Button(p.name, "product_" + p.id)));
            }
        }
        buttons.add(Arrays.asList(new Button("🔙 Назад", "back_to_menu")));
        editMessage(chatId, messageId, "📦 Выберите товар:", buttons);
    }
    
    private static void showProduct(long chatId, int messageId, Product p, UserSession session) {
        String text = String.format("*%s* - %s\n💰 Цена: %s\n📦 Артикул: %s%s",
            p.brand, p.name, formatCurrency(p.price), p.sku, p.badge != null ? "\n🏷️ " + p.badge : "");
        
        List<List<Button>> buttons = new ArrayList<>();
        
        List<Button> colorRow = new ArrayList<>();
        for (String color : p.colors) {
            colorRow.add(new Button(color, "color_" + color));
        }
        buttons.add(colorRow);
        
        List<Button> sizeRow = new ArrayList<>();
        for (String size : p.sizes.keySet()) {
            sizeRow.add(new Button(size, "size_" + size));
        }
        buttons.add(sizeRow);
        
        buttons.add(Arrays.asList(new Button("🛒 Оформить заказ", "checkout")));
        buttons.add(Arrays.asList(new Button("🔙 Назад", "category_" + p.category)));
        
        editMessage(chatId, messageId, text, buttons);
    }
    
    private static void updateProductSelection(long chatId, int messageId, UserSession session) {
        Product p = getProductById(session.selectedProductId);
        if (p == null) return;
        
        String text = String.format("*%s* - %s\n🎨 Цвет: %s\n📏 Размер: %s\n💰 Цена: %s",
            p.brand, p.name,
            session.selectedColor != null ? session.selectedColor : "❌ не выбран",
            session.selectedSize != null ? session.selectedSize : "❌ не выбран",
            formatCurrency(p.price));
        
        List<List<Button>> buttons = Arrays.asList(
            Arrays.asList(new Button("✅ Подтвердить заказ", "checkout")),
            Arrays.asList(new Button("🔙 Назад к товару", "product_" + p.id))
        );
        
        editMessage(chatId, messageId, text + "\n\n✅ Нажмите кнопку для оформления:", buttons);
    }
    
    private static void sendOrderToAdmin(Order order) {
        String message = String.format(
            "🏛️ <b>НОВЫЙ ЗАКАЗ #%d</b>\n────────────────────────\n🔥 <b>Бренд:</b> %s\n📦 <b>Модель:</b> %s\n🎨 <b>Цвет:</b> %s\n📏 <b>Размер:</b> %s\n────────────────────────\n💰 <b>Сумма:</b> %s\n👤 <b>Покупатель:</b> %s\n📞 <b>Телефон:</b> %s\n📍 <b>Адрес:</b> %s",
            order.id, order.productBrand, order.productName, order.selectedColor, order.selectedSize,
            formatCurrency(order.totalPrice), order.userFullName, order.userPhone, order.userAddress);
        
        List<List<Button>> buttons = Arrays.asList(
            Arrays.asList(
                new Button("✅ ПРИНЯТЬ", "accept_" + order.id),
                new Button("❌ ОТКЛОНИТЬ", "reject_" + order.id)
            )
        );
        sendKeyboard(Long.parseLong(ADMIN_CHAT_ID), message, buttons);
    }
    
    private static void confirmOrder(long orderId, String status) {
        Order order = orders.get(orderId);
        if (order != null) {
            String userMessage = status.equals("accepted") 
                ? "✅ Ваш заказ #" + orderId + " принят! Ожидайте доставку."
                : "❌ Ваш заказ #" + orderId + " отклонён.";
            sendMessage(order.userId, userMessage);
        }
    }
    
    private static Product getProductById(long id) {
        for (Product p : products) {
            if (p.id == id) return p;
        }
        return null;
    }
    
    // ===== ГЛАВНЫЙ ЦИКЛ =====
    public static void main(String[] args) {
        System.out.println("🚀 Бот запущен!");
        int lastUpdateId = 0;
        
        while (true) {
            try {
                String response = sendRequest("getUpdates", String.format("{\"offset\":%d,\"timeout\":30}", lastUpdateId + 1));
                if (response != null && !response.isEmpty()) {
                    // Парсим JSON и обрабатываем обновления (упрощённо)
                    if (response.contains("\"callback_query\"")) {
                        // Извлекаем callback_data
                        int cbIdx = response.indexOf("\"callback_data\":\"");
                        if (cbIdx != -1) {
                            int endIdx = response.indexOf("\"", cbIdx + 17);
                            String cbData = response.substring(cbIdx + 17, endIdx);
                            
                            int fromIdx = response.indexOf("\"from\":{\"id\":");
                            long userId = 0;
                            if (fromIdx != -1) {
                                int idStart = response.indexOf(":", fromIdx) + 1;
                                int idEnd = response.indexOf(",", idStart);
                                userId = Long.parseLong(response.substring(idStart, idEnd));
                            }
                            
                            int msgIdIdx = response.indexOf("\"message_id\":");
                            int msgId = 0;
                            if (msgIdIdx != -1) {
                                int idStart = msgIdIdx + 13;
                                int idEnd = response.indexOf(",", idStart);
                                msgId = Integer.parseInt(response.substring(idStart, idEnd));
                            }
                            
                            int cbIdIdx = response.indexOf("\"id\":\"", response.indexOf("\"callback_query\""));
                            String cbId = "";
                            if (cbIdIdx != -1) {
                                int idStart = cbIdIdx + 6;
                                int idEnd = response.indexOf("\"", idStart);
                                cbId = response.substring(idStart, idEnd);
                            }
                            
                            handleCallback(cbData, userId, msgId, cbId);
                        }
                    } else if (response.contains("\"text\":\"/start\"")) {
                        int fromIdx = response.indexOf("\"from\":{\"id\":");
                        if (fromIdx != -1) {
                            int idStart = response.indexOf(":", fromIdx) + 1;
                            int idEnd = response.indexOf(",", idStart);
                            long userId = Long.parseLong(response.substring(idStart, idEnd));
                            sendMainMenu(userId);
                        }
                    }
                    
                    // Обновляем lastUpdateId
                    int updIdIdx = response.indexOf("\"update_id\":");
                    if (updIdIdx != -1) {
                        int idStart = updIdIdx + 12;
                        int idEnd = response.indexOf(",", idStart);
                        lastUpdateId = Integer.parseInt(response.substring(idStart, idEnd));
                    }
                }
                Thread.sleep(500);
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
            }
        }
    }
    
    private static void handleCallback(String cbData, long userId, int messageId, String cbId) {
        UserSession session = sessions.computeIfAbsent(userId, k -> new UserSession());
        
        if (cbData.equals("back_to_menu")) {
            sendMainMenu(userId);
        } else if (cbData.startsWith("category_")) {
            String category = cbData.substring(9);
            session.currentCategory = category;
            showProducts(userId, messageId, category);
        } else if (cbData.startsWith("product_")) {
            long productId = Long.parseLong(cbData.substring(8));
            session.selectedProductId = productId;
            showProduct(userId, messageId, getProductById(productId), session);
        } else if (cbData.startsWith("color_")) {
            session.selectedColor = cbData.substring(6);
            updateProductSelection(userId, messageId, session);
        } else if (cbData.startsWith("size_")) {
            session.selectedSize = cbData.substring(5);
            updateProductSelection(userId, messageId, session);
        } else if (cbData.equals("checkout")) {
            session.step = "awaiting_name";
            editMessage(userId, messageId, "📝 Введите ваше ФИО:", null);
        } else if (cbData.startsWith("accept_")) {
            long orderId = Long.parseLong(cbData.substring(7));
            confirmOrder(orderId, "accepted");
            answerCallback(cbId, "✅ Заказ принят!");
        } else if (cbData.startsWith("reject_")) {
            long orderId = Long.parseLong(cbData.substring(7));
            confirmOrder(orderId, "rejected");
            answerCallback(cbId, "❌ Заказ отклонён!");
        } else if (cbData.startsWith("order_")) {
            // Обработка выбора заказа в админ-панели
            answerCallback(cbId, "Обработка...");
        }
        
        answerCallback(cbId, "");
    }
    
    // ===== ВНУТРЕННИЕ КЛАССЫ =====
    static class Button {
        String text;
        String callbackData;
        Button(String text, String callbackData) { this.text = text; this.callbackData = callbackData; }
    }
    
    static class Product {
        long id; String brand; String name; String sku; String category;
        double price; double installment; List<String> colors; Map<String, Integer> sizes; String badge;
        Product(long id, String brand, String name, String sku, String category, double price, double installment,
                List<String> colors, Map<String, Integer> sizes, String badge) {
            this.id = id; this.brand = brand; this.name = name; this.sku = sku; this.category = category;
            this.price = price; this.installment = installment; this.colors = colors; this.sizes = sizes; this.badge = badge;
        }
    }
    
    static class Order {
        long id; long userId; String userFullName; String userPhone; String userAddress;
        String productName; String productBrand; String productSku;
        String selectedColor; String selectedSize; double totalPrice;
        Order(long id, long userId, String name, String phone, String addr, String pName, String pBrand, String pSku,
              String color, String size, double price) {
            this.id = id; this.userId = userId; this.userFullName = name; this.userPhone = phone; this.userAddress = addr;
            this.productName = pName; this.productBrand = pBrand; this.productSku = pSku;
            this.selectedColor = color; this.selectedSize = size; this.totalPrice = price;
        }
    }
    
    static class UserSession {
        String currentCategory = "all";
        Long selectedProductId;
        String selectedColor;
        String selectedSize;
        String step;
        String tempName;
        String tempPhone;
        String tempAddress;
    }
}
