// bg-worker.mjs — запускается как отдельный процесс: in -> out
import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";

const [, , inPath, outPath] = process.argv;

const buf = fs.readFileSync(inPath);
const blob = new Blob([buf], { type: "image/png" });

const res = await removeBackground(blob, {
  debug: false,
  proxyToWorker: false,
  model: "small",
});

fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
console.error("BG_OK"); // маркер успеха в stderr
