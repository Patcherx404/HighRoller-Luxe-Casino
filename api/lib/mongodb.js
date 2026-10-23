import { MongoClient } from 'mongodb';

const FALLBACK_MONGODB_URI =
  'mongodb+srv://Vercel-Admin-HIGHROLLER:FSBV2A58PpzALcqU@highroller.d8jezy5.mongodb.net/?retryWrites=true&w=majority';

function sanitizeMongoUri(raw) {
  if (!raw || typeof raw !== 'string') return FALLBACK_MONGODB_URI;
  let uri = raw.trim();
  if (uri.startsWith('MONGODB_URI=')) {
    uri = uri.slice('MONGODB_URI='.length).trim();
  }
  while ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }
  uri = uri.replace(/^["']+|["']+$/g, '').trim();
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    if (uri.includes('<username>') || uri.includes('<password>')) {
      return FALLBACK_MONGODB_URI;
    }
    return uri;
  }
  return FALLBACK_MONGODB_URI;
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI);

const options = {
  appName: 'devrel.vercel.integration',
  maxIdleTimeMS: 5000,
};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(MONGODB_URI, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

// Attach the client to ensure proper cleanup on function suspension in Vercel
try {
  import('@vercel/functions')
    .then(({ attachDatabasePool }) => {
      if (attachDatabasePool && client) {
        attachDatabasePool(client);
      }
    })
    .catch(() => {});
} catch (_) {}

export default clientPromise;
