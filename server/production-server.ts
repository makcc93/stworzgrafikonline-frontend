import "dotenv/config";
import { createServer } from "./index";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const app = createServer();

app.listen(PORT, HOST, () => {
  console.log(`🚀 Production server running on http://${HOST}:${PORT}`);
  console.log(`📁 Serving static files from: ./dist/spa`);
  console.log(`🔐 Mock API available at: /api/*`);
  console.log(`👤 Demo login: admin / admin`);
});
