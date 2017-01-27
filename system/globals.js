const winston = require('winston');
const mongoose = require('mongoose');
const request = require('request');
const parseString = require('xml2js').parseString;
const moment = require('moment');
const exec = require('child_process').exec;

const Settings = require('../config/models/settings.js');
const Login = require('../config/models/login.js');
const Player = require('../config/models/player.js');


/************* Global Variables and Functions *************/

const GlobalFn = {
    /****** General Functions ******/
    die: function(msg) {
        if (msg) {
            winston.error(msg);
        }
        exec('killall -9 node'); // kill all child processes, not the best idea$
        process.exit(1);
    },

    // Send Private Message
    PMUser: function(userId, message, fontColor) {
        if (!fontColor) {
            send_MESSAGE_PRIVATE(userId, '<font color=' + this.defaultPMColor + '>' + message + '</font>');
        } else if (fontColor === 'success') {
            send_MESSAGE_PRIVATE(userId, '<font color=' + this.successPMColor + '>' + message + '</font>');
        } else if (fontColor === 'warning') {
            send_MESSAGE_PRIVATE(userId, '<font color=' + this.warnPMColor + '>' + message + '</font>');
        } else if (fontColor === 'error') {
            send_MESSAGE_PRIVATE(userId, '<font color=' + this.errPMColor + '>' + message + '</font>');
        } else {
            send_MESSAGE_PRIVATE(userId, '<font color=' + this.defaultPMColor + '>' + message + '</font>');
        }
    },
    getPlayerData: function(userId, userName) {
      winston.debug('Retrieving info for ' + userName + ' with ID ' + userId);
        request('http://people.anarchy-online.com/character/bio/d/5/name/' + userName + '/bio.xml', function(error, response, body) {
            if (!error && response.statusCode == 200) {
                if (body.length > 20) { // check if xml is empty
                    parseString(body, function(err, result) {
                        if (err) {
                            winston.warn('Error parsing response from AO People: ' + err);
                            GlobalFn.backUpGPD(userId, userName);
                        } else {
                            let charName = result.character.name[0];
                            let charStats = result.character.basic_stats[0];
                            let charOrg = {};
                            if (result.character.organization_membership !== undefined) {
                                charOrg.name = result.character.organization_membership[0].organization_name;
                                charOrg.rank = result.character.organization_membership[0].rank;
                            } else {
                                charOrg.name = 'No organization';
                                charOrg.rank = 'None';
                            }

                            // Create Or Update Player Database
                            Player.findOneAndUpdate({
                                _id: userId
                            }, {
                                firstname: charName.firstname,
                                name: charName.nick,
                                lastname: charName.lastname,
                                level: Number(charStats.level),
                                breed: charStats.breed,
                                gender: charStats.gender,
                                faction: charStats.faction,
                                profession: charStats.profession,
                                profession_title: charStats.profession_title,
                                ai_rank: charStats.defender_rank,
                                ai_level: Number(charStats.defender_rank_id),
                                org: charOrg.name,
                                org_rank: charOrg.rank,
                                lastupdate: Date.now(),
                                source: 'people.anarchy-online.com'
                            }, {
                                upsert: true,
                                setDefaultsOnInsert: true
                            }, function(err) {
                                if (err) {
                                    winston.error(err);
                                } else {
                                    onClientName.emit(userId, charName.name);
                                }
                            });
                        }
                    });
                }
            }
        }).on('error', function(err) {
            winston.warn('Error while trying to connect to AO People: ' + err);
            GlobalFn.backUpGPD(userId, userName);
        });
    },

    backUpGPD: function(userId, userName) {
        request('https://rubi-ka.net/services/characters.asmx/GetAoCharacterXml?name=' + userName, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                if (body.length > 20) { // check if xml is empty
                    parseString(body, function(err, result) {
                        let charName = result.character.name[0];
                        let charStats = result.character.basic_stats[0];
                        let charOrg = {};
                        if (result.character.organization_membership !== undefined) {
                            charOrg.name = result.character.organization_membership[0].organization_name;
                            charOrg.rank = result.character.organization_membership[0].rank;
                        } else {
                            charOrg.name = 'No organization';
                            charOrg.rank = 'None';
                        }

                        // Create Or Update Player Database
                        Player.findOneAndUpdate({
                            _id: userId
                        }, {
                            firstname: charName.firstname,
                            name: charName.nick,
                            lastname: charName.lastname,
                            level: Number(charStats.level),
                            breed: charStats.breed,
                            gender: charStats.gender,
                            faction: charStats.faction,
                            profession: charStats.profession,
                            profession_title: charStats.profession_title,
                            ai_rank: charStats.defender_rank,
                            ai_level: Number(charStats.defender_rank_id),
                            org: charOrg.name,
                            org_rank: charOrg.rank,
                            lastupdate: Date.now(),
                            source: 'Rubi-Ka.net'
                        }, {
                            upsert: true,
                            setDefaultsOnInsert: true
                        }, function(err) {
                            if (err) {
                                winston.error(err);
                            } else {
                                onClientName.emit(userId, charName.name);
                            }
                        });
                    });
                }
            }
        }).on('error', function(err) {
            winston.warn('Unable to retrieve player data from Rubi-Ka.net ' + err);
        });
    },
    cleanFriendList: function() {
      winston.info('Cleaning friend list.');
        Player.find({
            'accessLevel': 1,
            'lastseen': {
                $lte: moment().subtract(90, 'days')
            }
        }, function(err, result) {
            if (err) {
                winston.error(err);
            } else {
                for (let i = 0, len = result.length; i < len; i++) {
                    Player.update({
                        '_id': result[i]._id
                    }, {
                        'accessLevel': 0
                    }, function(err) {
                        if (err) {
                            winston.error(err);
                        } else {
                            if (result[i].buddyList === 'main') {
                                send_BUDDY_REMOVE(result[i]._id);
                            } else {
                                GlobalFn.replicaBuddyList({
                                    buddyAction: 'rem',
                                    replica: result[i].buddyList,
                                    buddyId: result[i]._id
                                });
                            }
                        }
                    });
                }
            }
        });
    },
    updatePlayerDb: function() {
        Player.find(function(err, result) {
            if (err) {
                winston.error(err);
            } else {
                winston.info('Updating info for ' + result.length + ' players.');
                for (let i = 0, len = result.length; i < len; i++) {
                    setTimeout(function() {
                        GlobalFn.getPlayerData(result[i]._id, result[i].name);
                    }, i * 250);
                }
            }
        });
    },
    // Tools
    blob: function(name, content) {
        return '<a href=\'text://' + content.replace(/\'/gmi, "`") + '\'>' + name + '</a>';
    },

    PMBlob: function(user, content, link) {
        return '<a href=\"chatcmd:///tell ' + user + ' ' + content.replace(/\'/gmi, "`") + '\">' + link + '</a>';
    },

    itemref: function(lowid, highid, ql, name) {
        return "<a href=\"itemref://" + lowid + "/" + highid + "/" + ql + "\">" + name.replace(/\'/gmi, "`") + "</a>";
    }

};

GlobalFn.loadSettings = function() {
    Settings.find(
        function(err, result) {
            if (err) {
                winston.error('Unable to load settings: ' + err);
                process.exitCode = 1;
            } else {
                for (let key in result[0].toObject()) {
                    // All settings will be available globbaly
                    GlobalFn[key] = result[0][key];
                }
                winston.info('Settings successfully loaded!');
            }
        }
    );
};

module.exports = GlobalFn;
