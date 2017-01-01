// Import all commands from modules, export them to main file and register to DB
const winston = require('winston');
/****************** Import Command Modules ******************/

const Command = require('../config/models/commands.js');
// Core Commands
const Cmd = require('./core/core_commands');

//Additional Commands
const shopnetwork = require('./core/shopnetwork');

/************ Add Imported Commands ************/

//General
Cmd.status = status;
Cmd.general = general;
Cmd.wts = wts;
Cmd.wtb = wtb;
Cmd.lr = lr;
Cmd.lock = lock;
Cmd.unlock = unlock;
Cmd.pvm = pvm;
//Cmd.replicastatus = replicastatus;

//MISC

/************ Export Commands To Index ************/
module.exports = Cmd;

/********** Register Commands to Database **********/

let cmdList = [{
    cmdName: 'about',
    description: 'General Bot information',
    help: 'about',
}, {
    cmdName: 'rules',
    description: 'Darknet usage rules',
    help: '!rules',
}, {
    cmdName: 'shutdown',
    description: 'Shutdown bot.',
    help: '!shutdown',
    accessRequired: 3
}, {
    cmdName: 'invite',
    description: 'Invite player to guest channel.',
    help: '!invite [player name]',
    accessRequired: 2
}, {
    cmdName: 'join',
    description: 'Join guest channel.',
    help: '!join',
    accessRequired: 2
}, {
    cmdName: 'kick',
    description: 'Kick player from guest channel.',
    help: '!kick [player name]',
    accessRequired: 2
}, {
    cmdName: 'leave',
    description: 'Leave guest channel.',
    help: '!leave',
    accessRequired: 0
}, {
    cmdName: 'addadmin',
    description: 'Add a new bot admin.',
    help: '!addadmin <player name>',
    accessRequired: 3
}, {
    cmdName: 'addmember',
    description: 'Add a new member.',
    help: '!addmember <player name>',
    accessRequired: 2
}, {
    cmdName: 'remadmin',
    description: 'Demotes an admin to member.',
    help: '!remadmin <player name>',
    accessRequired: 3
}, {
    cmdName: 'remmember',
    description: 'Warning!Removes all access, even if player is an admin!',
    help: '!deladmin <player name>',
    accessRequired: 3
}, {
    cmdName: 'register',
    description: 'Register as a member.',
    help: 'register',
    accessRequired: 0
}, {
    cmdName: 'unregister',
    description: 'Warning!Removes all access, even if player is an admin!',
    help: 'unregister',
    accessRequired: 1
}, {
    cmdName: 'subscribe',
    description: 'Subscribe to shopping channels.',
    help: 'subscribe <channel name> or all ',
    accessRequired: 1
}, {
    cmdName: 'unsubscribe',
    description: 'Unsubscribe from shopping channels.',
    help: 'unsubscribe <channel name> or all>',
    accessRequired: 1
}, {
    cmdName: 'status',
    description: 'User subscribtion status.',
    help: 'status',
    accessRequired: 1
}, {
    cmdName: 'general',
    description: 'Post message to General Channel.',
    help: 'general <message>',
    accessRequired: 1
}, {
    cmdName: 'wts',
    description: 'Post message to WTS Channel.',
    help: 'wts <message>',
    accessRequired: 1
}, {
    cmdName: 'wtb',
    description: 'Post message to WTB Channel.',
    help: 'wtb <message>',
    accessRequired: 1
}, {
    cmdName: 'lr',
    description: 'Post message to Lootrights Channel.',
    help: 'lr <message>',
    accessRequired: 1
}, {
    cmdName: 'addreplica',
    description: 'Add a new replica.',
    help: 'addreplica <user pass botname [dimension]>',
    accessRequired: 99
}, {
    cmdName: 'ban',
    description: 'Permanetly ban player.',
    help: 'ban <player name>',
    accessRequired: 2
}, {
    cmdName: 'unban',
    description: 'Unban player.',
    help: 'unban <player name>',
    accessRequired: 3
}, {
    cmdName: 'test',
    description: 'For testing purposes only!',
    help: 'Unknown',
    accessRequired: 99
}, {
    cmdName: 'lock',
    description: 'Locks player from posting.',
    help: 'lock <player name> <channel name or all >',
    accessRequired: 2
}, {
    cmdName: 'unlock',
    description: 'Unlocks player from posting.',
    help: 'unlock <player name> <channel name or all>',
    accessRequired: 2
}, {
    cmdName: 'help',
    description: 'Help...',
    help: 'help',
    accessRequired: 0
}, {
    cmdName: 'replicastatus',
    description: 'Shows the current status of each active replica!',
    help: 'replicastatus',
    accessRequired: 2
}, {
  cmdName: 'set',
  description: 'Update settings.',
  help: 'set <setting name> <argument>',
  accessRequired: 99
}, {
  cmdName: 'pvm',
  description: 'Send a message to PVM channel',
  help: 'pvm <message>',
  accessRequired: 1
}
];


// At the moment mongoose has no support continue on error
// so the database needs to be cleared manually if new commands are added
Command.insertMany(cmdList, function(err) {
    if (err) {
        winston.debug(err);
    }
});
