sap.ui.define(
  [
    "com/invertions/sapfiorimodinv/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
  ],
  function (
    BaseController,
    JSONModel,
    Log,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
    Fragment
  ) {
    "use strict";

    return BaseController.extend(
      "com.invertions.sapfiorimodinv.controller.security.RolesMaster",
      {
        _pDialog: null,
        _pEditDialog: null,
        _catalogsLoaded: false,

        onInit: function () {
          this.initModels();
          const oRouter = this.getRouter();
          oRouter
            .getRoute("RouteRolesMaster")
            .attachPatternMatched(this._onRouteMatched, this);
          this._loadFragments();
        },

        _loadFragments: function () {
          this._pDialog = Fragment.load({
            name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
            controller: this,
          }).then((oDialog) => {
            this.getView().addDependent(oDialog);
            return oDialog;
          });

          this._pEditDialog = Fragment.load({
            name: "com.invertions.sapfiorimodinv.view.security.fragments.EditRoleDialog",
            controller: this,
          }).then((oDialog) => {
            this.getView().addDependent(oDialog);
            return oDialog;
          });
        },

        _onRouteMatched: function () {
          this.loadRolesData();
        },

        initModels: function () {
          const oView = this.getView();
          oView.setModel(new JSONModel(), "selectedRole");
          const emptyRoleData = {
            ROLEID: "",
            ROLENAME: "",
            DESCRIPTION: "",
            NEW_PROCESSID: "",
            NEW_PRIVILEGES: [],
            PRIVILEGES: [],
          };
          oView.setModel(
            new JSONModel(Object.assign({}, emptyRoleData)),
            "newRoleModel"
          );
          oView.setModel(
            new JSONModel(Object.assign({}, emptyRoleData)),
            "roleDialogModel"
          );
        },

        loadCatalogsOnce: async function () {
          if (!this._catalogsLoaded) {
            await this._loadCatalog("IdProcesses", "processCatalogModel");
            await this._loadCatalog("IdPrivileges", "privilegeCatalogModel");
            this._catalogsLoaded = true;
          }
        },

        _loadCatalog: async function (labelId, modelName) {
          const view = this.getView();
          try {
            const response = await fetch(
              "http://localhost:4004/api/security/crudValues?action=get",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }
            );
            if (!response.ok) {
              const errorText = await response.text();
              Log.error(
                `Error fetching catalog (${labelId}): ${response.status} - ${errorText}`
              );
              MessageBox.error(
                `Error al cargar el catálogo (${labelId}). Por favor, inténtelo de nuevo.`
              );
              return;
            }
            const data = await response.json();
            const filteredValues = data.value.filter(
              (v) => v.LABELID === labelId
            );
            view.setModel(new JSONModel({ values: filteredValues }), modelName);
            Log.info(
              `Catálogo '${labelId}' cargado en el modelo '${modelName}'.`
            );
          } catch (error) {
            Log.error(`Error al cargar el catálogo (${labelId}): ${error}`);
            MessageBox.error(
              `Error al cargar el catálogo (${labelId}). Por favor, revise la consola.`
            );
          }
        },

        onOpenDialog: async function () {
          await this.loadCatalogsOnce();
          const oDialog = await this._pDialog;
          this.getView().getModel("newRoleModel").setData({
            ROLEID: "",
            ROLENAME: "",
            DESCRIPTION: "",
            NEW_PROCESSID: "",
            NEW_PRIVILEGES: [],
            PRIVILEGES: [],
          });
          oDialog.setTitle("Crear Rol");
          oDialog.open();
          this._currentDialog = "create"; // Establecer el diálogo actual como "create"
        },
        onOpenEditDialog: async function (oSelectedRoleData) {
          await this.loadCatalogsOnce();
          const oDialog = await this._pEditDialog;

          const oEditModel = this.getView().getModel("roleDialogModel");
          oEditModel.setData({
            ROLEID: oSelectedRoleData.ROLEID || "",
            ROLENAME: oSelectedRoleData.ROLENAME || "",
            DESCRIPTION: oSelectedRoleData.DESCRIPTION || "",
            NEW_PROCESSID: "",
            NEW_PRIVILEGES: [],
            // Copiar los privilegios existentes al modelo para que se muestren en la tabla
            PRIVILEGES: oSelectedRoleData.PRIVILEGES || [],
          });

          oDialog.setTitle("Editar Rol");
          oDialog.open();
          this._currentDialog = "edit"; // Establecer el diálogo actual como "edit"
          Log.info(
            `Diálogo de edición abierto para el rol: ${oSelectedRoleData.ROLEID}`
          );
        },
        onDialogClose: function () {
          if (this._pDialog) {
            this._pDialog.then((oDialog) => oDialog.close());
          }
          if (this._pEditDialog) {
            this._pEditDialog.then((oDialog) => oDialog.close());
          }
        },

        onAddPrivilege: function () {
          let oViewModel;
          if (this._currentDialog === "create") {
            oViewModel = this.getView().getModel("newRoleModel");
          } else if (this._currentDialog === "edit") {
            oViewModel = this.getView().getModel("roleDialogModel");
          } else {
            Log.error("Diálogo actual desconocido en onAddPrivilege.");
            return;
          }

          const oData = oViewModel.getData();
          if (
            !oData.NEW_PROCESSID ||
            !Array.isArray(oData.NEW_PRIVILEGES) ||
            oData.NEW_PRIVILEGES.length === 0
          ) {
            MessageToast.show("Selecciona proceso y al menos un privilegio.");
            return;
          }
          if (!Array.isArray(oData.PRIVILEGES)) {
            oData.PRIVILEGES = []; // Inicializar el array de privilegios si no existe
          }
          oData.PRIVILEGES.push({
            PROCESSID: oData.NEW_PROCESSID,
            PRIVILEGEID: oData.NEW_PRIVILEGES,
          });
          oData.NEW_PROCESSID = "";
          oData.NEW_PRIVILEGES = [];
          oViewModel.setData(oData);
        },
        onSaveRole: async function () {
          const oView = this.getView();
          const oNewRoleData = oView.getModel("newRoleModel").getData(); // Datos para la creación
          const oEditData = oView.getModel("roleDialogModel").getData(); // Datos para la edición
          const oSelectedRoleData = this.getView()
            .getModel("selectedRole")
            .getData(); // Datos del rol seleccionado

          if (!oNewRoleData.ROLEID || !oNewRoleData.ROLENAME) {
            MessageToast.show("ID y Nombre del Rol son obligatorios.");
            return;
          }

          let sAction = "create";
          let oPayload = { roles: oNewRoleData };

          if (oSelectedRoleData && oSelectedRoleData.ROLEID) {
            sAction = "update";
            oPayload = {
              roles: {
                ROLEID: oSelectedRoleData.ROLEID,
                ROLENAME: oEditData.ROLENAME,
                DESCRIPTION: oEditData.DESCRIPTION,
                PRIVILEGES: oEditData.PRIVILEGES || [], // Usar los privilegios del diálogo de edición
              },
            };
          } else {
            // Para la creación, tomamos los privilegios del modelo de nuevo rol
            oPayload.roles.PRIVILEGES = oNewRoleData.PRIVILEGES || [];
            // Limpiar propiedades temporales del modelo de nuevo rol
            delete oPayload.roles.NEW_PROCESSID;
            delete oPayload.roles.NEW_PRIVILEGES;
          }

          try {
            let sUrl =
              "http://localhost:4004/api/security/crudRoles?action=" + sAction;

            if (
              sAction === "update" &&
              oPayload.roles &&
              oPayload.roles.ROLEID
            ) {
              sUrl += "&roleid=" + encodeURIComponent(oPayload.roles.ROLEID);
              console.log("URL de actualización:", sUrl);
              console.log("Payload de actualización:", oPayload);
            } else {
              console.log("URL de creación:", sUrl);
              console.log("Payload de creación:", oPayload);
            }

            const response = await fetch(sUrl, {
              method: "POST", // Revisa la documentación de tu API para el método correcto (PUT/PATCH?)
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(oPayload),
            });
            if (!response.ok) {
              const errorText = await response.text();
              Log.error(
                `Error saving role (${sAction}): ${response.status} - ${errorText}`
              );
              MessageBox.error(`Error al guardar el rol: ${errorText}`);
              return;
            }
            MessageToast.show(`Rol guardado correctamente (${sAction}).`);
            this.onDialogClose();
            this.loadRolesData(); // Recargar los roles después de guardar
          } catch (error) {
            Log.error(`Error al guardar el rol (${sAction}):`, error);
            MessageBox.error(
              "Error al guardar el rol. Por favor, inténtelo de nuevo."
            );
          }
        },
        loadRolesData: async function () {
          try {
            const response = await fetch(
              "http://localhost:4004/api/security/crudRoles?action=get",
              { method: "POST" }
            );
            if (!response.ok) {
              const errorText = await response.text();
              Log.error(
                `Error fetching roles: ${response.status} - ${errorText}`
              );
              MessageBox.error(`Error al cargar los roles: ${errorText}`);
              return;
            }
            const data = await response.json();
            const aAllRoles = (data.value || []).filter(
              (role) => !role.DETAIL_ROW?.DELETED
            );
            const aFiltered = aAllRoles.filter(
              (role) => role.DETAIL_ROW?.ACTIVED
            );
            const oRolesModel = new JSONModel({
              value: aFiltered,
              valueAll: aAllRoles,
              filterKey: "active",
            });
            this.getOwnerComponent().setModel(oRolesModel, "roles");
            Log.info("Datos de roles cargados.");
          } catch (error) {
            Log.error("Error al cargar roles:", error);
            MessageBox.error(
              "Error al cargar los roles. Por favor, revise la consola."
            );
          }
        },

        onStatusFilterChange: function (oEvent) {
          const sKey = oEvent.getSource().getSelectedKey();
          const oRolesModel = this.getOwnerComponent().getModel("roles");
          const aAllRoles = oRolesModel.getProperty("/valueAll") || [];
          let aFiltered = [];
          switch (sKey) {
            case "active":
              aFiltered = aAllRoles.filter(
                (r) => r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED
              );
              break;
            case "inactive":
              aFiltered = aAllRoles.filter(
                (r) => !r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED
              );
              break;
            default:
              aFiltered = aAllRoles.filter((r) => !r.DETAIL_ROW?.DELETED);
          }
          oRolesModel.setProperty("/value", aFiltered);
          oRolesModel.setProperty("/filterKey", sKey);
        },

        onRemovePrivilege: function (oEvent) {
          const oModel = this.getView().getModel("roleDialogModel"); // Usar el modelo de edición
          const oData = oModel.getData();
          const oItem = oEvent.getSource().getParent();
          const oContext = oItem.getBindingContext("roleDialogModel");
          const iIndex = oContext.getPath().split("/").pop();
          oData.PRIVILEGES.splice(iIndex, 1);
          oModel.setData(oData);
        },

        onRoleSelected: function () {
          const oTable = this.byId("rolesTable");
          const iIndex = oTable.getSelectedIndex();
          if (iIndex === -1) {
            MessageToast.show("Selecciona un rol válido.");
            return;
          }
          const oContext = oTable.getContextByIndex(iIndex);
          if (!oContext) {
            MessageBox.error(
              "No se pudo obtener el contexto del rol seleccionado."
            );
            return;
          }
          const oSelectedRole = oContext.getObject();
          this.getView().getModel("selectedRole").setData(oSelectedRole); // Almacenar el rol seleccionado
          console.log("Rol seleccionado:", oSelectedRole);
          this.onOpenEditDialog(oSelectedRole);
          Log.info(`Rol seleccionado para editar: ${oSelectedRole.ROLEID}`);
        },

        onMultiSearch: function () {
          const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
          const oBinding = this.byId("rolesTable").getBinding("rows");
          const aFilters = sQuery
            ? [new Filter("ROLENAME", FilterOperator.Contains, sQuery)]
            : [];
          oBinding.filter(aFilters);
        },
     
      }
    );
  }
);
