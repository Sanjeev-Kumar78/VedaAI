import http from "node:http";
import { createApp } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { env } from "./config/env.js";
import { attachSocketServer } from "./modules/websocket/socket-server.js";

async function bootstrap() {
  await connectMongo();

  const app = createApp();
  const server = http.createServer(app);

  attachSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`VedaAI backend listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Backend failed to start", error);
  process.exit(1);
});
