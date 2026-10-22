import { MongoClient, MongoClientOptions } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://Vercel-Admin-HIGHROLLER:FSBV2A58PpzALcqU@highroller.d8jezy5.mongodb.net/?retryWrites=true&w=majority';

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
