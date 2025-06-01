const mongoose = require('mongoose');

const ztsymbols = new mongoose.Schema({
  SYMBOL: { type: String, required: true, unique: true, trim: true},
  NAME: { type: String, required: true },
  IPODATE: {  type: Date, default: null },
});

module.exports = mongoose.model('ZTSYMBOLS', ztsymbols, 'ZTSYMBOLS');