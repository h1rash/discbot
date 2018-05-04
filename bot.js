'use strict';

const Discord = require('discord.js');

// Get Instance of discord client
const client = new Discord.Client();

const ArrayList = require('arraylist');
const balance = require('./balance');

//get config data
const { prefix, token, dbpw } = require('./conf.json');

/*
	TODO: 
		Better Printout / message to clients (Currently as message, but not nice looking) (Deluxe: maybe image if possible)
		better names for commands

	Deluxe: 
		Move players into separate channels on team generation
		Remove player written message after a couple of seconds (at least for testing purpose) to prevent chat over flooding
*/

// will only do stuff after it's ready
client.on('ready', () => {
	console.log('ready to rumble');
});

client.on('message', message => {
	console.log('MSG: ', message.content);
	if(message.content == 'hej'){
		message.channel.send('lul')
	}
	if(message.content === prefix+'ping'){
		console.log('PingAlert, user had !ping as command');
		message.channel.send('Pong');
	}
	if(message.content === `${prefix}active`){
		//console.log(message); // Can print for information about hierarchy in discord message
		var voiceChannel = message.guild.member(message.author).voiceChannel;
			
		if(voiceChannel !== null && typeof voiceChannel != 'undefined'){ // Makes sure user is in a voice channel
			findPlayersStart(message, voiceChannel);
		} else {
			message.channel.send('Author must be in voiceChannel');
		}
	}

	// TODO Feat: Add functionality to remove player written message after ~5 sec, prevent flooding

});

//Create more events to do fancy stuff with discord API


//login
client.login(token);

function findPlayersStart(message, channel){
	console.log('VoiceChannel', channel.name, ' (id =',channel.id,') active users: (Total: ', channel.members.size ,')');
	var numPlayers = channel.members.size
	if(numPlayers == 10 || numPlayers == 8 || numPlayers == 6 || numPlayers == 4){
		// initalize 10 Player objects with playerInformation
		var players = new ArrayList;
		channel.members.forEach(function(members){
			if(!members.bot){ // Only real users
				console.log('\t' + members.user.username + '(' + members.user.id + ')'); // Printar alla activa users i denna voice chatt
				var tempPlayer = balance.createPlayer(members.user.userName, members.user.id);
				players.add(tempPlayer);
			}
		});
		var result = balance.initializePlayers(players, dbpw); // Initialize balancing, return result
		// Show result to discord users
		message.channel.send(result);
	} else if((numPlayers === 1 || numPlayers === 2) && (message.author.username === 'Petter' || message.author.username === 'Obtained') ){
		console.log('\t<-- Testing Environment: 10 player game, players with random mmr, res in console -->');
		var players = new ArrayList;
		for(var i = 0; i < 10; i++){
			var tempPlayer = balance.createTempPlayer('Player ' + i, i, 900 + ( Math.floor(Math.random() * Math.floor(200))) );
			//console.log('DEBUG: @!active, player[' + i + '] =', tempPlayer);
			players.add(tempPlayer);
		}
		var result = balance.initializePlayers(players, dbpw); // Initialize balancing, return result
		// Show result to discord users
		
		//message.channel.send(result);
	} else{
		console.log('Currently only support games for 4, 6, 8 and 10 players'); // TODO, support more sizes
	}
}