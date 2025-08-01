const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

// Railway uchun port handling
const port = process.env.PORT ? parseInt(process.env.PORT) : 7777;
console.log(`🔧 Using port: ${port} (from env: ${process.env.PORT})`);
const token = process.env.TELEGRAM_BOT_TOKEN;

// Global state management
let bot = null;
let isBotRunning = false;
let retryCount = 0;
const maxRetries = 5;
const baseRetryDelay = 3000;

// Improved bot configuration with better error handling
function createBot() {
  return new TelegramBot(token, {
    polling: {
      timeout: 30,
      limit: 50,
      retryTimeout: 5000,
      autoStart: false,
      params: {
        timeout: 30,
      },
    },
    request: {
      timeout: 30000,
      connectTimeout: 30000,
      readTimeout: 30000,
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 20,
      maxFreeSockets: 5,
    },
  });
}

// Force stop any existing webhook before starting polling
async function initializeBot() {
  try {
    console.log("🤖 Bot ishga tushmoqda...");

    // Create new bot instance
    bot = createBot();

    // Stop any existing webhook
    await bot.setWebHook("");
    console.log("✅ Webhook o'chirildi");

    // Start polling
    await bot.startPolling();
    console.log("✅ Bot muvaffaqiyatli ishga tushdi!");
    isBotRunning = true;
    retryCount = 0;

    // Setup bot event handlers
    setupBotEventHandlers();
  } catch (error) {
    console.error("❌ Bot ishga tushirishda xatolik:", error);
    isBotRunning = false;

    if (retryCount < maxRetries) {
      retryCount++;
      const retryDelay = Math.min(
        baseRetryDelay * Math.pow(2, retryCount - 1),
        60000
      );
      console.log(
        `🔄 ${Math.round(
          retryDelay / 1000
        )} soniyadan keyin qayta urinish (${retryCount}/${maxRetries})...`
      );
      setTimeout(initializeBot, retryDelay);
    } else {
      console.error(
        "❌ Maksimal urinishlar soniga yetildi. Bot ishga tushmadi."
      );
      // Reset and try again after 2 minutes
      setTimeout(() => {
        retryCount = 0;
        initializeBot();
      }, 120000);
    }
  }
}

// Setup bot event handlers
function setupBotEventHandlers() {
  if (!bot) return;

  // Enhanced error handling
  bot.on("error", (error) => {
    console.error("🚫 Telegram Bot error:", error);

    // Handle specific errors
    if (
      error.message &&
      error.message.includes(
        "phone number can be requested in private chats only"
      )
    ) {
      console.log(
        "ℹ️ Phone number request attempted in non-private chat - this is expected behavior"
      );
      return;
    }

    // Handle 409 Conflict - another bot instance is running
    if (
      error.code === "ETELEGRAM" &&
      error.response &&
      error.response.statusCode === 409
    ) {
      console.error(
        "⚠️ 409 Conflict: Boshqa bot instance ishlayapti. Bot to'xtatilmoqda..."
      );
      isBotRunning = false;
      return;
    }

    // Handle network errors
    if (
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNRESET" ||
      error.code === "ENOTFOUND" ||
      error.code === "ESOCKETTIMEDOUT" ||
      error.message?.includes("timeout") ||
      error.message?.includes("socket")
    ) {
      console.error("🌐 Tarmoq xatoligi:", error.message);
      handleNetworkError();
    } else {
      console.error("⚠️ Bot xatoligi, lekin davom etmoqda:", error.message);
    }
  });

  bot.on("polling_error", (error) => {
    console.error("🚫 Telegram Bot polling error:", error);

    // Handle specific errors
    if (
      error.message &&
      error.message.includes(
        "phone number can be requested in private chats only"
      )
    ) {
      console.log(
        "ℹ️ Phone number request attempted in non-private chat - this is expected behavior"
      );
      return;
    }

    // Handle 409 Conflict
    if (
      error.code === "ETELEGRAM" &&
      error.response &&
      error.response.statusCode === 409
    ) {
      console.error(
        "⚠️ 409 Conflict: Boshqa bot instance ishlayapti. Bot to'xtatilmoqda..."
      );
      isBotRunning = false;
      return;
    }

    // Handle network errors
    if (
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNRESET" ||
      error.code === "ENOTFOUND" ||
      error.code === "ESOCKETTIMEDOUT" ||
      error.message?.includes("timeout") ||
      error.message?.includes("socket")
    ) {
      console.error("🌐 Tarmoq xatoligi:", error.message);
      handleNetworkError();
    } else {
      console.error("⚠️ Polling xatoligi, lekin davom etmoqda:", error.message);
    }
  });

  // Command handlers
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    // Check if this is a private chat
    if (chatType !== "private") {
      await safeBotCall(() =>
        bot.sendMessage(
          chatId,
          "⚠️ Bu bot faqat shaxsiy xabarlarda ishlaydi. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
        )
      );
      return;
    }

    stats.users.add(chatId);

    try {
      // Check if MongoDB is connected before attempting database operations
      if (mongoose.connection.readyState !== 1) {
        console.warn(
          "⚠️ MongoDB not connected, proceeding without database check"
        );
        // Proceed as if user doesn't exist (request phone number)
        userStates.awaitingPhoneNumber[chatId] = true;
        await safeBotCall(() =>
          bot.sendMessage(
            chatId,
            "👋 Xush kelibsiz!\n\nBotdan foydalanish uchun telefon raqamingizni yuboring:",
            {
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: "📱 Telefon raqamni yuborish",
                      request_contact: true,
                    },
                  ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            }
          )
        );
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ chatId: chatId.toString() });

      if (existingUser) {
        // User already registered
        await safeBotCall(() =>
          bot.sendMessage(
            chatId,
            "👋 Xush kelibsiz, Ayti - IT Jobs Bot!\n\nQuyidagi variantlardan birini tanlang:",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "💼 Vakansiya joylash (BEPUL)",
                      callback_data: "post_vacancy",
                    },
                  ],
                  [
                    {
                      text: "⚙️ Xizmat joylash (PULLIK)",
                      callback_data: "post_service",
                    },
                  ],
                  [{ text: "❓ Yordam", callback_data: "help" }],
                ],
              },
            }
          )
        );
      } else {
        // Request phone number
        userStates.awaitingPhoneNumber[chatId] = true;
        await safeBotCall(() =>
          bot.sendMessage(
            chatId,
            "👋 Xush kelibsiz!\n\nBotdan foydalanish uchun telefon raqamingizni yuboring:",
            {
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: "📱 Telefon raqamni yuborish",
                      request_contact: true,
                    },
                  ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            }
          )
        );
      }
    } catch (error) {
      console.error("Error in /start command:", error);
      await safeBotCall(() =>
        bot.sendMessage(
          chatId,
          "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
        )
      );
    }
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    // Check if this is a private chat
    if (chatType !== "private") {
      bot.sendMessage(
        chatId,
        "⚠️ Bu bot faqat shaxsiy xabarlarda ishlaydi. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
      );
      return;
    }

    const helpMessage = `
ℹ️ <b>Botdan qanday foydalanish</b>

💼 <b>Vakansiya joylash (BEPUL):</b>
• <b>/start</b> - Botni ishga tushirish
• Ish o'rinlari uchun bepul e'lon joylash
• Admin tasdiqlashidan keyin kanallarga chiqadi

⚙️ <b>Xizmat joylash (PULLIK):</b>
• O'z xizmatlaringizni reklama qiling
• Professional layout bilan
• To'lov talab qilinadi

📞 <b>Yordam:</b>
• Savollar uchun: @ayti_admin
• Texnik yordam: @ayti_admin

🚀 Boshlash uchun pastdagi tugmalardan birini tanlang:
    `;

    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "💼 Vakansiya joylash",
              callback_data: "post_vacancy",
            },
          ],
          [
            {
              text: "⚙️ Xizmat joylash",
              callback_data: "post_service",
            },
          ],
          [
            {
              text: "📞 Admin bilan bog'lanish",
              url: "https://t.me/ayti_admin",
            },
          ],
        ],
      },
    });
  });

  // Callback query handler
  bot.on("callback_query", async (callbackQuery) => {
    try {
      if (!callbackQuery || !callbackQuery.data) {
        console.error("Incomplete callback query", callbackQuery);
        return;
      }

      const chatId = callbackQuery.message?.chat?.id;
      const data = callbackQuery.data;

      if (!chatId) {
        console.error("No chat ID in callback query", callbackQuery);
        return;
      }

      // Check if user is in active step process
      const isInVacancyProcess = userStates.awaitingVacancy[chatId];
      const isInServiceProcess = userStates.awaitingService[chatId];
      const isAwaitingPhone = userStates.awaitingPhoneNumber[chatId];

      // If user is in active process, only allow specific actions
      if (isInVacancyProcess || isInServiceProcess || isAwaitingPhone) {
        // Only allow cancel and skip actions during active process
        if (
          data === "cancel_post" ||
          data === "cancel_service" ||
          data === "cancel_service_post" ||
          data === "skip"
        ) {
          try {
            if (data === "cancel_post") {
              await handlePostCancellation(chatId, callbackQuery);
            } else if (data === "cancel_service") {
              await handleCancelService(chatId);
            } else if (data === "cancel_service_post") {
              await handleServiceCancellation(chatId, callbackQuery);
            } else if (data === "skip") {
              await handleSkip(chatId);
            }

            // Answer the callback query to remove the loading state
            await bot.answerCallbackQuery(callbackQuery.id);
          } catch (error) {
            console.error("Error in callback handling:", error);
            await bot.answerCallbackQuery(callbackQuery.id, {
              text: "❌ Xatolik yuz berdi",
              show_alert: true,
            });
          }
          return;
        }

        // Block all other actions during active process
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: "⚠️ Avval joriy jarayonni tugatishingiz kerak!",
          show_alert: true,
        });
        return;
      }

      // Handle button clicks
      if (data === "post_vacancy") {
        userStates.postingType[chatId] = "vacancy";
        await bot.sendMessage(
          chatId,
          "🔍 E'lon turini tanlang:\n\nBoshqa soha bo'yicha e'lon uchun 🔄 Boshqa tugmasini bosing",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "👨‍💻 Frontend", callback_data: "Frontend" },
                  { text: "⚙️ Backend", callback_data: "Backend" },
                ],
                [
                  { text: "📱 Mobile", callback_data: "Mobile" },
                  { text: "🎨 Design", callback_data: "Design" },
                ],
                [
                  { text: "🔄 Boshqa", callback_data: "Other" },
                  {
                    text: "📞 Admin bilan bog'lanish",
                    url: "https://t.me/ayti_admin",
                  },
                ],
              ],
            },
          }
        );
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
          }
        );
        return;
      } else if (data === "post_service") {
        userStates.postingType[chatId] = "service";
        await showServiceTariffs(chatId);
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
          }
        );
        return;
      } else if (data === "help") {
        await bot.sendMessage(
          chatId,
          "ℹ️ Botdan qanday foydalanish:\n\n💼 <b>Vakansiya joylash (BEPUL)</b>:\n• Ish o'rinlari uchun bepul e'lon joylang\n• Admin tasdiqlashidan keyin kanallarga chiqadi\n\n⚙️ <b>Xizmat joylash (PULLIK)</b>:\n• O'z xizmatlaringizni reklama qiling\n• Professional layout bilan\n• To'lov talab qilinadi\n\nYordam uchun: @ayti_admin",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "💼 Vakansiya joylash",
                    callback_data: "post_vacancy",
                  },
                ],
                [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
              ],
            },
          }
        );
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
          }
        );
        return;
      }

      // Handle other callback data
      if (Object.keys(channels).includes(data)) {
        await handleCategorySelection(chatId, callbackQuery, data);
      } else if (data === "confirm_post") {
        await handlePostConfirmation(chatId, callbackQuery);
      } else if (data === "cancel_post") {
        await handlePostCancellation(chatId, callbackQuery);
      } else if (data === "skip") {
        await handleSkip(chatId);
      } else if (data.startsWith("accept_") || data.startsWith("reject_")) {
        await handleAdminActions(callbackQuery, data);
      } else if (data === "user_list") {
        await handleUserList(callbackQuery);
      } else if (data === "detailed_stats") {
        await handleDetailedStats(callbackQuery);
      } else if (data === "top_users") {
        await handleTopUsers(callbackQuery);
      } else if (data === "daily_stats") {
        await handleDailyStats(callbackQuery);
      } else if (data === "pending_posts") {
        await handlePendingPosts(callbackQuery);
      } else if (data.startsWith("user_page_")) {
        await handleUserPage(callbackQuery, data);
      } else if (data.startsWith("tariff_")) {
        await handleTariffSelection(chatId, data, callbackQuery);
      } else if (data === "admin_panel_button") {
        await handleAdminPanelButton(callbackQuery);
      } else if (data === "back_to_admin") {
        await handleBackToAdmin(callbackQuery);
      } else if (data === "start_service_with_tariff") {
        await handleStartServiceWithTariff(chatId);
      } else if (data === "change_tariff") {
        await showServiceTariffs(chatId);
      } else if (data === "cancel_service") {
        await handleCancelService(chatId);
      } else if (data === "confirm_service") {
        await handleServiceConfirmation(chatId, callbackQuery);
      } else if (data === "cancel_service_post") {
        await handleServiceCancellation(chatId, callbackQuery);
      } else if (data.startsWith("edit_step_")) {
        await handleEditStep(chatId, data, callbackQuery);
      } else if (data === "cancel_edit") {
        delete userStates.editingStep[chatId];
        await bot.sendMessage(chatId, "❌ Tahrirlash bekor qilindi.");
        await showEditStepSelection(chatId);
      } else if (data === "show_preview") {
        await showVacancyPreview(chatId);
      } else if (data === "edit_preview") {
        await showEditStepSelection(chatId);
      } else if (data === "back_to_preview") {
        await showVacancyPreview(chatId);
      }
    } catch (error) {
      console.error("Callback query error:", error);
      try {
        await handleCallbackError(callbackQuery, error);
      } catch (notificationError) {
        console.error("Could not send error notification:", notificationError);
      }
    }
  });

  // Message handler
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    // Check if this is a private chat for contact handling
    if (msg.contact && userStates.awaitingPhoneNumber[chatId]) {
      if (chatType !== "private") {
        bot.sendMessage(
          chatId,
          "⚠️ Telefon raqamni faqat shaxsiy xabarlarda yuborishingiz mumkin. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
        );
        return;
      }
      try {
        const phoneNumber = msg.contact.phone_number;
        const firstName = msg.from.first_name || "";
        const lastName = msg.from.last_name || "";
        const username = msg.from.username || "";

        // Check if MongoDB is connected before attempting to save
        if (mongoose.connection.readyState !== 1) {
          console.warn("⚠️ MongoDB not connected, cannot save user");
          await safeBotCall(() =>
            bot.sendMessage(
              chatId,
              "⚠️ Ma'lumotlar bazasi bilan bog'lanishda muammo bor. Iltimos, keyinroq qayta urinib ko'ring."
            )
          );
          return;
        }

        // Save user to database
        const newUser = new User({
          chatId: chatId.toString(),
          phoneNumber: phoneNumber,
          firstName: firstName,
          lastName: lastName,
          username: username,
        });

        await newUser.save();
        delete userStates.awaitingPhoneNumber[chatId];

        await safeBotCall(() =>
          bot.sendMessage(
            chatId,
            "✅ Siz muvaffaqiyatli ro'yxatdan o'tdingiz!\n\nQuyidagi variantlardan birini tanlang:",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "💼 Vakansiya joylash (BEPUL)",
                      callback_data: "post_vacancy",
                    },
                  ],
                  [
                    {
                      text: "⚙️ Xizmat joylash (PULLIK)",
                      callback_data: "post_service",
                    },
                  ],
                  [{ text: "❓ Yordam", callback_data: "help" }],
                ],
                remove_keyboard: true,
              },
            }
          )
        );
      } catch (error) {
        console.error("Error saving user:", error);
        await safeBotCall(() =>
          bot.sendMessage(
            chatId,
            "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
          )
        );
      }
      return;
    }

    if (!msg.text) {
      return;
    }

    // Check if this is a group chat and the message starts with a command
    if (chatType !== "private" && msg.text.startsWith("/")) {
      bot.sendMessage(
        chatId,
        "⚠️ Bu bot faqat shaxsiy xabarlarda ishlaydi. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
      );
      return;
    }

    // Check if user is in active step process
    const isInVacancyProcess = userStates.awaitingVacancy[chatId];
    const isInServiceProcess = userStates.awaitingService[chatId];
    const isAwaitingPhone = userStates.awaitingPhoneNumber[chatId];

    // If user is in active process, only handle step input
    if (isInVacancyProcess || isInServiceProcess || isAwaitingPhone) {
      try {
        if (userStates.editingStep[chatId] !== undefined) {
          stats.users.add(chatId);
          await handleEditInput(chatId, msg);
        } else if (userStates.awaitingVacancy[chatId]) {
          stats.users.add(chatId);
          await handleVacancyInput(chatId, msg);
        } else if (userStates.awaitingService[chatId]) {
          stats.users.add(chatId);
          await handleServiceInput(chatId, msg);
        }
      } catch (error) {
        console.error("Error handling step input:", error);
        await bot.sendMessage(
          chatId,
          "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "💼 Vakansiya joylash",
                    callback_data: "post_vacancy",
                  },
                ],
                [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
                [{ text: "❓ Yordam", callback_data: "help" }],
              ],
            },
          }
        );
        cleanup(chatId);
      }
      return;
    }

    // If not in active process, ignore regular text messages
    // Only handle commands
    if (msg.text.startsWith("/")) {
      // Handle commands here if needed
      return;
    }
  });
}

// Handle network errors
async function handleNetworkError() {
  if (!isBotRunning) return;

  console.log("🔄 Tarmoq xatoligi tufayli bot qayta ishga tushirilmoqda...");

  try {
    if (bot && bot.isPolling()) {
      await bot.stopPolling();
      console.log("✅ Bot polling to'xtatildi");
    }

    // Wait before restarting
    setTimeout(() => {
      if (isBotRunning) {
        initializeBot();
      }
    }, 5000);
  } catch (err) {
    console.error("❌ Bot to'xtatishda xatolik:", err);
    // Force restart after delay
    setTimeout(() => {
      if (isBotRunning) {
        initializeBot();
      }
    }, 10000);
  }
}

// MongoDB connection with improved error handling and reconnection logic
const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
};

let mongoRetryCount = 0;
const maxMongoRetries = 3;

async function connectToMongoDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://qiyomovabdulloh3:postvacancy_bot@cluster0.h5ujkjt.mongodb.net/postvacancy_bot",
      mongoOptions
    );
    console.log("✅ MongoDB connected successfully");
    mongoRetryCount = 0;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    mongoRetryCount++;

    if (mongoRetryCount < maxMongoRetries) {
      const retryDelay = Math.min(5000 * Math.pow(2, mongoRetryCount), 30000);
      console.log(
        `🔄 MongoDB qayta ulanish ${Math.round(
          retryDelay / 1000
        )} soniyadan keyin...`
      );
      setTimeout(connectToMongoDB, retryDelay);
    } else {
      console.error("❌ Maximum MongoDB reconnection attempts reached.");
    }
  }
}

// Initial MongoDB connection
connectToMongoDB();

// MongoDB connection events
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
  mongoRetryCount = 0;
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
  mongoRetryCount++;

  if (mongoRetryCount < maxMongoRetries) {
    console.log(
      `🔄 MongoDB reconnection attempt ${mongoRetryCount}/${maxMongoRetries} in 10 seconds...`
    );
    setTimeout(connectToMongoDB, 10000);
  } else {
    console.error("❌ Maximum MongoDB reconnection attempts reached.");
  }
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected - attempting to reconnect...");
  mongoRetryCount++;

  if (mongoRetryCount < maxMongoRetries) {
    console.log(
      `🔄 MongoDB reconnection attempt ${mongoRetryCount}/${maxMongoRetries} in 10 seconds...`
    );
    setTimeout(connectToMongoDB, 10000);
  } else {
    console.error("❌ Maximum MongoDB reconnection attempts reached.");
  }
});

// Periodic health check for bot and database
setInterval(() => {
  const botStatus = isBotRunning && bot && bot.isPolling();
  const dbStatus = mongoose.connection.readyState === 1;

  if (!botStatus && isBotRunning) {
    console.log("⚠️ Bot polling stopped - attempting to restart...");
    initializeBot();
  }

  if (!dbStatus) {
    console.log("⚠️ Database connection lost - attempting to reconnect...");
    connectToMongoDB();
  }

  console.log(
    `🔍 Health check - Bot: ${botStatus ? "✅" : "❌"}, DB: ${
      dbStatus ? "✅" : "❌"
    }`
  );
}, 60000); // Check every minute

// User Schema with statistics tracking
const userSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  firstName: String,
  lastName: String,
  username: String,
  registeredAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  // Statistics tracking
  totalVacanciesSubmitted: { type: Number, default: 0 },
  totalVacanciesApproved: { type: Number, default: 0 },
  totalVacanciesRejected: { type: Number, default: 0 },
  totalServicesSubmitted: { type: Number, default: 0 },
  totalServicesApproved: { type: Number, default: 0 },
  totalServicesRejected: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// Channel configurations
const channels = {
  Frontend: {
    username: "@frontend_vacancy",
    image: "https://i.imgur.com/YQhc6hQ.jpeg",
    displayName: "Frontend Vacancy",
  },
  Backend: {
    username: "@backend_vacancy",
    image: "https://i.imgur.com/EVkwIq0.jpeg",
    displayName: "Backend Vacancy",
  },
  Mobile: {
    username: "@mobile_vacancy",
    image: "https://i.imgur.com/LyYRNo1.jpeg",
    displayName: "Mobile Vacancy",
  },
  Design: {
    username: "@dsgn_jobs",
    image: "https://i.imgur.com/tXXY4Ay.png",
    displayName: "Design Vacancy",
  },
  Other: {
    username: "@ayti_jobs",
    image: "https://i.imgur.com/UZU3daT.jpeg",
    displayName: "Ayti - IT Jobs",
  },
};

const mainChannel = channels.Other.username;
const adminId = process.env.TELEGRAM_ADMIN_ID;

// State management
const userStates = {
  pendingPosts: {},
  awaitingVacancy: {},
  awaitingService: {},
  userSelection: {},
  awaitingContactTitle: {},
  awaitingContactType: {},
  editingStep: {},
  awaitingPhoneNumber: {},
  postingType: {},
  selectedTariff: {},
  awaitingLinkTitle: {},
};

// Statistics tracking
const stats = {
  users: new Set(),
  vacancies: 0,
  approved: 0,
  rejected: 0,
  pending: 0,
  services: 0,
  servicesApproved: 0,
  servicesRejected: 0,
  servicesPending: 0,
  totalUsers: 0,
  activeUsers: 0,
  todayUsers: 0,
  todayVacancies: 0,
  todayApproved: 0,
  todayRejected: 0,
};

const steps = [
  { label: "🏢 Lavozim nomi", required: true, example: "Flutter Developer" },
  { label: "💰 Maosh", required: true, example: "Oylik - 300$ - 1000$" },
  { label: "🏪 Idora", required: false, example: "Tech Solutions Inc." },
  {
    label: "💻 Texnologiya",
    required: false,
    example: "Flutter, Dart, Firebase",
  },
  { label: "📧 Telegram", required: false, example: "@JohnDoe" },
  {
    label: "🔗 Aloqa",
    required: false,
    example: "Email yoki Telefon raqamini kiriting",
  },
  {
    label: "🔗 Havola sarlavhasi",
    required: false,
    example: "Batafsil ma'lumot",
  },
  {
    label: "🔗 Havola URL",
    required: false,
    example: "https://example.com/vacancy",
  },
  { label: "📍 Hudud", required: false, example: "Toshkent, O'zbekiston" },
  { label: "👨‍💼 Tajriba", required: false, example: "2-3 yil tajriba" },
  { label: "🕒 Ish vaqti", required: false, example: "5/2 - 8 soat" },
  {
    label: "📝 Batafsil",
    required: false,
    example: "GraphQL bilan ishlash tajribasi afzal",
  },
];

const serviceSteps = [
  {
    label: "⚙️ Xizmat nomi",
    required: true,
    example: "Web dasturlar yaratish",
  },
  { label: "👥 Biz", required: true, example: "Software Team" },
  { label: "💼 Portfolio", required: false, example: "Portfolio ko'rish" },
  { label: "🌐 Website", required: false, example: "Bizning sayt" },
  {
    label: "🔗 Aloqa",
    required: false,
    example: "Email yoki Telefon raqamini kiriting",
  },
  {
    label: "📝 Xizmat haqida",
    required: false,
    example: "Professional web saytlar va mobil ilovalar yaratamiz",
  },
  { label: "💰 Xizmat narxi", required: true, example: "500$ dan boshlab" },
];

// Service tariffs
const serviceTariffs = {
  start: {
    name: "Start",
    price: "29.000 so'm",
    pinnedTime: "1 soat",
    feedTime: "12 soat",
    description: "Kanalda oxirgi habar bo'lib 1 soat turadi, lentada 12 soat",
  },
  pro: {
    name: "Pro",
    price: "39.000 so'm",
    pinnedTime: "1 soat",
    feedTime: "1 kun",
    description: "Kanalda oxirgi habar bo'lib 1 soat turadi, lentada 1 kun",
  },
  ultra: {
    name: "Ultra",
    price: "69.000 so'm",
    pinnedTime: "3 soat",
    feedTime: "2 kun",
    description: "Kanalda oxirgi habar bo'lib 3 soat turadi, lentada 2 kun",
  },
  custom: {
    name: "Custom",
    price: "Admin bilan kelishib",
    description: "O'zingiz hohlagandek tarif - admin bilan kelishasiz",
  },
};

// Helper functions
function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Safe bot API wrapper with timeout and retry logic
async function safeBotCall(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        apiCall(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("API timeout")), 30000)
        ),
      ]);
    } catch (error) {
      console.error(`Bot API call attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

function formatTechnologies(techString) {
  return techString
    .split(",")
    .map((tech) => `#${tech.trim().toLowerCase().replace(/\s+/g, "")}`)
    .join(" ");
}

function getCategoryText(category) {
  const channel = channels[category];
  if (!channel) return `Rasmiy kanal: ${mainChannel}`;
  return `${channel.displayName}: ${channel.username}`;
}

function getUserInfoString(user, vacancyDetails) {
  let userInfo = "<b>📤 Joylagan:</b>\n";

  if (user.username) {
    userInfo += `● Username: @${user.username}\n`;
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  if (fullName) {
    userInfo += `● Ism: ${fullName}\n`;
  }

  userInfo += `● Profil: <a href="tg://user?id=${user.id}">Profilga o'tish</a>\n`;

  if (
    vacancyDetails[steps[4].label] &&
    vacancyDetails[steps[4].label] !== "-"
  ) {
    userInfo += `● Telegram: ${vacancyDetails[steps[4].label]}\n`;
  }

  return userInfo;
}

function validatePhoneNumber(phone) {
  if (!phone) return "-";

  let cleanedPhone = phone.replace(/\D/g, "");

  if (cleanedPhone.startsWith("998")) {
    cleanedPhone = `+${cleanedPhone}`;
  } else if (cleanedPhone.length === 9) {
    cleanedPhone = `+998${cleanedPhone}`;
  } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith("998")) {
    cleanedPhone = `+${cleanedPhone}`;
  } else {
    return phone;
  }

  // Validate Uzbek phone number format
  const phoneRegex = /^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;
  const formattedPhone = cleanedPhone.replace(
    /^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/,
    "$1 $2 $3 $4 $5"
  );

  return phoneRegex.test(formattedPhone) ? formattedPhone : "invalid";
}

function validateTelegramUsername(username) {
  if (!username) return "-";

  let cleanedUsername = username.trim();
  if (!cleanedUsername.startsWith("@")) {
    cleanedUsername = `@${cleanedUsername}`;
  }

  const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;
  return usernameRegex.test(cleanedUsername) ? cleanedUsername : "invalid";
}

function formatVacancyText(vacancyDetails, techTags, categoryText) {
  let vacancyText = `${techTags}

<b>${vacancyDetails[steps[0].label]}</b>

— <b>Maosh:</b> ${vacancyDetails[steps[1].label]}`;

  // Add optional fields only if they have content and are not "-"
  const optionalFields = [
    { step: 2, label: "Idora" },
    { step: 3, label: "Texnologiya" },
    { step: 4, label: "Telegram" },
    { step: 5, label: "Aloqa" },
    { step: 8, label: "Hudud" },
    { step: 9, label: "Tajriba" },
    { step: 10, label: "Ish vaqti" },
    { step: 11, label: "Batafsil" },
  ];

  optionalFields.forEach((field) => {
    const value = vacancyDetails[steps[field.step].label];
    if (value && value !== "-" && value.trim() !== "") {
      vacancyText += `\n— <b>${field.label}:</b> ${value}`;
    }
  });

  // Handle Havola sarlavhasi and Havola URL fields specially for links (steps 6 and 7)
  const havolaTitle = vacancyDetails[steps[6].label];
  const havolaUrl = vacancyDetails[steps[7].label];

  if (havolaTitle && havolaTitle !== "-" && havolaTitle.trim() !== "") {
    if (havolaUrl && havolaUrl !== "-" && havolaUrl.trim() !== "") {
      // If both title and URL are provided, create a clickable link
      vacancyText += `\n— <b>Havola:</b> <a href="${havolaUrl}">${havolaTitle}</a>`;
    } else {
      // If only title is provided, show as regular text
      vacancyText += `\n— <b>Havola:</b> ${havolaTitle}`;
    }
  }

  vacancyText += `

➖➖➖➖

✅ Ushbu postni tanishlaringizgaham yuboring!

⚡️Rasmiy kanal: ${mainChannel}

⚡️E'lon joylash: @postvacancy_bot`;

  return vacancyText;
}

function formatServiceText(serviceDetails) {
  let serviceText = `<b>${serviceDetails[serviceSteps[0].label]}</b>

— <b>Biz:</b> ${serviceDetails[serviceSteps[1].label]}`;

  // Add optional fields only if they have content and are not "-"
  const optionalFields = [
    { step: 2, label: "Portfolio", fieldName: "💼 Portfolio" },
    { step: 3, label: "Website", fieldName: "🌐 Website" },
    { step: 4, label: "Aloqa", fieldName: "🔗 Aloqa" },
    { step: 5, label: "Xizmat haqida", fieldName: "📝 Xizmat haqida" },
  ];

  optionalFields.forEach((field) => {
    const value = serviceDetails[serviceSteps[field.step].label];
    if (value && value !== "-" && value.trim() !== "") {
      serviceText += `\n— <b>${field.label}:</b> ${value}`;
    }
  });

  // Handle Portfolio link specially
  const portfolioValue = serviceDetails[serviceSteps[2].label];
  const portfolioLink = serviceDetails["portfolio_link"];

  if (
    portfolioValue &&
    portfolioValue !== "-" &&
    portfolioValue.trim() !== ""
  ) {
    if (portfolioLink && portfolioLink !== "-" && portfolioLink.trim() !== "") {
      // Replace the regular portfolio field with clickable link
      serviceText = serviceText.replace(
        `— <b>Portfolio:</b> ${portfolioValue}`,
        `— <b>Portfolio:</b> <a href="${portfolioLink}">${portfolioValue}</a>`
      );
    }
  }

  // Handle Website link specially
  const websiteValue = serviceDetails[serviceSteps[3].label];
  const websiteLink = serviceDetails["website_link"];

  if (websiteValue && websiteValue !== "-" && websiteValue.trim() !== "") {
    if (websiteLink && websiteLink !== "-" && websiteLink.trim() !== "") {
      // Replace the regular website field with clickable link
      serviceText = serviceText.replace(
        `— <b>Website:</b> ${websiteValue}`,
        `— <b>Website:</b> <a href="${websiteLink}">${websiteValue}</a>`
      );
    }
  }

  // Add required price field
  serviceText += `\n\n— <b>Xizmat narxi:</b> ${
    serviceDetails[serviceSteps[6].label]
  }`;

  serviceText += `

➖➖➖➖

✅ Xizmatdan foydalanib qoling!

⚡️Rasmiy kanal: @ayti_jobs
⚡️O'z xizmatingizni joylang: @postvacancy_bot`;

  return serviceText;
}

console.log("✅ Bot tayyor - scheduler o'chirildi");

// Express server setup
app.get("/", (req, res) => {
  res.send("Telegram Bot is running!");
});

// Health check endpoint
app.get("/health", (req, res) => {
  const botStatus = isBotRunning && bot && bot.isPolling();
  const dbStatus = mongoose.connection.readyState === 1;

  // Determine overall status
  let overallStatus = "ok";
  if (!botStatus) {
    overallStatus = "bot_error";
  } else if (!dbStatus) {
    overallStatus = "db_error";
  }

  res.json({
    status: overallStatus,
    bot: botStatus,
    mongodb: dbStatus,
    mongodb_retry_count: mongoRetryCount,
    timestamp: new Date().toISOString(),
  });
});

// Start server and bot
let server;
try {
  server = app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    // Start bot after server is running
    initializeBot();
  });
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}

// Server error handling
if (server) {
  server.on("error", (err) => {
    console.error("❌ Server error:", err);
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${port} is already in use. Exiting...`);
      process.exit(1);
    } else {
      console.error("❌ Unknown server error. Exiting...");
      process.exit(1);
    }
  });
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Graceful shutdown...`);

  try {
    // Stop bot polling
    if (bot && bot.isPolling()) {
      await bot.stopPolling();
      console.log("✅ Bot polling stopped.");
    }

    // Close server
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log("✅ HTTP server closed.");
          resolve();
        });
      });
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed.");
    }

    console.log("✅ Graceful shutdown completed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handler functions
async function handleCategorySelection(chatId, callbackQuery, data) {
  try {
    const channel = channels[data];
    if (!channel) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Kanal topilmadi",
        show_alert: true,
      });
      return;
    }

    userStates.awaitingVacancy[chatId] = {
      currentStep: 0,
      data: {},
      category: data,
    };

    const step = steps[0];
    const message = `📝 <b>${step.label}</b>\n\n${
      step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
    }\n\n💡 Masalan: ${step.example}`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "⏭️ O'tkazib yuborish", callback_data: "skip" }],
          [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
        ],
      },
    });

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in handleCategorySelection:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handlePostConfirmation(chatId, callbackQuery) {
  try {
    const currentState = userStates.awaitingVacancy[chatId];
    if (!currentState) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Vakansiya ma'lumotlari topilmadi",
        show_alert: true,
      });
      return;
    }

    await showVacancyPreview(chatId);
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in handlePostConfirmation:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handlePostCancellation(chatId, callbackQuery) {
  try {
    cleanup(chatId);
    await bot.sendMessage(chatId, "❌ Vakansiya joylash bekor qilindi.");
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in handlePostCancellation:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handleSkip(chatId) {
  try {
    const currentState = userStates.awaitingVacancy[chatId];
    if (!currentState) {
      await bot.sendMessage(
        chatId,
        "❌ Vakansiya yaratish jarayoni topilmadi."
      );
      return;
    }

    const step = steps[currentState.currentStep];
    currentState.data[step.label] = "-";

    await bot.sendMessage(
      chatId,
      `✅ "${step.label}" o'tkazib yuborildi.\n\nKeyingi qadamga o'tamiz...`
    );
    await handleNextStep(chatId);
  } catch (error) {
    console.error("Error in handleSkip:", error);
    await bot.sendMessage(
      chatId,
      "❌ O'tkazib yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
          ],
        },
      }
    );
  }
}

async function handleNextStep(chatId) {
  try {
    const currentState = userStates.awaitingVacancy[chatId];
    if (!currentState) {
      await bot.sendMessage(
        chatId,
        "❌ Vakansiya yaratish jarayoni topilmadi."
      );
      return;
    }

    currentState.currentStep++;

    if (currentState.currentStep >= steps.length) {
      // All steps completed, show preview
      await showVacancyPreview(chatId);
      return;
    }

    const step = steps[currentState.currentStep];
    const message = `📝 <b>${step.label}</b>\n\n${
      step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
    }\n\n💡 Masalan: ${step.example}`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "⏭️ O'tkazib yuborish", callback_data: "skip" }],
          [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleNextStep:", error);
    await bot.sendMessage(
      chatId,
      "❌ Keyingi qadamga o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
          ],
        },
      }
    );
  }
}

async function showVacancyPreview(chatId) {
  try {
    const currentState = userStates.awaitingVacancy[chatId];
    if (!currentState) {
      await bot.sendMessage(chatId, "❌ Vakansiya ma'lumotlari topilmadi.");
      return;
    }

    const vacancyDetails = currentState.data;
    const categoryText = getCategoryText(currentState.category);
    const techTags = formatTechnologies(vacancyDetails[steps[3].label] || "");
    const vacancyText = formatVacancyText(
      vacancyDetails,
      techTags,
      categoryText
    );

    await bot.sendMessage(chatId, vacancyText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✏️ Tahrirlash", callback_data: "edit_preview" },
            { text: "✅ Tasdiqlash", callback_data: "confirm_post" },
            { text: "❌ Bekor qilish", callback_data: "cancel_post" },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error in showVacancyPreview:", error);
    await bot.sendMessage(
      chatId,
      "❌ Ko'rinish yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
          ],
        },
      }
    );
  }
}

async function handleVacancyInput(chatId, msg) {
  try {
    const currentState = userStates.awaitingVacancy[chatId];
    if (!currentState) {
      await bot.sendMessage(
        chatId,
        "❌ Vakansiya yaratish jarayoni topilmadi."
      );
      return;
    }

    const step = steps[currentState.currentStep];
    const input = msg.text.trim();

    // Validate input based on step
    if (step.label === "📧 Telegram") {
      const validatedUsername = validateTelegramUsername(input);
      if (validatedUsername === "invalid") {
        await bot.sendMessage(
          chatId,
          "❌ Noto'g'ri Telegram username format. Iltimos, to'g'ri formatda kiriting (masalan: @username yoki username)"
        );
        return;
      }
      currentState.data[step.label] = validatedUsername;
    } else if (step.label === "🔗 Aloqa") {
      const validatedPhone = validatePhoneNumber(input);
      if (validatedPhone === "invalid") {
        await bot.sendMessage(
          chatId,
          "❌ Noto'g'ri telefon raqam format. Iltimos, to'g'ri formatda kiriting"
        );
        return;
      }
      currentState.data[step.label] = validatedPhone;
    } else {
      currentState.data[step.label] = input;
    }

    await bot.sendMessage(
      chatId,
      `✅ "${step.label}" saqlandi: ${currentState.data[step.label]}`
    );

    await handleNextStep(chatId);
  } catch (error) {
    console.error("Error in handleVacancyInput:", error);
    await bot.sendMessage(
      chatId,
      "❌ Ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
          ],
        },
      }
    );
  }
}

function cleanup(chatId) {
  delete userStates.awaitingVacancy[chatId];
  delete userStates.awaitingService[chatId];
  delete userStates.awaitingPhoneNumber[chatId];
  delete userStates.editingStep[chatId];
  delete userStates.postingType[chatId];
  delete userStates.selectedTariff[chatId];
  delete userStates.awaitingLinkTitle[chatId];
}

async function handleCallbackError(callbackQuery, error) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  } catch (err) {
    console.error("Could not send error notification:", err);
  }
}

async function showServiceTariffs(chatId) {
  try {
    const tariffsMessage = `
💼 <b>Xizmat joylash uchun tarif tanlang:</b>

🚀 <b>Start</b> - ${serviceTariffs.start.price}
⏰ ${serviceTariffs.start.pinnedTime} | ${serviceTariffs.start.feedTime}
📝 ${serviceTariffs.start.description}

⚡️ <b>Pro</b> - ${serviceTariffs.pro.price}
⏰ ${serviceTariffs.pro.pinnedTime} | ${serviceTariffs.pro.feedTime}
📝 ${serviceTariffs.pro.description}

🔥 <b>Ultra</b> - ${serviceTariffs.ultra.price}
⏰ ${serviceTariffs.ultra.pinnedTime} | ${serviceTariffs.ultra.feedTime}
📝 ${serviceTariffs.ultra.description}

🎯 <b>Custom</b> - ${serviceTariffs.custom.price}
📝 ${serviceTariffs.custom.description}
    `;

    await bot.sendMessage(chatId, tariffsMessage, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🚀 Start", callback_data: "tariff_start" },
            { text: "⚡️ Pro", callback_data: "tariff_pro" },
          ],
          [
            { text: "🔥 Ultra", callback_data: "tariff_ultra" },
            { text: "🎯 Custom", callback_data: "tariff_custom" },
          ],
          [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in showServiceTariffs:", error);
    await bot.sendMessage(
      chatId,
      "❌ Tariflarni ko'rsatishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
    );
  }
}

async function handleAdminActions(callbackQuery, data) {
  try {
    const action = data.startsWith("accept_") ? "accept" : "reject";
    const postId = data.replace("accept_", "").replace("reject_", "");

    // Handle admin actions here
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `✅ ${action === "accept" ? "Tasdiqlandi" : "Rad etildi"}`,
      show_alert: true,
    });
  } catch (error) {
    console.error("Error in handleAdminActions:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handleUserList(callbackQuery) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "👥 Foydalanuvchilar ro'yxati - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handleUserList:", error);
  }
}

async function handleDetailedStats(callbackQuery) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "📊 Batafsil statistika - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handleDetailedStats:", error);
  }
}

async function handleTopUsers(callbackQuery) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "🏆 Top foydalanuvchilar - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handleTopUsers:", error);
  }
}

async function handleDailyStats(callbackQuery) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "📅 Kunlik statistika - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handleDailyStats:", error);
  }
}

async function handlePendingPosts(callbackQuery) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "📋 Kutilmoqda e'lonlar - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handlePendingPosts:", error);
  }
}

async function handleUserPage(callbackQuery, data) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "👤 Foydalanuvchi sahifasi - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handleUserPage:", error);
  }
}

async function handleTariffSelection(chatId, data, callbackQuery) {
  try {
    const tariff = data.replace("tariff_", "");
    userStates.selectedTariff[chatId] = tariff;

    await bot.sendMessage(
      chatId,
      `✅ "${serviceTariffs[tariff].name}" tarifi tanlandi!\n\nEndi xizmat ma'lumotlarini kiriting:`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Xizmatni boshlash",
                callback_data: "start_service_with_tariff",
              },
            ],
            [
              {
                text: "🔄 Tarifni o'zgartirish",
                callback_data: "change_tariff",
              },
            ],
            [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
          ],
        },
      }
    );

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in handleTariffSelection:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handleAdminPanelButton(callbackQuery) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "📊 Admin panel - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handleAdminPanelButton:", error);
  }
}

async function handleBackToAdmin(callbackQuery) {
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "🔙 Admin panelga qaytish - bu funksiya keyinroq qo'shiladi."
    );
  } catch (error) {
    console.error("Error in handleBackToAdmin:", error);
  }
}

async function handleStartServiceWithTariff(chatId) {
  try {
    const tariff = userStates.selectedTariff[chatId];
    if (!tariff) {
      await bot.sendMessage(
        chatId,
        "❌ Tarif tanlanmagan. Iltimos, avval tarif tanlang."
      );
      return;
    }

    userStates.awaitingService[chatId] = {
      currentStep: 0,
      data: {},
      tariff: tariff,
    };

    const step = serviceSteps[0];
    const message = `📝 <b>${step.label}</b>\n\n${
      step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
    }\n\n💡 Masalan: ${step.example}`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleStartServiceWithTariff:", error);
    await bot.sendMessage(
      chatId,
      "❌ Xizmatni boshlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
    );
  }
}

async function handleCancelService(chatId) {
  try {
    cleanup(chatId);
    await bot.sendMessage(chatId, "❌ Xizmat joylash bekor qilindi.");
  } catch (error) {
    console.error("Error in handleCancelService:", error);
    await bot.sendMessage(chatId, "❌ Bekor qilishda xatolik yuz berdi.");
  }
}

async function handleServiceInput(chatId, msg) {
  try {
    const currentState = userStates.awaitingService[chatId];
    if (!currentState) {
      await bot.sendMessage(chatId, "❌ Xizmat yaratish jarayoni topilmadi.");
      return;
    }

    const step = serviceSteps[currentState.currentStep];
    const input = msg.text.trim();

    currentState.data[step.label] = input;

    await bot.sendMessage(
      chatId,
      `✅ "${step.label}" saqlandi: ${currentState.data[step.label]}`
    );

    await handleServiceNextStep(chatId);
  } catch (error) {
    console.error("Error in handleServiceInput:", error);
    await bot.sendMessage(
      chatId,
      "❌ Ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
          ],
        },
      }
    );
  }
}

async function handleServiceNextStep(chatId) {
  try {
    const currentState = userStates.awaitingService[chatId];
    if (!currentState) {
      await bot.sendMessage(chatId, "❌ Xizmat yaratish jarayoni topilmadi.");
      return;
    }

    currentState.currentStep++;

    if (currentState.currentStep >= serviceSteps.length) {
      // All steps completed, show preview
      await showServicePreview(chatId);
      return;
    }

    const step = serviceSteps[currentState.currentStep];
    const message = `📝 <b>${step.label}</b>\n\n${
      step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
    }\n\n💡 Masalan: ${step.example}`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleServiceNextStep:", error);
    await bot.sendMessage(
      chatId,
      "❌ Keyingi qadamga o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
          ],
        },
      }
    );
  }
}

async function showServicePreview(chatId) {
  try {
    const currentState = userStates.awaitingService[chatId];
    if (!currentState) {
      await bot.sendMessage(chatId, "❌ Xizmat ma'lumotlari topilmadi.");
      return;
    }

    const serviceDetails = currentState.data;
    const serviceText = formatServiceText(serviceDetails);

    await bot.sendMessage(chatId, serviceText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: "confirm_service" },
            { text: "❌ Bekor qilish", callback_data: "cancel_service_post" },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error in showServicePreview:", error);
    await bot.sendMessage(
      chatId,
      "❌ Ko'rinish yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_service_post" }],
          ],
        },
      }
    );
  }
}

async function handleServiceConfirmation(chatId, callbackQuery) {
  try {
    const currentState = userStates.awaitingService[chatId];
    if (!currentState) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Xizmat ma'lumotlari topilmadi",
        show_alert: true,
      });
      return;
    }

    await bot.sendMessage(chatId, "✅ Xizmat muvaffaqiyatli yaratildi!");
    cleanup(chatId);
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in handleServiceConfirmation:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handleServiceCancellation(chatId, callbackQuery) {
  try {
    cleanup(chatId);
    await bot.sendMessage(chatId, "❌ Xizmat joylash bekor qilindi.");
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in handleServiceCancellation:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handleEditStep(chatId, data, callbackQuery) {
  try {
    const stepIndex = parseInt(data.replace("edit_step_", ""));

    // Validate step index
    if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= steps.length) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Noto'g'ri step indeksi",
        show_alert: true,
      });
      return;
    }

    userStates.editingStep[chatId] = stepIndex;

    const currentState = userStates.awaitingVacancy[chatId];
    const currentValue =
      currentState && currentState.data
        ? currentState.data[steps[stepIndex].label] || ""
        : "";

    const step = steps[stepIndex];
    const message = `📝 <b>${step.label}</b> ni tahrirlang:\n\n${
      step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
    }\n\n💡 Masalan: ${step.example}\n\n📋 Hozirgi qiymat: ${
      currentValue || "Bo'sh"
    }`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Bekor qilish", callback_data: "cancel_edit" }],
        ],
      },
    });

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error in handleEditStep:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

async function handleEditInput(chatId, msg) {
  try {
    const stepIndex = userStates.editingStep[chatId];
    if (stepIndex === undefined) {
      await bot.sendMessage(chatId, "❌ Tahrirlash jarayoni topilmadi.");
      return;
    }

    // Validate step index
    if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= steps.length) {
      await bot.sendMessage(chatId, "❌ Noto'g'ri step indeksi.");
      return;
    }

    const currentState = userStates.awaitingVacancy[chatId];
    if (!currentState || !currentState.data) {
      await bot.sendMessage(chatId, "❌ Vakansiya ma'lumotlari topilmadi.");
      return;
    }

    const step = steps[stepIndex];
    const input = msg.text.trim();

    // Validate input based on step
    if (step.label === "📧 Telegram") {
      const validatedUsername = validateTelegramUsername(input);
      if (validatedUsername === "invalid") {
        await bot.sendMessage(
          chatId,
          "❌ Noto'g'ri Telegram username format. Iltimos, to'g'ri formatda kiriting (masalan: @username yoki username)"
        );
        return;
      }
      currentState.data[step.label] = validatedUsername;
    } else if (step.label === "🔗 Aloqa") {
      const validatedPhone = validatePhoneNumber(input);
      if (validatedPhone === "invalid") {
        await bot.sendMessage(
          chatId,
          "❌ Noto'g'ri telefon raqam format. Iltimos, to'g'ri formatda kiriting"
        );
        return;
      }
      currentState.data[step.label] = validatedPhone;
    } else {
      currentState.data[step.label] = input;
    }

    delete userStates.editingStep[chatId];
    await bot.sendMessage(
      chatId,
      `✅ "${step.label}" yangilandi: ${currentState.data[step.label]}`
    );

    await showEditStepSelection(chatId);
  } catch (error) {
    console.error("Error in handleEditInput:", error);
    await bot.sendMessage(
      chatId,
      "❌ Tahrirlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_edit" }],
          ],
        },
      }
    );
  }
}

async function showEditStepSelection(chatId) {
  try {
    const currentState = userStates.awaitingVacancy[chatId];
    if (!currentState || !currentState.data) {
      await bot.sendMessage(chatId, "❌ Vakansiya ma'lumotlari topilmadi.");
      return;
    }

    const vacancyDetails = currentState.data;
    let stepButtons = [];

    // Create buttons in 2-row format
    for (let i = 0; i < steps.length; i += 2) {
      const row = [];

      // First button in row
      const step1 = steps[i];
      const currentValue1 = vacancyDetails[step1.label] || "Bo'sh";
      const displayValue1 =
        currentValue1.length > 10
          ? currentValue1.substring(0, 8) + "..."
          : currentValue1;
      row.push({
        text: `${step1.label}\n${displayValue1}`,
        callback_data: `edit_step_${i}`,
      });

      // Second button in row (if exists)
      if (i + 1 < steps.length) {
        const step2 = steps[i + 1];
        const currentValue2 = vacancyDetails[step2.label] || "Bo'sh";
        const displayValue2 =
          currentValue2.length > 10
            ? currentValue2.substring(0, 8) + "..."
            : currentValue2;
        row.push({
          text: `${step2.label}\n${displayValue2}`,
          callback_data: `edit_step_${i + 1}`,
        });
      }

      stepButtons.push(row);
    }

    // Add back button
    stepButtons.push([
      { text: "🔙 Orqaga qaytish", callback_data: "back_to_preview" },
    ]);

    await bot.sendMessage(chatId, "📝 Qaysi maydonni tahrirlamoqchisiz?", {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: stepButtons,
      },
    });
  } catch (error) {
    console.error("Error in showEditStepSelection:", error);
    await bot.sendMessage(
      chatId,
      "❌ Tahrirlash maydonlarini ko'rsatishda xatolik yuz berdi.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Orqaga qaytish", callback_data: "back_to_preview" }],
          ],
        },
      }
    );
  }
}
