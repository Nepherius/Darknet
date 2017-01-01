
const winston = require('winston');
const prompt = require('prompt');
const connect = require('./system/core/connect');
const main = require('./main');
const mongoose = require('bluebird').promisifyAll(require('mongoose'));
const GlobalFn = require('./system/globals');
const Login = require('./config/models/login.js');
const Settings = require('./config/models/settings.js');
const _ = require('lodash');
const replica_event = require('./system/replica/replica_event');
const start = startBot;


mongoose.connect('mongodb://localhost/darknet'); // connect to/create Database

let HOST, PORT;

// Check if login info exists;
settingsExists();
Login.findOne({}, function(err, result) {
    if (err) {
        winston.error('Error ' + err);

    } else if (!result) {
        winston.warn('Login info not found, creating config... \n');
        prompt.start();
        prompt.get(schema, function(err, result) {

            if (result.dimension === 1) {
                HOST = 'chat.d1.funcom.com';
                PORT = 7105;
            } else if (result.dimension === 2) {
                HOST = 'chat.dt.funcom.com';
                PORT = 7109;
            } else {
                winston.warn('Invalid Dimension Selected');
                process.exitCode = 1;
            }

            const newLogin = new Login();
            newLogin.username = result.user;
            newLogin.password = result.password;
            newLogin.dimension = result.dimension;
            newLogin.botname = _.capitalize(result.botname);
            newLogin.owner = _.capitalize(result.owner);

            // Save Login info to db

            newLogin.save(function(err) {
                if (err) {
                    throw err;
                }
                winston.info('Config saved!');

                GlobalFn.Login = result.username;
                GlobalFn.Pass = result.password;
                GlobalFn.botname = _.capitalize(result.botname);
                GlobalFn.owner = _.capitalize(result.owner);

                start(HOST, PORT);
            });

        });
    } else {
        if (result.dimension === 1) {
            HOST = 'chat.d1.funcom.com';
            PORT = 7105;
        } else if (result.dimension === 2) {
            HOST = 'chat.dt.funcom.com';
            PORT = 7109;
        } else {
            winston.info('Invalid Dimension Selected');
            process.exitCode = 1;
        }
        //TODO Fix me. global login details
        GlobalFn.Login = result.username;
        GlobalFn.Pass = result.password;
        GlobalFn.owner = result.owner;
        GlobalFn.botname = result.botname;



        start(HOST, PORT);
    }
});


function settingsExists() {
    Settings.find({}, function(err, result) {
        if (result.length > 0) {
            winston.info('Settings found.');
        } else {
            winston.warn('No Settings found, writing defaults now!');
            let newSettings = new Settings({});
            newSettings.save(function(err) {
                if (err) {
                    winston.error(err);
                    process.exitCode = 1;
                }
            });
        }
    });
}


var schema = {
    properties: {
        user: {
            description: 'Account Username',
            pattern: /^[a-zA-Z\0-9]+$/,
            message: 'User must be only letters or numbers',
            required: true
        },
        password: {
            description: 'Account Password',
            required: true
        },
        botname: {
            description: 'Enter the character name the bot will run on',
            required: true
        },
        dimension: {
            description: 'Choose dimension (1 - Rubi-Ka, 2 - Test)',
            type: 'number',
            pattern: /^[1-2]+$/,
            message: 'Numbers only, 1 OR 2',
            default: 1
        },
        owner: {
            description: 'Enter the name of the character you wish to be super-admin',
            required: true
        }
    }
};
