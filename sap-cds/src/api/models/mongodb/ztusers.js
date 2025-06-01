const mongoose = require('mongoose');

const DetailRowRegSchema = new mongoose.Schema({
        CURRENT: { type: Boolean, default: false },
        REGDATE: { type: Date, required: true },
        REGTIME: { type: Date, required: true },
        REGUSER: { type: String, required: true }
}, { _id: false });

const DetailRowSchema = new mongoose.Schema({
        ACTIVED: { type: Boolean, default: true },
        DELETED: { type: Boolean, default: false },
        DETAIL_ROW_REG: { type: [DetailRowRegSchema], default: [] }
}, { _id: false });

const UsersSchema = new mongoose.Schema({
        USERID: { type: String, required: true },
        USERNAME: { type: String },
        PASSWORD: { type: String, required: true },
        ALIAS: { type: String },
        FIRSTNAME: { type: String },
        LASTNAME: { type: String },
        EMAIL: { type: String },
        BIRTHDAYDATE: { type: Date },
        COMPANYID: { type: Number },
        COMPANYNAME: { type: String },
        COMPANYALIAS: { type: String },
        CEDIID: { type: String },
        EMPLOYEEID: { type: Number },
        PHONENUMBER: { type: String },
        EXTENSION: { type: String },
        DEPARTMENT: { type: String },
        FUNCTION: { type: String },
        STREET: { type: String },
        POSTALCODE: { type: Number },
        CITY: { type: String },
        REGION: { type: String },
        STATE: { type: String },
        COUNTRY: { type: String },
        AVATAR: { type: String },
        CAPITAL: { type: String},
        ROLES: {
                type: [{
                        ROLEID: { type: String },
                        ROLESAPID: { type: String }
                }],
                default: []
        },
        DETAIL_ROW: { type: DetailRowSchema, default: {} }
});

// Middleware automático antes de guardar
UsersSchema.pre('save', function (next) {
        const now = new Date();

        if (!this.DETAIL_ROW) this.DETAIL_ROW = {};

        if (this.DETAIL_ROW.ACTIVED === undefined) {
                this.DETAIL_ROW.ACTIVED = true;
        }
        if (this.DETAIL_ROW.DELETED === undefined) {
                this.DETAIL_ROW.DELETED = false;
        }

        if (!this.DETAIL_ROW.DETAIL_ROW_REG || this.DETAIL_ROW.DETAIL_ROW_REG.length === 0) {
                this.DETAIL_ROW.DETAIL_ROW_REG = [
                        {
                                CURRENT: true,
                                REGDATE: now,
                                REGTIME: now,
                                REGUSER: this._reguser || 'SYSTEM'
                        }
                ];
        }

        next();
});

module.exports = mongoose.model(
        'ZTUSERS',
        UsersSchema,
        'ZTUSERS'
);