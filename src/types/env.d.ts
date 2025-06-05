declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    APP_PORT: string;
    DB_URI: string;
  }
}
