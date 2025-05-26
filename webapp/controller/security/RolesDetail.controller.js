sap.ui.define([
  "com/invertions/sapfiorimodinv/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/base/Log",
  "sap/m/MessageToast"
], function (BaseController, JSONModel, Log, MessageToast) {
  "use strict";

  return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.RolesDetail", {

    onInit: async function () {
      await this.loadCatalogsOnce();

      const oProcessModel = this.getOwnerComponent().getModel("processCatalogModel");
      const oPrivilegeModel = this.getOwnerComponent().getModel("privilegeCatalogModel");

      if (oProcessModel) this.getView().setModel(oProcessModel, "processCatalogModel");
      if (oPrivilegeModel) this.getView().setModel(oPrivilegeModel, "privilegeCatalogModel");
    },

    loadCatalogsOnce: async function () {
      if (this._catalogsLoaded) return;
      await this.loadCatalog("IdProcesses", "processCatalogModel");
      await this.loadCatalog("IdPrivileges", "privilegeCatalogModel");
      this._catalogsLoaded = true;
    },

    loadCatalog: async function (labelId, modelName) {
      try {
        //const res = await fetch(`http://localhost:3033/api/sec/usersroles/catalogsR?procedure=get&type=bylabelid&labelid=${labelId}`);
        const data = await res.json();
        const values = data.value?.[0]?.VALUES || [];
        this.getView().setModel(new JSONModel({ values }), modelName);
      } catch (e) {
        Log.error("Error cargando catálogo", e);
      }
    },

    _onRouteMatched: function (oEvent) {
      const sRoleId = decodeURIComponent(oEvent.getParameter("arguments").roleId);
      const oModel = this.getOwnerComponent().getModel("roles");

      if (!oModel) {
        MessageToast.show("Modelo de roles no disponible.");
        return;
      }

      const aRoles = oModel.getProperty("/value");
      const oRole = aRoles.find(role => role.ROLEID === sRoleId);

      if (!oRole) {
        MessageToast.show("Rol no encontrado.");
        return;
      }

      this.getView().setModel(new JSONModel(oRole), "selectedRole");
    }

  });
});
