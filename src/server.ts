import Fastify from "fastify";
import { usersRoutes } from "./routes/users";

const fastify = Fastify({ logger: true });

fastify.register(usersRoutes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

fastify.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  
});
