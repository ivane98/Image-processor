import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1", // or your Redis server
  port: 6379,
  // password: process.env.REDIS_PASSWORD, // if needed
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error", err));

export default redis;
