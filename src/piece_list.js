'use strict';

const constants = require('./constants');

module.exports = class PieceList {
    constructor() {
        this.indices = [];
    }

    push(index) {
        this.indices.push(index);
    }

    remove(index) {
        let reverseIndex = this.indices.indexOf(index);
        this.indices.splice(reverseIndex, 1);
    }
};