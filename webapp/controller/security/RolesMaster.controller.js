sap.ui.define([
  "com/invertions/sapfiorimodinv/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/base/Log",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment"
], function (BaseController,JSONModel,Log,MessageToast,MessageBox,Filter,FilterOperator,Fragment,$){
  "use strict";


  return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.RolesMaster", {


onInit: function () {
  this._catalogsLoaded = false;
  this.initModels();
  this.loadRolesData();


  const oUiStateModel = new JSONModel({
    isDetailVisible: false,
    dialogMode: "create" // modo por defecto
  });


  this.getView().setModel(oUiStateModel, "uiState");


  // Cargar el fragmento solo una vez
  if (!this._pDialog) {
    this._pDialog = Fragment.load({
      name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
      controller: this
    }).then(function (oDialog) {
      this.getView().addDependent(oDialog);
      return oDialog;
    }.bind(this));
  }
},


    initModels: function () {
      const view = this.getView();
      view.setModel(new JSONModel(), "selectedRole");


      view.setModel(new JSONModel({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        PRIVILEGES: []
      }), "newRoleModel");
    },


    loadCatalogsOnce: async function () {
      if (!this._catalogsLoaded) {
        await this.loadCatalog("IdProcesses", "processCatalogModel");
        await this.loadCatalog("IdPrivileges", "privilegeCatalogModel");
        this._catalogsLoaded = true;
      }
    },


    onOpenDialog: async function () {
      await this.loadCatalogsOnce();


      this.getView().getModel("newRoleModel").setData({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        PRIVILEGES: []
      });


      this._pDialog.then(function (oDialog) {
        oDialog.setTitle("Crear Rol");
        oDialog.open();
      });
    },


    onDialogClose: function () {
      this._pDialog.then(function (oDialog) {
        oDialog.close();
      });
    },


    onAddPrivilege: function () {
      const oModel = this.getView().getModel("newRoleModel");
      const oData = oModel.getData();


      if (!oData.NEW_PROCESSID || !Array.isArray(oData.NEW_PRIVILEGES) || oData.NEW_PRIVILEGES.length === 0) {
        MessageToast.show("Selecciona proceso y al menos un privilegio.");
        return;
      }


      oData.PRIVILEGES.push({
        PROCESSID: oData.NEW_PROCESSID,
        PRIVILEGEID: oData.NEW_PRIVILEGES
      });


      oData.NEW_PROCESSID = "";
      oData.NEW_PRIVILEGES = [];
      oModel.setData(oData);
    },


  onSaveRole: async function () {
  const oView = this.getView();
  const oData = oView.getModel("newRoleModel").getData();
  const oUiState = oView.getModel("uiState");
  const bIsEditMode = oUiState?.getProperty("/dialogMode") === "edit";


  if (!oData.ROLEID || !oData.ROLENAME) {
    MessageToast.show("ID y Nombre del Rol son obligatorios.");
    return;
  }


  try {
    const sProcedure = bIsEditMode ? "patch" : "post";
    const sMethod = "POST"; // Siempre POST, y que el backend lo distinga por `procedure`


    const response = await fetch(`http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=${sProcedure}`, {
      method: sMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ROLEID: oData.ROLEID,
        ROLENAME: oData.ROLENAME,
        DESCRIPTION: oData.DESCRIPTION,
        PRIVILEGES: oData.PRIVILEGES
      })
    });


    if (!response.ok) throw new Error(await response.text());


    MessageToast.show(bIsEditMode ? "Rol actualizado correctamente." : "Rol guardado correctamente.");


    this._pDialog.then(function (oDialog) {
      oDialog.close();
    });


    const oRolesModel = this.getOwnerComponent().getModel("roles");
    let aAllRoles = oRolesModel.getProperty("/valueAll") || [];


    if (bIsEditMode) {
      // Actualizar el rol en la lista
      aAllRoles = aAllRoles.map((r) => {
        if (r.ROLEID === oData.ROLEID) {
          return {
            ...r,
            ROLENAME: oData.ROLENAME,
            DESCRIPTION: oData.DESCRIPTION,
            PRIVILEGES: oData.PRIVILEGES
          };
        }
        return r;
      });
    } else {
      // Agregar nuevo rol
      const oNewRole = {
        ROLEID: oData.ROLEID,
        ROLENAME: oData.ROLENAME,
        DESCRIPTION: oData.DESCRIPTION,
        PRIVILEGES: oData.PRIVILEGES,
        DETAIL_ROW: {
          ACTIVED: true,
          DELETED: false
        }
      };
      aAllRoles.push(oNewRole);
    }


    // Filtrar según el filtro actual
    let aFiltered = [];
    const sFilterKey = oRolesModel.getProperty("/filterKey");


    switch (sFilterKey) {
      case "active":
        aFiltered = aAllRoles.filter(r => r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
        break;
      case "inactive":
        aFiltered = aAllRoles.filter(r => !r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
        break;
      default:
        aFiltered = aAllRoles.filter(r => !r.DETAIL_ROW?.DELETED);
    }


    oRolesModel.setProperty("/valueAll", aAllRoles);
    oRolesModel.setProperty("/value", aFiltered);


  } catch (err) {
    MessageBox.error("Error al guardar el rol: " + err.message);
  }
},


onDesactivateRole: function () {
  const oTable = this.byId("rolesTable");
  const iIndex = oTable.getSelectedIndex();


  if (iIndex === -1) {
    MessageToast.show("Selecciona un rol para desactivar.");
    return;
  }


  const oSelectedRole = oTable.getContextByIndex(iIndex).getObject();


  // Setear el modelo seleccionado
  const oModel = new JSONModel(oSelectedRole);
  this.getView().setModel(oModel, "selectedRole");


  // Llamar al handler
  this._handleRoleAction({
    dialogType: "confirm",
    message: "¿Estás seguro de que deseas desactivar el rol \"{ROLENAME}\"?",
    title: "Confirmar desactivación",
    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
    emphasizedAction: MessageBox.Action.YES,
    confirmAction: MessageBox.Action.YES,
    method: "POST",
    url: "http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=delete&type=logic&roleid=",
    successMessage: "Rol desactivado correctamente."
  });
},




      onDeleteRole: function () {
      this._handleRoleAction({
        dialogType: "warning",
        message: "¿Estás seguro de que deseas eliminar el rol \"{ROLENAME}\" permanentemente? Esta acción no se puede deshacer.",
        title: "Confirmar eliminación permanente",
        actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.DELETE,
        confirmAction: MessageBox.Action.DELETE,
        method: "POST",
        url: "http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=delete&type=hard&roleid=",
        successMessage: "Rol eliminado permanentemente."
      });
    },


  loadRolesData: async function () {
  try {
    const response = await fetch("http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=get&type=all", {
      method: "POST"
    });
    const data = await response.json();


    const aAllRoles = (data.value || []).filter(role => role.DETAIL_ROW?.DELETED === false);
    const aFiltered = aAllRoles.filter(role => role.DETAIL_ROW?.ACTIVED === true);


    // 🔁 Si ya existe el modelo, actualiza sus propiedades
    let oRolesModel = this.getOwnerComponent().getModel("roles");
    if (!oRolesModel) {
      oRolesModel = new JSONModel();
      this.getOwnerComponent().setModel(oRolesModel, "roles");
    }


    oRolesModel.setProperty("/valueAll", aAllRoles);
    oRolesModel.setProperty("/value", aFiltered);
    oRolesModel.setProperty("/filterKey", "active");
    oRolesModel.refresh(true); // 🔄 Fuerza actualización de bindings


  } catch (error) {
    Log.error("Error al cargar roles", error);
  }
},




    onRemovePrivilege: function (oEvent) {
      const oModel = this.getView().getModel("newRoleModel");
      const oData = oModel.getData();


      const oItem = oEvent.getSource().getParent();
      const oContext = oItem.getBindingContext("newRoleModel");
      const iIndex = oContext.getPath().split("/").pop();


      oData.PRIVILEGES.splice(iIndex, 1);
      oModel.setData(oData);
    },


    loadCatalog: async function (labelId, modelName) {
      try {
        //const response = await fetch(`http://localhost:3033/api/sec/usersroles/catalogsR?procedure=get&type=bylabelid&&labelid=${labelId}`);
        const data = await response.json();
        const values = data.value?.[0]?.VALUES || [];
        this.getView().setModel(new JSONModel({ values }), modelName);
      } catch (err) {
        Log.error(`Error al cargar catálogo ${labelId}`, err);
      }
    },


  onRoleSelected: async function () {
  const oTable = this.byId("rolesTable");
  const iIndex = oTable.getSelectedIndex();
  if (iIndex === -1) {
    MessageToast.show("Selecciona un rol válido.");
    return;
  }


  const oRolesView = this.getView().getParent().getParent(); // sube hasta Roles.view
  const oUiStateModel = oRolesView.getModel("uiState");


  if (oUiStateModel) {
    oUiStateModel.setProperty("/isDetailVisible", true);
  }


  const oRole = oTable.getContextByIndex(iIndex).getObject();
  const sId = encodeURIComponent(oRole.ROLEID);


  try {
    const res = await fetch(`http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=get&type=all&roleid=${sId}`, {
      method: "POST"
    });
    const result = await res.json();


    if (!result?.value?.length) {
      MessageBox.warning("No se encontró información del rol.");
      return;
    }


    console.log("📦 Resultado del fetch get role:", result);


    // Buscar el rol exacto en el arreglo result.value
    const selectedRole = result.value.find(r => r.ROLEID === oRole.ROLEID);


    if (!selectedRole) {
      MessageBox.warning("No se encontró el rol exacto seleccionado.");
      return;
    }


    this.getOwnerComponent().setModel(new JSONModel(selectedRole), "selectedRole");
  } catch (e) {
    MessageBox.error("Error al obtener el rol: " + e.message);
  }


  console.log("👉 Se ejecutó onRoleSelected");
},




    onMultiSearch: function () {
      const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      const oBinding = this.byId("rolesTable").getBinding("rows");
      const aFilters = sQuery ? [new Filter("ROLENAME", FilterOperator.Contains, sQuery)] : [];
      oBinding.filter(aFilters);
    },


onEditRole: async function () {
const oRole = this.getOwnerComponent().getModel("selectedRole")?.getData();


  if (!oRole || !oRole.ROLEID) {
    MessageToast.show("Selecciona un rol para editar.");
    return;
  }


  await this.loadCatalogsOnce();


  // Cargar los datos en el modelo del diálogo
  const oModel = this.getView().getModel("newRoleModel");
  oModel.setData({
    ROLEID: oRole.ROLEID,
    ROLENAME: oRole.ROLENAME,
    DESCRIPTION: oRole.DESCRIPTION,
    PRIVILEGES: oRole.PRIVILEGES || [],
    NEW_PROCESSID: "",
    NEW_PRIVILEGES: []
  });


  // Establecer modo edición
  const oUiState = this.getView().getModel("uiState");
  oUiState.setProperty("/dialogMode", "edit");


  this._pDialog.then(function (oDialog) {
    oDialog.setTitle("Editar Rol");
    oDialog.open();
  });
},


_handleRoleAction: async function (options) {
  const oModel = this.getView().getModel("selectedRole");
  const oData = oModel ? oModel.getData() : null;
  const that = this;


  if (!oData || !oData.ROLEID) {
    MessageToast.show("No se encontró el ROLEID.");
    return;
  }


  MessageBox[options.dialogType](
    options.message.replace("{ROLENAME}", oData.ROLENAME),
    {
      title: options.title,
      actions: options.actions,
      emphasizedAction: options.emphasizedAction,
      onClose: async function (oAction) {
        if (oAction === options.confirmAction) {
          try {
            const response = await fetch(`${options.url}${oData.ROLEID}`, {
              method: options.method
            });


            const result = await response.json();


            if (result && !result.error) {
              MessageToast.show(options.successMessage);
              const oRolesModel = that.getOwnerComponent().getModel("roles");
              if (oRolesModel) {
                let aRoles = oRolesModel.getProperty("/valueAll");


                // 🔄 Si es actualización lógica, modifica solo el estado
                if (options.updateOnly) {
                  aRoles = aRoles.map(role => {
                    if (role.ROLEID === oData.ROLEID) {
                      return {
                        ...role,
                        DETAIL_ROW: {
                          ...role.DETAIL_ROW,
                          ACTIVED: false
                        }
                      };
                    }
                    return role;
                  });
                } else {
                  // ❌ Eliminación física (remueve el rol del modelo)
                  aRoles = aRoles.filter(role => role.ROLEID !== oData.ROLEID);
                }


                // Reaplica el filtro
                const sFilterKey = oRolesModel.getProperty("/filterKey") || "active";
                let aFiltered = [];


                switch (sFilterKey) {
                  case "active":
                    aFiltered = aRoles.filter(r => r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
                    break;
                  case "inactive":
                    aFiltered = aRoles.filter(r => !r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
                    break;
                  default:
                    aFiltered = aRoles.filter(r => !r.DETAIL_ROW?.DELETED);
                }


                oRolesModel.setProperty("/valueAll", aRoles);
                oRolesModel.setProperty("/value", aFiltered);
              }


              //that.getOwnerComponent().getRouter().navTo("RouteRolesMaster");
              that.loadRolesData(); // Recargar roles




            } else {
              MessageBox.error("Error: " + (result?.message || "desconocido"));
            }
          } catch (error) {
            MessageBox.error("Error en la petición: " + error.message);
          }
        }
      }
    }
  );
},


    onToggleActive: async function () {
      const oSelectedRole = this.getView().getModel("selectedRole").getData();
      if (!oSelectedRole?.ROLEID) {
        MessageToast.show("Selecciona un rol válido.");
        return;
      }


      const bNewState = !oSelectedRole.DETAIL_ROW?.ACTIVED;
      const sMessage = bNewState
        ? "¿Deseas activar este rol?"
        : "¿Deseas desactivar este rol?";


      MessageBox.confirm(sMessage, {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: async function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            try {
              const res = await fetch("http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=patch", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ROLEID: oSelectedRole.ROLEID,
                  "DETAIL_ROW.ACTIVED": bNewState
                })
              });


              if (!res.ok) throw new Error(await res.text());


              MessageToast.show("Estado del rol actualizado.");
              this.loadRolesData(); // Recargar roles
            } catch (e) {
              MessageBox.error("Error al actualizar el estado: " + e.message);
            }
          }
        }.bind(this)
      });
    },
  });
});
