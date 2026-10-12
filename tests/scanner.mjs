// HTTPS contract fixture only. This is NOT a malware engine and is never used by the application outside tests.
import https from "node:https";
import fs from "node:fs";
https
  .createServer(
    {
      key: fs.readFileSync(process.env.BLIES_TEST_TLS_KEY),
      cert: fs.readFileSync(process.env.BLIES_TEST_TLS_CERT),
    },
    async (req, res) => {
      if (req.method === "GET") {
        res.end("ready");
        return;
      }
      if (
        req.headers.authorization !==
        `Bearer ${process.env.BLIES_TEST_SCAN_KEY}`
      ) {
        res.writeHead(401);
        res.end();
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ clean: !bytes.includes(Buffer.from("EICAR")) }));
    },
  )
  .listen(3002, "127.0.0.1");
