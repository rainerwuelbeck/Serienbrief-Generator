import { createCanvas } from "@napi-rs/canvas";
import fs from "node:fs";

const canvas = createCanvas(400, 160);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#0f2f4d";
ctx.fillRect(0, 0, 400, 160);
ctx.fillStyle = "#ffffff";
ctx.font = "bold 48px sans-serif";
ctx.fillText("TestLogo", 30, 95);
fs.writeFileSync("test-data/logo.png", canvas.toBuffer("image/png"));
console.log("written test-data/logo.png");
