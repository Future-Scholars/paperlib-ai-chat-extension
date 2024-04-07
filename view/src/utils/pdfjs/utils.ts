import { stringUtils, urlUtils } from "paperlib-api/utils";

import pdfworker from "./worker";
import fs from "fs";


async function cmapProvider(name) {
    let buf = fs.readFileSync(__dirname + "/cmaps/" + name + ".bcmap");
    return {
        compressionType: 1,
        cMapData: buf,
    };
}

let fontCache = {};
async function standardFontProvider(filename) {
    if (fontCache[filename]) {
        return fontCache[filename];
    }
    let data = fs.readFileSync(__dirname + "/standard_fonts/" + filename);
    fontCache[filename] = data;
    return data;
}


export async function getFullText(url: string) {
    let buf = fs.readFileSync(urlUtils.eraseProtocol(url));
    let pdfData = await pdfworker.getRecognizerData(
        buf,
        "",
        cmapProvider,
        standardFontProvider,
    );

    const fulltext: string[] = []

    for (const page of pdfData.pages) {
        const textData = page[2][0][0][0][4];
        const sentences: string[] = [];
        for (const text of textData) {
            const wordList = text[0];
            const sentence = wordList.map((word) => word[13] + " ".repeat(word[5])).join("");
            sentences.push(sentence);
        }

        const pagetext = sentences.join("\n");
        fulltext.push(pagetext);
    }
    return fulltext
}