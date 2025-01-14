/*
Do not forget to create a .env file with the following two variables set:

SESSION_TOKEN=
CHROME_PATH=

See documentation for help
*/
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
require("dotenv").config();

// Create whatsapp client instance
const whatsapp = new Client({
  puppeteer: {
    executablePath: process.env.CHROME_PATH,
  },
  authStrategy: new LocalAuth(),
});

// Initialize conversation storage
const conversations = {};

whatsapp.initialize();

// This will output a QR code to the console, scan this with the WhatsApp app on the account that will be dedicated to chatGPT
whatsapp.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

whatsapp.on("authenticated", () => {
  console.log("Authentication complete");
});
whatsapp.on("ready", () => {
  console.log("Ready to accept messages");
});

async function main() {
  const { ChatGPTAPI } = await import("chatgpt");

  const chatgpt = new ChatGPTAPI({ sessionToken: process.env.SESSION_TOKEN, clearanceToken: process.env.CLEARANCE_TOKEN });

  await chatgpt.ensureAuth();

  whatsapp.on("message", (message) => {
    (async () => {
      console.log(
        `From: ${message._data.id.remote} (${message._data.notifyName})`
      );

      console.log(`Message: ${message.body}`);

      // Do we already have a conversation for this sender, or is the user resetting this conversation?
      if (
        conversations[message._data.id.remote] === undefined ||
        message.body === "reset"
      ) {
        console.log(`Creating new conversation for ${message._data.id.remote}`);
        if (message.body === "reset") {
          message.reply("Conversation reset");
          return;
        }
        conversations[message._data.id.remote] = chatgpt.getConversation();
      }

      const response = await conversations[message._data.id.remote].sendMessage(
        message.body
      );

      console.log(`Response: ${response}`);

      message.reply(response);
    })();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const sleep = (waitTimeInMs) =>
  new Promise((resolve) => setTimeout(resolve, waitTimeInMs));
