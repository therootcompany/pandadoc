# pandadoc.js

Node.js (JavaScript) API for PandaDoc

## Features

- [x] PandaDoc Webhook Signature Verification
- [x] Open to PRs for more server-side features

## Install

```bash
npm install --save pandadoc@1.x
```

## Usage

```js
require('dotenv').config();

let pdSharedKey = process.env.PANDADOC_SHARED_KEY;
let pdWebhook = require('pandadoc/webhook').middleware(pdSharedKey);

// PandaDoc webhook MUST come before other body parsers
// (because it must have access to `req` before `req.body` is read)
app.use('/webhooks/pandadoc', pdWebhook);
app.use('/', bodyParser.json());

// ...

// PandaDoc webhook verified MUST be used before PD webhook routes
app.use('/webhooks/pandadoc', pdWebhook.verify);
app.post('/webhooks/pandadoc/YOUR_PD_ENDPOINT', YOUR_PD_HANDLER);

app.use(function (err, req, res, next) {
  if ('E_PANDADOC_WEBHOOK' === err.code) {
    // log webhook failure or some such
  }
});
```

## API

- middleware
  - webhookHandler
  - webhookHandler.verify
- request
- sign (for streams)
- signSync (for strings)
- verify (for streams)
- verifySync (for strings)
- request (for testing)

```js
let PDWebhook = require('pandadoc/webhook');
```

```js
webhookHandler = PDWebhook.middleware(sharedKey, { allowUnsignedGet: false });
// MUST come before other body parsers
webhookHandler(req, res, next);
webhookHandler.verify(req, res, next);
```

```js
PDWebhook.sign(sharedKey, readableStream);
PDWebhook.signSync(sharedKey, str);

PDWebhook.verify(sharedKey, readableStream, untrustedHexSig);
PDWebhook.verifySync(sharedKey, str, untrustedHexSig);
```

```js
// Experimental API, may change.
PDWebhook.request(sharedKey, 'https://example.com/api/webhook/pandadoc/test', [
  {
    event: 'pandadoc_webhook_test_success',
  },
]);
```
