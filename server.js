const express = require('express');
const app = express();
const TelegramBot = require('node-telegram-bot-api');
const jwt = require('jsonwebtoken');
const opn = require('opn');
const rp = require('request-promise');

const bottoken = '';
const botid = '';
const email = ''
const APIKey = '';
const APISecret = '';

const payload = {
    iss: APIKey,
    exp: ((new Date()).getTime() + 5000)
};
const token = jwt.sign(payload, APISecret);
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

var opts2 = {
    reply_markup: {
        inline_keyboard: [
            [{
                text: "Terminate Call",
                callback_data: "13"
            }]
        ]
    }
};

var result = "";

app.post('/zoomcmd_on', async function(req, res) {
    console.log("zoomcmd_on");
    var total_records = await getCurrentMeeting();
    if (total_records === 0) {
        StartZoomMeeting(bot);
    }

    res.end();
})

app.post('/zoomcmd_off', async function(req, res) {
    console.log("zoomcmd_off");

    try {
        var response = await StopZoomMeeting(result.id);
        //console.log("response");
        console.log(response);
    } catch (err) {
        console.log('error: can\'t terminate call');
    }

    res.end();
})

var server = app.listen(8081, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
})


async function getCurrentMeeting() {
    const options = {
        method: "GET",
        uri: "https://api.zoom.us/v2/users/me/meetings?type=live",
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
        const response = await rp(options);
        return Promise.resolve(response.total_records);
    } catch (error) {
        return Promise.reject("error");
    }
}


async function StartZoomMeeting(bot) {
    screenOnOff("on");

    const options = {
        method: "POST",
        uri: "https://api.zoom.us/v2/users/" + email + "/meetings",
        body: {
            topic: "test create meeting",
            type: 1,
            settings: {
                host_video: "true",
                participant_video: "false",
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
        bot.sendMessage(botid, result.join_url, opts2);
    } catch (error) {
        console.log("API call failed, reason ", error);
    }
}

async function StopZoomMeeting(meetingID) {
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

bot.on("callback_query", async function(data) {
    const chatId = data.id;
    //console.log(data);
    // Get the callback data specified
    let callback_data = data.data
    //console.log(callback_data)
    if (callback_data === "13") {
        console.log("Terminating call..")

        try {
            var response = await StopZoomMeeting(result.id);
            //console.log("response");
            //console.log(response);

            if (response === "OK") {
                //https://github.com/yagop/node-telegram-bot-api/issues/622
                await bot.answerCallbackQuery(data.id, {
                    text: 'Call terminated'
                });
                console.log('Call terminated');
            } else {
                await bot.answerCallbackQuery(data.id, {
                    text: 'Error'
                });

                console.log('Error');
            }

        } catch (err) {
            console.log('error: can\'t terminate call');
            await bot.answerCallbackQuery(data.id, {
                text: 'Can\'t terminate call'
            });
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

