'use strict';
// Author: Petter Andersson

import { assert } from 'chai';
const rewire = require('rewire');
const { initializeMySQL } = require('../src/database/mysql_pool');
const { getConfig } = require('../src/tools/load-environment');
const teamNameModule = rewire('../src/birthday.js');
const getBirthdays = teamNameModule.__get__('getBirthdays');

initializeMySQL(getConfig().db);

describe('birthday', () => {
  describe('getBirthdays', () => {
    it('getBirthdays', async () => {
      const res = await getBirthdays(new Date('1995-09-28'));
      assert.equal(res[0].userName, 'Petter');
    })
    it('getBirthdays any year', async () => {
      const res = await getBirthdays(new Date('2018-09-28'));
      assert.equal(res[0].userName, 'Petter');
    })
  })
});
