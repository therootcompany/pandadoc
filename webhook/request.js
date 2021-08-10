'use strict';

let request = require('@root/request');

module.exports = function (sharedKey, uri, json) {
  let bodyStr = JSON.stringify(json);
  let hmac = require('./hmac.js');
  let sig = hmac.signSync(sharedKey, bodyStr);
  let url = new URL(uri);
  url.searchParams.set('signature', sig);

  return request({
    url: url.toString(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: bodyStr,
  }).then(function (resp) {
    var isJSON = /[\/\+]json($|;\s)/;
    // "application/json"
    // "application/json; charset=utf-8"
    // "application/vnd.github.v3+json"
    if (isJSON.test(resp.headers['content-type'])) {
      resp.body = JSON.parse(resp.body);
    }
    return resp;
  });
};
