let mongoose = require('mongoose');
let express = require('express');
let bodyParser = require('body-parser');
let schedule = require('node-schedule');
let util = require('util');

// Slackbot section
let SlackBot = require('slackbots');

require('dotenv').config({path: __dirname + '/.env'})

const token = process.env.BOT_TOKEN;

// create the bot
let bot = new SlackBot({
    token: token,
    name: 'Chores Bot'
});

const params = {
    icon_emoji: ':cat:',
    as_user: true
}

const daysOfTheWeek = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
}

bot.on('message', ( message ) => {
    if ( message.text && message.text.includes('<@UK0323283>') ) {
        bot.postMessage(message.user, 'meow!', params);
    }
});


// Database Function Section
let connection = mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });

const Schema = mongoose.Schema;
 
const ChoreSchema = new Schema({
    title: String,
    instructions: String,
    difficulty: { type: Number, min: 1, max: 4 },
    date: { type: Date, default: Date.now },
    creator: String,
    frequency: [{ type: Number, default: [0, 1, 2, 3, 4, 5, 6]}],
    deleted: { type: Boolean, default: false }
});

const Chore = mongoose.model('chore', ChoreSchema);

const getDeletedChores = () => {
    Chore.find({ deleted: true }, ( err, docs ) => {
        if (err) {
            console.log(err);
            return 400;
        }
        console.log(util.inspect(docs));
        return docs;
    });
}

const reinstateDeletedChore = ( choreId ) => {
    Chore.findById( choreId, ( err, chore ) => {
        if (err) {
            console.log(util.inspect(err));
            return 400;
        }

        chore.deleted = false;
        chore.save( errorCallback );
    });
}

const errorCallback = ( err ) => {
    if (err) {
        console.log(util.inspect(err));
        return 400;
    }
}

// Webserver section
const app = express();
const port = process.env.PORT || 3019;

app.use(express.static('src'));

let jsonParser = bodyParser.json();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/index.html');
});

app.get('/chores', (req, res) => {
    Chore.find({ deleted: false }, ( err, docs ) => {
        if (err) {
            console.log(util.inspect(err));
            return 400;
        }
        return res.json(docs);
    });
});

app.post('/add', jsonParser, (req, res) => {
    new Chore(req.body).save( (err, chore) => {
        if (!err) {
            res.sendStatus(200);

            bot.getChannel('chorebot').then(c => {
                bot.postMessageToChannel(c.name, `${chore.title} added by ${chore.creator}.`, params, function(data) {
                    console.log(data);
                });
            });
        }
    });
});

app.post('/delete', jsonParser, (req, res) => {
    Chore.findById( req.body.id, ( err, chore ) => {
        chore.deleted = true;
        chore.save( errorCallback );
        
        if (!err) {
            res.sendStatus(200);
            
            bot.getChannel('chorebot').then(c => {
                bot.postMessageToChannel(c.name, `${chore.title} removed.`, params, function(data) {
                    console.log(data);
                });
            });
        }
    });
});



// Close the server and db connection
let server = app.listen(port, () => console.log(`App listening on port ${port}.`));

process.on( 'SIGTERM', () => {
    console.log('Exiting.');

    server.close( () => {
      console.log('Server closed.');
    });
    
    connection.close( () => {
        console.log('Database connection closed.');
    })
 });

schedule.scheduleJob('* 10 * * *', (sched) => {

    Chore.find({ deleted: false }, ( err, docs ) => {
        if (err) {
            console.log(util.inspect(err));
            return 400;
        }

        docs = docs.filter( d => d.frequency.includes(new Date().getDay()) );

        bot.getChannel('chorebot').then(c => {
            bot.postMessageToChannel(c.name, `The scheduled chores for today are: ${docs.reduce( (acc, doc) => [...acc, doc.title], []).join(', ')}`, params, function(data) {
                console.log(data);
            });
        });
    });

})


// Google API auth section

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from env.
authorize(listOOOEvents);

function authorize(callback) {
    const {client_secret, client_id, redirect_uris} = {
        client_secret: process.env.client_secret, 
        client_id: process.env.client_id, 
        redirect_uris: ["urn:ietf:wg:oauth:2.0:oob","http://localhost"]
    }

    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
  
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
  }

function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            console.log('Token stored to', TOKEN_PATH);
        });
        callback(oAuth2Client);
        });
    });
}


function listOOOEvents(auth) {
    const calendar = google.calendar({version: 'v3', auth});
    calendar.events.list({
      calendarId: process.env.CALENDAR_ID,
      timeMin: (new Date(new Date().setHours(0,0,0,0))).toISOString(),
      timeMax: (new Date(new Date().setHours(23,59,59,0))).toISOString(),
      singleEvents: true,
      alwaysIncludeEmail: true,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const events = res.data.items;
      if (events.length) {
        let ooo = []
        console.log('Upcoming 10 events:');
        events.map((event, i) => {
          const start = event.start.dateTime || event.start.date;
          console.log(`${start} - ${event.summary}`);
          if ( !ooo.includes(event.creator.email) ) {
              ooo.push(event.creator.email)
          }
        });

        console.log(ooo.join(', '))
      } else {
        console.log('No upcoming events found.');
      }
    });
}