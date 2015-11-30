'use strict';

const constants = require('./constants');

module.exports = class PieceList {
    constructor() {
        this.indices = [];
        this.reverse = new Array(constants.WIDTH * constants.HEIGHT);
    }

    push(index) {
        this.reverse[index] = this.indices.length;
        this.indices.push(index);
    }

    subtract(index) {
        let reverseIndex = this.reverse[index];
        this.indices.splice(reverseIndex, 1);
        this.reverse[index] = undefined;
    }
};