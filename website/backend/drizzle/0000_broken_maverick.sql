CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userName" varchar(25) NOT NULL,
	"email" text NOT NULL,
	"wcaId" varchar(20),
	"wcaIdNo" integer,
	"avatarURL" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_userName_unique" UNIQUE("userName")
);
