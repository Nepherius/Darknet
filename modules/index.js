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
    description: 'Darknet rules.',
    help: 'rules',
}, {
    cmdName: 'shutdown',
    description: 'Shutdown bot.',
    help: 'shutdown',
    accessRequired: 99
}, {
    cmdName: 'invite',
    description: 'Invite player to guest channel.',
    help: 'invite [player name]',
    accessRequired: 2
}, {
    cmdName: 'join',
    description: 'Join guest channel.',
    help: 'join',
    accessRequired: 1
}, {
    cmdName: 'kick',
    description: 'Kick player from guest channel.',
    help: 'kick [player name]',
    accessRequired: 2
}, {
    cmdName: 'leave',
    description: 'Leave guest channel.',
    help: 'leave',
    accessRequired: 0
}, {
    cmdName: 'addadmin',
    description: 'Add a new bot admin.',
    help: 'addadmin <player name>',
    accessRequired: 99
}, {
    cmdName: 'addmember',
    description: 'Add a new member.',
    help: 'addmember <player name>',
    accessRequired: 2
}, {
    cmdName: 'remadmin',
    description: 'Demotes an admin to member.',
    help: 'remadmin <player name>',
    accessRequired: 99
}, {
    cmdName: 'remmember',
    description: 'Warning!Removes all access, even if player is an admin.',
    help: 'remmember <player name>',
    accessRequired: 2
}, {
    cmdName: 'register',
    description: 'Register as a member.',
    help: 'register',
    accessRequired: 0
}, {
    cmdName: 'unregister',
    description: 'Warning!Removes all access, even if player is an admin.',
    help: 'unregister',
    accessRequired: 1
}, {
    cmdName: 'subscribe',
    description: 'Subscribe to shopping channels.',
    help: 'subscribe <channel name|all>',
    accessRequired: 1
}, {
    cmdName: 'unsubscribe',
    description: 'Unsubscribe from shopping channels.',
    help: 'unsubscribe <channel name|all>',
    accessRequired: 1
}, {
    cmdName: 'status',
    description: 'User subscribtion status.',
    help: 'status',
    accessRequired: 1
}, {
    cmdName: 'general',
    description: 'Post message to General Channel.',
    help: 'general < msg >',
    accessRequired: 1
}, {
    cmdName: 'wts',
    description: 'Post message to WTS Channel.',
    help: 'wts < msg >',
    accessRequired: 1
}, {
    cmdName: 'wtb',
    description: 'Post message to WTB Channel.',
    help: 'wtb < msg >',
    accessRequired: 1
}, {
    cmdName: 'lr',
    description: 'Post message to Lootrights Channel.',
    help: 'lr < msg >',
    accessRequired: 1
}, {
    cmdName: 'pvm',
    description: 'Send a message to PVM channel',
    help: 'pvm < msg >',
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
    accessRequired: 99
}, {
    cmdName: 'test',
    description: 'For testing purposes only!',
    help: 'Unknown.',
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
    description: 'Display general help or help for a specified command.',
    help: 'help [command name]',
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
    cmdName: 'history',
    description: 'See broadcast history.',
    help: 'history [channel name]',
    accessRequired: 1
}, {
    cmdName: 'autoinvite',
    description: 'Turn autoinvite on/off.',
    help: 'autoinvite [on|off]',
    accessRequired: 1
}, {
    cmdName: 'stats',
    description: 'Bot statistics',
    help: 'stats',
    accessRequired: 0
}, {
    cmdName: 'ignore',
    description: 'Add player to ignore list.',
    help: 'ignore < player name >',
    accessRequired: 1
}, {
    cmdName: 'unignore',
    description: 'Remove player from ignore list.',
    help: 'unignore < player name >',
    accessRequired: 1
}, {
    cmdName: 'playerhistory',
    description: 'Display your or another player\'s last 20 broadcass.',
    help: 'playerhistory [player name]',
    accessRequired: 1
}, {
    cmdName: 'cmdlist',
    description: 'List all commands.',
    help: 'cmdlist',
    accessRequired: 0
}, {
    cmdName: 'admins',
    description: 'Admins, sort of.',
    help: 'admins',
    accessRequired: 0
}, {
    cmdName: 'lastseen',
    description: 'Display how long ago was a player last seen.',
    help: 'lastseen < player name >',
    accessRequired: 1
},{
    cmdName: 'addwarning',
    description: 'Add a warning to a players account.',
    help: 'addwarning < player name >',
    accessRequired: 2
},
{
    cmdName: 'remwarning',
    description: 'Removes a warning to a players account.',
    help: 'remwarning < player name >',
    accessRequired: 2
}
];


// At the moment mongoose has no support for continue on error while using
// Model.insertMany so the database needs to be cleared manually if new commands
// are added.
Command.insertMany(cmdList, function(err) {
    if (err) {
        winston.debug(err);
    }
});
