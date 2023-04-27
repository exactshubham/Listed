const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { log } = require('console');


// If modifying these scopes, delete token.json.
const SCOPES =  [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.readonly',
  
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */


async function listLabels(auth) {
  const gmail = google.gmail({version: 'v1', auth});
  const res = await gmail.users.labels.list({
    userId: 'me',
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log('No labels found.');
    return;
  }
  console.log('Labels:');
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });
}


async function checkAndReply(auth) {

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    // Retrieve the user's email messages
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
    });

    const messages = res.data.messages;

    // Process each message
    for (const message of messages) {
      const threadId = message.threadId;

      // Check if this thread has already been replied to
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
      });

      // If the thread has no messages from the user, send a reply
      if (!thread.data.messages.some(message => message.labelIds.includes('SENT') && message.from.emailAddress === 'exactsshubham@gmail.com')) {
        const sendRes = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            threadId: threadId,
            raw: 'It is an automated response',
          },
        });

        // Add a label to the message
        await gmail.users.messages.modify({
          userId: 'me',
          id: sendRes.data.id,
          requestBody: {
            addLabelIds: ['YOUR_LABEL_NAME'],
          },
        });
      }
    }
  } catch (err) {
    console.error('Error retrieving or sending messages', err);
  }
}

// Set up the interval for checking and replying to emails
const MIN_INTERVAL = 45 * 1000; // 45 seconds
const MAX_INTERVAL = 120 * 1000; // 120 seconds
setInterval(() => authorize().then(() => checkAndReply()), Math.random() * (MAX_INTERVAL - MIN_INTERVAL) + MIN_INTERVAL);

 // Create a new Gmail API client
 //const gmail = google.gmail({version: 'v1', auth: oauth2Client});

//////////////////////////////////////////////
//  // Function to check for new emails and send replies
//   async function checkAndReply(auth) {
//     const gmail = google.gmail({version: 'v1', auth});
    
//     // Retrieve the user's email messages
//     gmail.users.messages.list({
//       userId: 'me',
//       q: 'is:unread'
//     }, (err, res) => {
//       if (err) {
//         console.error('Error retrieving messages', err.message);
//         return;
//       }

//       const messages = res.data.messages;

//       // Process each message
//       messages.forEach(message => {
//         const threadId = message.threadId;

//         // Check if this thread has already been replied to
//         gmail.users.threads.get({
//           userId: 'me',
//           id: threadId,
//         }, (err, res) => {
//           if (err) {
//             console.error('Error retrieving thread', err.message);
//             return;
//           }

//           const thread = res.data;

//           // If the thread has no messages from the user, send a reply
//           if (!thread.messages.some(message => message.labelIds.includes('SENT') && message.from.emailAddress === 'exactsshubham@gmail.com')) {
//             gmail.users.messages.send({
//               userId: 'me',
//               requestBody: {
//                 threadId: threadId,
//                 raw: 'It is an automated response',
//               },
//             }, (err, res) => {
//               if (err) {
//                 console.error('Error sending message', err.message);
//                 return;
//               }

//               // Add a label to the message
//               gmail.users.messages.modify({
//                 userId: 'me',
//                 id: res.data.id,
//                 requestBody: {
//                   addLabelIds: ['YOUR_LABEL_NAME'],
//                 },
//               }, (err, res) => {
//                 if (err) {
//                   console.error('Error adding label', err.message4);
//                   return;
//                 }
//               });
//             });
//           }
//         });
//       });
//     });
//   };

//   // Set up the interval for checking and replying to emails
//   const MIN_INTERVAL = 45 * 1000; // 45 seconds
//   const MAX_INTERVAL = 120 * 1000; // 120 seconds
//   setInterval(checkAndReply, Math.random() * (MAX_INTERVAL - MIN_INTERVAL) + MIN_INTERVAL);

   //authorize().then(listLabels).catch(console.error);
  //  authorize().then(auth => {
  // //   listLabels(auth);
  //    checkAndReply(auth);
  // }).catch(console.error);
  