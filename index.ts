require("dotenv").config({ path: __dirname + `/.env.${process.env.NODE_ENV}` });
import express from "express";
import bodyParser from "body-parser";
import { Runner } from "./runner";
import { join } from "path";
import cons from "consolidate";
import cors from "cors";

import { initKVController } from "./kv.controller";

const PORT = 7001;

async function main() {
  const app = express();
  app.engine("html", cons.handlebars);
  app.set("view engine", "html");
  app.set("views", join(__dirname, "views"));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cors());
  app.use(express.static("public"));

  app.get("/", async (req, res) => {
    res.render("runner-home");
  });

  await initKVController(app);

  app.listen(PORT, () => {
    console.log(`server started on http://127.0.0.1:${PORT}`);
  });

  new Runner().init().catch((error) => {
    console.log("runner error:", error);
  });
}

main()
  .then(() => {})
  .catch((e) => {
    console.log(e);
  });
