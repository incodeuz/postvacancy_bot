// const express = require("express");
// const TelegramBot = require("node-telegram-bot-api");
// const mongoose = require("mongoose");
// require("dotenv").config();

// const app = express();
// app.use(express.json());

// // Railway uchun port handling
// const port = process.env.PORT ? parseInt(process.env.PORT) : 7777;
// console.log(`🔧 Using port: ${port} (from env: ${process.env.PORT})`);
// const token = process.env.TELEGRAM_BOT_TOKEN;

// // Global state management
// let bot = null;
// let isBotRunning = false;
// let retryCount = 0;
// const maxRetries = 5;
// const baseRetryDelay = 3000;

// // Improved bot configuration with better error handling
// function createBot() {
//   return new TelegramBot(token, {
//     polling: {
//       timeout: 30,
//       limit: 50,
//       retryTimeout: 5000,
//       autoStart: false,
//       params: {
//         timeout: 30,
//       },
//     },
//     request: {
//       timeout: 30000,
//       connectTimeout: 30000,
//       readTimeout: 30000,
//       keepAlive: true,
//       keepAliveMsecs: 1000,
//       maxSockets: 20,
//       maxFreeSockets: 5,
//     },
//   });
// }

// // Force stop any existing webhook before starting polling
// async function initializeBot() {
//   try {
//     console.log("🤖 Bot ishga tushmoqda...");

//     // Create new bot instance
//     bot = createBot();

//     // Stop any existing webhook
//     await bot.setWebHook("");
//     console.log("✅ Webhook o'chirildi");

//     // Start polling
//     await bot.startPolling();
//     console.log("✅ Bot muvaffaqiyatli ishga tushdi!");
//     isBotRunning = true;
//     retryCount = 0;

//     // Setup bot event handlers
//     setupBotEventHandlers();
//   } catch (error) {
//     console.error("❌ Bot ishga tushirishda xatolik:", error);
//     isBotRunning = false;

//     if (retryCount < maxRetries) {
//       retryCount++;
//       const retryDelay = Math.min(
//         baseRetryDelay * Math.pow(2, retryCount - 1),
//         60000
//       );
//       console.log(
//         `🔄 ${Math.round(
//           retryDelay / 1000
//         )} soniyadan keyin qayta urinish (${retryCount}/${maxRetries})...`
//       );
//       setTimeout(initializeBot, retryDelay);
//     } else {
//       console.error(
//         "❌ Maksimal urinishlar soniga yetildi. Bot ishga tushmadi."
//       );
//       // Reset and try again after 2 minutes
//       setTimeout(() => {
//         retryCount = 0;
//         initializeBot();
//       }, 120000);
//     }
//   }
// }

// // Setup bot event handlers
// function setupBotEventHandlers() {
//   if (!bot) return;

//   // Enhanced error handling
//   bot.on("error", (error) => {
//     console.error("🚫 Telegram Bot error:", error);

//     // Handle specific errors
//     if (
//       error.message &&
//       error.message.includes(
//         "phone number can be requested in private chats only"
//       )
//     ) {
//       console.log(
//         "ℹ️ Phone number request attempted in non-private chat - this is expected behavior"
//       );
//       return;
//     }

//     // Handle 409 Conflict - another bot instance is running
//     if (
//       error.code === "ETELEGRAM" &&
//       error.response &&
//       error.response.statusCode === 409
//     ) {
//       console.error(
//         "⚠️ 409 Conflict: Boshqa bot instance ishlayapti. Bot to'xtatilmoqda..."
//       );
//       isBotRunning = false;
//       return;
//     }

//     // Handle network errors
//     if (
//       error.code === "ETIMEDOUT" ||
//       error.code === "ECONNRESET" ||
//       error.code === "ENOTFOUND" ||
//       error.code === "ESOCKETTIMEDOUT" ||
//       error.message?.includes("timeout") ||
//       error.message?.includes("socket")
//     ) {
//       console.error("🌐 Tarmoq xatoligi:", error.message);
//       handleNetworkError();
//     } else {
//       console.error("⚠️ Bot xatoligi, lekin davom etmoqda:", error.message);
//     }
//   });

//   bot.on("polling_error", (error) => {
//     console.error("🚫 Telegram Bot polling error:", error);

//     // Handle specific errors
//     if (
//       error.message &&
//       error.message.includes(
//         "phone number can be requested in private chats only"
//       )
//     ) {
//       console.log(
//         "ℹ️ Phone number request attempted in non-private chat - this is expected behavior"
//       );
//       return;
//     }

//     // Handle 409 Conflict
//     if (
//       error.code === "ETELEGRAM" &&
//       error.response &&
//       error.response.statusCode === 409
//     ) {
//       console.error(
//         "⚠️ 409 Conflict: Boshqa bot instance ishlayapti. Bot to'xtatilmoqda..."
//       );
//       isBotRunning = false;
//       return;
//     }

//     // Handle network errors
//     if (
//       error.code === "ETIMEDOUT" ||
//       error.code === "ECONNRESET" ||
//       error.code === "ENOTFOUND" ||
//       error.code === "ESOCKETTIMEDOUT" ||
//       error.message?.includes("timeout") ||
//       error.message?.includes("socket")
//     ) {
//       console.error("🌐 Tarmoq xatoligi:", error.message);
//       handleNetworkError();
//     } else {
//       console.error("⚠️ Polling xatoligi, lekin davom etmoqda:", error.message);
//     }
//   });

//   // Command handlers
//   bot.onText(/\/start/, async (msg) => {
//     const chatId = msg.chat.id;
//     const chatType = msg.chat.type;

//     // Check if this is a private chat
//     if (chatType !== "private") {
//       await safeBotCall(() =>
//         bot.sendMessage(
//           chatId,
//           "⚠️ Bu bot faqat shaxsiy xabarlarda ishlaydi. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
//         )
//       );
//       return;
//     }

//     stats.users.add(chatId);

//     try {
//       // Check if MongoDB is connected before attempting database operations
//       if (mongoose.connection.readyState !== 1) {
//         console.warn(
//           "⚠️ MongoDB not connected, proceeding without database check"
//         );
//         // Proceed as if user doesn't exist (request phone number)
//         userStates.awaitingPhoneNumber[chatId] = true;
//         await safeBotCall(() =>
//           bot.sendMessage(
//             chatId,
//             "👋 Xush kelibsiz!\n\nBotdan foydalanish uchun telefon raqamingizni yuboring:",
//             {
//               reply_markup: {
//                 keyboard: [
//                   [
//                     {
//                       text: "📱 Telefon raqamni yuborish",
//                       request_contact: true,
//                     },
//                   ],
//                 ],
//                 resize_keyboard: true,
//                 one_time_keyboard: true,
//               },
//             }
//           )
//         );
//         return;
//       }

//       // Check if user already exists
//       const existingUser = await User.findOne({ chatId: chatId.toString() });

//       if (existingUser) {
//         // User already registered
//         await safeBotCall(() =>
//           bot.sendMessage(
//             chatId,
//             "👋 Xush kelibsiz, Ayti - IT Jobs Bot!\n\nQuyidagi variantlardan birini tanlang:",
//             {
//               reply_markup: {
//                 inline_keyboard: [
//                   [
//                     {
//                       text: "💼 Vakansiya joylash (BEPUL)",
//                       callback_data: "post_vacancy",
//                     },
//                   ],
//                   [
//                     {
//                       text: "⚙️ Xizmat joylash (PULLIK)",
//                       callback_data: "post_service",
//                     },
//                   ],
//                   [{ text: "❓ Yordam", callback_data: "help" }],
//                 ],
//               },
//             }
//           )
//         );
//       } else {
//         // Request phone number
//         userStates.awaitingPhoneNumber[chatId] = true;
//         await safeBotCall(() =>
//           bot.sendMessage(
//             chatId,
//             "👋 Xush kelibsiz!\n\nBotdan foydalanish uchun telefon raqamingizni yuboring:",
//             {
//               reply_markup: {
//                 keyboard: [
//                   [
//                     {
//                       text: "📱 Telefon raqamni yuborish",
//                       request_contact: true,
//                     },
//                   ],
//                 ],
//                 resize_keyboard: true,
//                 one_time_keyboard: true,
//               },
//             }
//           )
//         );
//       }
//     } catch (error) {
//       console.error("Error in /start command:", error);
//       await safeBotCall(() =>
//         bot.sendMessage(
//           chatId,
//           "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
//         )
//       );
//     }
//   });

//   bot.onText(/\/help/, async (msg) => {
//     const chatId = msg.chat.id;
//     const chatType = msg.chat.type;

//     // Check if this is a private chat
//     if (chatType !== "private") {
//       bot.sendMessage(
//         chatId,
//         "⚠️ Bu bot faqat shaxsiy xabarlarda ishlaydi. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
//       );
//       return;
//     }

//     const helpMessage = `
// ℹ️ <b>Botdan qanday foydalanish</b>

// 💼 <b>Vakansiya joylash (BEPUL):</b>
// • <b>/start</b> - Botni ishga tushirish
// • Ish o'rinlari uchun bepul e'lon joylash
// • Admin tasdiqlashidan keyin kanallarga chiqadi

// ⚙️ <b>Xizmat joylash (PULLIK):</b>
// • O'z xizmatlaringizni reklama qiling
// • Professional layout bilan
// • To'lov talab qilinadi

// 📞 <b>Yordam:</b>
// • Savollar uchun: @ayti_admin
// • Texnik yordam: @ayti_admin

// 🚀 Boshlash uchun pastdagi tugmalardan birini tanlang:
//     `;

//     await bot.sendMessage(chatId, helpMessage, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [
//             {
//               text: "💼 Vakansiya joylash",
//               callback_data: "post_vacancy",
//             },
//           ],
//           [
//             {
//               text: "⚙️ Xizmat joylash",
//               callback_data: "post_service",
//             },
//           ],
//           [
//             {
//               text: "📞 Admin bilan bog'lanish",
//               url: "https://t.me/ayti_admin",
//             },
//           ],
//         ],
//       },
//     });
//   });

//   // Callback query handler
//   bot.on("callback_query", async (callbackQuery) => {
//     try {
//       if (!callbackQuery || !callbackQuery.data) {
//         console.error("Incomplete callback query", callbackQuery);
//         return;
//       }

//       const chatId = callbackQuery.message?.chat?.id;
//       const data = callbackQuery.data;

//       if (!chatId) {
//         console.error("No chat ID in callback query", callbackQuery);
//         return;
//       }

//       // Check if user is in active step process
//       const isInVacancyProcess = userStates.awaitingVacancy[chatId];
//       const isInServiceProcess = userStates.awaitingService[chatId];
//       const isAwaitingPhone = userStates.awaitingPhoneNumber[chatId];

//       // If user is in active process, only allow specific actions
//       if (isInVacancyProcess || isInServiceProcess || isAwaitingPhone) {
//         // Only allow cancel and skip actions during active process
//         if (
//           data === "cancel_post" ||
//           data === "cancel_service" ||
//           data === "cancel_service_post" ||
//           data === "skip"
//         ) {
//           try {
//             if (data === "cancel_post") {
//               await handlePostCancellation(chatId, callbackQuery);
//             } else if (data === "cancel_service") {
//               await handleCancelService(chatId);
//             } else if (data === "cancel_service_post") {
//               await handleServiceCancellation(chatId, callbackQuery);
//             } else if (data === "skip") {
//               await handleSkip(chatId);
//             }

//             // Answer the callback query to remove the loading state
//             await bot.answerCallbackQuery(callbackQuery.id);
//           } catch (error) {
//             console.error("Error in callback handling:", error);
//             await bot.answerCallbackQuery(callbackQuery.id, {
//               text: "❌ Xatolik yuz berdi",
//               show_alert: true,
//             });
//           }
//           return;
//         }

//         // Allow preview-related actions even during active process
//         if (
//           data === "edit_preview" ||
//           data === "confirm_post" ||
//           data === "cancel_post" ||
//           data === "back_to_preview" ||
//           data.startsWith("edit_step_") ||
//           data === "cancel_edit"
//         ) {
//           // These actions are allowed during preview
//         } else {
//           // Block other actions during active process
//           await bot.answerCallbackQuery(callbackQuery.id, {
//             text: "⚠️ Avval joriy jarayonni tugatishingiz kerak!",
//             show_alert: true,
//           });
//           return;
//         }
//       }

//       // Handle button clicks
//       if (data === "post_vacancy") {
//         userStates.postingType[chatId] = "vacancy";
//         await bot.sendMessage(
//           chatId,
//           "🔍 E'lon turini tanlang:\n\nBoshqa soha bo'yicha e'lon uchun 🔄 Boshqa tugmasini bosing",
//           {
//             reply_markup: {
//               inline_keyboard: [
//                 [
//                   { text: "👨‍💻 Frontend", callback_data: "Frontend" },
//                   { text: "⚙️ Backend", callback_data: "Backend" },
//                 ],
//                 [
//                   { text: "📱 Mobile", callback_data: "Mobile" },
//                   { text: "🎨 Design", callback_data: "Design" },
//                 ],
//                 [
//                   { text: "🔄 Boshqa", callback_data: "Other" },
//                   {
//                     text: "📞 Admin bilan bog'lanish",
//                     url: "https://t.me/ayti_admin",
//                   },
//                 ],
//               ],
//             },
//           }
//         );
//         await bot.editMessageReplyMarkup(
//           { inline_keyboard: [] },
//           {
//             chat_id: chatId,
//             message_id: callbackQuery.message.message_id,
//           }
//         );
//         return;
//       } else if (data === "post_service") {
//         userStates.postingType[chatId] = "service";
//         await showServiceTariffs(chatId);
//         await bot.editMessageReplyMarkup(
//           { inline_keyboard: [] },
//           {
//             chat_id: chatId,
//             message_id: callbackQuery.message.message_id,
//           }
//         );
//         return;
//       } else if (data === "help") {
//         await bot.sendMessage(
//           chatId,
//           "ℹ️ Botdan qanday foydalanish:\n\n💼 <b>Vakansiya joylash (BEPUL)</b>:\n• Ish o'rinlari uchun bepul e'lon joylang\n• Admin tasdiqlashidan keyin kanallarga chiqadi\n\n⚙️ <b>Xizmat joylash (PULLIK)</b>:\n• O'z xizmatlaringizni reklama qiling\n• Professional layout bilan\n• To'lov talab qilinadi\n\nYordam uchun: @ayti_admin",
//           {
//             parse_mode: "HTML",
//             reply_markup: {
//               inline_keyboard: [
//                 [
//                   {
//                     text: "💼 Vakansiya joylash",
//                     callback_data: "post_vacancy",
//                   },
//                 ],
//                 [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
//               ],
//             },
//           }
//         );
//         await bot.editMessageReplyMarkup(
//           { inline_keyboard: [] },
//           {
//             chat_id: chatId,
//             message_id: callbackQuery.message.message_id,
//           }
//         );
//         return;
//       }

//       // Handle other callback data
//       if (Object.keys(channels).includes(data)) {
//         await handleCategorySelection(chatId, callbackQuery, data);
//       } else if (data === "confirm_post") {
//         await handlePostConfirmation(chatId, callbackQuery);
//       } else if (data === "cancel_post") {
//         await handlePostCancellation(chatId, callbackQuery);
//       } else if (data === "skip") {
//         await handleSkip(chatId);
//       } else if (data.startsWith("accept_") || data.startsWith("reject_")) {
//         await handleAdminActions(callbackQuery, data);
//       } else if (data === "user_list") {
//         await handleUserList(callbackQuery);
//       } else if (data === "detailed_stats") {
//         await handleDetailedStats(callbackQuery);
//       } else if (data === "top_users") {
//         await handleTopUsers(callbackQuery);
//       } else if (data === "daily_stats") {
//         await handleDailyStats(callbackQuery);
//       } else if (data === "pending_posts") {
//         await handlePendingPosts(callbackQuery);
//       } else if (data.startsWith("user_page_")) {
//         await handleUserPage(callbackQuery, data);
//       } else if (data.startsWith("tariff_")) {
//         await handleTariffSelection(chatId, data, callbackQuery);
//       } else if (data === "admin_panel_button") {
//         await handleAdminPanelButton(callbackQuery);
//       } else if (data === "back_to_admin") {
//         await handleBackToAdmin(callbackQuery);
//       } else if (data === "start_service_with_tariff") {
//         await handleStartServiceWithTariff(chatId);
//       } else if (data === "change_tariff") {
//         await showServiceTariffs(chatId);
//       } else if (data === "cancel_service") {
//         await handleCancelService(chatId);
//       } else if (data === "confirm_service") {
//         await handleServiceConfirmation(chatId, callbackQuery);
//       } else if (data === "cancel_service_post") {
//         await handleServiceCancellation(chatId, callbackQuery);
//       } else if (data.startsWith("edit_step_")) {
//         await handleEditStep(chatId, data, callbackQuery);
//       } else if (data === "cancel_edit") {
//         delete userStates.editingStep[chatId];
//         await bot.sendMessage(chatId, "❌ Tahrirlash bekor qilindi.");
//         await showEditStepSelection(chatId);
//       } else if (data === "show_preview") {
//         await showVacancyPreview(chatId);
//       } else if (data === "edit_preview") {
//         await showEditStepSelection(chatId);
//       } else if (data === "back_to_preview") {
//         await showVacancyPreview(chatId);
//       }
//     } catch (error) {
//       console.error("Callback query error:", error);
//       try {
//         await handleCallbackError(callbackQuery, error);
//       } catch (notificationError) {
//         console.error("Could not send error notification:", notificationError);
//       }
//     }
//   });

//   // Message handler
//   bot.on("message", async (msg) => {
//     const chatId = msg.chat.id;
//     const chatType = msg.chat.type;

//     // Check if this is a private chat for contact handling
//     if (msg.contact && userStates.awaitingPhoneNumber[chatId]) {
//       if (chatType !== "private") {
//         bot.sendMessage(
//           chatId,
//           "⚠️ Telefon raqamni faqat shaxsiy xabarlarda yuborishingiz mumkin. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
//         );
//         return;
//       }
//       try {
//         const phoneNumber = msg.contact.phone_number;
//         const firstName = msg.from.first_name || "";
//         const lastName = msg.from.last_name || "";
//         const username = msg.from.username || "";

//         // Check if MongoDB is connected before attempting to save
//         if (mongoose.connection.readyState !== 1) {
//           console.warn("⚠️ MongoDB not connected, cannot save user");
//           await safeBotCall(() =>
//             bot.sendMessage(
//               chatId,
//               "⚠️ Ma'lumotlar bazasi bilan bog'lanishda muammo bor. Iltimos, keyinroq qayta urinib ko'ring."
//             )
//           );
//           return;
//         }

//         // Save user to database
//         const newUser = new User({
//           chatId: chatId.toString(),
//           phoneNumber: phoneNumber,
//           firstName: firstName,
//           lastName: lastName,
//           username: username,
//         });

//         await newUser.save();
//         delete userStates.awaitingPhoneNumber[chatId];

//         await safeBotCall(() =>
//           bot.sendMessage(
//             chatId,
//             "✅ Siz muvaffaqiyatli ro'yxatdan o'tdingiz!\n\nQuyidagi variantlardan birini tanlang:",
//             {
//               reply_markup: {
//                 inline_keyboard: [
//                   [
//                     {
//                       text: "💼 Vakansiya joylash (BEPUL)",
//                       callback_data: "post_vacancy",
//                     },
//                   ],
//                   [
//                     {
//                       text: "⚙️ Xizmat joylash (PULLIK)",
//                       callback_data: "post_service",
//                     },
//                   ],
//                   [{ text: "❓ Yordam", callback_data: "help" }],
//                 ],
//                 remove_keyboard: true,
//               },
//             }
//           )
//         );
//       } catch (error) {
//         console.error("Error saving user:", error);
//         await safeBotCall(() =>
//           bot.sendMessage(
//             chatId,
//             "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
//           )
//         );
//       }
//       return;
//     }

//     if (!msg.text) {
//       return;
//     }

//     // Check if this is a group chat and the message starts with a command
//     if (chatType !== "private" && msg.text.startsWith("/")) {
//       bot.sendMessage(
//         chatId,
//         "⚠️ Bu bot faqat shaxsiy xabarlarda ishlaydi. Iltimos, bot bilan to'g'ridan-to'g'ri xabar yozing: @ayti_jobs_bot"
//       );
//       return;
//     }

//     // Check if user is in active step process
//     const isInVacancyProcess = userStates.awaitingVacancy[chatId];
//     const isInServiceProcess = userStates.awaitingService[chatId];
//     const isAwaitingPhone = userStates.awaitingPhoneNumber[chatId];

//     // If user is in active process, only handle step input
//     if (isInVacancyProcess || isInServiceProcess || isAwaitingPhone) {
//       try {
//         if (userStates.editingStep[chatId] !== undefined) {
//           stats.users.add(chatId);
//           await handleEditInput(chatId, msg);
//         } else if (userStates.awaitingVacancy[chatId]) {
//           stats.users.add(chatId);
//           await handleVacancyInput(chatId, msg);
//         } else if (userStates.awaitingService[chatId]) {
//           stats.users.add(chatId);
//           await handleServiceInput(chatId, msg);
//         }
//       } catch (error) {
//         console.error("Error handling step input:", error);
//         await bot.sendMessage(
//           chatId,
//           "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//           {
//             reply_markup: {
//               inline_keyboard: [
//                 [
//                   {
//                     text: "💼 Vakansiya joylash",
//                     callback_data: "post_vacancy",
//                   },
//                 ],
//                 [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
//                 [{ text: "❓ Yordam", callback_data: "help" }],
//               ],
//             },
//           }
//         );
//         cleanup(chatId);
//       }
//       return;
//     }

//     // If not in active process, ignore regular text messages
//     // Only handle commands
//     if (msg.text.startsWith("/")) {
//       // Handle commands here if needed
//       return;
//     }
//   });
// }

// // Handle network errors
// async function handleNetworkError() {
//   if (!isBotRunning) return;

//   console.log("🔄 Tarmoq xatoligi tufayli bot qayta ishga tushirilmoqda...");

//   try {
//     if (bot && bot.isPolling()) {
//       await bot.stopPolling();
//       console.log("✅ Bot polling to'xtatildi");
//     }

//     // Wait before restarting
//     setTimeout(() => {
//       if (isBotRunning) {
//         initializeBot();
//       }
//     }, 5000);
//   } catch (err) {
//     console.error("❌ Bot to'xtatishda xatolik:", err);
//     // Force restart after delay
//     setTimeout(() => {
//       if (isBotRunning) {
//         initializeBot();
//       }
//     }, 10000);
//   }
// }

// // MongoDB connection with improved error handling and reconnection logic
// const mongoOptions = {
//   serverSelectionTimeoutMS: 30000,
//   socketTimeoutMS: 30000,
//   connectTimeoutMS: 30000,
//   maxPoolSize: 10,
//   minPoolSize: 1,
//   maxIdleTimeMS: 30000,
//   retryWrites: true,
//   retryReads: true,
//   heartbeatFrequencyMS: 10000,
// };

// let mongoRetryCount = 0;
// const maxMongoRetries = 3;

// async function connectToMongoDB() {
//   try {
//     await mongoose.connect(
//       process.env.MONGODB_URI ||
//         "mongodb+srv://qiyomovabdulloh3:postvacancy_bot@cluster0.h5ujkjt.mongodb.net/postvacancy_bot",
//       mongoOptions
//     );
//     console.log("✅ MongoDB connected successfully");
//     mongoRetryCount = 0;
//   } catch (error) {
//     console.error("❌ MongoDB connection error:", error);
//     mongoRetryCount++;

//     if (mongoRetryCount < maxMongoRetries) {
//       const retryDelay = Math.min(5000 * Math.pow(2, mongoRetryCount), 30000);
//       console.log(
//         `🔄 MongoDB qayta ulanish ${Math.round(
//           retryDelay / 1000
//         )} soniyadan keyin...`
//       );
//       setTimeout(connectToMongoDB, retryDelay);
//     } else {
//       console.error("❌ Maximum MongoDB reconnection attempts reached.");
//     }
//   }
// }

// // Initial MongoDB connection
// connectToMongoDB();

// // MongoDB connection events
// mongoose.connection.on("connected", () => {
//   console.log("✅ MongoDB connected successfully");
//   mongoRetryCount = 0;
// });

// mongoose.connection.on("error", (err) => {
//   console.error("❌ MongoDB connection error:", err);
//   mongoRetryCount++;

//   if (mongoRetryCount < maxMongoRetries) {
//     console.log(
//       `🔄 MongoDB reconnection attempt ${mongoRetryCount}/${maxMongoRetries} in 10 seconds...`
//     );
//     setTimeout(connectToMongoDB, 10000);
//   } else {
//     console.error("❌ Maximum MongoDB reconnection attempts reached.");
//   }
// });

// mongoose.connection.on("disconnected", () => {
//   console.log("⚠️ MongoDB disconnected - attempting to reconnect...");
//   mongoRetryCount++;

//   if (mongoRetryCount < maxMongoRetries) {
//     console.log(
//       `🔄 MongoDB reconnection attempt ${mongoRetryCount}/${maxMongoRetries} in 10 seconds...`
//     );
//     setTimeout(connectToMongoDB, 10000);
//   } else {
//     console.error("❌ Maximum MongoDB reconnection attempts reached.");
//   }
// });

// // Periodic health check for bot and database
// setInterval(() => {
//   const botStatus = isBotRunning && bot && bot.isPolling();
//   const dbStatus = mongoose.connection.readyState === 1;

//   if (!botStatus && isBotRunning) {
//     console.log("⚠️ Bot polling stopped - attempting to restart...");
//     initializeBot();
//   }

//   if (!dbStatus) {
//     console.log("⚠️ Database connection lost - attempting to reconnect...");
//     connectToMongoDB();
//   }

//   console.log(
//     `🔍 Health check - Bot: ${botStatus ? "✅" : "❌"}, DB: ${
//       dbStatus ? "✅" : "❌"
//     }`
//   );
// }, 60000); // Check every minute

// // User Schema with statistics tracking
// const userSchema = new mongoose.Schema({
//   chatId: { type: String, required: true, unique: true },
//   phoneNumber: { type: String, required: true },
//   firstName: String,
//   lastName: String,
//   username: String,
//   registeredAt: { type: Date, default: Date.now },
//   isActive: { type: Boolean, default: true },
//   // Statistics tracking
//   totalVacanciesSubmitted: { type: Number, default: 0 },
//   totalVacanciesApproved: { type: Number, default: 0 },
//   totalVacanciesRejected: { type: Number, default: 0 },
//   totalServicesSubmitted: { type: Number, default: 0 },
//   totalServicesApproved: { type: Number, default: 0 },
//   totalServicesRejected: { type: Number, default: 0 },
//   lastActivity: { type: Date, default: Date.now },
// });

// const User = mongoose.model("User", userSchema);

// // Channel configurations
// const channels = {
//   Frontend: {
//     username: "@frontend_vacancy",
//     image: "https://i.imgur.com/YQhc6hQ.jpeg",
//     displayName: "Frontend Vacancy",
//   },
//   Backend: {
//     username: "@backend_vacancy",
//     image: "https://i.imgur.com/EVkwIq0.jpeg",
//     displayName: "Backend Vacancy",
//   },
//   Mobile: {
//     username: "@mobile_vacancy",
//     image: "https://i.imgur.com/LyYRNo1.jpeg",
//     displayName: "Mobile Vacancy",
//   },
//   Design: {
//     username: "@dsgn_jobs",
//     image: "https://i.imgur.com/tXXY4Ay.png",
//     displayName: "Design Vacancy",
//   },
//   Other: {
//     username: "@ayti_jobs",
//     image: "https://i.imgur.com/UZU3daT.jpeg",
//     displayName: "Ayti - IT Jobs",
//   },
// };

// const mainChannel = channels.Other.username;
// const adminId = process.env.TELEGRAM_ADMIN_ID;

// // State management
// const userStates = {
//   pendingPosts: {},
//   awaitingVacancy: {},
//   awaitingService: {},
//   userSelection: {},
//   awaitingContactTitle: {},
//   awaitingContactType: {},
//   editingStep: {},
//   awaitingPhoneNumber: {},
//   postingType: {},
//   selectedTariff: {},
//   awaitingLinkTitle: {},
// };

// // Statistics tracking
// const stats = {
//   users: new Set(),
//   vacancies: 0,
//   approved: 0,
//   rejected: 0,
//   pending: 0,
//   services: 0,
//   servicesApproved: 0,
//   servicesRejected: 0,
//   servicesPending: 0,
//   totalUsers: 0,
//   activeUsers: 0,
//   todayUsers: 0,
//   todayVacancies: 0,
//   todayApproved: 0,
//   todayRejected: 0,
// };

// const steps = [
//   { label: "🏢 Lavozim nomi", required: true, example: "Flutter Developer" },
//   { label: "💰 Maosh", required: true, example: "Oylik - 300$ - 1000$" },
//   { label: "🏪 Idora", required: false, example: "Tech Solutions Inc." },
//   {
//     label: "💻 Texnologiya",
//     required: false,
//     example: "Flutter, Dart, Firebase",
//   },
//   { label: "📧 Telegram", required: false, example: "@JohnDoe" },
//   {
//     label: "🔗 Aloqa",
//     required: false,
//     example: "Email yoki Telefon raqamini kiriting",
//   },
//   {
//     label: "🔗 Havola sarlavhasi",
//     required: false,
//     example: "Batafsil ma'lumot",
//   },
//   {
//     label: "🔗 Havola URL",
//     required: false,
//     example: "https://example.com/vacancy",
//   },
//   { label: "📍 Hudud", required: false, example: "Toshkent, O'zbekiston" },
//   { label: "👨‍💼 Tajriba", required: false, example: "2-3 yil tajriba" },
//   { label: "🕒 Ish vaqti", required: false, example: "5/2 - 8 soat" },
//   {
//     label: "📝 Batafsil",
//     required: false,
//     example: "GraphQL bilan ishlash tajribasi afzal",
//   },
// ];

// const serviceSteps = [
//   {
//     label: "⚙️ Xizmat nomi",
//     required: true,
//     example: "Web dasturlar yaratish",
//   },
//   { label: "👥 Biz", required: true, example: "Software Team" },
//   { label: "💼 Portfolio", required: false, example: "Portfolio ko'rish" },
//   { label: "🌐 Website", required: false, example: "Bizning sayt" },
//   {
//     label: "🔗 Aloqa",
//     required: false,
//     example: "Email yoki Telefon raqamini kiriting",
//   },
//   {
//     label: "📝 Xizmat haqida",
//     required: false,
//     example: "Professional web saytlar va mobil ilovalar yaratamiz",
//   },
//   { label: "💰 Xizmat narxi", required: true, example: "500$ dan boshlab" },
// ];

// // Service tariffs
// const serviceTariffs = {
//   start: {
//     name: "Start",
//     price: "29.000 so'm",
//     pinnedTime: "1 soat",
//     feedTime: "12 soat",
//     description: "Kanalda oxirgi habar bo'lib 1 soat turadi, lentada 12 soat",
//   },
//   pro: {
//     name: "Pro",
//     price: "39.000 so'm",
//     pinnedTime: "1 soat",
//     feedTime: "1 kun",
//     description: "Kanalda oxirgi habar bo'lib 1 soat turadi, lentada 1 kun",
//   },
//   ultra: {
//     name: "Ultra",
//     price: "69.000 so'm",
//     pinnedTime: "3 soat",
//     feedTime: "2 kun",
//     description: "Kanalda oxirgi habar bo'lib 3 soat turadi, lentada 2 kun",
//   },
//   custom: {
//     name: "Custom",
//     price: "Admin bilan kelishib",
//     description: "O'zingiz hohlagandek tarif - admin bilan kelishasiz",
//   },
// };

// // Helper functions
// function escapeHTML(text) {
//   return text
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#39;");
// }

// // Safe bot API wrapper with timeout and retry logic
// async function safeBotCall(apiCall, maxRetries = 3) {
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       return await Promise.race([
//         apiCall(),
//         new Promise((_, reject) =>
//           setTimeout(() => reject(new Error("API timeout")), 30000)
//         ),
//       ]);
//     } catch (error) {
//       console.error(`Bot API call attempt ${attempt} failed:`, error.message);

//       if (attempt === maxRetries) {
//         throw error;
//       }

//       // Wait before retry with exponential backoff
//       const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
//       await new Promise((resolve) => setTimeout(resolve, delay));
//     }
//   }
// }

// function formatTechnologies(techString) {
//   return techString
//     .split(",")
//     .map((tech) => `#${tech.trim().toLowerCase().replace(/\s+/g, "")}`)
//     .join(" ");
// }

// function getCategoryText(category) {
//   const channel = channels[category];
//   if (!channel) return `Rasmiy kanal: ${mainChannel}`;
//   return `${channel.displayName}: ${channel.username}`;
// }

// function getUserInfoString(user, vacancyDetails) {
//   let userInfo = "<b>📤 Joylagan:</b>\n";

//   if (user.username) {
//     userInfo += `● Username: @${user.username}\n`;
//   }

//   const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
//   if (fullName) {
//     userInfo += `● Ism: ${fullName}\n`;
//   }

//   userInfo += `● Profil: <a href="tg://user?id=${user.id}">Profilga o'tish</a>\n`;

//   if (
//     vacancyDetails[steps[4].label] &&
//     vacancyDetails[steps[4].label] !== "-"
//   ) {
//     userInfo += `● Telegram: ${vacancyDetails[steps[4].label]}\n`;
//   }

//   return userInfo;
// }

// function validatePhoneNumber(phone) {
//   if (!phone) return "-";

//   let cleanedPhone = phone.replace(/\D/g, "");

//   if (cleanedPhone.startsWith("998")) {
//     cleanedPhone = `+${cleanedPhone}`;
//   } else if (cleanedPhone.length === 9) {
//     cleanedPhone = `+998${cleanedPhone}`;
//   } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith("998")) {
//     cleanedPhone = `+${cleanedPhone}`;
//   } else {
//     return phone;
//   }

//   // Validate Uzbek phone number format
//   const phoneRegex = /^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;
//   const formattedPhone = cleanedPhone.replace(
//     /^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/,
//     "$1 $2 $3 $4 $5"
//   );

//   return phoneRegex.test(formattedPhone) ? formattedPhone : "invalid";
// }

// function validateTelegramUsername(username) {
//   if (!username) return "-";

//   let cleanedUsername = username.trim();
//   if (!cleanedUsername.startsWith("@")) {
//     cleanedUsername = `@${cleanedUsername}`;
//   }

//   const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;
//   return usernameRegex.test(cleanedUsername) ? cleanedUsername : "invalid";
// }

// function formatVacancyText(vacancyDetails, techTags, categoryText) {
//   let vacancyText = `${techTags}

// <b>${vacancyDetails[steps[0].label]}</b>

// — <b>Maosh:</b> ${vacancyDetails[steps[1].label]}`;

//   // Add optional fields only if they have content and are not "-"
//   const optionalFields = [
//     { step: 2, label: "Idora" },
//     { step: 3, label: "Texnologiya" },
//     { step: 4, label: "Telegram" },
//     { step: 5, label: "Aloqa" },
//     { step: 8, label: "Hudud" },
//     { step: 9, label: "Tajriba" },
//     { step: 10, label: "Ish vaqti" },
//     { step: 11, label: "Batafsil" },
//   ];

//   optionalFields.forEach((field) => {
//     const value = vacancyDetails[steps[field.step].label];
//     if (value && value !== "-" && value.trim() !== "") {
//       vacancyText += `\n— <b>${field.label}:</b> ${value}`;
//     }
//   });

//   // Handle Havola sarlavhasi and Havola URL fields specially for links (steps 6 and 7)
//   const havolaTitle = vacancyDetails[steps[6].label];
//   const havolaUrl = vacancyDetails[steps[7].label];

//   if (havolaTitle && havolaTitle !== "-" && havolaTitle.trim() !== "") {
//     if (havolaUrl && havolaUrl !== "-" && havolaUrl.trim() !== "") {
//       // If both title and URL are provided, create a clickable link
//       vacancyText += `\n— <b>Havola:</b> <a href="${havolaUrl}">${havolaTitle}</a>`;
//     } else {
//       // If only title is provided, show as regular text
//       vacancyText += `\n— <b>Havola:</b> ${havolaTitle}`;
//     }
//   }

//   vacancyText += `

// ➖➖➖➖

// ✅ Ushbu postni tanishlaringizgaham yuboring!

// ⚡️Rasmiy kanal: ${mainChannel}

// ⚡️E'lon joylash: @postvacancy_bot`;

//   return vacancyText;
// }

// function formatServiceText(serviceDetails) {
//   let serviceText = `<b>${serviceDetails[serviceSteps[0].label]}</b>

// — <b>Biz:</b> ${serviceDetails[serviceSteps[1].label]}`;

//   // Add optional fields only if they have content and are not "-"
//   const optionalFields = [
//     { step: 2, label: "Portfolio", fieldName: "💼 Portfolio" },
//     { step: 3, label: "Website", fieldName: "🌐 Website" },
//     { step: 4, label: "Aloqa", fieldName: "🔗 Aloqa" },
//     { step: 5, label: "Xizmat haqida", fieldName: "📝 Xizmat haqida" },
//   ];

//   optionalFields.forEach((field) => {
//     const value = serviceDetails[serviceSteps[field.step].label];
//     if (value && value !== "-" && value.trim() !== "") {
//       serviceText += `\n— <b>${field.label}:</b> ${value}`;
//     }
//   });

//   // Handle Portfolio link specially
//   const portfolioValue = serviceDetails[serviceSteps[2].label];
//   const portfolioLink = serviceDetails["portfolio_link"];

//   if (
//     portfolioValue &&
//     portfolioValue !== "-" &&
//     portfolioValue.trim() !== ""
//   ) {
//     if (portfolioLink && portfolioLink !== "-" && portfolioLink.trim() !== "") {
//       // Replace the regular portfolio field with clickable link
//       serviceText = serviceText.replace(
//         `— <b>Portfolio:</b> ${portfolioValue}`,
//         `— <b>Portfolio:</b> <a href="${portfolioLink}">${portfolioValue}</a>`
//       );
//     }
//   }

//   // Handle Website link specially
//   const websiteValue = serviceDetails[serviceSteps[3].label];
//   const websiteLink = serviceDetails["website_link"];

//   if (websiteValue && websiteValue !== "-" && websiteValue.trim() !== "") {
//     if (websiteLink && websiteLink !== "-" && websiteLink.trim() !== "") {
//       // Replace the regular website field with clickable link
//       serviceText = serviceText.replace(
//         `— <b>Website:</b> ${websiteValue}`,
//         `— <b>Website:</b> <a href="${websiteLink}">${websiteValue}</a>`
//       );
//     }
//   }

//   // Add required price field
//   serviceText += `\n\n— <b>Xizmat narxi:</b> ${
//     serviceDetails[serviceSteps[6].label]
//   }`;

//   serviceText += `

// ➖➖➖➖

// ✅ Xizmatdan foydalanib qoling!

// ⚡️Rasmiy kanal: @ayti_jobs
// ⚡️O'z xizmatingizni joylang: @postvacancy_bot`;

//   return serviceText;
// }

// console.log("✅ Bot tayyor - scheduler o'chirildi");

// // Express server setup
// app.get("/", (req, res) => {
//   res.send("Telegram Bot is running!");
// });

// // Health check endpoint
// app.get("/health", (req, res) => {
//   const botStatus = isBotRunning && bot && bot.isPolling();
//   const dbStatus = mongoose.connection.readyState === 1;

//   // Determine overall status
//   let overallStatus = "ok";
//   if (!botStatus) {
//     overallStatus = "bot_error";
//   } else if (!dbStatus) {
//     overallStatus = "db_error";
//   }

//   res.json({
//     status: overallStatus,
//     bot: botStatus,
//     mongodb: dbStatus,
//     mongodb_retry_count: mongoRetryCount,
//     timestamp: new Date().toISOString(),
//   });
// });

// // Start server and bot
// let server;
// try {
//   server = app.listen(port, () => {
//     console.log(`🚀 Server is running on port ${port}`);
//     // Start bot after server is running
//     initializeBot();
//   });
// } catch (error) {
//   console.error("❌ Failed to start server:", error);
//   process.exit(1);
// }

// // Server error handling
// if (server) {
//   server.on("error", (err) => {
//     console.error("❌ Server error:", err);
//     if (err.code === "EADDRINUSE") {
//       console.error(`❌ Port ${port} is already in use. Exiting...`);
//       process.exit(1);
//     } else {
//       console.error("❌ Unknown server error. Exiting...");
//       process.exit(1);
//     }
//   });
// }

// // Graceful shutdown
// async function gracefulShutdown(signal) {
//   console.log(`\n🛑 Received ${signal}. Graceful shutdown...`);

//   try {
//     // Stop bot polling
//     if (bot && bot.isPolling()) {
//       await bot.stopPolling();
//       console.log("✅ Bot polling stopped.");
//     }

//     // Close server
//     if (server) {
//       await new Promise((resolve) => {
//         server.close(() => {
//           console.log("✅ HTTP server closed.");
//           resolve();
//         });
//       });
//     }

//     // Close MongoDB connection
//     if (mongoose.connection.readyState === 1) {
//       await mongoose.connection.close();
//       console.log("✅ MongoDB connection closed.");
//     }

//     console.log("✅ Graceful shutdown completed.");
//     process.exit(0);
//   } catch (error) {
//     console.error("❌ Error during graceful shutdown:", error);
//     process.exit(1);
//   }
// }

// process.on("SIGINT", () => gracefulShutdown("SIGINT"));
// process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// // Handler functions
// async function handleCategorySelection(chatId, callbackQuery, data) {
//   try {
//     const channel = channels[data];
//     if (!channel) {
//       await bot.answerCallbackQuery(callbackQuery.id, {
//         text: "❌ Kanal topilmadi",
//         show_alert: true,
//       });
//       return;
//     }

//     userStates.awaitingVacancy[chatId] = {
//       currentStep: 0,
//       data: {},
//       category: data,
//     };

//     const step = steps[0];
//     const message = `📝 <b>${step.label}</b>\n\n${
//       step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
//     }\n\n💡 Masalan: ${step.example}`;

//     await bot.sendMessage(chatId, message, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "⏭️ O'tkazib yuborish", callback_data: "skip" }],
//           [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
//         ],
//       },
//     });

//     await bot.answerCallbackQuery(callbackQuery.id);
//   } catch (error) {
//     console.error("Error in handleCategorySelection:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handlePostConfirmation(chatId, callbackQuery) {
//   try {
//     const currentState = userStates.awaitingVacancy[chatId];
//     if (!currentState) {
//       await bot.answerCallbackQuery(callbackQuery.id, {
//         text: "❌ Vakansiya ma'lumotlari topilmadi",
//         show_alert: true,
//       });
//       return;
//     }

//     await showVacancyPreview(chatId);
//     await bot.answerCallbackQuery(callbackQuery.id);
//   } catch (error) {
//     console.error("Error in handlePostConfirmation:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handlePostCancellation(chatId, callbackQuery) {
//   try {
//     cleanup(chatId);
//     await bot.sendMessage(chatId, "❌ Vakansiya joylash bekor qilindi.");
//     await bot.answerCallbackQuery(callbackQuery.id);
//   } catch (error) {
//     console.error("Error in handlePostCancellation:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handleSkip(chatId) {
//   try {
//     const currentState = userStates.awaitingVacancy[chatId];
//     if (!currentState) {
//       await bot.sendMessage(
//         chatId,
//         "❌ Vakansiya yaratish jarayoni topilmadi."
//       );
//       return;
//     }

//     const step = steps[currentState.currentStep];
//     currentState.data[step.label] = "-";

//     await bot.sendMessage(
//       chatId,
//       `✅ "${step.label}" o'tkazib yuborildi.\n\nKeyingi qadamga o'tamiz...`
//     );
//     await handleNextStep(chatId);
//   } catch (error) {
//     console.error("Error in handleSkip:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ O'tkazib yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
//           ],
//         },
//       }
//     );
//   }
// }

// async function handleNextStep(chatId) {
//   try {
//     const currentState = userStates.awaitingVacancy[chatId];
//     if (!currentState) {
//       await bot.sendMessage(
//         chatId,
//         "❌ Vakansiya yaratish jarayoni topilmadi."
//       );
//       return;
//     }

//     currentState.currentStep++;

//     if (currentState.currentStep >= steps.length) {
//       // All steps completed, show preview
//       await showVacancyPreview(chatId);
//       return;
//     }

//     const step = steps[currentState.currentStep];
//     const message = `📝 <b>${step.label}</b>\n\n${
//       step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
//     }\n\n💡 Masalan: ${step.example}`;

//     await bot.sendMessage(chatId, message, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "⏭️ O'tkazib yuborish", callback_data: "skip" }],
//           [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
//         ],
//       },
//     });
//   } catch (error) {
//     console.error("Error in handleNextStep:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Keyingi qadamga o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
//           ],
//         },
//       }
//     );
//   }
// }

// async function showVacancyPreview(chatId) {
//   try {
//     const currentState = userStates.awaitingVacancy[chatId];
//     if (!currentState) {
//       await bot.sendMessage(chatId, "❌ Vakansiya ma'lumotlari topilmadi.");
//       return;
//     }

//     const vacancyDetails = currentState.data;
//     const categoryText = getCategoryText(currentState.category);
//     const techTags = formatTechnologies(vacancyDetails[steps[3].label] || "");
//     const vacancyText = formatVacancyText(
//       vacancyDetails,
//       techTags,
//       categoryText
//     );

//     await bot.sendMessage(chatId, vacancyText, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [
//             { text: "✏️ Tahrirlash", callback_data: "edit_preview" },
//             { text: "✅ Tasdiqlash", callback_data: "confirm_post" },
//             { text: "❌ Bekor qilish", callback_data: "cancel_post" },
//           ],
//         ],
//       },
//     });
//   } catch (error) {
//     console.error("Error in showVacancyPreview:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Ko'rinish yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
//           ],
//         },
//       }
//     );
//   }
// }

// async function handleVacancyInput(chatId, msg) {
//   try {
//     const currentState = userStates.awaitingVacancy[chatId];
//     if (!currentState) {
//       await bot.sendMessage(
//         chatId,
//         "❌ Vakansiya yaratish jarayoni topilmadi."
//       );
//       return;
//     }

//     const step = steps[currentState.currentStep];
//     const input = msg.text.trim();

//     // Validate input based on step
//     if (step.label === "📧 Telegram") {
//       const validatedUsername = validateTelegramUsername(input);
//       if (validatedUsername === "invalid") {
//         await bot.sendMessage(
//           chatId,
//           "❌ Noto'g'ri Telegram username format. Iltimos, to'g'ri formatda kiriting (masalan: @username yoki username)"
//         );
//         return;
//       }
//       currentState.data[step.label] = validatedUsername;
//     } else if (step.label === "🔗 Aloqa") {
//       const validatedPhone = validatePhoneNumber(input);
//       if (validatedPhone === "invalid") {
//         await bot.sendMessage(
//           chatId,
//           "❌ Noto'g'ri telefon raqam format. Iltimos, to'g'ri formatda kiriting"
//         );
//         return;
//       }
//       currentState.data[step.label] = validatedPhone;
//     } else {
//       currentState.data[step.label] = input;
//     }

//     await bot.sendMessage(
//       chatId,
//       `✅ "${step.label}" saqlandi: ${currentState.data[step.label]}`
//     );

//     await handleNextStep(chatId);
//   } catch (error) {
//     console.error("Error in handleVacancyInput:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
//           ],
//         },
//       }
//     );
//   }
// }

// function cleanup(chatId) {
//   delete userStates.awaitingVacancy[chatId];
//   delete userStates.awaitingService[chatId];
//   delete userStates.awaitingPhoneNumber[chatId];
//   delete userStates.editingStep[chatId];
//   delete userStates.postingType[chatId];
//   delete userStates.selectedTariff[chatId];
//   delete userStates.awaitingLinkTitle[chatId];
// }

// async function handleCallbackError(callbackQuery, error) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   } catch (err) {
//     console.error("Could not send error notification:", err);
//   }
// }

// async function showServiceTariffs(chatId) {
//   try {
//     const tariffsMessage = `
// 💼 <b>Xizmat joylash uchun tarif tanlang:</b>

// 🚀 <b>Start</b> - ${serviceTariffs.start.price}
// ⏰ ${serviceTariffs.start.pinnedTime} | ${serviceTariffs.start.feedTime}
// 📝 ${serviceTariffs.start.description}

// ⚡️ <b>Pro</b> - ${serviceTariffs.pro.price}
// ⏰ ${serviceTariffs.pro.pinnedTime} | ${serviceTariffs.pro.feedTime}
// 📝 ${serviceTariffs.pro.description}

// 🔥 <b>Ultra</b> - ${serviceTariffs.ultra.price}
// ⏰ ${serviceTariffs.ultra.pinnedTime} | ${serviceTariffs.ultra.feedTime}
// 📝 ${serviceTariffs.ultra.description}

// 🎯 <b>Custom</b> - ${serviceTariffs.custom.price}
// 📝 ${serviceTariffs.custom.description}
//     `;

//     await bot.sendMessage(chatId, tariffsMessage, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [
//             { text: "🚀 Start", callback_data: "tariff_start" },
//             { text: "⚡️ Pro", callback_data: "tariff_pro" },
//           ],
//           [
//             { text: "🔥 Ultra", callback_data: "tariff_ultra" },
//             { text: "🎯 Custom", callback_data: "tariff_custom" },
//           ],
//           [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
//         ],
//       },
//     });
//   } catch (error) {
//     console.error("Error in showServiceTariffs:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Tariflarni ko'rsatishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
//     );
//   }
// }

// async function handleAdminActions(callbackQuery, data) {
//   try {
//     const action = data.startsWith("accept_") ? "accept" : "reject";
//     const postId = data.replace("accept_", "").replace("reject_", "");

//     // Handle admin actions here
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: `✅ ${action === "accept" ? "Tasdiqlandi" : "Rad etildi"}`,
//       show_alert: true,
//     });
//   } catch (error) {
//     console.error("Error in handleAdminActions:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handleUserList(callbackQuery) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "👥 Foydalanuvchilar ro'yxati - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handleUserList:", error);
//   }
// }

// async function handleDetailedStats(callbackQuery) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "📊 Batafsil statistika - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handleDetailedStats:", error);
//   }
// }

// async function handleTopUsers(callbackQuery) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "🏆 Top foydalanuvchilar - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handleTopUsers:", error);
//   }
// }

// async function handleDailyStats(callbackQuery) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "📅 Kunlik statistika - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handleDailyStats:", error);
//   }
// }

// async function handlePendingPosts(callbackQuery) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "📋 Kutilmoqda e'lonlar - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handlePendingPosts:", error);
//   }
// }

// async function handleUserPage(callbackQuery, data) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "👤 Foydalanuvchi sahifasi - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handleUserPage:", error);
//   }
// }

// async function handleTariffSelection(chatId, data, callbackQuery) {
//   try {
//     const tariff = data.replace("tariff_", "");
//     userStates.selectedTariff[chatId] = tariff;

//     await bot.sendMessage(
//       chatId,
//       `✅ "${serviceTariffs[tariff].name}" tarifi tanlandi!\n\nEndi xizmat ma'lumotlarini kiriting:`,
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [
//               {
//                 text: "🚀 Xizmatni boshlash",
//                 callback_data: "start_service_with_tariff",
//               },
//             ],
//             [
//               {
//                 text: "🔄 Tarifni o'zgartirish",
//                 callback_data: "change_tariff",
//               },
//             ],
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
//           ],
//         },
//       }
//     );

//     await bot.answerCallbackQuery(callbackQuery.id);
//   } catch (error) {
//     console.error("Error in handleTariffSelection:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handleAdminPanelButton(callbackQuery) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "📊 Admin panel - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handleAdminPanelButton:", error);
//   }
// }

// async function handleBackToAdmin(callbackQuery) {
//   try {
//     await bot.answerCallbackQuery(callbackQuery.id);
//     await bot.sendMessage(
//       callbackQuery.message.chat.id,
//       "🔙 Admin panelga qaytish - bu funksiya keyinroq qo'shiladi."
//     );
//   } catch (error) {
//     console.error("Error in handleBackToAdmin:", error);
//   }
// }

// async function handleStartServiceWithTariff(chatId) {
//   try {
//     const tariff = userStates.selectedTariff[chatId];
//     if (!tariff) {
//       await bot.sendMessage(
//         chatId,
//         "❌ Tarif tanlanmagan. Iltimos, avval tarif tanlang."
//       );
//       return;
//     }

//     userStates.awaitingService[chatId] = {
//       currentStep: 0,
//       data: {},
//       tariff: tariff,
//     };

//     const step = serviceSteps[0];
//     const message = `📝 <b>${step.label}</b>\n\n${
//       step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
//     }\n\n💡 Masalan: ${step.example}`;

//     await bot.sendMessage(chatId, message, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
//         ],
//       },
//     });
//   } catch (error) {
//     console.error("Error in handleStartServiceWithTariff:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Xizmatni boshlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
//     );
//   }
// }

// async function handleCancelService(chatId) {
//   try {
//     cleanup(chatId);
//     await bot.sendMessage(chatId, "❌ Xizmat joylash bekor qilindi.");
//   } catch (error) {
//     console.error("Error in handleCancelService:", error);
//     await bot.sendMessage(chatId, "❌ Bekor qilishda xatolik yuz berdi.");
//   }
// }

// async function handleServiceInput(chatId, msg) {
//   try {
//     const currentState = userStates.awaitingService[chatId];
//     if (!currentState) {
//       await bot.sendMessage(chatId, "❌ Xizmat yaratish jarayoni topilmadi.");
//       return;
//     }

//     const step = serviceSteps[currentState.currentStep];
//     const input = msg.text.trim();

//     currentState.data[step.label] = input;

//     await bot.sendMessage(
//       chatId,
//       `✅ "${step.label}" saqlandi: ${currentState.data[step.label]}`
//     );

//     await handleServiceNextStep(chatId);
//   } catch (error) {
//     console.error("Error in handleServiceInput:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
//           ],
//         },
//       }
//     );
//   }
// }

// async function handleServiceNextStep(chatId) {
//   try {
//     const currentState = userStates.awaitingService[chatId];
//     if (!currentState) {
//       await bot.sendMessage(chatId, "❌ Xizmat yaratish jarayoni topilmadi.");
//       return;
//     }

//     currentState.currentStep++;

//     if (currentState.currentStep >= serviceSteps.length) {
//       // All steps completed, show preview
//       await showServicePreview(chatId);
//       return;
//     }

//     const step = serviceSteps[currentState.currentStep];
//     const message = `📝 <b>${step.label}</b>\n\n${
//       step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
//     }\n\n💡 Masalan: ${step.example}`;

//     await bot.sendMessage(chatId, message, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
//         ],
//       },
//     });
//   } catch (error) {
//     console.error("Error in handleServiceNextStep:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Keyingi qadamga o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
//           ],
//         },
//       }
//     );
//   }
// }

// async function showServicePreview(chatId) {
//   try {
//     const currentState = userStates.awaitingService[chatId];
//     if (!currentState) {
//       await bot.sendMessage(chatId, "❌ Xizmat ma'lumotlari topilmadi.");
//       return;
//     }

//     const serviceDetails = currentState.data;
//     const serviceText = formatServiceText(serviceDetails);

//     await bot.sendMessage(chatId, serviceText, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [
//             { text: "✅ Tasdiqlash", callback_data: "confirm_service" },
//             { text: "❌ Bekor qilish", callback_data: "cancel_service_post" },
//           ],
//         ],
//       },
//     });
//   } catch (error) {
//     console.error("Error in showServicePreview:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Ko'rinish yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_service_post" }],
//           ],
//         },
//       }
//     );
//   }
// }

// async function handleServiceConfirmation(chatId, callbackQuery) {
//   try {
//     const currentState = userStates.awaitingService[chatId];
//     if (!currentState) {
//       await bot.answerCallbackQuery(callbackQuery.id, {
//         text: "❌ Xizmat ma'lumotlari topilmadi",
//         show_alert: true,
//       });
//       return;
//     }

//     await bot.sendMessage(chatId, "✅ Xizmat muvaffaqiyatli yaratildi!");
//     cleanup(chatId);
//     await bot.answerCallbackQuery(callbackQuery.id);
//   } catch (error) {
//     console.error("Error in handleServiceConfirmation:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handleServiceCancellation(chatId, callbackQuery) {
//   try {
//     cleanup(chatId);
//     await bot.sendMessage(chatId, "❌ Xizmat joylash bekor qilindi.");
//     await bot.answerCallbackQuery(callbackQuery.id);
//   } catch (error) {
//     console.error("Error in handleServiceCancellation:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handleEditStep(chatId, data, callbackQuery) {
//   try {
//     const stepIndex = parseInt(data.replace("edit_step_", ""));

//     // Validate step index
//     if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= steps.length) {
//       await bot.answerCallbackQuery(callbackQuery.id, {
//         text: "❌ Noto'g'ri step indeksi",
//         show_alert: true,
//       });
//       return;
//     }

//     userStates.editingStep[chatId] = stepIndex;

//     const currentState = userStates.awaitingVacancy[chatId];
//     const currentValue =
//       currentState && currentState.data
//         ? currentState.data[steps[stepIndex].label] || ""
//         : "";

//     const step = steps[stepIndex];
//     const message = `📝 <b>${step.label}</b> ni tahrirlang:\n\n${
//       step.required ? "⚠️ Bu maydon majburiy!" : "ℹ️ Bu maydon ixtiyoriy"
//     }\n\n💡 Masalan: ${step.example}\n\n📋 Hozirgi qiymat: ${
//       currentValue || "Bo'sh"
//     }`;

//     await bot.sendMessage(chatId, message, {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "❌ Bekor qilish", callback_data: "cancel_edit" }],
//         ],
//       },
//     });

//     await bot.answerCallbackQuery(callbackQuery.id);
//   } catch (error) {
//     console.error("Error in handleEditStep:", error);
//     await bot.answerCallbackQuery(callbackQuery.id, {
//       text: "❌ Xatolik yuz berdi",
//       show_alert: true,
//     });
//   }
// }

// async function handleEditInput(chatId, msg) {
//   try {
//     const stepIndex = userStates.editingStep[chatId];
//     if (stepIndex === undefined) {
//       await bot.sendMessage(chatId, "❌ Tahrirlash jarayoni topilmadi.");
//       return;
//     }

//     // Validate step index
//     if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= steps.length) {
//       await bot.sendMessage(chatId, "❌ Noto'g'ri step indeksi.");
//       return;
//     }

//     const currentState = userStates.awaitingVacancy[chatId];
//     if (!currentState || !currentState.data) {
//       await bot.sendMessage(chatId, "❌ Vakansiya ma'lumotlari topilmadi.");
//       return;
//     }

//     const step = steps[stepIndex];
//     const input = msg.text.trim();

//     // Validate input based on step
//     if (step.label === "📧 Telegram") {
//       const validatedUsername = validateTelegramUsername(input);
//       if (validatedUsername === "invalid") {
//         await bot.sendMessage(
//           chatId,
//           "❌ Noto'g'ri Telegram username format. Iltimos, to'g'ri formatda kiriting (masalan: @username yoki username)"
//         );
//         return;
//       }
//       currentState.data[step.label] = validatedUsername;
//     } else if (step.label === "🔗 Aloqa") {
//       const validatedPhone = validatePhoneNumber(input);
//       if (validatedPhone === "invalid") {
//         await bot.sendMessage(
//           chatId,
//           "❌ Noto'g'ri telefon raqam format. Iltimos, to'g'ri formatda kiriting"
//         );
//         return;
//       }
//       currentState.data[step.label] = validatedPhone;
//     } else {
//       currentState.data[step.label] = input;
//     }

//     delete userStates.editingStep[chatId];
//     await bot.sendMessage(
//       chatId,
//       `✅ "${step.label}" yangilandi: ${currentState.data[step.label]}`
//     );

//     await showEditStepSelection(chatId);
//   } catch (error) {
//     console.error("Error in handleEditInput:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Tahrirlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "❌ Bekor qilish", callback_data: "cancel_edit" }],
//           ],
//         },
//       }
//     );
//   }
// }

// async function showEditStepSelection(chatId) {
//   try {
//     const currentState = userStates.awaitingVacancy[chatId];
//     if (!currentState || !currentState.data) {
//       await bot.sendMessage(chatId, "❌ Vakansiya ma'lumotlari topilmadi.");
//       return;
//     }

//     const vacancyDetails = currentState.data;
//     let stepButtons = [];

//     // Create buttons in 2-row format
//     for (let i = 0; i < steps.length; i += 2) {
//       const row = [];

//       // First button in row
//       const step1 = steps[i];
//       const currentValue1 = vacancyDetails[step1.label] || "Bo'sh";
//       const displayValue1 =
//         currentValue1.length > 10
//           ? currentValue1.substring(0, 8) + "..."
//           : currentValue1;
//       row.push({
//         text: `${step1.label}\n${displayValue1}`,
//         callback_data: `edit_step_${i}`,
//       });

//       // Second button in row (if exists)
//       if (i + 1 < steps.length) {
//         const step2 = steps[i + 1];
//         const currentValue2 = vacancyDetails[step2.label] || "Bo'sh";
//         const displayValue2 =
//           currentValue2.length > 10
//             ? currentValue2.substring(0, 8) + "..."
//             : currentValue2;
//         row.push({
//           text: `${step2.label}\n${displayValue2}`,
//           callback_data: `edit_step_${i + 1}`,
//         });
//       }

//       stepButtons.push(row);
//     }

//     // Add back button
//     stepButtons.push([
//       { text: "🔙 Orqaga qaytish", callback_data: "back_to_preview" },
//     ]);

//     await bot.sendMessage(chatId, "📝 Qaysi maydonni tahrirlamoqchisiz?", {
//       parse_mode: "HTML",
//       reply_markup: {
//         inline_keyboard: stepButtons,
//       },
//     });
//   } catch (error) {
//     console.error("Error in showEditStepSelection:", error);
//     await bot.sendMessage(
//       chatId,
//       "❌ Tahrirlash maydonlarini ko'rsatishda xatolik yuz berdi.",
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "🔙 Orqaga qaytish", callback_data: "back_to_preview" }],
//           ],
//         },
//       }
//     );
//   }
// }

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const schedule = require("node-schedule");
require("dotenv").config();

const app = express();
app.use(express.json());

// Railway uchun port handling
const port = process.env.PORT ? parseInt(process.env.PORT) : 7777;
console.log(`🔧 Using port: ${port} (from env: ${process.env.PORT})`);
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

// Bot error handling
bot.on("error", (error) => {
  console.error("🚫 Telegram Bot error:", error);

  // Handle specific phone number request error
  if (
    error.message &&
    error.message.includes(
      "phone number can be requested in private chats only"
    )
  ) {
    console.log(
      "ℹ️ Phone number request attempted in non-private chat - this is expected behavior"
    );
  }
});

bot.on("polling_error", (error) => {
  console.error("🚫 Telegram Bot polling error:", error);

  // Handle specific phone number request error
  if (
    error.message &&
    error.message.includes(
      "phone number can be requested in private chats only"
    )
  ) {
    console.log(
      "ℹ️ Phone number request attempted in non-private chat - this is expected behavior"
    );
  }
});

// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI ||
    "mongodb+srv://qiyomovabdulloh3:postvacancy_bot@cluster0.h5ujkjt.mongodb.net/postvacancy_bot"
);

// MongoDB connection events
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

// User Schema
const userSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  firstName: String,
  lastName: String,
  username: String,
  registeredAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

const User = mongoose.model("User", userSchema);

// Advertisement Schema for admin ads management
const advertisementSchema = new mongoose.Schema({
  channelLink: { type: String, required: true },
  messageId: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  durationDays: { type: Number, default: 0 },
  durationHours: { type: Number, default: 0 },
  durationMinutes: { type: Number, default: 0 },
  totalMinutes: { type: Number, required: true },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  channelMessageIds: [
    {
      channel: String,
      messageId: String,
    },
  ],
});

const Advertisement = mongoose.model("Advertisement", advertisementSchema);

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
  awaitingAdData: {}, // New state for ad data
};

// Statistics tracking
const stats = {
  users: new Set(),
  vacancies: 0,
  approved: 0,
  rejected: 0,
  pending: 0,
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
  { label: "📍 Hudud", required: false, example: "Toshkent, O'zbekiston" },
  { label: "👨‍💼 Mas'ul", required: false, example: "2-3 yil tajriba" },
  { label: "🕒 Ish vaqti", required: false, example: "5/2 - 8 soat" },
  {
    label: "📝 Batafsil",
    required: false,
    example: "GraphQL bilan ishlash tajribasi afzal",
  },
  {
    label: "🔗 Havola qo'shish",
    required: false,
    example: "Batafsil ma'lumot",
  },
];

const serviceSteps = [
  {
    label: "⚙️ Xizmat nomi",
    required: true,
    example: "Web dasturlar yaratish",
  },
  { label: "👥 Biz", required: true, example: "Software Team" },
  {
    label: "💼 Portfolio",
    required: false,
    example: "Portfolio ko'rish",
  },
  {
    label: "🌐 Website",
    required: false,
    example: "Bizning sayt",
  },
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
  {
    label: "💰 Xizmat narxi",
    required: true,
    example: "500$ dan boshlab",
  },
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
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, `"`)
    .replace(/'/g, "'");
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

  return cleanedPhone.replace(
    /^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/,
    "$1 $2 $3 $4 $5"
  );
}

function validateTelegramUsername(username) {
  if (!username) return "-";

  let cleanedUsername = username.trim();
  if (!cleanedUsername.startsWith("@")) {
    cleanedUsername = `@${cleanedUsername}`;
  }

  const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;
  return usernameRegex.test(cleanedUsername) ? cleanedUsername : username;
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
    { step: 6, label: "Hudud" },
    { step: 7, label: "Mas'ul" },
    { step: 8, label: "Ish vaqti" },
    { step: 9, label: "Batafsil" },
  ];

  optionalFields.forEach((field) => {
    const value = vacancyDetails[steps[field.step].label];
    if (value && value !== "-" && value.trim() !== "") {
      vacancyText += `\n— <b>${field.label}:</b> ${value}`;
    }
  });

  // Handle Havola qo'shish (Add Link) field specially for links
  const havolaValue = vacancyDetails[steps[10].label];
  const havolaLink = vacancyDetails["havola_link"];

  if (havolaValue && havolaValue !== "-" && havolaValue.trim() !== "") {
    if (havolaLink && havolaLink !== "-" && havolaLink.trim() !== "") {
      // If both title and link are provided, create a clickable link
      vacancyText += `\n— <b>Havola:</b> <a href="${havolaLink}">${havolaValue}</a>`;
    } else {
      // If only title is provided, show as regular text
      vacancyText += `\n— <b>Havola:</b> ${havolaValue}`;
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

// Enhanced Advertisement Deletion Function
async function deleteExpiredAds() {
  try {
    const now = new Date();
    const expiredAds = await Advertisement.find({
      endDate: { $lte: now },
      isActive: true,
    });

    for (const ad of expiredAds) {
      let deletedCount = 0;

      // Delete from channels if message IDs are stored
      if (ad.channelMessageIds && ad.channelMessageIds.length > 0) {
        for (const channelMsg of ad.channelMessageIds) {
          try {
            await bot.deleteMessage(channelMsg.channel, channelMsg.messageId);
            console.log(`🗑️ Deleted ad message from ${channelMsg.channel}`);
            deletedCount++;
          } catch (error) {
            console.error(
              `Error deleting message from ${channelMsg.channel}:`,
              error.message
            );
          }
        }
      } else {
        // Try to extract message ID from channel link if not stored
        try {
          const linkMatch = ad.channelLink.match(
            /https:\/\/t\.me\/([^\/]+)\/(\d+)/
          );
          if (linkMatch) {
            const channelUsername = "@" + linkMatch[1];
            const messageId = linkMatch[2];

            await bot.deleteMessage(channelUsername, messageId);
            console.log(
              `🗑️ Deleted ad message from ${channelUsername} using link extraction`
            );
            deletedCount++;
          }
        } catch (error) {
          console.error(
            `Error deleting message using link extraction:`,
            error.message
          );
        }
      }

      // Mark as inactive
      ad.isActive = false;
      await ad.save();

      console.log(
        `✅ Advertisement expired and deleted: ${ad.description} (${deletedCount} messages deleted)`
      );
    }

    if (expiredAds.length > 0) {
      await bot.sendMessage(
        adminId,
        `🗑️ ${expiredAds.length} ta reklama muddati tugab o'chirildi!`
      );
    }
  } catch (error) {
    console.error("Error deleting expired ads:", error);
  }
}

// Command handlers
bot.onText(/\/start/, async (msg) => {
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

  stats.users.add(chatId);

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ chatId: chatId.toString() });

    if (existingUser) {
      // User already registered
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
      );
    } else {
      // Request phone number
      userStates.awaitingPhoneNumber[chatId] = true;
      bot.sendMessage(
        chatId,
        "👋 Xush kelibsiz!\n\nBotdan foydalanish uchun telefon raqamingizni yuboring:",
        {
          reply_markup: {
            keyboard: [
              [{ text: "📱 Telefon raqamni yuborish", request_contact: true }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    }
  } catch (error) {
    console.error("Error in /start command:", error);
    bot.sendMessage(
      chatId,
      "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
    );
  }
});

bot.onText(/\/admin-help/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === adminId) {
    const helpMessage = `
🔧 <b>Admin Komandalar</b>

📊 <b>Panel va Statistika:</b>
• <b>/admin-panel</b> - Admin panel va statistikalar
• <b>/admin-help</b> - Bu yordam sahifasi

📢 <b>Reklama Boshqaruvi:</b>
• <b>/rek</b> - Barcha reklamalar ro'yxati
• <b>/new-rek</b> - Yangi reklama qo'shish

🧪 <b>Test Komandalar:</b>
• <b>/test-ads</b> - Reklama deletion test qilish

💡 E'lonlarni tasdiqlash va rad etish admin panelda callback orqali amalga oshiriladi.
    `;

    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📊 Admin Panel",
              callback_data: "admin_panel_button",
            },
          ],
          [
            {
              text: "📢 Reklamalar",
              callback_data: "view_ads",
            },
          ],
        ],
      },
    });
  } else {
    bot.sendMessage(chatId, "⛔️ Bu komanda faqat admin uchun.");
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

bot.onText(/\/admin-panel/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === adminId) {
    // Send loading message first
    const loadingMessage = await bot.sendMessage(
      chatId,
      "⏳ <b>Loading...</b>",
      {
        parse_mode: "HTML",
      }
    );

    try {
      // Fetch all real data from database
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const todayUsers = await User.countDocuments({
        registeredAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      });

      // Get real vacancy statistics by counting from pendingPosts and other sources
      const pendingCount = Object.keys(userStates.pendingPosts || {}).length;

      // Use stats object for accumulated totals, but ensure they're not 0
      const totalVacancies = Math.max(stats.vacancies, 0);
      const approvedVacancies = Math.max(stats.approved, 0);
      const rejectedVacancies = Math.max(stats.rejected, 0);

      const statsMessage = `
📊 <b>Admin Panel - Statistikalar</b>

👥 <b>Foydalanuvchilar:</b>
● Jami: ${totalUsers}
● Faol: ${activeUsers}
● Bugun ro'yxatdan o'tgan: ${todayUsers}

📋 <b>E'lonlar:</b>
● Jami yuborilgan: ${totalVacancies}
● Tasdiqlangan: ${approvedVacancies}
● Rad etilgan: ${rejectedVacancies}
● Kutilmoqda: ${pendingCount}

📊 <b>Reklamalar:</b>
● Faol: ${await Advertisement.countDocuments({ isActive: true })}
● Jami: ${await Advertisement.countDocuments()}
      `;

      // Edit the loading message with real data
      await bot.editMessageText(statsMessage, {
        chat_id: chatId,
        message_id: loadingMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "👥 Foydalanuvchilar ro'yxati",
                callback_data: "user_list",
              },
            ],
            [
              {
                text: "📊 Batafsil statistika",
                callback_data: "detailed_stats",
              },
            ],
            [
              {
                text: "📢 Reklamalar",
                callback_data: "view_ads",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Error in admin panel:", error);
      await bot.editMessageText(
        "❌ Admin panelni yuklashda xatolik yuz berdi.",
        {
          chat_id: chatId,
          message_id: loadingMessage.message_id,
        }
      );
    }
  } else {
    bot.sendMessage(chatId, "⛔️ Sizda admin panelini ko'rish huquqi yo'q.");
  }
});

// Advertisement management commands
bot.onText(/\/rek/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== adminId) {
    bot.sendMessage(chatId, "⛔️ Bu komanda faqat admin uchun.");
    return;
  }

  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 });

    if (ads.length === 0) {
      bot.sendMessage(
        chatId,
        "📝 Hech qanday reklama topilmadi.\n\n📌 Yangi reklama qo'shish uchun: <b>/new-rek</b>",
        { parse_mode: "HTML" }
      );
      return;
    }

    let message = "📢 <b>Reklamalar ro'yxati:</b>\n\n";

    ads.forEach((ad, index) => {
      const now = new Date();
      const timeLeft = ad.endDate - now;
      const status = ad.isActive && timeLeft > 0 ? "🟢 Faol" : "🔴 Tugagan";

      message += `<b>${index + 1}.</b> ${status}\n`;
      message += `🔗 Link: ${ad.channelLink}\n`;
      message += `📅 Boshlangan: ${ad.startDate.toLocaleString("uz-UZ")}\n`;
      message += `⏰ Tugaydi: ${ad.endDate.toLocaleString("uz-UZ")}\n`;

      // Show original duration
      let originalDurationText = "";
      if (ad.durationDays > 0)
        originalDurationText += `${ad.durationDays} kun `;
      if (ad.durationHours > 0)
        originalDurationText += `${ad.durationHours} soat `;
      if (ad.durationMinutes > 0)
        originalDurationText += `${ad.durationMinutes} minut`;
      if (originalDurationText) {
        message += `📊 Muddat: ${originalDurationText.trim()}\n`;
      } else {
        message += `📊 Muddat: 0 minut\n`;
      }

      // Show remaining time if active
      if (ad.isActive && timeLeft > 0) {
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));
        const hoursLeft = Math.floor(minutesLeft / 60);
        const daysLeft = Math.floor(hoursLeft / 24);

        let timeLeftText = "";
        if (daysLeft > 0) {
          timeLeftText += `${daysLeft} kun `;
          const remainingHours = hoursLeft % 24;
          if (remainingHours > 0) timeLeftText += `${remainingHours} soat `;
        } else if (hoursLeft > 0) {
          timeLeftText += `${hoursLeft} soat `;
          const remainingMinutes = minutesLeft % 60;
          if (remainingMinutes > 0) timeLeftText += `${remainingMinutes} minut`;
        } else {
          timeLeftText = `${minutesLeft} minut`;
        }

        message += `⏳ Qolgan: ${timeLeftText.trim()}\n`;
      }

      if (ad.description) {
        message += `📝 ${ad.description}\n`;
      }
      message += `\n`;
    });

    bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Yangi reklama qo'shish", callback_data: "add_new_ad" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching ads:", error);
    bot.sendMessage(chatId, "❌ Reklamalarni yuklashda xatolik yuz berdi.");
  }
});

bot.onText(/\/new-rek/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== adminId) {
    bot.sendMessage(chatId, "⛔️ Bu komanda faqat admin uchun.");
    return;
  }

  userStates.awaitingAdData = userStates.awaitingAdData || {};
  userStates.awaitingAdData[chatId] = {
    step: "link",
    durationDays: 0,
    durationHours: 0,
    durationMinutes: 0,
  };

  await bot.sendMessage(
    chatId,
    "📢 <b>Yangi reklama qo'shish</b>\n\n" +
      "🔗 Kanal linkini yuboring:\n" +
      "<i>Misol: https://t.me/channel_name/123</i>\n\n" +
      "⚠️ <b>Muhim:</b> Linkda post ID bo'lishi kerak (oxiridagi raqam)",
    { parse_mode: "HTML" }
  );
});

// Manual command to test ad deletion (admin only)
bot.onText(/\/test-ads/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === adminId) {
    await bot.sendMessage(chatId, "🔄 Reklama deletion boshlandi...");
    await deleteExpiredAds();
  } else {
    await bot.sendMessage(chatId, "⛔️ Bu komanda faqat admin uchun.");
  }
});

// Schedule ad deletion check (every hour)
schedule.scheduleJob("0 * * * *", deleteExpiredAds);

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
              [{ text: "💼 Vakansiya joylash", callback_data: "post_vacancy" }],
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
    } else if (data === "view_ads") {
      await handleViewAds(callbackQuery);
    } else if (data === "add_new_ad") {
      await handleAddNewAdCallback(chatId);
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
    } else if (data === "confirm_ad") {
      await handleConfirmAd(chatId, callbackQuery);
    } else if (data === "cancel_ad") {
      await handleCancelAd(chatId, callbackQuery);
    }
  } catch (error) {
    console.error("Callback query error:", error);
    await handleCallbackError(callbackQuery, error);
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
      );
    } catch (error) {
      console.error("Error saving user:", error);
      bot.sendMessage(
        chatId,
        "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
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
    } else if (userStates.awaitingAdData && userStates.awaitingAdData[chatId]) {
      await handleAdInput(chatId, msg);
    }
  } catch (error) {
    console.error("Error handling message:", error);
    await bot.sendMessage(
      chatId,
      "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💼 Vakansiya joylash", callback_data: "post_vacancy" }],
            [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
            [{ text: "❓ Yordam", callback_data: "help" }],
          ],
        },
      }
    );
    cleanup(chatId);
  }
});

// Helper functions for handlers
async function handleCategorySelection(chatId, callbackQuery, data) {
  userStates.userSelection[chatId] = data;

  // Different handling for vacancy vs service
  if (userStates.postingType[chatId] === "service") {
    // Services don't need category selection, always go to main channel
    userStates.awaitingService[chatId] = { step: 0, data: {} };
    await bot.sendMessage(
      chatId,
      `${serviceSteps[0].label}:\n<i>Misol: ${serviceSteps[0].example}</i>`,
      {
        parse_mode: "HTML",
      }
    );
  } else {
    // Regular vacancy posting
    userStates.awaitingVacancy[chatId] = { step: 0, data: {} };
    await bot.sendMessage(
      chatId,
      `${steps[0].label}:\n<i>Misol: ${steps[0].example}</i>`,
      {
        parse_mode: "HTML",
      }
    );
  }
}

async function handlePostConfirmation(chatId, callbackQuery) {
  try {
    const vacancyDetails = userStates.awaitingVacancy[chatId].data;
    const category = userStates.userSelection[chatId];
    const techTags = formatTechnologies(vacancyDetails[steps[3].label] || "");
    const categoryText = getCategoryText(category);
    const vacancyText = formatVacancyText(
      vacancyDetails,
      techTags,
      categoryText
    );
    const messageId = callbackQuery.message.message_id;
    const user = callbackQuery.from;
    const userInfo = getUserInfoString(user, vacancyDetails);

    stats.vacancies++;
    stats.pending++;

    userStates.pendingPosts[messageId] = {
      chatId,
      vacancy: vacancyText,
      userInfo,
      category,
      imageUrl: channels[category].image,
    };

    await bot.sendPhoto(adminId, channels[category].image, {
      caption: `${userInfo}\n\n${vacancyText}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Accept", callback_data: `accept_${messageId}` },
            { text: "❌ Reject", callback_data: `reject_${messageId}` },
          ],
        ],
      },
      parse_mode: "HTML",
    });

    await bot.sendMessage(
      chatId,
      "⏳ Sizning e'loningiz ko'rib chiqilmoqda...\nTez orada e'lon qilinadi!",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📝 Yana e'lon joylash",
                callback_data: "post_vacancy",
              },
            ],
            [{ text: "❓ Yordam", callback_data: "help" }],
          ],
        },
      }
    );

    delete userStates.awaitingVacancy[chatId];
    delete userStates.awaitingContactTitle[chatId];
    delete userStates.editingStep[chatId];

    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: chatId,
        message_id: messageId,
      }
    );
  } catch (error) {
    console.error("Post confirmation error:", error);
    throw error;
  }
}

async function handlePostCancellation(chatId, callbackQuery) {
  try {
    delete userStates.awaitingVacancy[chatId];
    delete userStates.userSelection[chatId];
    delete userStates.awaitingContactTitle[chatId];
    delete userStates.editingStep[chatId];

    await bot.sendMessage(chatId, "❌ E'lon yaratish bekor qilindi.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 E'lon joylash", callback_data: "post_vacancy" }],
          [{ text: "❓ Yordam", callback_data: "help" }],
        ],
      },
    });
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      }
    );
  } catch (error) {
    console.error("Post cancellation error:", error);
    throw error;
  }
}

async function handleSkip(chatId) {
  const currentStep = userStates.awaitingVacancy[chatId].step;
  const step = steps[currentStep];

  userStates.awaitingVacancy[chatId].data[step.label] = "-";
  userStates.awaitingVacancy[chatId].step++;
  await handleNextStep(chatId);
}

async function handleNextStep(chatId) {
  const currentState = userStates.awaitingVacancy[chatId];

  if (!currentState) {
    throw new Error("No active vacancy creation process");
  }

  if (currentState.step < steps.length) {
    const nextStep = steps[currentState.step];

    const keyboard = !nextStep.required
      ? {
          reply_markup: {
            inline_keyboard: [
              [{ text: "⏩ O'tkazib yuborish", callback_data: "skip" }],
            ],
          },
        }
      : undefined;
    await bot.sendMessage(
      chatId,
      `${nextStep.label}:\n<i>Misol: ${nextStep.example}</i>`,
      {
        ...keyboard,
        parse_mode: "HTML",
      }
    );
  } else {
    await showVacancyPreview(chatId);
  }
}

async function showVacancyPreview(chatId) {
  const vacancyDetails = userStates.awaitingVacancy[chatId].data;
  const category = userStates.userSelection[chatId];
  const techTags = formatTechnologies(vacancyDetails[steps[3].label] || "");
  const categoryText = getCategoryText(category);
  const vacancyText = formatVacancyText(vacancyDetails, techTags, categoryText);

  await bot.sendMessage(chatId, "📝 E'loningiz ko'rinishi:\n\n" + vacancyText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Tasdiqlash", callback_data: "confirm_post" },
          { text: "❌ Bekor qilish", callback_data: "cancel_post" },
        ],
      ],
    },
  });
}

async function handleVacancyInput(chatId, msg) {
  const currentState = userStates.awaitingVacancy[chatId];

  if (!currentState) {
    throw new Error("No active vacancy creation process");
  }

  const step = steps[currentState.step];

  if (!step) {
    // Reset the process if step is invalid
    cleanup(chatId);
    await bot.sendMessage(
      chatId,
      "❌ Vakansiya yaratish jarayonida xatolik yuz berdi. Iltimos, qaytadan boshlang.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💼 Vakansiya joylash", callback_data: "post_vacancy" }],
            [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
            [{ text: "❓ Yordam", callback_data: "help" }],
          ],
        },
      }
    );
    return;
  }

  let processedValue = msg.text;

  if (step.label.includes("Telegram")) {
    processedValue = validateTelegramUsername(msg.text);
  }

  userStates.awaitingVacancy[chatId].data[step.label] =
    escapeHTML(processedValue);
  userStates.awaitingVacancy[chatId].step++;

  await handleNextStep(chatId);
}

function cleanup(chatId) {
  delete userStates.awaitingVacancy[chatId];
  delete userStates.awaitingService[chatId];
  delete userStates.userSelection[chatId];
  delete userStates.awaitingContactTitle[chatId];
  delete userStates.awaitingContactType[chatId];
  delete userStates.editingStep[chatId];
  delete userStates.awaitingPhoneNumber[chatId];
  delete userStates.postingType[chatId];
  delete userStates.selectedTariff[chatId];

  if (userStates.awaitingAdData && userStates.awaitingAdData[chatId]) {
    delete userStates.awaitingAdData[chatId];
  }
}

async function handleCallbackError(callbackQuery, error) {
  try {
    const chatId = callbackQuery.message?.chat?.id || adminId;
    await bot.sendMessage(
      chatId,
      `⚠️ Xatolik yuz berdi: ${error.message}. Iltimos, qayta urinib ko'ring.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Vakansiya joylash", callback_data: "post_vacancy" }],
            [{ text: "❓ Yordam", callback_data: "help" }],
          ],
        },
      }
    );
  } catch (notificationError) {
    console.error("Could not send error notification", notificationError);
  }
}

// Remaining handler functions will be added in the next part
async function showServiceTariffs(chatId) {
  const message = `⚙️ <b>Xizmat joylash - Tariflar</b>

💰 <b>Mavjud tariflar:</b>

🥉 <b>Start</b> - ${serviceTariffs.start.price}
📌 ${serviceTariffs.start.description}

🥈 <b>Pro</b> - ${serviceTariffs.pro.price}  
📌 ${serviceTariffs.pro.description}

🥇 <b>Ultra</b> - ${serviceTariffs.ultra.price}
📌 ${serviceTariffs.ultra.description}

⚙️ <b>Custom</b> - ${serviceTariffs.custom.price}
📌 ${serviceTariffs.custom.description}

Qaysi tarifni tanlaysiz?`;

  await bot.sendMessage(chatId, message, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🥉 Start (29.000)", callback_data: "tariff_start" },
          { text: "🥈 Pro (39.000)", callback_data: "tariff_pro" },
        ],
        [
          { text: "🥇 Ultra (69.000)", callback_data: "tariff_ultra" },
          { text: "⚙️ Custom", callback_data: "tariff_custom" },
        ],
        [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
      ],
    },
  });
}

// Admin action handlers
async function handleAdminActions(callbackQuery, data) {
  const [action, messageId] = data.split("_");
  const adminChatId = callbackQuery.message.chat.id;

  if (adminChatId !== +adminId) {
    await bot.sendMessage(
      adminChatId,
      "⛔️ You are not authorized to review posts."
    );
    return;
  }

  const post = userStates.pendingPosts[messageId];

  try {
    if (action === "accept") {
      stats.approved++;
      stats.pending--;
      await handleAcceptedPost(post, adminChatId);
    } else if (action === "reject") {
      stats.rejected++;
      stats.pending--;
      await handleRejectedPost(post, adminChatId);
    }

    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [
            {
              text: action === "accept" ? "✅ Accepted" : "❌ Rejected",
              callback_data: "processed",
            },
          ],
        ],
      },
      {
        chat_id: adminChatId,
        message_id: callbackQuery.message.message_id,
      }
    );

    if (post) {
      delete userStates.pendingPosts[messageId];
      delete userStates.userSelection[post.chatId];
    }
  } catch (error) {
    console.error("Error in admin actions:", error);
    await bot.sendMessage(
      adminChatId,
      `⚠️ Error processing the post: ${error.message}`
    );
  }
}

async function handleAcceptedPost(post, adminChatId) {
  const category = post.category;
  const imageUrl = post.imageUrl;
  const postedMessages = [];

  try {
    // Post to category channel if not main
    if (category !== "Other" && channels[category]) {
      const categoryPost = await bot.sendPhoto(
        channels[category].username,
        imageUrl,
        {
          caption: post.vacancy,
          parse_mode: "HTML",
        }
      );
      postedMessages.push({
        channelName: channels[category].displayName,
        channelUsername: channels[category].username.replace("@", ""),
        messageId: categoryPost.message_id,
      });
    }

    // Post to main channel
    const mainPost = await bot.sendPhoto(mainChannel, imageUrl, {
      caption: post.vacancy,
      parse_mode: "HTML",
    });
    postedMessages.push({
      channelName: channels.Other.displayName,
      channelUsername: mainChannel.replace("@", ""),
      messageId: mainPost.message_id,
    });

    await sendConfirmationMessages(post, postedMessages, adminChatId);
  } catch (error) {
    console.error("Error posting vacancy:", error);
    await bot.sendMessage(
      adminChatId,
      `⚠️ Error posting vacancy: ${error.message}`
    );
  }
}

async function sendConfirmationMessages(post, postedMessages, adminChatId) {
  let postingInfo = "✨ Sizning e'loningiz quyidagi kanallarga joylandi:\n\n";
  postedMessages.forEach((msg, index) => {
    const postLink = `https://t.me/${msg.channelUsername}/${msg.messageId}`;
    postingInfo += `<b>${index + 1}. ${msg.channelName}</b>\n`;
    postingInfo += `📎 E'lon havolasi: ${postLink}\n\n`;
  });

  const userMessage =
    postingInfo + "🎉 Xizmatimizdan foydalanganingiz uchun rahmat!";
  const adminMessage = `✅ E'lon muvaffaqiyatli joylandi!\n\n${post.userInfo}\n\n${postingInfo}`;

  await bot.sendMessage(adminId, adminMessage, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  if (post.chatId && post.chatId !== adminChatId) {
    await bot.sendMessage(post.chatId, userMessage, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "💼 Yana vakansiya joylash",
              callback_data: "post_vacancy",
            },
          ],
          [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
          [{ text: "❓ Yordam", callback_data: "help" }],
        ],
      },
    });
  }
}

async function handleRejectedPost(post, adminChatId) {
  await bot.sendMessage(adminChatId, "❌ E'lon rad etildi.");
  if (post.chatId && post.chatId !== adminId) {
    await bot.sendMessage(
      post.chatId,
      "❌ Sizning e'loningiz admin tomonidan rad etildi.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Qayta urinish", callback_data: "post_vacancy" }],
            [
              {
                text: "📞 Admin bilan bog'lanish",
                url: "https://t.me/ayti_admin",
              },
            ],
          ],
        },
      }
    );
  }
}

async function handleUserList(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;

  if (chatId.toString() !== adminId) {
    await bot.sendMessage(
      chatId,
      "⛔️ Sizda admin panelini ko'rish huquqi yo'q."
    );
    return;
  }

  try {
    const users = await User.find().sort({ registeredAt: -1 }).limit(20);

    if (users.length === 0) {
      await bot.sendMessage(chatId, "📝 Hech qanday foydalanuvchi topilmadi.");
      return;
    }

    let userListMessage =
      "👥 <b>Foydalanuvchilar ro'yxati (oxirgi 20 ta):</b>\n\n";

    users.forEach((user, index) => {
      const registeredDate = new Date(user.registeredAt).toLocaleDateString(
        "uz-UZ"
      );
      const userName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : "Noma'lum";
      const username = user.username ? `(@${user.username})` : "";

      userListMessage += `${index + 1}. <b>${userName}</b> ${username}\n`;
      userListMessage += `   📱 ${user.phoneNumber}\n`;
      userListMessage += `   📅 ${registeredDate}\n\n`;
    });

    await bot.sendMessage(chatId, userListMessage, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Orqaga", callback_data: "back_to_admin" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleUserList:", error);
    await bot.sendMessage(
      chatId,
      "❌ Foydalanuvchilar ro'yxatini yuklashda xatolik yuz berdi."
    );
  }
}

async function handleDetailedStats(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;

  if (chatId.toString() !== adminId) {
    await bot.sendMessage(
      chatId,
      "⛔️ Sizda admin panelini ko'rish huquqi yo'q."
    );
    return;
  }

  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const todayUsers = await User.countDocuments({
      registeredAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });

    const detailedMessage = `
📊 <b>Batafsil Statistika</b>

👥 <b>Foydalanuvchilar:</b>
● Jami: ${totalUsers}
● Faol: ${activeUsers}
● Bugun: ${todayUsers}

📋 <b>E'lonlar:</b>
● Jami yuborilgan: ${stats.vacancies}
● Tasdiqlangan: ${stats.approved}
● Rad etilgan: ${stats.rejected}
● Kutilmoqda: ${stats.pending}
● Muvaffaqiyat foizi: ${
      stats.vacancies > 0
        ? Math.round((stats.approved / stats.vacancies) * 100)
        : 0
    }%
    `;

    await bot.sendMessage(chatId, detailedMessage, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Orqaga", callback_data: "back_to_admin" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleDetailedStats:", error);
    await bot.sendMessage(
      chatId,
      "❌ Batafsil statistikalarni yuklashda xatolik yuz berdi."
    );
  }
}

// Stub functions for remaining handlers
async function handleViewAds(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  if (chatId.toString() !== adminId) return;

  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 });
    if (ads.length === 0) {
      await bot.editMessageText("📝 Hech qanday reklama topilmadi.", {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      });
      return;
    }

    let message = "📢 <b>Reklamalar ro'yxati:</b>\n\n";
    ads.forEach((ad, index) => {
      const status = ad.isActive ? "🟢 Faol" : "🔴 Tugagan";
      message += `<b>${index + 1}.</b> ${status}\n`;
      message += `🔗 ${ad.channelLink}\n\n`;
    });

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error viewing ads:", error);
  }
}

async function handleAddNewAdCallback(chatId) {
  if (chatId.toString() !== adminId) return;

  userStates.awaitingAdData = userStates.awaitingAdData || {};
  userStates.awaitingAdData[chatId] = { step: "link" };

  await bot.sendMessage(
    chatId,
    "📢 Yangi reklama qo'shish\n\n🔗 Kanal linkini yuboring:",
    {
      parse_mode: "HTML",
    }
  );
}

async function handleTariffSelection(chatId, data, callbackQuery) {
  const tariffType = data.split("_")[1];
  const selectedTariff = serviceTariffs[tariffType];

  if (!selectedTariff) {
    await bot.sendMessage(chatId, "❌ Noto'g'ri tarif tanlandi.");
    return;
  }

  userStates.selectedTariff[chatId] = tariffType;

  await bot.sendMessage(
    chatId,
    `✅ ${selectedTariff.name} tarifi tanlandi!\n\n💰 Narx: ${selectedTariff.price}`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Davom etish",
              callback_data: "start_service_with_tariff",
            },
          ],
          [{ text: "❌ Bekor qilish", callback_data: "cancel_service" }],
        ],
      },
    }
  );
}

async function handleAdminPanelButton(callbackQuery) {
  // Redirect to admin panel
  await handleAdminPanelCallback(callbackQuery);
}

async function handleBackToAdmin(callbackQuery) {
  // Redirect to admin panel
  await handleAdminPanelCallback(callbackQuery);
}

async function handleAdminPanelCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  if (chatId.toString() !== adminId) return;

  try {
    const totalUsers = await User.countDocuments();
    const pendingCount = Object.keys(userStates.pendingPosts || {}).length;

    const statsMessage = `📊 <b>Admin Panel</b>\n\n👥 Foydalanuvchilar: ${totalUsers}\n📋 Kutilmoqda: ${pendingCount}`;

    await bot.editMessageText(statsMessage, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "👥 Foydalanuvchilar", callback_data: "user_list" }],
          [{ text: "📊 Statistika", callback_data: "detailed_stats" }],
          [{ text: "📢 Reklamalar", callback_data: "view_ads" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in admin panel callback:", error);
  }
}

async function handleStartServiceWithTariff(chatId) {
  userStates.userSelection[chatId] = "Other";
  userStates.awaitingService[chatId] = { step: 0, data: {} };

  await bot.sendMessage(
    chatId,
    `${serviceSteps[0].label}:\n<i>Misol: ${serviceSteps[0].example}</i>`,
    {
      parse_mode: "HTML",
    }
  );
}

async function handleCancelService(chatId) {
  delete userStates.postingType[chatId];
  await bot.sendMessage(chatId, "❌ Xizmat joylash bekor qilindi.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💼 Vakansiya joylash", callback_data: "post_vacancy" }],
        [{ text: "⚙️ Xizmat joylash", callback_data: "post_service" }],
      ],
    },
  });
}

async function handleServiceInput(chatId, msg) {
  const currentState = userStates.awaitingService[chatId];
  if (!currentState) return;

  const step = serviceSteps[currentState.step];
  if (!step) return;

  userStates.awaitingService[chatId].data[step.label] = escapeHTML(msg.text);
  userStates.awaitingService[chatId].step++;

  await handleServiceNextStep(chatId);
}

async function handleServiceNextStep(chatId) {
  const currentState = userStates.awaitingService[chatId];
  if (!currentState) return;

  if (currentState.step < serviceSteps.length) {
    const nextStep = serviceSteps[currentState.step];
    await bot.sendMessage(
      chatId,
      `${nextStep.label}:\n<i>Misol: ${nextStep.example}</i>`,
      {
        parse_mode: "HTML",
      }
    );
  } else {
    await showServicePreview(chatId);
  }
}

async function showServicePreview(chatId) {
  const serviceDetails = userStates.awaitingService[chatId].data;
  const serviceText = formatServiceText(serviceDetails);

  await bot.sendMessage(
    chatId,
    "⚙️ Xizmatingiz ko'rinishi:\n\n" + serviceText,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: "confirm_service" },
            { text: "❌ Bekor qilish", callback_data: "cancel_service_post" },
          ],
        ],
      },
    }
  );
}

async function handleServiceConfirmation(chatId, callbackQuery) {
  const serviceDetails = userStates.awaitingService[chatId].data;
  const user = callbackQuery.from;
  const userInfo = getUserInfoString(user, serviceDetails);
  const serviceText = formatServiceText(serviceDetails);

  const post = {
    chatId: chatId,
    service: serviceText,
    userInfo: userInfo,
    type: "service",
    imageUrl: "https://i.ibb.co/vxxsdpzv/Group-2-2.png",
  };

  const messageId = Date.now().toString();
  userStates.pendingPosts[messageId] = post;
  stats.vacancies++;
  stats.pending++;

  await bot.sendPhoto(adminId, post.imageUrl, {
    caption: `🔍 <b>XIZMAT E'LONI</b>\n\n${userInfo}\n\n${serviceText}`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Tasdiqlash", callback_data: `accept_${messageId}` },
          { text: "❌ Rad etish", callback_data: `reject_${messageId}` },
        ],
      ],
    },
  });

  await bot.sendMessage(
    chatId,
    "⚙️ Xizmatingiz admin ko'rib chiqishi uchun yuborildi!"
  );
  cleanup(chatId);
}

async function handleServiceCancellation(chatId, callbackQuery) {
  cleanup(chatId);
  await bot.sendMessage(chatId, "❌ Xizmat joylash bekor qilindi.");
}

async function handleEditInput(chatId, msg) {
  // Stub for edit functionality
  await bot.sendMessage(chatId, "✏️ Edit funksiyasi hozircha mavjud emas.");
}

async function handleConfirmAd(chatId, callbackQuery) {
  if (chatId.toString() !== adminId) return;

  const adData = userStates.awaitingAdData[chatId];
  if (!adData) {
    await bot.sendMessage(chatId, "❌ Reklama ma'lumotlari topilmadi.");
    return;
  }

  try {
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + adData.durationDays);
    endDate.setHours(endDate.getHours() + adData.durationHours);
    endDate.setMinutes(endDate.getMinutes() + adData.durationMinutes);

    // Calculate total minutes
    const totalMinutes =
      adData.durationDays * 24 * 60 +
      adData.durationHours * 60 +
      adData.durationMinutes;

    // Extract channel username and message ID from link
    let channelUsername = "";
    let messageId = "";

    try {
      // Parse the channel link to extract channel username and message ID
      const linkMatch = adData.channelLink.match(
        /https:\/\/t\.me\/([^\/]+)\/(\d+)/
      );
      if (linkMatch) {
        channelUsername = "@" + linkMatch[1];
        messageId = linkMatch[2];
      } else {
        // If link format is different, try to extract just the channel
        const channelMatch = adData.channelLink.match(
          /https:\/\/t\.me\/([^\/]+)/
        );
        if (channelMatch) {
          channelUsername = "@" + channelMatch[1];
        }
      }
    } catch (error) {
      console.error("Error parsing channel link:", error);
    }

    // Create new advertisement
    const newAd = new Advertisement({
      channelLink: adData.channelLink,
      messageId: messageId || Date.now().toString(),
      startDate: startDate,
      endDate: endDate,
      durationDays: adData.durationDays,
      durationHours: adData.durationHours,
      durationMinutes: adData.durationMinutes,
      totalMinutes: totalMinutes,
      description: adData.description,
      isActive: true,
      channelMessageIds:
        channelUsername && messageId
          ? [
              {
                channel: channelUsername,
                messageId: messageId,
              },
            ]
          : [],
    });

    await newAd.save();

    // Format duration text for success message
    let durationText = "";
    if (adData.durationDays > 0) {
      durationText += `${adData.durationDays} kun `;
    }
    if (adData.durationHours > 0) {
      durationText += `${adData.durationHours} soat `;
    }
    if (adData.durationMinutes > 0) {
      durationText += `${adData.durationMinutes} minut`;
    }
    if (!durationText) {
      durationText = "0 minut";
    }

    await bot.sendMessage(
      chatId,
      `✅ Reklama muvaffaqiyatli qo'shildi!\n\n📢 Tavsif: ${
        adData.description
      }\n⏰ Davomiylik: ${durationText.trim()}\n📅 Tugash sanasi: ${endDate.toLocaleString(
        "uz-UZ"
      )}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Admin Panel", callback_data: "admin_panel_button" }],
            [{ text: "📢 Reklamalar", callback_data: "view_ads" }],
          ],
        },
      }
    );

    // Clean up state
    delete userStates.awaitingAdData[chatId];
  } catch (error) {
    console.error("Error saving advertisement:", error);
    await bot.sendMessage(
      chatId,
      `❌ Reklama saqlashda xatolik: ${error.message}`
    );
  }
}

async function handleCancelAd(chatId, callbackQuery) {
  if (chatId.toString() !== adminId) return;

  delete userStates.awaitingAdData[chatId];

  await bot.sendMessage(chatId, "❌ Reklama qo'shish bekor qilindi.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Admin Panel", callback_data: "admin_panel_button" }],
        [{ text: "📢 Reklamalar", callback_data: "view_ads" }],
      ],
    },
  });
}

async function handleAdInput(chatId, msg) {
  if (chatId.toString() !== adminId) return;

  const adData = userStates.awaitingAdData[chatId];
  if (!adData) return;

  if (adData.step === "link") {
    // Validate link format
    const linkMatch = msg.text.match(/https:\/\/t\.me\/([^\/]+)\/(\d+)/);
    if (!linkMatch) {
      await bot.sendMessage(
        chatId,
        "❌ Noto'g'ri link format!\n\n" +
          "✅ To'g'ri format: https://t.me/channel_name/123\n" +
          "⚠️ Linkda post ID bo'lishi kerak (oxiridagi raqam)",
        { parse_mode: "HTML" }
      );
      return;
    }

    adData.channelLink = msg.text;
    adData.step = "description";

    await bot.sendMessage(
      chatId,
      "📝 Reklama tavsifini kiriting:\n<i>Misol: Yangi xizmatlar haqida ma'lumot</i>",
      {
        parse_mode: "HTML",
      }
    );
  } else if (adData.step === "description") {
    adData.description = msg.text;
    adData.step = "durationDays";

    await bot.sendMessage(
      chatId,
      "📅 Reklama davomiyligini kunlarda kiriting:\n<i>Misol: 7 (0 yozsa soat so'raladi)</i>",
      {
        parse_mode: "HTML",
      }
    );
  } else if (adData.step === "durationDays") {
    const days = parseInt(msg.text);
    if (isNaN(days) || days < 0) {
      await bot.sendMessage(
        chatId,
        "❌ Noto'g'ri kun. Iltimos, 0 yoki undan katta son kiriting."
      );
      return;
    }

    adData.durationDays = days;
    adData.step = "durationHours";

    await bot.sendMessage(
      chatId,
      "🕐 Reklama davomiyligini soatlarda kiriting:\n<i>Misol: 12 (0 yozsa minut so'raladi)</i>",
      {
        parse_mode: "HTML",
      }
    );
  } else if (adData.step === "durationHours") {
    const hours = parseInt(msg.text);
    if (isNaN(hours) || hours < 0 || hours > 23) {
      await bot.sendMessage(
        chatId,
        "❌ Noto'g'ri soat. Iltimos, 0-23 oralig'ida son kiriting."
      );
      return;
    }

    adData.durationHours = hours;
    adData.step = "durationMinutes";

    await bot.sendMessage(
      chatId,
      "⏱️ Reklama davomiyligini minutlarda kiriting:\n<i>Misol: 30 (0 yoki undan katta son)</i>",
      {
        parse_mode: "HTML",
      }
    );
  } else if (adData.step === "durationMinutes") {
    const minutes = parseInt(msg.text);
    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
      await bot.sendMessage(
        chatId,
        "❌ Noto'g'ri minut. Iltimos, 0-59 oralig'ida son kiriting."
      );
      return;
    }

    adData.durationMinutes = minutes;
    adData.step = "confirm";

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + adData.durationDays);
    endDate.setHours(endDate.getHours() + adData.durationHours);
    endDate.setMinutes(endDate.getMinutes() + adData.durationMinutes);

    // Format duration text
    let durationText = "";
    if (adData.durationDays > 0) {
      durationText += `${adData.durationDays} kun `;
    }
    if (adData.durationHours > 0) {
      durationText += `${adData.durationHours} soat `;
    }
    if (adData.durationMinutes > 0) {
      durationText += `${adData.durationMinutes} minut`;
    }
    if (!durationText) {
      durationText = "0 minut";
    }

    const confirmMessage = `📢 <b>Reklama ma'lumotlari:</b>

🔗 Kanal: ${adData.channelLink}
📝 Tavsif: ${adData.description}
⏰ Davomiylik: ${durationText.trim()}
📅 Boshlanish: ${startDate.toLocaleString("uz-UZ")}
📅 Tugash: ${endDate.toLocaleString("uz-UZ")}

✅ Tasdiqlash uchun "Tasdiqlash" tugmasini bosing:`;

    await bot.sendMessage(chatId, confirmMessage, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: "confirm_ad" },
            { text: "❌ Bekor qilish", callback_data: "cancel_ad" },
          ],
        ],
      },
    });
  }
}

console.log("🤖 Bot ishga tushdi!");
console.log("⏰ Scheduler o'rnatildi: reklama tekshiruvi har soat");

// Express server setup
app.get("/", (req, res) => {
  res.send("Telegram Bot is running!");
});

// Check if server is already running
let server;
try {
  server = app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
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
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT. Graceful shutdown...");
  if (server) {
    server.close(() => {
      console.log("✅ HTTP server closed.");
      mongoose.connection.close();
      console.log("✅ MongoDB connection closed.");
      process.exit(0);
    });
  } else {
    mongoose.connection.close();
    console.log("✅ MongoDB connection closed.");
    process.exit(0);
  }
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
  if (server) {
    server.close(() => {
      console.log("✅ HTTP server closed.");
      mongoose.connection.close();
      console.log("✅ MongoDB connection closed.");
      process.exit(0);
    });
  } else {
    mongoose.connection.close();
    console.log("✅ MongoDB connection closed.");
    process.exit(0);
  }
});
