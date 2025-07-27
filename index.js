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

// Improved bot configuration with better error handling
const bot = new TelegramBot(token, {
  polling: {
    timeout: 60, // Increased from 30 to 60 seconds
    limit: 100,
    retryTimeout: 10000, // Increased from 5000 to 10000 ms
    autoStart: false,
    params: {
      timeout: 60, // Additional timeout parameter
    },
  },
  request: {
    timeout: 60000, // Increased from 30000 to 60000 ms
    connectTimeout: 60000, // Increased from 30000 to 60000 ms
    readTimeout: 60000, // Increased from 30000 to 60000 ms
    keepAlive: true, // Enable keep-alive
    keepAliveMsecs: 1000, // Keep-alive interval
    maxSockets: 50, // Maximum number of sockets
    maxFreeSockets: 10, // Maximum number of free sockets
  },
});

// Connection retry logic with exponential backoff
let retryCount = 0;
const maxRetries = 10; // Increased from 5 to 10
const baseRetryDelay = 5000; // Base delay of 5 seconds

async function startBot() {
  try {
    console.log("🤖 Bot ishga tushmoqda...");
    await bot.startPolling();
    console.log("✅ Bot muvaffaqiyatli ishga tushdi!");
    retryCount = 0; // Reset retry count on success
  } catch (error) {
    console.error("❌ Bot ishga tushirishda xatolik:", error);
    retryCount++;

    if (retryCount < maxRetries) {
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s, etc.
      const retryDelay = Math.min(
        baseRetryDelay * Math.pow(2, retryCount - 1),
        300000
      ); // Max 5 minutes
      console.log(
        `🔄 ${Math.round(
          retryDelay / 1000
        )} soniyadan keyin qayta urinish (${retryCount}/${maxRetries})...`
      );
      setTimeout(startBot, retryDelay);
    } else {
      console.error(
        "❌ Maksimal urinishlar soniga yetildi. Bot ishga tushmadi."
      );
      // Don't exit process, just log the error and keep trying
      console.log("🔄 5 daqiqadan keyin qayta urinish...");
      setTimeout(() => {
        retryCount = 0; // Reset retry count
        startBot();
      }, 300000); // 5 minutes
    }
  }
}

// Enhanced error handling with specific timeout error handling
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
    return;
  }

  // Handle network errors with specific timeout handling
  if (
    error.code === "ETIMEDOUT" ||
    error.code === "ECONNRESET" ||
    error.code === "ENOTFOUND" ||
    error.code === "ESOCKETTIMEDOUT" ||
    error.message?.includes("timeout") ||
    error.message?.includes("socket")
  ) {
    console.error("🌐 Tarmoq xatoligi:", error.message);
    console.log("🔄 Bot qayta ishga tushirilmoqda...");

    // Add delay before restarting to avoid rapid restarts
    setTimeout(async () => {
      try {
        if (bot.isPolling()) {
          await bot.stopPolling();
          console.log("✅ Bot polling to'xtatildi");
        }
        // Wait a bit more before restarting
        setTimeout(() => {
          startBot();
        }, 2000);
      } catch (err) {
        console.error("❌ Bot to'xtatishda xatolik:", err);
        // Force restart after delay
        setTimeout(() => {
          startBot();
        }, 5000);
      }
    }, 3000);
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
    return;
  }

  // Handle network errors with specific timeout handling
  if (
    error.code === "ETIMEDOUT" ||
    error.code === "ECONNRESET" ||
    error.code === "ENOTFOUND" ||
    error.code === "ESOCKETTIMEDOUT" ||
    error.message?.includes("timeout") ||
    error.message?.includes("socket")
  ) {
    console.error("🌐 Tarmoq xatoligi:", error.message);
    console.log("🔄 Bot qayta ishga tushirilmoqda...");

    // Add delay before restarting to avoid rapid restarts
    setTimeout(async () => {
      try {
        if (bot.isPolling()) {
          await bot.stopPolling();
          console.log("✅ Bot polling to'xtatildi");
        }
        // Wait a bit more before restarting
        setTimeout(() => {
          startBot();
        }, 2000);
      } catch (err) {
        console.error("❌ Bot to'xtatishda xatolik:", err);
        // Force restart after delay
        setTimeout(() => {
          startBot();
        }, 5000);
      }
    }, 3000);
  }
});

// MongoDB connection with improved error handling and reconnection logic
const mongoOptions = {
  serverSelectionTimeoutMS: 60000, // Increased from 30000
  socketTimeoutMS: 60000, // Increased from 45000
  connectTimeoutMS: 60000, // Increased from 30000
  maxPoolSize: 20, // Increased from 10
  minPoolSize: 2, // Increased from 1
  maxIdleTimeMS: 60000, // Increased from 30000
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000, // Heartbeat frequency
  // Removed deprecated options: bufferMaxEntries and bufferCommands
};

async function connectToMongoDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://qiyomovabdulloh3:postvacancy_bot@cluster0.h5ujkjt.mongodb.net/postvacancy_bot",
      mongoOptions
    );
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    // Retry connection after 5 seconds
    setTimeout(connectToMongoDB, 5000);
  }
}

// Initial MongoDB connection
connectToMongoDB();

// MongoDB connection events with reconnection logic
let mongoRetryCount = 0;
const maxMongoRetries = 5;

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
  mongoRetryCount = 0; // Reset retry count on successful connection
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
    console.error(
      "❌ Maximum MongoDB reconnection attempts reached. Stopping reconnection attempts."
    );
    // Don't exit the process, just log the error and continue without database
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
    console.error(
      "❌ Maximum MongoDB reconnection attempts reached. Stopping reconnection attempts."
    );
    // Don't exit the process, just log the error and continue without database
  }
});

// Periodic health check for bot and database
setInterval(() => {
  const botStatus = bot.isPolling();
  const dbStatus = mongoose.connection.readyState === 1;

  if (!botStatus) {
    console.log("⚠️ Bot polling stopped - attempting to restart...");
    startBot();
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
  { label: "👨‍💼 Mas'ul", required: false, example: "2-3 yil tajriba" },
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
    { step: 9, label: "Mas'ul" },
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

bot.onText(/\/admin-help/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === adminId) {
    const helpMessage = `
🔧 <b>Admin Komandalar</b>

📊 <b>Panel va Statistika:</b>
• <b>/admin-panel</b> - Admin panel va statistikalar
• <b>/admin-help</b> - Bu yordam sahifasi



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
      // Fetch comprehensive statistics from database
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const todayUsers = await User.countDocuments({
        registeredAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      });

      // Get vacancy statistics
      const totalVacanciesSubmitted = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$totalVacanciesSubmitted" } } },
      ]);
      const totalVacanciesApproved = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$totalVacanciesApproved" } } },
      ]);
      const totalVacanciesRejected = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$totalVacanciesRejected" } } },
      ]);

      // Get service statistics
      const totalServicesSubmitted = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$totalServicesSubmitted" } } },
      ]);
      const totalServicesApproved = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$totalServicesApproved" } } },
      ]);
      const totalServicesRejected = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$totalServicesRejected" } } },
      ]);

      // Get pending count
      const pendingCount = Object.keys(userStates.pendingPosts || {}).length;

      // Calculate totals
      const totalVacancies = totalVacanciesSubmitted[0]?.total || 0;
      const approvedVacancies = totalVacanciesApproved[0]?.total || 0;
      const rejectedVacancies = totalVacanciesRejected[0]?.total || 0;
      const totalServices = totalServicesSubmitted[0]?.total || 0;
      const approvedServices = totalServicesApproved[0]?.total || 0;
      const rejectedServices = totalServicesRejected[0]?.total || 0;

      const statsMessage = `
📊 <b>Admin Panel - Asosiy Statistika</b>

👥 <b>Foydalanuvchilar:</b>
● Jami: ${totalUsers}
● Faol: ${activeUsers}
● Bugun ro'yxatdan o'tgan: ${todayUsers}

📋 <b>Vakansiyalar:</b>
● Jami yuborilgan: ${totalVacancies}
● Tasdiqlangan: ${approvedVacancies}
● Rad etilgan: ${rejectedVacancies}
● Kutilmoqda: ${pendingCount}

⚙️ <b>Xizmatlar:</b>
● Jami yuborilgan: ${totalServices}
● Tasdiqlangan: ${approvedServices}
● Rad etilgan: ${rejectedServices}

📈 <b>Umumiy:</b>
● Jami e'lonlar: ${totalVacancies + totalServices}
● Muvaffaqiyat foizi: ${
        totalVacancies + totalServices > 0
          ? Math.round(
              ((approvedVacancies + approvedServices) /
                (totalVacancies + totalServices)) *
                100
            )
          : 0
      }%
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
              {
                text: "📊 Batafsil statistika",
                callback_data: "detailed_stats",
              },
            ],
            [
              {
                text: "🏆 Top foydalanuvchilar",
                callback_data: "top_users",
              },
              {
                text: "📅 Kunlik statistika",
                callback_data: "daily_stats",
              },
            ],
            [
              {
                text: "📋 Kutilmoqda e'lonlar",
                callback_data: "pending_posts",
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

    // Check if user is in active step process
    const isInVacancyProcess = userStates.awaitingVacancy[chatId];
    const isInServiceProcess = userStates.awaitingService[chatId];
    const isAwaitingPhone = userStates.awaitingPhoneNumber[chatId];

    // If user is in active process, only allow specific actions
    if (isInVacancyProcess || isInServiceProcess || isAwaitingPhone) {
      // Only allow cancel actions during active process
      if (
        data === "cancel_post" ||
        data === "cancel_service" ||
        data === "cancel_service_post"
      ) {
        if (data === "cancel_post") {
          await handlePostCancellation(chatId, callbackQuery);
        } else if (data === "cancel_service") {
          await handleCancelService(chatId);
        } else if (data === "cancel_service_post") {
          await handleServiceCancellation(chatId, callbackQuery);
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
              [{ text: "💼 Vakansiya joylash", callback_data: "post_vacancy" }],
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
    delete userStates.awaitingLinkTitle[chatId];
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
    delete userStates.awaitingLinkTitle[chatId];

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

  // Check if step is required
  if (step.required) {
    await bot.sendMessage(
      chatId,
      "⚠️ Bu maydon majburiy! O'tkazib yuborish mumkin emas.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
          ],
        },
      }
    );
    return;
  }

  // Special handling for link title step - skip both title and URL
  if (step.label === "🔗 Havola sarlavhasi") {
    userStates.awaitingVacancy[chatId].data[step.label] = "-";
    userStates.awaitingVacancy[chatId].data[steps[7].label] = "-"; // Skip URL step too
    userStates.awaitingVacancy[chatId].step += 2; // Skip both steps
    await handleNextStep(chatId);
    return;
  }

  // Special handling for link URL step - skip only URL
  if (step.label === "🔗 Havola URL") {
    userStates.awaitingVacancy[chatId].data[step.label] = "-";
    userStates.awaitingVacancy[chatId].step++;
    await handleNextStep(chatId);
    return;
  }

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

    // Create keyboard with skip button for non-required fields
    const keyboard = !nextStep.required
      ? {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "⏩ O'tkazib yuborish", callback_data: "skip" },
                { text: "❌ Bekor qilish", callback_data: "cancel_post" },
              ],
            ],
          },
        }
      : {
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
            ],
          },
        };

    await bot.sendMessage(
      chatId,
      `${nextStep.label}:\n<i>Misol: ${nextStep.example}</i>${
        nextStep.required ? "\n\n⚠️ Bu maydon majburiy!" : ""
      }`,
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

  // Validate input
  const inputText = msg.text.trim();

  // Check if input is empty
  if (!inputText || inputText.length === 0) {
    await bot.sendMessage(
      chatId,
      "⚠️ Iltimos, ma'lumot kiriting! Bo'sh xabar yuborish mumkin emas.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
          ],
        },
      }
    );
    return;
  }

  // Check input length
  if (inputText.length > 500) {
    await bot.sendMessage(
      chatId,
      "⚠️ Xabar juda uzun! Iltimos, 500 belgidan kamroq kiriting.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
          ],
        },
      }
    );
    return;
  }

  let processedValue = inputText;

  // Validate specific fields
  if (step.label.includes("Telegram")) {
    processedValue = validateTelegramUsername(inputText);
    if (processedValue === "invalid") {
      await bot.sendMessage(
        chatId,
        "⚠️ Noto'g'ri Telegram username! Iltimos, to'g'ri formatda kiriting (masalan: @username yoki username)",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
            ],
          },
        }
      );
      return;
    }
  }

  // Validate phone number if it's contact field
  if (step.label.includes("Aloqa") && inputText.includes("+998")) {
    const phoneValidation = validatePhoneNumber(inputText);
    if (phoneValidation === "invalid") {
      await bot.sendMessage(
        chatId,
        "⚠️ Noto'g'ri telefon raqam! Iltimos, to'g'ri formatda kiriting (masalan: +998 90 123 45 67)",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
            ],
          },
        }
      );
      return;
    }
  }

  // Validate URL if it's link field
  if (step.label.includes("Havola URL") && inputText !== "-") {
    try {
      new URL(inputText);
    } catch (error) {
      await bot.sendMessage(
        chatId,
        "⚠️ Noto'g'ri URL! Iltimos, to'g'ri havola kiriting (masalan: https://example.com)",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Bekor qilish", callback_data: "cancel_post" }],
            ],
          },
        }
      );
      return;
    }
  }

  // Save the input
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
  delete userStates.awaitingLinkTitle[chatId];
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
    // Update user statistics
    if (post.chatId && mongoose.connection.readyState === 1) {
      try {
        const user = await User.findOne({ chatId: post.chatId.toString() });
        if (user) {
          if (post.type === "service") {
            user.totalServicesSubmitted += 1;
            user.totalServicesApproved += 1;
          } else {
            user.totalVacanciesSubmitted += 1;
            user.totalVacanciesApproved += 1;
          }
          user.lastActivity = new Date();
          await user.save();
        }
      } catch (dbError) {
        console.error("Error updating user statistics:", dbError);
      }
    }

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
  // Update user statistics
  if (post.chatId && mongoose.connection.readyState === 1) {
    try {
      const user = await User.findOne({ chatId: post.chatId.toString() });
      if (user) {
        if (post.type === "service") {
          user.totalServicesSubmitted += 1;
          user.totalServicesRejected += 1;
        } else {
          user.totalVacanciesSubmitted += 1;
          user.totalVacanciesRejected += 1;
        }
        user.lastActivity = new Date();
        await user.save();
      }
    } catch (dbError) {
      console.error("Error updating user statistics:", dbError);
    }
  }

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

// Pagination state for user list
const userListPagination = {};

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
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find()
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limit);

    if (users.length === 0) {
      await bot.sendMessage(chatId, "📝 Hech qanday foydalanuvchi topilmadi.");
      return;
    }

    let userListMessage = `👥 <b>Foydalanuvchilar ro'yxati</b>\n`;
    userListMessage += `📊 Sahifa ${page} / ${Math.ceil(totalUsers / limit)}\n`;
    userListMessage += `📈 Jami: ${totalUsers} foydalanuvchi\n\n`;

    users.forEach((user, index) => {
      const registeredDate = new Date(user.registeredAt).toLocaleDateString(
        "uz-UZ"
      );
      const userName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : "Noma'lum";
      const username = user.username ? `(@${user.username})` : "";

      userListMessage += `${
        skip + index + 1
      }. <b>${userName}</b> ${username}\n`;
      userListMessage += `   📱 ${user.phoneNumber}\n`;
      userListMessage += `   📅 ${registeredDate}\n`;
      userListMessage += `   📊 Vakansiya: ${
        user.totalVacanciesSubmitted || 0
      } | Xizmat: ${user.totalServicesSubmitted || 0}\n\n`;
    });

    // Create pagination buttons
    const keyboard = [];
    const totalPages = Math.ceil(totalUsers / limit);

    if (totalPages > 1) {
      const row = [];
      if (page > 1) {
        row.push({
          text: "⬅️ Oldingi",
          callback_data: `user_page_${page - 1}`,
        });
      }
      if (page < totalPages) {
        row.push({
          text: "Keyingi ➡️",
          callback_data: `user_page_${page + 1}`,
        });
      }
      keyboard.push(row);
    }

    keyboard.push([{ text: "🔙 Orqaga", callback_data: "back_to_admin" }]);

    await bot.sendMessage(chatId, userListMessage, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboard,
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
    // Get comprehensive statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const todayUsers = await User.countDocuments({
      registeredAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });

    // Get vacancy statistics
    const vacancyStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalSubmitted: { $sum: "$totalVacanciesSubmitted" },
          totalApproved: { $sum: "$totalVacanciesApproved" },
          totalRejected: { $sum: "$totalVacanciesRejected" },
        },
      },
    ]);

    // Get service statistics
    const serviceStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalSubmitted: { $sum: "$totalServicesSubmitted" },
          totalApproved: { $sum: "$totalServicesApproved" },
          totalRejected: { $sum: "$totalServicesRejected" },
        },
      },
    ]);

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayVacancies = await User.aggregate([
      {
        $match: { lastActivity: { $gte: today } },
      },
      {
        $group: {
          _id: null,
          totalSubmitted: { $sum: "$totalVacanciesSubmitted" },
          totalApproved: { $sum: "$totalVacanciesApproved" },
        },
      },
    ]);

    const stats = vacancyStats[0] || {
      totalSubmitted: 0,
      totalApproved: 0,
      totalRejected: 0,
    };
    const serviceStatsData = serviceStats[0] || {
      totalSubmitted: 0,
      totalApproved: 0,
      totalRejected: 0,
    };
    const todayStats = todayVacancies[0] || {
      totalSubmitted: 0,
      totalApproved: 0,
    };

    const detailedMessage = `
📊 <b>Batafsil Statistika</b>

👥 <b>Foydalanuvchilar:</b>
● Jami: ${totalUsers}
● Faol: ${activeUsers}
● Bugun ro'yxatdan o'tgan: ${todayUsers}

📋 <b>Vakansiyalar:</b>
● Jami yuborilgan: ${stats.totalSubmitted}
● Tasdiqlangan: ${stats.totalApproved}
● Rad etilgan: ${stats.totalRejected}
● Muvaffaqiyat foizi: ${
      stats.totalSubmitted > 0
        ? Math.round((stats.totalApproved / stats.totalSubmitted) * 100)
        : 0
    }%

⚙️ <b>Xizmatlar:</b>
● Jami yuborilgan: ${serviceStatsData.totalSubmitted}
● Tasdiqlangan: ${serviceStatsData.totalApproved}
● Rad etilgan: ${serviceStatsData.totalRejected}
● Muvaffaqiyat foizi: ${
      serviceStatsData.totalSubmitted > 0
        ? Math.round(
            (serviceStatsData.totalApproved / serviceStatsData.totalSubmitted) *
              100
          )
        : 0
    }%

📅 <b>Bugungi faollik:</b>
● Vakansiya yuborilgan: ${todayStats.totalSubmitted}
● Tasdiqlangan: ${todayStats.totalApproved}

📈 <b>Umumiy ko'rsatkichlar:</b>
● Jami e'lonlar: ${stats.totalSubmitted + serviceStatsData.totalSubmitted}
● Umumiy muvaffaqiyat: ${
      stats.totalSubmitted + serviceStatsData.totalSubmitted > 0
        ? Math.round(
            ((stats.totalApproved + serviceStatsData.totalApproved) /
              (stats.totalSubmitted + serviceStatsData.totalSubmitted)) *
              100
          )
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

// Top foydalanuvchilar
async function handleTopUsers(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;

  if (chatId.toString() !== adminId) {
    await bot.sendMessage(
      chatId,
      "⛔️ Sizda admin panelini ko'rish huquqi yo'q."
    );
    return;
  }

  try {
    // Top vakansiya yuborgan foydalanuvchilar
    const topVacancyUsers = await User.find({
      totalVacanciesSubmitted: { $gt: 0 },
    })
      .sort({ totalVacanciesSubmitted: -1 })
      .limit(5);

    // Top xizmat yuborgan foydalanuvchilar
    const topServiceUsers = await User.find({
      totalServicesSubmitted: { $gt: 0 },
    })
      .sort({ totalServicesSubmitted: -1 })
      .limit(5);

    // Top muvaffaqiyatli foydalanuvchilar
    const topSuccessfulUsers = await User.find({
      $or: [
        { totalVacanciesApproved: { $gt: 0 } },
        { totalServicesApproved: { $gt: 0 } },
      ],
    })
      .sort({
        totalVacanciesApproved: -1,
        totalServicesApproved: -1,
      })
      .limit(5);

    let message = "🏆 <b>Top Foydalanuvchilar</b>\n\n";

    // Top vakansiya yuborganlar
    message += "📋 <b>Eng ko'p vakansiya yuborganlar:</b>\n";
    topVacancyUsers.forEach((user, index) => {
      const userName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : "Noma'lum";
      const username = user.username ? `@${user.username}` : "Username yo'q";
      message += `${index + 1}. ${userName} (${username})\n`;
      message += `   📊 Yuborilgan: ${user.totalVacanciesSubmitted} | Tasdiqlangan: ${user.totalVacanciesApproved}\n\n`;
    });

    // Top xizmat yuborganlar
    message += "⚙️ <b>Eng ko'p xizmat yuborganlar:</b>\n";
    topServiceUsers.forEach((user, index) => {
      const userName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : "Noma'lum";
      const username = user.username ? `@${user.username}` : "Username yo'q";
      message += `${index + 1}. ${userName} (${username})\n`;
      message += `   📊 Yuborilgan: ${user.totalServicesSubmitted} | Tasdiqlangan: ${user.totalServicesApproved}\n\n`;
    });

    // Top muvaffaqiyatli
    message += "✅ <b>Eng muvaffaqiyatli foydalanuvchilar:</b>\n";
    topSuccessfulUsers.forEach((user, index) => {
      const userName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : "Noma'lum";
      const username = user.username ? `@${user.username}` : "Username yo'q";
      const totalApproved =
        user.totalVacanciesApproved + user.totalServicesApproved;
      message += `${index + 1}. ${userName} (${username})\n`;
      message += `   📊 Tasdiqlangan: ${totalApproved}\n\n`;
    });

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Orqaga", callback_data: "back_to_admin" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleTopUsers:", error);
    await bot.sendMessage(
      chatId,
      "❌ Top foydalanuvchilarni yuklashda xatolik yuz berdi."
    );
  }
}

// Kunlik statistika
async function handleDailyStats(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;

  if (chatId.toString() !== adminId) {
    await bot.sendMessage(
      chatId,
      "⛔️ Sizda admin panelini ko'rish huquqi yo'q."
    );
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Bugungi statistika
    const todayUsers = await User.countDocuments({
      registeredAt: { $gte: today },
    });

    const todayVacancies = await User.aggregate([
      {
        $match: { lastActivity: { $gte: today } },
      },
      {
        $group: {
          _id: null,
          submitted: { $sum: "$totalVacanciesSubmitted" },
          approved: { $sum: "$totalVacanciesApproved" },
          rejected: { $sum: "$totalVacanciesRejected" },
        },
      },
    ]);

    const todayServices = await User.aggregate([
      {
        $match: { lastActivity: { $gte: today } },
      },
      {
        $group: {
          _id: null,
          submitted: { $sum: "$totalServicesSubmitted" },
          approved: { $sum: "$totalServicesApproved" },
          rejected: { $sum: "$totalServicesRejected" },
        },
      },
    ]);

    // Kechagi statistika
    const yesterdayUsers = await User.countDocuments({
      registeredAt: { $gte: yesterday, $lt: today },
    });

    const yesterdayVacancies = await User.aggregate([
      {
        $match: { lastActivity: { $gte: yesterday, $lt: today } },
      },
      {
        $group: {
          _id: null,
          submitted: { $sum: "$totalVacanciesSubmitted" },
          approved: { $sum: "$totalVacanciesApproved" },
          rejected: { $sum: "$totalVacanciesRejected" },
        },
      },
    ]);

    const yesterdayServices = await User.aggregate([
      {
        $match: { lastActivity: { $gte: yesterday, $lt: today } },
      },
      {
        $group: {
          _id: null,
          submitted: { $sum: "$totalServicesSubmitted" },
          approved: { $sum: "$totalServicesApproved" },
          rejected: { $sum: "$totalServicesRejected" },
        },
      },
    ]);

    const todayStats = todayVacancies[0] || {
      submitted: 0,
      approved: 0,
      rejected: 0,
    };
    const todayServiceStats = todayServices[0] || {
      submitted: 0,
      approved: 0,
      rejected: 0,
    };
    const yesterdayStats = yesterdayVacancies[0] || {
      submitted: 0,
      approved: 0,
      rejected: 0,
    };
    const yesterdayServiceStats = yesterdayServices[0] || {
      submitted: 0,
      approved: 0,
      rejected: 0,
    };

    const message = `
📅 <b>Kunlik Statistika</b>

📊 <b>Bugun (${today.toLocaleDateString("uz-UZ")}):</b>
👥 Yangi foydalanuvchilar: ${todayUsers}
📋 Vakansiyalar: ${todayStats.submitted} yuborilgan, ${
      todayStats.approved
    } tasdiqlangan
⚙️ Xizmatlar: ${todayServiceStats.submitted} yuborilgan, ${
      todayServiceStats.approved
    } tasdiqlangan

📊 <b>Kecha (${yesterday.toLocaleDateString("uz-UZ")}):</b>
👥 Yangi foydalanuvchilar: ${yesterdayUsers}
📋 Vakansiyalar: ${yesterdayStats.submitted} yuborilgan, ${
      yesterdayStats.approved
    } tasdiqlangan
⚙️ Xizmatlar: ${yesterdayServiceStats.submitted} yuborilgan, ${
      yesterdayServiceStats.approved
    } tasdiqlangan

📈 <b>O'zgarish:</b>
👥 Foydalanuvchilar: ${todayUsers > yesterdayUsers ? "+" : ""}${
      todayUsers - yesterdayUsers
    }
📋 Vakansiyalar: ${todayStats.submitted > yesterdayStats.submitted ? "+" : ""}${
      todayStats.submitted - yesterdayStats.submitted
    }
⚙️ Xizmatlar: ${
      todayServiceStats.submitted > yesterdayServiceStats.submitted ? "+" : ""
    }${todayServiceStats.submitted - yesterdayServiceStats.submitted}
    `;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Orqaga", callback_data: "back_to_admin" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handleDailyStats:", error);
    await bot.sendMessage(
      chatId,
      "❌ Kunlik statistikani yuklashda xatolik yuz berdi."
    );
  }
}

// Kutilmoqda e'lonlar
async function handlePendingPosts(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;

  if (chatId.toString() !== adminId) {
    await bot.sendMessage(
      chatId,
      "⛔️ Sizda admin panelini ko'rish huquqi yo'q."
    );
    return;
  }

  try {
    const pendingPosts = Object.keys(userStates.pendingPosts || {});

    if (pendingPosts.length === 0) {
      await bot.sendMessage(chatId, "📋 Kutilmoqda e'lonlar yo'q.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Orqaga", callback_data: "back_to_admin" }],
          ],
        },
      });
      return;
    }

    let message = `📋 <b>Kutilmoqda E'lonlar (${pendingPosts.length} ta)</b>\n\n`;

    pendingPosts.forEach((messageId, index) => {
      const post = userStates.pendingPosts[messageId];
      if (post) {
        const userName = post.userInfo
          ? post.userInfo.split("\n")[1]?.replace("● Username: ", "") ||
            "Noma'lum"
          : "Noma'lum";
        const postType = post.type === "service" ? "⚙️ Xizmat" : "📋 Vakansiya";
        message += `${index + 1}. ${postType} - ${userName}\n`;
        message += `   📅 ID: ${messageId}\n\n`;
      }
    });

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Orqaga", callback_data: "back_to_admin" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error in handlePendingPosts:", error);
    await bot.sendMessage(
      chatId,
      "❌ Kutilmoqda e'lonlarni yuklashda xatolik yuz berdi."
    );
  }
}

// Foydalanuvchilar sahifasi
async function handleUserPage(callbackQuery, data) {
  const chatId = callbackQuery.message.chat.id;
  const page = parseInt(data.split("_")[2]);

  if (chatId.toString() !== adminId) {
    await bot.sendMessage(
      chatId,
      "⛔️ Sizda admin panelini ko'rish huquqi yo'q."
    );
    return;
  }

  try {
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find()
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limit);

    if (users.length === 0) {
      await bot.sendMessage(chatId, "📝 Bu sahifada foydalanuvchilar yo'q.");
      return;
    }

    let userListMessage = `👥 <b>Foydalanuvchilar ro'yxati</b>\n`;
    userListMessage += `📊 Sahifa ${page} / ${Math.ceil(totalUsers / limit)}\n`;
    userListMessage += `📈 Jami: ${totalUsers} foydalanuvchi\n\n`;

    users.forEach((user, index) => {
      const registeredDate = new Date(user.registeredAt).toLocaleDateString(
        "uz-UZ"
      );
      const userName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : "Noma'lum";
      const username = user.username ? `(@${user.username})` : "";

      userListMessage += `${
        skip + index + 1
      }. <b>${userName}</b> ${username}\n`;
      userListMessage += `   📱 ${user.phoneNumber}\n`;
      userListMessage += `   📅 ${registeredDate}\n`;
      userListMessage += `   📊 Vakansiya: ${
        user.totalVacanciesSubmitted || 0
      } | Xizmat: ${user.totalServicesSubmitted || 0}\n\n`;
    });

    // Create pagination buttons
    const keyboard = [];
    const totalPages = Math.ceil(totalUsers / limit);

    if (totalPages > 1) {
      const row = [];
      if (page > 1) {
        row.push({
          text: "⬅️ Oldingi",
          callback_data: `user_page_${page - 1}`,
        });
      }
      if (page < totalPages) {
        row.push({
          text: "Keyingi ➡️",
          callback_data: `user_page_${page + 1}`,
        });
      }
      keyboard.push(row);
    }

    keyboard.push([{ text: "🔙 Orqaga", callback_data: "back_to_admin" }]);

    await bot.editMessageText(userListMessage, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  } catch (error) {
    console.error("Error in handleUserPage:", error);
    await bot.sendMessage(
      chatId,
      "❌ Foydalanuvchilar sahifasini yuklashda xatolik yuz berdi."
    );
  }
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

  // Validate input
  const inputText = msg.text.trim();

  // Check if input is empty
  if (!inputText || inputText.length === 0) {
    await bot.sendMessage(
      chatId,
      "⚠️ Iltimos, ma'lumot kiriting! Bo'sh xabar yuborish mumkin emas.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_service_post" }],
          ],
        },
      }
    );
    return;
  }

  // Check input length
  if (inputText.length > 500) {
    await bot.sendMessage(
      chatId,
      "⚠️ Xabar juda uzun! Iltimos, 500 belgidan kamroq kiriting.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Bekor qilish", callback_data: "cancel_service_post" }],
          ],
        },
      }
    );
    return;
  }

  let processedValue = inputText;

  // Validate specific fields
  if (step.label.includes("Aloqa") && inputText.includes("+998")) {
    const phoneValidation = validatePhoneNumber(inputText);
    if (phoneValidation === "invalid") {
      await bot.sendMessage(
        chatId,
        "⚠️ Noto'g'ri telefon raqam! Iltimos, to'g'ri formatda kiriting (masalan: +998 90 123 45 67)",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "❌ Bekor qilish",
                  callback_data: "cancel_service_post",
                },
              ],
            ],
          },
        }
      );
      return;
    }
  }

  // Validate URL if it's portfolio or website field
  if (
    (step.label.includes("Portfolio") || step.label.includes("Website")) &&
    inputText !== "-"
  ) {
    try {
      new URL(inputText);
    } catch (error) {
      await bot.sendMessage(
        chatId,
        "⚠️ Noto'g'ri URL! Iltimos, to'g'ri havola kiriting (masalan: https://example.com)",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "❌ Bekor qilish",
                  callback_data: "cancel_service_post",
                },
              ],
            ],
          },
        }
      );
      return;
    }
  }

  // Save the input
  userStates.awaitingService[chatId].data[step.label] =
    escapeHTML(processedValue);
  userStates.awaitingService[chatId].step++;

  await handleServiceNextStep(chatId);
}

async function handleServiceNextStep(chatId) {
  const currentState = userStates.awaitingService[chatId];
  if (!currentState) return;

  if (currentState.step < serviceSteps.length) {
    const nextStep = serviceSteps[currentState.step];

    // Create keyboard with cancel button
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Bekor qilish", callback_data: "cancel_service_post" }],
        ],
      },
    };

    await bot.sendMessage(
      chatId,
      `${nextStep.label}:\n<i>Misol: ${nextStep.example}</i>${
        nextStep.required ? "\n\n⚠️ Bu maydon majburiy!" : ""
      }`,
      {
        ...keyboard,
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
    // Start bot after server is running
    startBot();
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

// Health check endpoint
app.get("/health", (req, res) => {
  const botStatus = bot.isPolling();
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

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Graceful shutdown...`);

  try {
    // Stop bot polling
    if (bot.isPolling()) {
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
