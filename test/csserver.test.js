'use strict';
// Author: Petter Andersson

const assert = require('assert');
const rewire = require('rewire');
const { getConfig } = require('../src/tools/load-environment');
const { gameServers, configureServer } = require('../src/csserver/csserver');
const { createPlayer } = require('../src/game/player');

describe('dathost', () => {
  describe('gameServers', () => {
    it('gameServers', async () => {
      const res = await gameServers();
      console.log('@dathost.gamesevers:', res);
    })
  })
  describe('configureServer', () => {
    it('configureServer', async () => {
      let player1 = createPlayer('Petter', '1');
      player1.setSteamId('STEAM_1:0:24603593');
      let player2 = createPlayer('Morgan', '2');
      player2.setSteamId('STEAM_0:0:28181825');
      const gameObject = {
        team1: [
          player1
        ],
        team2: [
          player2
        ],
        getBalanceInfo: () => {
          return {
            team1Name: 'Team1NameFromFunc',
            team2Name: 'Team2NameFromFunc'
          }
        }
      }
      const res = await configureServer(gameObject);
      console.log('@test.configureServer:', res);
    })
  })
});