"use strict";

const crc = require("crc")
const pako = require("pako")
const bufferpack = require("./bufferPack")

let indexOf = [].indexOf || function (item) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (i in this && this[i] === item) return i;
    }
    return -1;
}

class Cgbi {

    #PNGHEADER_BASE64
    #ignoreChunkTypes

    constructor() {
        this.#PNGHEADER_BASE64 = "iVBORw0KGgo="
        this.#ignoreChunkTypes = ["CgBI", "iDOT"]
    }

    #isBrowser() {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
    }

    #concat(arrayList) {
        if (!this.#isBrowser()) {
            return Buffer.concat(arrayList)
        } else {
            let totalLen = 0;
            for (let arr of arrayList) {
                totalLen += arr.length;
            }
            let res = new Uint8Array(totalLen)
            let offset = 0
            for (let arr of arrayList) {
                res.set(arr, offset)
                offset += arr.length
            }
            return res
        }
    }

    revert(buffer) {
        let isIphoneCompressed = false;
        let offset = 0;
        let chunks = [];
        let idatCgbiData = !this.#isBrowser() ? Buffer.alloc(0) : new Uint8Array(0);
        let headerData = buffer.slice(0, 8);
        let ref, width, height, chunk, uncompressed, newData, j, y, ref1, ref2, k, x, idatData, chunkCRC, idat_chunk;
        offset += 8;
        if (headerData.toString("base64") !== this.#PNGHEADER_BASE64) {
            throw new Error("not a png file");
        }
        while (offset < buffer.length) {
            chunk = {};
            let data = buffer.slice(offset, offset + 4);
            offset += 4;
            chunk.length = bufferpack.unpack("L>", data, 0)[0];
            data = buffer.slice(offset, offset + 4);
            offset += 4;
            chunk.type = data.toString();
            chunk.data = data = buffer.slice(offset, offset + chunk.length);
            offset += chunk.length;
            let dataCrc = buffer.slice(offset, offset + 4);
            offset += 4;
            chunk.crc = bufferpack.unpack("L>", dataCrc, 0)[0];
            if (chunk.type === "CgBI") {
                isIphoneCompressed = true;
            }
            if (((ref = chunk.type), indexOf.call(this.#ignoreChunkTypes, ref) >= 0)) {
                continue;
            }
            if (chunk.type === "IHDR") {
                width = bufferpack.unpack("L>", data)[0];
                height = bufferpack.unpack("L>", data, 4)[0];
            }
            if (chunk.type === "IDAT" && isIphoneCompressed) {
                idatCgbiData = this.#concat([idatCgbiData, data]);
                continue;
            }
            if (chunk.type === "IEND" && isIphoneCompressed) {
                uncompressed = pako.inflateRaw(idatCgbiData);
                newData = !this.#isBrowser() ? Buffer.alloc(uncompressed.length) : new Uint8Array(uncompressed.length);
                let i = 0;
                for (
                    y = j = 0, ref1 = height - 1;
                    0 <= ref1 ? j <= ref1 : j >= ref1;
                    y = 0 <= ref1 ? ++j : --j
                ) {
                    newData[i] = uncompressed[i];
                    i++;
                    for (
                        x = k = 0, ref2 = width - 1;
                        0 <= ref2 ? k <= ref2 : k >= ref2;
                        x = 0 <= ref2 ? ++k : --k
                    ) {
                        newData[i + 0] = uncompressed[i + 2];
                        newData[i + 1] = uncompressed[i + 1];
                        newData[i + 2] = uncompressed[i + 0];
                        newData[i + 3] = uncompressed[i + 3];
                        i += 4;
                    }
                }
                idatData = pako.deflate(newData);
                chunkCRC = crc.crc32("IDAT");
                chunkCRC = crc.crc32(idatData, chunkCRC);
                chunkCRC = (chunkCRC + 0x100000000) % 0x100000000;
                idat_chunk = {
                    type: "IDAT",
                    length: idatData.length,
                    data: idatData,
                    crc: chunkCRC
                };
                chunks.push(idat_chunk);
            }
            chunks.push(chunk);
        }
        let output = headerData;
        for (let l = 0, len = chunks.length; l < len; l++) {
            chunk = chunks[l];
            output = this.#concat([output, bufferpack.pack("L>", [chunk.length])]);
            const typeData = !this.#isBrowser() ? Buffer.from(chunk.type) : new TextEncoder().encode(chunk.type)
            output = this.#concat([output, typeData]);
            if (chunk.length > 0) {
                output = this.#concat([output, !this.#isBrowser() ? Buffer.from(chunk.data) : new Uint8Array(chunk.data)]);
            }
            output = this.#concat([output, bufferpack.pack("L>", [chunk.crc])]);
        }
        return output;
    }

}

const cgbi = new Cgbi()
module.exports = cgbi