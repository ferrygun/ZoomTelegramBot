const TelegramBot = require('node-telegram-bot-api');

// Create a bot that uses 'polling' to fetch new updates
const bottoken = 'YOUR_TELEGRAM_BOT_TOKEN';
const botid = 'YOUR_TELEGRAM_BOT_ID';
const email = 'YOUR_EMAIL_ADDRESS'

const APIKey = 'YOUR_ZOOM_JWT_API_KEY';
const APISecret = 'YOUR_ZOOM_JWT_API_SECRET';


const bot = new TelegramBot(bottoken, {
    polling: true
});

var opts = {
    reply_markup: {
        inline_keyboard: [
            [{
                text: "Terminate Call",
                callback_data: "13"
            }],
            [{
                text: "Initiate Call",
                callback_data: "18"
            }]
        ]
    }
};

var opts1 = {
    reply_markup: {
        inline_keyboard: [
            [{
                text: "Initiate Call",
                callback_data: "18"
            }]
        ]
    }
};

var result = "";
var flag = 0;
const jwt = require('jsonwebtoken');
const opn = require('opn');

//Use the ApiKey and APISecret from config.js
const payload = {
    iss: APIKey,
    exp: ((new Date()).getTime() + 5000)
};
const token = jwt.sign(payload, APISecret);
const rp = require('request-promise');

async function screenOnOff(input) {
    if(input === "on") {
        screen = "screenOn";
    } else {
        screen = "screenOff";
    }
    const options = {
        method: "POST",
        uri: "http://localhost:2323/?cmd=" + screen + "&type=json&password=123",
        
        headers: {
            "User-Agent": "Zoom-api-Jwt-Request",
            "content-type": "application/json"
        },
        json: true 
    };

    try {
        const response = await rp(options);
        result = JSON.stringify(response);
        result = JSON.parse(result);
        
    } catch (error) {
        console.log("API call failed, reason ", error);
    }
}

async function StartZoomMeeting(bot, flag) {
    screenOnOff("on");

    const options = {
        method: "POST",
        uri: "https://api.zoom.us/v2/users/" + email + "/meetings",
        body: {
            topic: "test create meeting",
            type: 1,
            settings: {
                host_video: "true",
                participant_video: "true",
                approval_type: 0
            }
        },
        auth: {
            bearer: token
        },
        headers: {
            "User-Agent": "Zoom-api-Jwt-Request",
            "content-type": "application/json"
        },
        json: true 
    };

    try {

        if (flag === 1) {
                const response = await rp(options);
                result = JSON.stringify(response);
                result = JSON.parse(result);
                //console.log(result.start_url);
                //opn(result.start_url);

                var proc = require('child_process').spawn("xdg-open", [result.start_url]);

                function killBrowser(arg) {
                        console.log(`arg=> ${arg}`);
                        proc.kill('SIGINT');
                }

                setTimeout(killBrowser, 15000, 'close browser');

                //send bot
                bot.sendMessage(botid, result.join_url, opts);
        } else {
                bot.sendMessage(botid, "Zoom Bot", opts1);
        }
    } catch (error) {
        console.log("API call failed, reason ", error);
    }
}

bot.on("callback_query", async function(data) {
    const chatId = data.id;
    //console.log(data);
    // Get the callback data specified
    let callback_data = data.data
    //console.log(callback_data)
    if (callback_data === "13") {
        console.log("Terminating call..")

        try {
            var response = await UpdateZoomMeeting(result.id);
            //console.log("response");
            //console.log(response);

            if (response === "OK") {
                //https://github.com/yagop/node-telegram-bot-api/issues/622
                await bot.answerCallbackQuery(data.id, {
                    text: 'Call terminated'
                });
                flag = 0;
            } else {
                await bot.answerCallbackQuery(data.id, {
                    text: 'Error'
                });
                flag = 0;
            }

        } catch (err) {
            console.log('error: can\'t terminate call');
            await bot.answerCallbackQuery(data.id, {
                text: 'Can\'t terminate call'
            });
            flag = 0;
        }
    }

    if (callback_data === "18") {
        console.log("Initiating call..")

        if (flag === 0) {
            console.log("here you go - initiate call");
            flag = 1;
            StartZoomMeeting(bot, 1);
        } else {
            console.log('error: can\'t initiate call');
            await bot.answerCallbackQuery(data.id, {
                text: 'Can\'t initiate call. Please terminate it first'
            });
        }

    }
});

bot.on('polling_error', error => console.log(error))

bot.on('message', (msg) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  const chatId = msg.chat.id;

  // send back the matched "whatever" to the chat
  //bot.sendMessage(chatId, resp);
  bot.sendMessage(botid, "Zoom Bot", opts1);
});

async function UpdateZoomMeeting(meetingID) {
    screenOnOff("off");

    const options = {
        // To update the meeting ID with status 'end'
        method: "PUT",
        uri: "https://api.zoom.us/v2/meetings/" + meetingID + "/status",
        body: {
            "action": "end"
        },
        auth: {
            bearer: token
        },
        json: true
    };

    try {
        const response = await rp(options);
        return Promise.resolve("OK");
    } catch (error) {
        return Promise.reject("error");
    }
}

console.log("Starting Bot...");
StartZoomMeeting(bot, 0);

