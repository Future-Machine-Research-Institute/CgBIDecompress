const path = require("path");
const fs = require('fs');
const cgbi = require('./lib/cgbi')

function base64ImageToBuffer(base64String) {
    if (!base64String) {
        return new Error('Invalid base64String');
    }
    const buffer = new Object();
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    buffer.type = matches[1].match(/\/(.*?)$/)[1];
    buffer.data = Buffer.from(matches[2], 'base64');
    return buffer;
}

async function writeStreamBufferAsync(path, buffer) {
    return new Promise(async (resolve, reject) => {
        const writeStream = fs.createWriteStream(path);
        writeStream.on('error', (err) => {
            return reject(err);
        });
        writeStream.on('open', (fd) => {

        });
        writeStream.on('finish', () => {
            return resolve(path);
        });
        writeStream.on('close', () => {

        });
        writeStream.write(buffer);
        writeStream.end();
    })
}

const cgbiBuffer = fs.readFileSync("./resource/cgbi-delta.png");
const pngBuffer = cgbi.revert(cgbiBuffer)
console.log(pngBuffer)
let icon = 'data:image/png;base64,' + pngBuffer.toString('base64');
console.log(icon)
const iconBuffer = base64ImageToBuffer(icon)
writeStreamBufferAsync(path.resolve("./resource/", `${"png-delta"}.${"png"}`), iconBuffer.data);

