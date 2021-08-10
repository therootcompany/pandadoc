'use strict';

let pandaHmac = require('./hmac.js');

let mismatchSignature =
  '?signature={signature} does not match sha256 hmac of the request body using the shared key';

// TODO subclass the error
function createError(msg) {
  let err = new Error(msg);
  err.message = msg;
  err.code = 'E_PANDADOC_WEBHOOK';
  return err;
}

module.exports = function _createPandadocVerify(sharedKey, opts) {
  if (!opts) {
    opts = { allowUnsignedGet: false };
  }
  if (!opts.pandadocParam) {
    opts.pandadocParam = '_pandadocSignaturePromise';
  }

  let verifier = async function _pandadocVerify(req, res, next) {
    if (req.body) {
      next(
        createError(
          "pandadoc webhook middleware must be 'use()'d  before any body parser",
        ),
      );
      return;
    }

    let untrustedHexSig = req.query.signature;
    // no signature
    if (!untrustedHexSig) {
      req[opts.pandadocParam] = Promise.resolve(false);
      next();
      return;
    }

    // empty content body
    if (
      !req.headers['content-length'] &&
      'chunked' !== req.headers['transfer-encoding']
    ) {
      req[opts.pandadocParam] = Promise.resolve(
        pandaHmac.verifySync(sharedKey, '', untrustedHexSig),
      );
      next();
      return;
    }

    // signature + content body
    req[opts.pandadocParam] = pandaHmac
      .verify(sharedKey, req, untrustedHexSig)
      .catch(function () {
        // we ignore this error because we expect stream errors to be handled by
        // a bodyParser
        return '';
      });
    next();
  };

  verifier.verify = async function (req, res, next) {
    let result = await req[opts.pandadocParam];
    if (true === result) {
      next();
      return;
    }

    if (opts.allowUnsignedGet && 'GET' === req.method && !req.query.signature) {
      next();
      return;
    }

    next(createError(mismatchSignature));
  };

  return verifier;
};

if (require.main === module) {
  (async function main() {
    console.info('');

    function toBuffer(req, _, next) {
      var stream = require('stream');
      var converter = new stream.Writable();

      converter.data = [];
      converter._write = function (chunk) {
        converter.data.push(chunk);
      };

      converter.on('finish', function () {
        req.body = Buffer.concat(this.data).toString('utf8');
        next();
      });
      req.pipe(converter);
      req.on('end', function () {
        // docs say 'finish' should emit when end() is called
        // but experimentation says otherwise...
        converter.end();
        converter.emit('finish');
      });
    }

    let sharedKey = 'secret';
    let middleware = module.exports(sharedKey);
    let sig = require('./hmac.js').signSync(
      sharedKey,
      require('fs').readFileSync(__filename, 'utf8'),
    );
    // test that unverified signature fails
    // faux request as file stream
    let req = require('fs').createReadStream(__filename);
    // add required query param
    req.query = { signature: sig };
    await new Promise(function (resolve, reject) {
      toBuffer(req, null, function _next2(err) {
        if (err) {
          // not expected to get this error
          reject(err);
          return;
        }
        middleware.verify(req, null, function _next3(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    })
      .catch(Object)
      .then(function (err) {
        if (!(err instanceof Error) || err.message !== mismatchSignature) {
          throw new Error('expected mismatch signature error');
        }
        console.log('Pass: bad/missing signature should fail');
      });

    // test that verified signature passes
    req = require('fs').createReadStream(__filename);
    // add required query param
    req.query = { signature: sig };
    await new Promise(function (resolve, reject) {
      middleware(req, null, function _next(err) {
        if (err) {
          // not expected (shouldn't be possible)
          reject(err);
          return;
        }
        toBuffer(req, null, function _next2(err) {
          if (err) {
            // not expected (shouldn't be possible)
            reject(err);
            return;
          }
          middleware.verify(req, null, function _next3(err) {
            if (err) {
              // not expected (shouldn't be possible)
              reject(err);
              return;
            }
            console.log('Pass: correct signature should verify');
            resolve();
          });
        });
      });
    });
  })()
    .then(function () {
      console.info('PASS');
      console.info('');
    })
    .catch(function (err) {
      console.error(err.message);
      process.exit(1);
    });
}
