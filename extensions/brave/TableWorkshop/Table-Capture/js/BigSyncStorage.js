
// Loosely based on:
//   https://raw.githubusercontent.com/kdzwinel/Context/master/js/classes/HugeStorageSync.class.js

class BigSyncStorage {
  constructor(browserEnv) {
    this.browserEnv_ = browserEnv;
    this.storageApi_ = browserEnv.getSyncStorageApi();
    this.maxItems_ = this.storageApi_.getMaxItems();
  }

  getWorlds(defaultVals, worldKeys) {
    defaultVals = defaultVals || {};
    worldKeys = worldKeys || [];
    worldKeys.forEach(worldKey => defaultVals[worldKey] = '');

    return this.storageApi_
        .getP(null)
        .then(items => {
          this.browserEnv_.checkThrowLastError();

          // Needed for backwards compatability.
          let vals = {...defaultVals, ...items};

          const worlds = [];
          worldKeys.forEach(worldKey => {
            let world = '';
            for (var i = 0; i < this.maxItems_; i++) {
              const key = `${worldKey}_${i}`;
              if (items[key]) {
                world += items[key];
              } else {
                break;
              }
            }
            if (world) {
              worlds.push(JSON.parse(world));
            }
          });

          worlds.forEach(worldObj => {
            vals = {...vals, ...worldObj};
          });

          return {
            ...defaultVals,
            ...vals,
          };
        });
  }

  deleteWorld(worldKey) {
     return this
        .getWorlds({}, [worldKey])
        .then(vals => {
          return Promise.all(
            Object
              .keys(vals)
              .filter(key => key.includes(worldKey))
              .map(key => this.storageApi_.removeP(key))
          );
        });
  }

  setWorld(worldKey, vals) {
    let i = 0, cache = {};

    let stringVal = JSON.stringify(vals);
    while (stringVal.length > 0) {
      const cacheKey = `${worldKey}_${i}`;

      let segment = null;

      // https://code.google.com/p/chromium/issues/detail?id=261572
      // https://stackoverflow.com/questions/41805621/sync-storage-max-quota-bytes-per-item-and-chunked-data-storage
      let endIndex = this.storageApi_.getItemByteQuota() - cacheKey.length - 2;
      while (true) {
        if (endIndex < 500) {
          return Promise.reject(new Error('BigSyncStorage: World segmentation error (< 500/key)'));
        }

        segment = stringVal.substr(0, endIndex);

        // NOTE(gmike): See Config.js:GB_WORLD_KEYS
        const keyLength = 16;
        const jsonStringifiedSegment = JSON.stringify(segment);
        const lengthInBytes = lengthInUtf8Bytes(jsonStringifiedSegment);
        if (lengthInBytes > (this.storageApi_.getItemByteQuota() - 2 - keyLength)) {
          endIndex -= 500;
        } else {
          break;
        }
      }

      cache[cacheKey] = segment;
      stringVal = stringVal.substr(endIndex);
      i++;
    }

    // Store all the chunks
    return this.storageApi_
        .setP(cache)
        .then(() => {
          // We need to make sure that after the last chunk we have an empty chunk. Why this is so important?
          // Saving v1 of our object. Chrome sync status: [chunk1v1] [chunk2v1] [chunk3v1]
          // Saving v2 of our object (a bit smaller). Chrome sync status: [chunk1v2] [chunk2v2] [chunk3v1]
          // When reading this configuration back we will end up with chunk3v1 being appended to the chunk1v2+chunk2v2
          return this.storageApi_.removeP(`${worldKey}_${i}`);
        });
  }
}

//// UTILS

function lengthInUtf8Bytes(str) {
  // by: https://stackoverflow.com/a/5515960/2675672
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}
