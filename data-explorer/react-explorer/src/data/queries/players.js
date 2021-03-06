import { URL } from 'url';
import fetch from 'isomorphic-fetch';
import { GraphQLList as List } from 'graphql';
import PlayerType from '../types/PlayerType';
import log from '../../../tools/log';
import MySportsFeedService from '../services/MySportsFeedService';

// API Service Route
const url = MySportsFeedService.playerUrl;

// Local Storage
const playersStorage = {};
const lastFetchTasks = {};

// Misc
let playersData;
// const lastFetchTime = new Date(1970, 0, 1);
const debug = false;
const logger = log.debugCreator('queries-players', { enabled: debug });

/**
 * Get the name from the request
 *
 * @param request
 * @returns {string}
 * @throws Error
 */
function getNameQuery(request) {
  if (!request.body.name) {
    throw new Error('No player name found in request');
  }

  return request.body.name;
}

/**
 * Get an id from the request
 *
 * @param request
 * @returns {integer}
 * @throws Error
 */
function getIdQuery(request) {
  if (!request.body.id) {
    throw new Error('No player id found in request');
  }

  return request.body.id;
}

/**
 * Cache expiration
 *
 * @returns {boolean}
 */
function cacheMiss() {
  return true;
}

/**
 *
 * @param data
 * @returns {boolean}
 * @throws Error
 */
function hasValidPlayers(data) {
  if (!data.activeplayers || !Array.isArray(data.activeplayers.playerentry)) {
    throw new Error('No Player Entries');
  }

  if (!data.activeplayers.playerentry[0]) {
    throw new Error('Player not found');
  }

  return true;
}

const player = {
  type: new List(PlayerType),
  resolve({ request }) {
    // Create the proper url
    if (request.body.name) {
      url.searchParams.set('player', getNameQuery(request));
    } else {
      url.searchParams.set('id', getIdQuery(request));
    }

    // Last request didn't finish
    if (lastFetchTasks[url.href]) {
      return lastFetchTasks[url.href];
    }

    // Make a real request
    if (cacheMiss(url, request)) {
      lastFetchTasks[url.href] = fetch(url.href)
        .then(response => response.json())
        .then(data => {
          hasValidPlayers(data);

          playersData = data.activeplayers.playerentry.map(
            playerEntry => playerEntry.player,
          );

          logger('PlayersData: %o', playersData);

          playersStorage[url.href] = playersData;
          lastFetchTasks[url.href] = null;
          return playersData;
        })
        .catch(err => {
          lastFetchTasks[url.href] = null;
          logger('Error', err);
          throw err;
        });

      // If we have already resolved at this point
      if (playersStorage[url.href] && playersStorage[url.href].Age) {
        return playersStorage[url.href];
      }

      return lastFetchTasks[url.href];
    }

    // Retrieve from cache
    if (playersStorage[url.href]) {
      return playersStorage[url.href];
    }

    throw new Error('Failed to query for this player');
  },
};

export default player;
