const cds = require('@sap/cds');

const { RolesCRUD, UsersCRUD, GetAllCompanies, GetDepartmentsByCompany } = require('../services/sec-usersroles-service');


class SecurityClass extends cds.ApplicationService {
  async init() {

    this.on('usersCRUD', async (req) => {
      return UsersCRUD(req);
    });

    //CRUD COMPLETO DE ROLES ദ്ദി •⩊• ), para no tener que hacer todo x separado
    this.on('rolesCRUD', async (req) => {
      return RolesCRUD(req);
    });


    //enpoinds cap auxiliares wawa

    this.on('getAllCompanies', async (req) => {
      return GetAllCompanies();
    });

    this.on('getDepartmentsByCompany', async (req) => {
      const { companyIdStr } = req.data;
      return GetDepartmentsByCompany(companyIdStr);
    });

  };


  
};
module.exports = SecurityClass;