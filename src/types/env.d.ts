declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    APP_PORT: string;
    DB_URI: string;
    WCA_SOURCE: string;
    WCA_CLIENT_ID: string;
    WCA_CLIENT_SECRET: string;
    WCA_CALLBACK_URL: string;
    SESSION_SECRET: string;
  }
}
