import { MongoClient, MongoClientOptions } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

const FALLBACK_MONGODB_URI =
  'mongodb+srv://Vercel-Admin-HIGHROLLER:FSBV2A58PpzALcqU@highroller.d8jezy5.mongodb.net/?retryWrites=true&w=majority';

function sanitizeMongoUri(raw: string | undefined): string {
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

const options: MongoClientOptions = {
  appName: "devrel.vercel.integration",
  maxIdleTimeMS: 5000
};
const client = new MongoClient(MONGODB_URI, options);

// Attach the client to ensure proper cleanup on function suspension
try {
  attachDatabasePool(client);
} catch (e) {
  // Graceful fallback if not running on Vercel runtime
}

// Export a module-scoped MongoClient to ensure the client can be shared across functions.
export default client;
