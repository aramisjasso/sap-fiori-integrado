const mongoose = require('mongoose');
const { Schema } = mongoose;

const DetailRowRegSchema = new Schema({
  CURRENT: { type: Boolean, default: false },
  REGDATE: { type: Date, required: true },
  REGTIME: { type: Date, required: true },
  REGUSER: { type: String, required: true }
}, { _id: false });

const DetailRowSchema = new Schema({
  ACTIVED: { type: Boolean, default: true },
  DELETED: { type: Boolean, default: false },
  DETAIL_ROW_REG: { type: [DetailRowRegSchema], default: [] }
}, { _id: false });

const PrivilegeSchema = new Schema({
  PROCESSID: { type: String, required: true },
  PRIVILEGEID: { type: [String], required: true }
}, { _id: false });

const RoleSchema = new Schema({
  ROLEID: { type: String, required: true },
  ROLENAME: { type: String, required: true },
  DESCRIPTION: { type: String },
  PRIVILEGES: { type: [PrivilegeSchema], default: [] },
  DETAIL_ROW: { type: DetailRowSchema, default: {} }
}, {
  versionKey: false 
});

// Middleware automático antes de guardar
RoleSchema.pre('save', function (next) {
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


module.exports = mongoose.model('ZTROLES', RoleSchema, 'ZTROLES');
