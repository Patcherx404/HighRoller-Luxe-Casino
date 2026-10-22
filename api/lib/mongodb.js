import { MongoClient } from 'mongodb';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://Vercel-Admin-HIGHROLLER:FSBV2A58PpzALcqU@highroller.d8jezy5.mongodb.net/?retryWrites=true&w=majority';

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
