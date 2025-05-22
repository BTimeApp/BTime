import mongoose from 'mongoose';
import { config } from '@/server/config';

export const connectToDB = async () => {
  await mongoose.connect(config.database.uri).then(() => {
    console.log('Connected to DB.');
  }).catch((err) => {
    console.log('Error when connecting to DB:', err);
    process.exit();
  });
};