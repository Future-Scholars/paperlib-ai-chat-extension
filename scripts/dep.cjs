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


const NODE_MODULES_PATH= path.resolve(__dirname, "..", "dist", "node_modules")

const filePaths = fs.readdirSync(NODE_MODULES_PATH,{recursive:true})

for (const filePath of filePaths){
    if ([".wasm",".map",".ts",".md"].some((fileType)=>filePath.endsWith(fileType))){
        fs.rmSync(path.resolve(NODE_MODULES_PATH,filePath), {force: true,recursive:true})
    }
}


