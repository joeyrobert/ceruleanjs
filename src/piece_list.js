'use strict';

const constants = require('./constants');

module.exports = class PieceList {
    constructor() {
        this.indices = new Array(16);
        this.reverse = new Array(constants.WIDTH * constants.HEIGHT);
        this.length = 0;
    }

    push(index) {
        this.reverse[index] = this.length;
        this.indices[this.length] = index;
        this.length++;
    }

    shift(index) {
        this.push(this.indices[0])
        this.reverse[index] = 0;
        this.indices[0] = index;
    }

    remove(index) {
        this.length--;
        var reverseIndex = this.reverse[index];
        this.indices[reverseIndex] = this.indices[this.length];
        this.reverse[this.indices[reverseIndex]] = reverseIndex;
        this.indices[this.length] = undefined;
        this.reverse[index] = undefined;
    }
};