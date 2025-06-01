const mongoose = require('mongoose');

//Commerce

const ztpriceshistory = new mongoose.Schema({
    COMPANYID: { type: String },
    CEDIID: { type: String },
    LABELID: { type: String, required: true },
    LABEL: { type: String, required: true },
    INDEX: { type: String },
    COLLECTION: { type: String },
    SECTION: { type: String },
    SEQUENCE: { type: Number },
    IMAGE: { type: String },
    DESCRIPTION: { type: String },
    DETAIL_ROW: {
        ACTIVED: { type: Boolean, default: true },
        DELETED: { type: Boolean, default: false },
        DETAIL_ROW_REG: [{
            CURRENT: { type: Boolean, default: false },
            REGDATE: { type: Date },
            REGTIME: { type: Date },
            REGUSER: { type: String }
        }]
    }
});

module.exports = mongoose.model(
    "ZTPRICESHISTORY",
    ztpriceshistory,
    "ZTPRICESHISTORY"
);