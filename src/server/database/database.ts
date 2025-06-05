import mongoose from 'mongoose';

export const connectToDB = async () => {
  await mongoose.connect(process.env.DB_URI).then(() => {
    console.log('Connected to DB.');
  }).catch((err) => {
    console.log('Error when connecting to DB:', err);
    process.exit();
  });
};