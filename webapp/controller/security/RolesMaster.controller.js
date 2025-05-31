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


// ==============================
// INICIO DE TODO
// ==============================
onInit: function () {
  this._catalogsLoaded = false;
  this.initModels();
  this.loadRolesData();


  const oUiStateModel = new JSONModel({
    isDetailVisible: false,
    dialogMode: "create" // modo por defecto
  });


  this.getView().setModel(oUiStateModel, "uiState");


// ==============================
// Cargar el fragmento para anñadir roles
// ==============================
  if (!this._pDialog) {
    this._pDialog = Fragment.load({
      name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
      controller: this
    }).then(function (oDialog) {
      this.getView().addDependent(oDialog);
      return oDialog;
    }.bind(this));
  }

  // Fragmento para editar
  if (!this._pEditDialog) {
    this._pEditDialog = Fragment.load({
      name: "com.invertions.sapfiorimodinv.view.security.fragments.EditRoleDialog",
      controller: this
    }).then(function (oDialog) {
      this.getView().addDependent(oDialog);
      return oDialog;
    }.bind(this));
  }

},


// ==============================
// Inicializar los modelos 
// ==============================
    initModels: function () {
      const view = this.getView();
      view.setModel(new JSONModel(), "selectedRole");


      view.setModel(new JSONModel({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        NEW_APPID:"",
        NEW_VIEWID: "",
        NEW_PAGEID:"",
        PRIVILEGES: []
      }), "newRoleModel");
    },

//Cargar los catalogs de una sola vez, el de procesos y privilegios
    loadCatalogsOnce: async function () {
      if (!this._catalogsLoaded) {
        await this.loadCatalog("IdApplications","applicationCatalogModel");
        await this.loadCatalog("IdProcesses", "processCatalogModel");
        await this.loadCatalog("IdViews", "viewCatalogModel");
        await this.loadCatalog("IdPrivileges", "privilegeCatalogModel");
        this._catalogsLoaded = true;
      }
    },
// ==============================
// FUNCIÓN para abrir el dialogo de crear roles
// ==============================
    onOpenDialog: async function () {
      await this.loadCatalogsOnce();


      this.getView().getModel("newRoleModel").setData({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        NEW_APPID: "",
        NEW_PAGEID: "",
        PRIVILEGES: []
      });


      this._pDialog.then(function (oDialog) {
        oDialog.setTitle("Crear Rol");
        oDialog.open();
      });
    },

//Cuando se cierra el dialogo
    onDialogClose: function () {
      this._pDialog.then(function (oDialog) {
        oDialog.close();
      });

    // Cierra el de editar si está abierto
    this._pEditDialog && this._pEditDialog.then(function (oDialog) {
      if (oDialog.isOpen()) oDialog.close();
    });

    },

//Agregar privilegios al rol Y TAMBIEN CUANDO EDITA PRIVILEGIOS
onAddPrivilege: function () {
  // Detectar el modo de la UI
  const oUiState = this.getView().getModel("uiState");
  const bIsEditMode = oUiState?.getProperty("/dialogMode") === "edit";
  // Usar el modelo correcto según el modo
  const oModel = this.getView().getModel(bIsEditMode ? "roleDialogModel" : "newRoleModel");
  const oData = oModel.getData();

  if (!oData.NEW_PROCESSID || !Array.isArray(oData.NEW_PRIVILEGES) || oData.NEW_PRIVILEGES.length === 0) {
    MessageToast.show("Selecciona proceso y al menos un privilegio.");
    return;
  }

  // Obtener los textos de página y aplicación seleccionada
  const viewModel = this.getView().getModel("viewCatalogModel");
  const appModel = this.getView().getModel("applicationCatalogModel");

  const selectedView = viewModel.getProperty("/values").find(v => v.VALUEID === oData.NEW_VIEWID);
  const selectedApp = appModel.getProperty("/values").find(a => a.VALUEID === oData.NEW_APPID);

   oData.PRIVILEGES.push({
    PROCESSID: oData.NEW_PROCESSID,
    PRIVILEGEID: oData.NEW_PRIVILEGES,
    VIEWID: oData.NEW_VIEWID,
    VIEWNAME: selectedView ? selectedView.VALUE : "",
    APPLICATIONID: oData.NEW_APPID,
    APPLICATIONNAME: selectedApp ? selectedApp.VALUE : ""
  });

  oData.NEW_PROCESSID = "";
  oData.NEW_PRIVILEGES = [];
  oModel.setData(oData);
},

//Guardar el rol nuevo rol , crear rol, O EDITAR?
  onSaveRole: async function () {
  const oView = this.getView();
  const oData = oView.getModel("newRoleModel").getData();

  if (!oData.ROLEID || !oData.ROLENAME) {
    MessageToast.show("ID y Nombre del Rol son obligatorios.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ROLEID: oData.ROLEID,
        ROLENAME: oData.ROLENAME,
        DESCRIPTION: oData.DESCRIPTION,
        PRIVILEGES: (oData.PRIVILEGES || []).map(p => ({
          PROCESSID: p.PROCESSID,
          PRIVILEGEID: Array.isArray(p.PRIVILEGEID) ? p.PRIVILEGEID : [p.PRIVILEGEID]
        }))
      })
    });

    if (!response.ok) throw new Error(await response.text());
    MessageToast.show("Rol guardado correctamente.");

    this._pDialog.then(function (oDialog) { oDialog.close(); });
    this.loadRolesData();

  } catch (err) {
    MessageBox.error("Error al guardar el rol: " + err.message);
  }
},

// Guardar edición de rol
onSaveEditRole: async function () {
  const oView = this.getView();
  const oData = oView.getModel("roleDialogModel").getData();
  const oOriginal = this.getOwnerComponent().getModel("selectedRole")?.getData();

  if (!oData.ROLEID || !oData.ROLENAME) {
    MessageToast.show("ID y Nombre del Rol son obligatorios.");
    return;
  }

  try {
    // Usa el ROLEID original en la URL, el nuevo en el body
    const response = await fetch(`http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=put&roleid=${encodeURIComponent(oOriginal.ROLEID)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ROLEID: oData.ROLEID,
        ROLENAME: oData.ROLENAME,
        DESCRIPTION: oData.DESCRIPTION,
        PRIVILEGES: (oData.PRIVILEGES || []).map(p => ({
          PROCESSID: p.PROCESSID,
          PRIVILEGEID: Array.isArray(p.PRIVILEGEID) ? p.PRIVILEGEID : [p.PRIVILEGEID]
        }))
      })
    });

    if (!response.ok) throw new Error(await response.text());
    MessageToast.show("Rol actualizado correctamente.");

    this._pEditDialog.then(function (oDialog) { oDialog.close(); });
    this.loadRolesData();

  } catch (err) {
    MessageBox.error("Error al actualizar el rol: " + err.message);
  }
},

//Desactivar un rol
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
    successMessage: "Rol desactivado correctamente.",
    updateOnly: true 
  });
},

//Activar un rol
onActivateRole: function () {
  console.log("Activar rol");
  const oTable = this.byId("rolesTable");
  const iIndex = oTable.getSelectedIndex();

  if (iIndex === -1) {
    MessageToast.show("Selecciona un rol para activar.");
    return;
  }

  const oSelectedRole = oTable.getContextByIndex(iIndex).getObject();

  // Setear el modelo seleccionado
  const oModel = new JSONModel(oSelectedRole);
  this.getView().setModel(oModel, "selectedRole");

  // Llamar al handler
  this._handleRoleAction({
    dialogType: "confirm",
    message: "¿Estás seguro de que deseas activar el rol \"{ROLENAME}\"?",
    title: "Confirmar activación",
    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
    emphasizedAction: MessageBox.Action.YES,
    confirmAction: MessageBox.Action.YES,
    method: "POST",
    url: "http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=activate&roleid=",
    successMessage: "Rol activado correctamente.",
    updateOnly: true
  });
},

//Eliminar un rol permanentemente(fisico)
  onDeleteRole: function () {
  const oTable = this.byId("rolesTable");
  const iIndex = oTable.getSelectedIndex();

  if (iIndex === -1) {
    MessageToast.show("Selecciona un rol para eliminar.");
    return;
  }

  const oSelectedRole = oTable.getContextByIndex(iIndex).getObject();

  // Establecer modelo seleccionado como en activar/desactivar
  const oModel = new JSONModel(oSelectedRole);
  this.getView().setModel(oModel, "selectedRole");

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

//Cargar los datos de los roles, desde la API de getall
  loadRolesData: async function () {
  try {
    const response = await fetch("http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=get&type=all", {
      method: "POST"
    });
    const data = await response.json();

    const aAllRoles = data.value || []; // No filtrar nada
    const aFiltered = aAllRoles;

    let oRolesModel = this.getOwnerComponent().getModel("roles");
    if (!oRolesModel) {
      oRolesModel = new JSONModel();
      this.getOwnerComponent().setModel(oRolesModel, "roles");
    }

    oRolesModel.setProperty("/valueAll", aAllRoles);
    oRolesModel.setProperty("/value", aFiltered);
    oRolesModel.setProperty("/filterKey", "all");
    oRolesModel.refresh(true);
  } catch (error) {
    Log.error("Error al cargar roles", error);
  }
},

//quitar los privilegios en lo de editar un rol
    onRemovePrivilege: function (oEvent) {
  // Detectar el modo de la UI
  const oUiState = this.getView().getModel("uiState");
  const bIsEditMode = oUiState?.getProperty("/dialogMode") === "edit";
  // Usar el modelo correcto según el modo
  const oModel = this.getView().getModel(bIsEditMode ? "roleDialogModel" : "newRoleModel");
  const oData = oModel.getData();

  const oItem = oEvent.getSource().getParent();
  const oContext = oItem.getBindingContext(bIsEditMode ? "roleDialogModel" : "newRoleModel");
  const iIndex = oContext.getPath().split("/").pop();

  oData.PRIVILEGES.splice(iIndex, 1);
  oModel.setData(oData);
},


    //Cargar los catalogos
    loadCatalog: async function (labelId, modelName) {
      try {
        const response = await fetch(`http://localhost:3033/api/catalogos/getAllLabels?type=value&labelID=${labelId}`);
        const data = await response.json();
        const values = data.value || [];
        this.getView().setModel(new JSONModel({ values, valuesAll: values }), modelName);
      } catch (err) {
        Log.error(`Error al cargar catálogo ${labelId}`, err);
      }
    },

//Rol seleccionado
  onRoleSelected: async function () {
  const oTable = this.byId("rolesTable");
  const iIndex = oTable.getSelectedIndex();
  if (iIndex === -1) {
    MessageToast.show("Selecciona un rol válido.");
    return;
  }

  const oRolesView = this.getView().getParent().getParent();
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
  
},


    onMultiSearch: function () {
      const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      const oBinding = this.byId("rolesTable").getBinding("rows");
      const aFilters = sQuery ? [new Filter("ROLENAME", FilterOperator.Contains, sQuery)] : [];
      oBinding.filter(aFilters);
    },

// MODAL DE EDITAR UN ROL
onEditRole: async function () {
  const oRole = this.getOwnerComponent().getModel("selectedRole")?.getData();

  if (!oRole || !oRole.ROLEID) {
    MessageToast.show("Selecciona un rol para editar.");
    return;
  }

  await this.loadCatalogsOnce();

  // Si el rol viene con PROCESSES (estructura agrupada), desglósalo a un array plano de privilegios
  let privileges = [];
  if (Array.isArray(oRole.PROCESSES)) {
    oRole.PROCESSES.forEach(proc => {
      (proc.PRIVILEGES || []).forEach(priv => {
        privileges.push({
          PROCESSID: proc.PROCESSID,
          PROCESSNAME: proc.PROCESSNAME,
          PRIVILEGEID: [priv.PRIVILEGEID], // Si es un array, ajusta aquí
          PRIVILEGENAME: priv.PRIVILEGENAME,
          VIEWID: proc.VIEWID,
          VIEWNAME: proc.VIEWNAME,
          APPLICATIONID: proc.APPLICATIONID,
          APPLICATIONNAME: proc.APPLICATIONNAME
        });
      });
    });
  } else if (Array.isArray(oRole.PRIVILEGES)) {
    privileges = oRole.PRIVILEGES;
  }

  // Enriquecer los privilegios con VIEWNAME y APPLICATIONNAME si no existen
  const viewCatalog = this.getView().getModel("viewCatalogModel").getProperty("/valuesAll") || [];
  const appCatalog = this.getView().getModel("applicationCatalogModel").getProperty("/valuesAll") || [];

  const enrichedPrivileges = (privileges || []).map(priv => {
    const view = viewCatalog.find(v => v.VALUEID === priv.VIEWID);
    const app = appCatalog.find(a => a.VALUEID === priv.APPLICATIONID);
    return {
      ...priv,
      VIEWNAME: priv.VIEWNAME || (view ? view.VALUE : ""),
      APPLICATIONNAME: priv.APPLICATIONNAME || (app ? app.VALUE : "")
    };
  });

  // Cargar los datos en el modelo del diálogo
  let oModel = this.getView().getModel("roleDialogModel");
  if (!oModel) {
    oModel = new JSONModel();
    this.getView().setModel(oModel, "roleDialogModel");
  }
  oModel.setData({
    ROLEID: oRole.ROLEID,
    ROLENAME: oRole.ROLENAME,
    DESCRIPTION: oRole.DESCRIPTION,
    PRIVILEGES: enrichedPrivileges,
    NEW_PROCESSID: "",
    NEW_PRIVILEGES: [],
    NEW_VIEWID: "",
    NEW_APPID: ""
  });
  oModel.refresh(true);

  // Establecer modo edición
  const oUiState = this.getView().getModel("uiState");
  oUiState.setProperty("/dialogMode", "edit");

  this._pEditDialog.then(function (oDialog) {
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
              that.loadRolesData(); // Esto refresca todo el modelo y la tabla
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

// Cuando le doy a seleccionas una aplicación filtrado de aplicaciones
onApplicationChange: function (oEvent) {
  const sAppId = oEvent.getSource().getSelectedKey();
  const oModel = this.getView().getModel("newRoleModel");
  oModel.setProperty("/NEW_APPID", sAppId);
  oModel.setProperty("/NEW_VIEWID", "");
  oModel.setProperty("/NEW_PROCESSID", "");
  // No filtrar nada, deja el modelo como estáF
},

// Cuando seleccionas una view y se despliega, bueno arriba se despliegan datos
onViewChange: async function (oEvent) {

  console.log("Vista seleccionada:", oEvent.getSource().getSelectedKey());
},

//PARA CUANDO VA A EDITAR EL ROL ESTO PASA, NO FILTRO AUNA

onEditApplicationChange: function (oEvent) {
  const sAppId = oEvent.getSource().getSelectedKey();
  const oModel = this.getView().getModel("roleDialogModel");
  oModel.setProperty("/NEW_APPID", sAppId);
  oModel.setProperty("/NEW_VIEWID", "");
  oModel.setProperty("/NEW_PROCESSID", "");
  // No filtrar nada, deja el modelo como está
},

onEditViewChange: function (oEvent) {
  
  onsole.log("Vista seleccionada:", oEvent.getSource().getSelectedKey());

},



  });
});
