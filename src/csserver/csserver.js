const axios = require('axios');
const { getToken, getActiveToken } = require('./csserver_auth');
const fs = require('fs');
const util = require('util');
const FormData = require('form-data');
const concat = require('concat-stream');

// const querystring = require('querystring'); // querystring.stringify({ foo: 'bar' })

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

axios.defaults.timeout = 30000; // Timeout 10 mins

const DATHOST_URL = process.env.DATHOST_URL || 'https://dathost.net/api/0.1/';

const handleResponse = (response, message, rules = {allow: [200]}) => {
  if(message) console.log(message, response.status, response.data);
  if (rules.allow.includes(response.status)) {
    return {
      statusCode: response.status,
      data: response.data
    }
  } else {
    console.error('Invalid statusCode:', response.status, response.data);
    return {
      statusCode: response.status,
      data: response.data
    }
  }
}

const handleError = (error, message) => {
  if(message) console.error(message, 'Error:', error.message, error);
  if (error && error.response && error.response.status) {
    return {
      statusCode: error.response.status,
      data: error
    }
  } else {
    return {
      statusCode: 400,
      data: error
    }
  }
}

const datHostEndpoint = async (endpoint, options = null, printInfo = '') => {
  let token = getActiveToken();
  if (!token || token === '') {
    token = await getToken();
  }
  
  const headers = {
    'Authorization': token,
  };

  const url = DATHOST_URL + endpoint;
  const params = {
    method: (options && options.method ? options.method : (options && options.data ? 'POST' : 'GET')),
    url: url,
    headers: {
      ...headers,
      ...(options && options.headers ? options.headers : { 'Content-Type': 'application/json' }),
    },
    ...(options && options.data && { data: options.data }),
  }

  console.log('Params:', params);
  try {
    const response = await axios(params);
    console.log('Response:', endpoint, (options && options.data ? JSON.stringify(options.data) : ''));
    return handleResponse(response, 'Success Response:', { 
      allow: [200],
    });
  } catch (error) {
    return handleError(error, 'Failed Response: ' + params.url + ', ' + JSON.stringify(params.data));
  }
}

const gameServers = async () => {
  const response = await datHostEndpoint('game-servers', { method: 'GET' });
  if (response.statusCode === 200) {
    return response.data.map((x) => {
      return { name: x.name, ip: x.ip, id: x.id };
    });
  }
  return response;
}

const generateConfigFile = async (replacements, filePath, version = '-gen', fileType = '.cfg') => {
  let data;
  try {
    console.log('@generateConfigFile:', replacements);
    data = await readFile(filePath + fileType, 'utf8');
    const result = data
      .replace(/\$\$chosen\_map\$\$/g, replacements.chosen_map)
      .replace(/\$\$coordinator\_prediction\_team1\$\$/g, replacements.coordinator_prediction_team1)
      .replace(/\$\$team1\_name\$\$/g, replacements.team1_name)
      .replace(/\$\$team2\_name\$\$/g, replacements.team2_name)
      .replace(/\$\$match\_id\$\$/g, replacements.match_id)
      .replace(/\$\$team1Players\$\$/g, replacements.team1Players)
      .replace(/\$\$team2Players\$\$/g, replacements.team2Players);
  
    console.log(result);
    const wholePath = filePath + version + fileType;
    const writeFileRes = await writeFile(wholePath, result, 'utf8');
    console.log('Wrote to file:', writeFileRes);
    return wholePath;
  } catch (e) {
    console.error('IO Error:', e);
  }
  console.error('@generateConfigFile: Error');
  return null;
}

const uploadFile = async (serverId, filePath, localPath) => {
  // game-servers/5ee3fe74d451b92ec776d519/files/cfg%2Fget5%2Fkosatupp_inhouse_coordinator_match.cfg
  // console.log('@uploadFile', serverId, filePath, localPath);
  const formData = new FormData();
  formData.append('file', fs.createReadStream(localPath));
  return datHostEndpoint(`game-servers/${serverId}/files/${filePath}`, {
    method: 'POST',
    data: formData,
    headers: { //formData.getHeaders()
      'Content-Type': 'multipart/form-data',
      'Accept': 'application/json',
      ...formData.getHeaders()
    }
  });
}

const loadConfigFile = async (serverId, filePath='cfg%2Fget5%2Fkosatupp_inhouse_coordinator_match.cfg') => {
  // game-servers/5ee3fe74d451b92ec776d519/files/cfg%2Fget5%2Fkosatupp_inhouse_coordinator_match.cfg
  return datHostEndpoint(`game-servers/${serverId}/console`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' } ,
    data: 'line=get5_loadmatch%20' + filePath 
      //'get5_loadmatch%20cfg%2Fget5%2Fkosatupp_inhouse_coordinator_match.cfg' // application/x-www-form-urlencoded'
      // line: `get5_loadmatch ${filePath}`
  })
}

const writeConsole = async (serverId, line) => {
  return datHostEndpoint(`game-servers/${serverId}/console`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' } ,
    data: 'line=' + line
  })
}

const getLatestConsoleLines = async (serverId) => {
  return datHostEndpoint(`game-servers/${serverId}/console?max_lines=100`);
}

const generateTeamPlayersBody = (team, players) => {
  let s = '';
  console.log('@generateTeamPlayersBody:', players);
  players.map((player, index) => {
    if (!player.steamId) return null;
    s += `"${player.steamId}" \t""\n`
  });
  return s;
}

const configureServer = async (gameObject) => {
  console.log('@configureServer:', gameObject);
  const gameServersList = await gameServers();
  const serverId = gameServersList[0].id;
  const team1Players = generateTeamPlayersBody(1, gameObject.team1),
  const team2Players = generateTeamPlayersBody(2, gameObject.team2)
  const replacements = {
    chosen_map: 'de_inferno', // TODO Map
    coordinator_prediction_team1: 75, // TODO Prediction score
    team1_name: gameObject.getBalanceInfo().team1Name || 'Team 1',
    team2_name: gameObject.getBalanceInfo().team2Name || 'Team 2',
    match_id: '1', // TODO match id
    ...(team1Players && { team1Players }),
    ...(team2Players && { team2Players }),
  }
  console.log('@configureServer - server/placements:', serverId, replacements)
  const wholeFilePath = await generateConfigFile(replacements, 'cfg/kosatupp_inhouse_coordinator_match');
  console.log('@configureServer.filePath:', wholeFilePath);
  const filePathRemote = 'cfg%2Fget5%2Fkosatupp_inhouse_coordinator_match.cfg';
  const uploadedFileRes = await uploadFile(serverId, filePathRemote, wholeFilePath);
  const cmdResetRunningGames = await writeConsole(serverId, `get5_endmatch;`); // TODO: Only run if gameongoing
  const cmdCheckAuths = await writeConsole(serverId, `get5_check_auths ${team1Players && team2Players ? 1 : 0}; say All users require a linked Steam ID for automatic team placement`);
  const writeConsoleRes = await loadConfigFile(serverId);
  const latestConsoleLines = getLatestConsoleLines(serverId);
  return latestConsoleLines;
}


module.exports = {
  uploadFile : uploadFile,
  gameServers : gameServers,
  generateConfigFile : generateConfigFile,
  configureServer : configureServer,
}