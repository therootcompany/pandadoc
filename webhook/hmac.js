'use strict';

let crypto = require('crypto');

async function sign(sharedKey, rstream) {
  let hmac = crypto.createHmac('sha256', sharedKey);
  await new Promise(function (resolve, reject) {
    rstream.pipe(hmac);
    rstream.once('error', reject);
    // 'end' should always fire, even if 'finished' or 'close' don't
    rstream.once('end', resolve);
  });
  return hmac.read().toString('hex');
}

async function verify(sharedKey, rstream, hexSig) {
  let sig2 = await sign(sharedKey, rstream);
  if (hexSig.length !== sig2.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(hexSig), Buffer.from(sig2));
}

function signSync(sharedKey, utf8str) {
  let hmac = crypto.createHmac('sha256', sharedKey);
  hmac.update(utf8str);
  return hmac.digest('hex');
}

function verifySync(sharedKey, utf8str, hexSig) {
  let sig2 = signSync(sharedKey, utf8str);
  if (hexSig.length !== sig2.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(hexSig), Buffer.from(sig2));
}

module.exports.sign = sign;
module.exports.verify = verify;
module.exports.signSync = signSync;
module.exports.verifySync = verifySync;

if (require.main === module) {
  (async function main() {
    console.info('');
    let fs = require('fs');

    // Stream mini-test
    let sharedKey = 'secret';
    let stream1 = fs.createReadStream(__filename);
    let stream2 = fs.createReadStream(__filename);
    let sig1 = await sign(sharedKey, stream1);
    if (!(await verify(sharedKey, stream2, sig1))) {
      throw Error('[SANITY FAIL] cannot verify self (stream)');
    }
    console.info('PASS: (Stream) Signatures match (duh!) 🙃');

    // Sync mini-test
    let utf8str = fs.readFileSync(__filename);
    let sigB = signSync(sharedKey, utf8str);
    if (!verifySync(sharedKey, utf8str, sigB)) {
      throw Error('[SANITY FAIL] cannot verify self (sync)');
    }
    console.info('PASS: (Sync) Signatures also match, as expected');

    // Final Sanity Check
    if (sig1 != sigB) {
      throw new Error('[SANITY FAIL] sync vs stream yield different signatures');
    }
    console.info('PASS');
    console.info('');
  })().catch(function (err) {
    console.error(err.message);
  });
}
