const {execSync} = require("child_process")
const fs = require("fs")
const path = require("path");


const pkg = require("../package.json");

const transformersVersion = pkg.devDependencies["@xenova/transformers"];

pkg.dependencies = {
    "@xenova/transformers": transformersVersion
}

pkg.devDependencies = {}


fs.writeFileSync(path.resolve(__dirname, "..", "dist", "package.json"), JSON.stringify(pkg))

execSync("npm install --production", {cwd: path.resolve(__dirname, "..", "dist")})


fs.rmSync(path.resolve(__dirname, "..", "dist", "node_modules", "onnxruntime-web"), {force: true, recursive: true})


