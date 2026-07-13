import { createServer } from "./index.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const app = createServer();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});