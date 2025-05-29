/* eslint-disable valid-jsdoc */
/* eslint-disable linebreak-style */
/* eslint-disable no-console */
/* eslint-disable fiori-custom/sap-no-hardcoded-url */
/* eslint-disable fiori-custom/sap-no-localhost */
sap.ui.define([
    "com/invertions/sapfiorimodinv/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
// @ts-ignore
// @ts-ignore
], function (BaseController, JSONModel, Log, Fragment, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.UsersList", {
        onInit: function () {

            // Esto desactiva los botones cuando entras a la vista, hasta que selecciones un usuario en la tabla se activan
            var oViewModel = new JSONModel({
                buttonsEnabled: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            //

            // Carga los usuarios
            this.loadUsers();
        },


        //===================================================
        //=============== Cargar datos Users ======================
        //===================================================
        //llenado de la tabla de usuarios
        /**
         * Funcion para cargar la lista de usuarios.
         */
        loadUsers: function () {
            var oTable = this.byId("IdTable1UsersManageTable");
            var oModel = new sap.ui.model.json.JSONModel();
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            var that = this;

            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=get&type=all", {
                method: "POST"
            })
                .then(res => res.json())
                .then(data => {
                    oModel.setData(data); // data = { value: [...] }
                    oTable.setModel(oModel);
                })
                .catch(err => {
                    // @ts-ignore
                    sap.m.MessageToast.show("Error al cargar usuarios: " + err.message);
                });
        },

        // ============= CARGAR COMPAÑÍAS DINÁMICAMENTE =============
        loadCompanies: async function () {
            try {
                const res = await fetch("http://localhost:3033/api/sec/usersroles/getAllCompanies", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });

                if (!res.ok) throw new Error("Error en la respuesta del servidor.");

                const data = await res.json();
                console.log("Respuesta cruda de getAllCompanies:", data);

                // Si la respuesta tiene propiedad 'value', úsala, si no, asume que es el array directamente
                const aAllCompanies = Array.isArray(data.value) ? data.value : (Array.isArray(data) ? data : []);
                console.log("Array de compañías procesado:", aAllCompanies);

                // Filtra solo activas y no eliminadas
                const aFilteredCompanies = aAllCompanies.filter(
                    (company) => company.DETAIL_ROW?.ACTIVED && !company.DETAIL_ROW?.DELETED
                );
                console.log("Compañías activas y no eliminadas:", aFilteredCompanies);

                // Mapea los campos para el ComboBox y para el modelo de usuario
                const companiesFormatted = aFilteredCompanies.map((company) => ({
                    COMPANYID: company.VALUEID,      // Usar VALUEID como clave única
                    COMPANYNAME: company.VALUE,      // Mostrar VALUE como nombre visible
                    COMPANYALIAS: company.ALIAS,
                    IMAGE: company.IMAGE,
                    DESCRIPTION: company.DESCRIPTION,
                    RAW: company                     // Guarda el objeto original por si lo necesitas
                }));
                console.log("Compañías formateadas para ComboBox:", companiesFormatted);

                // Modelo y asignación
                const oModel = this.getView().getModel("companies") || new sap.ui.model.json.JSONModel();
                oModel.setData({ companies: companiesFormatted, originalData: aFilteredCompanies });
                if (!this.getView().getModel("companies")) {
                    this.getView().setModel(oModel, "companies");
                }
            } catch (error) {
                console.error("Error al cargar compañías:", error);
                // @ts-ignore
                sap.m.MessageBox.error("Error al cargar compañías. Por favor, intente nuevamente.");
            }
        },
        // ============= FIN CARGAR COMPAÑÍAS =============

        // ============= CARGAR DEPARTAMENTOS DINÁMICAMENTE =============
        loadDeptos: async function () {
            try {
                var oUserModel = this.getView().getModel("newUserModel");
                var sCompanyName = oUserModel.getProperty("/COMPANYNAME"); // Ya es el identificador compuesto

                if (!sCompanyName) {
                    console.warn("No hay compañía seleccionada para cargar departamentos.");
                    return;
                }

                var companyIdStr = sCompanyName;
                console.log("Solicitando departamentos para:", companyIdStr);

                const res = await fetch("http://localhost:3033/api/sec/usersroles/getDepartmentsByCompany", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyIdStr: companyIdStr })
                });

                if (!res.ok) throw new Error("Error en la respuesta del servidor.");

                const data = await res.json();
                console.log("Respuesta cruda de getDepartmentsByCompany:", data);

                const aAllDepartments = Array.isArray(data.value) ? data.value : (Array.isArray(data) ? data : []);
                console.log("Array de departamentos procesado:", aAllDepartments);

                // Filtra solo los departamentos que pertenecen a la compañía seleccionada
                var oUserCompanyId = oUserModel.getProperty("/COMPANYID");
                const aFilteredDepartments = aAllDepartments.filter(
                    (dept) =>
                        dept.DETAIL_ROW?.ACTIVED &&
                        !dept.DETAIL_ROW?.DELETED &&
                        dept.VALUEPAID === companyIdStr &&
                        dept.COMPANYID === oUserCompanyId
                );
                console.log("Departamentos activos y no eliminados:", aFilteredDepartments);

                const departmentsFormatted = aFilteredDepartments.map((dept) => ({
                    DEPARTMENTID: dept.VALUEID,
                    DEPARTMENTNAME: dept.VALUE,
                    DEPARTMENTALIAS: dept.ALIAS,
                    IMAGE: dept.IMAGE,
                    DESCRIPTION: dept.DESCRIPTION,
                    RAW: dept
                }));
                console.log("Departamentos formateados para ComboBox:", departmentsFormatted);

                const oModel = this.getView().getModel("departments") || new sap.ui.model.json.JSONModel();
                oModel.setData({ departments: departmentsFormatted, originalData: aFilteredDepartments });
                if (!this.getView().getModel("departments")) {
                    this.getView().setModel(oModel, "departments");
                }
            } catch (error) {
                console.error("Error al cargar departamentos:", error);
                // @ts-ignore
                sap.m.MessageBox.error("Error al cargar departamentos. Por favor, intente nuevamente.");
            }
        },
        // ============= FIN CARGAR DEPARTAMENTOS =============

        // ============= CARGAR ROLES PARA EL DIALOGO DE NUEVO USUARIO =============
        /**
         * Funcion para cargar la lista de roles y poderlos visualizar en el combobox
         * Esto va cambiar ya que quiere que primero carguemos las compañías, luego que carguemos los depto
         * Y en base a las compañías y depto que coloquemos, se muestren los roles que pertenecen a esta compañía y depto.
         */
        loadRoles: function () {
            var oView = this.getView();
            var oRolesModel = new sap.ui.model.json.JSONModel();

            // Llama a tu API CAP para obtener los roles
            fetch("http://localhost:3033/api/sec/usersroles/rolesCRUD?procedure=get&type=all", {
                method: "POST"
            })
                .then(res => res.json())
                .then(data => {
                    // data.value debe ser el array de roles
                    oRolesModel.setData({ roles: data.value });
                    oView.setModel(oRolesModel, "roles");
                })
                // @ts-ignore
                .catch(err => sap.m.MessageToast.show("Error al cargar roles: " + err.message));
        },
        // ============= FIN CARGAR ROLES =============


        /**
         * Esto es para formatear los roles al cargarlos de la bd y que aparezcan separados por un guion medio en la tabla.
         * Ejemplo: Usuario auxiliar-Investor-etc...
         */
        formatRoles: function (rolesArray) {
            if (!Array.isArray(rolesArray) || rolesArray.length === 0) return "";
            // Muestra ROLEID y si hay error, lo indica
            return rolesArray.map(function (role) {
                return role.ROLEID + (role.error ? " (" + role.error + ")" : "");
            }).join(", ");
        },

        /**
         * Este evento se encarga de crear los items en el VBox con el nombre de los roles que se vayan agregando.
         */
        onRoleSelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var sSelectedKey = oComboBox.getSelectedKey();
            var sSelectedText = oComboBox.getSelectedItem().getText();

            var oVBox;
            // Este if valida si es la modal de add user o edit user en la que se estáran colocando los roles
            if (oComboBox.getId().includes("comboBoxEditRoles")) {
                oVBox = this.getView().byId("selectedEditRolesVBox");  // Update User VBox
            } else {
                oVBox = this.getView().byId("selectedRolesVBox");   // Create User VBox
            }
            // Validar duplicados
            var bExists = oVBox.getItems().some(oItem => oItem.data("roleId") === sSelectedKey);
            if (bExists) {
                MessageToast.show("El rol ya ha sido añadido.");
                return;
            }

            // Crear item visual del rol seleccionado
            var oHBox = new sap.m.HBox({
                items: [
                    new sap.m.Label({ text: sSelectedText }).addStyleClass("sapUiSmallMarginEnd"),
                    // @ts-ignore
                    new sap.m.Button({
                        icon: "sap-icon://decline",
                        type: "Transparent",
                        press: () => oVBox.removeItem(oHBox)
                    })
                ]
            });

            oHBox.data("roleId", sSelectedKey);
            oVBox.addItem(oHBox);
        },

        //===================================================
        //=============== AÑADIR USUARIO ====================
        //===================================================

        /**
         * Función onpress del botón para agregar un nuevo usuario
         */
        onAddUser: function () {
            var oView = this.getView();

            // Inicializa el modelo solo si no existe
            var oNewUserModel = new sap.ui.model.json.JSONModel({
                USERID: "",
                USERNAME: "",
                PASSWORD: "",
                ALIAS: "",
                FIRSTNAME: "",
                LASTNAME: "",
                EMAIL: "",
                PHONENUMBER: "",
                BIRTHDAYDATE: "",
                COMPANYID: "",
                COMPANYNAME: "",
                COMPANYALIAS: "",
                CEDIID: "",
                EMPLOYEEID: "",
                EXTENSION: "",
                DEPARTMENT: "",
                FUNCTION: "",
                STREET: "",
                POSTALCODE: "",
                CITY: "",
                REGION: "",
                STATE: "",
                COUNTRY: "",
                AVATAR: "",
                ROLES: []
            });
            oView.setModel(oNewUserModel, "newUserModel");

            // CARGA LAS COMPAÑÍAS ANTES DE ABRIR EL DIALOG
            this.loadCompanies();

            if (!this._oCreateUserDialog) {
                sap.ui.core.Fragment.load({
                    id: this.getView().getId(), // Usa el id de la vista
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.AddUserDialog",
                    controller: this // <-- MUY IMPORTANTE
                }).then(function (oDialog) {
                    this._oCreateUserDialog = oDialog;
                    // @ts-ignore
                    this.getView().addDependent(oDialog);
                    // @ts-ignore
                    this.loadRoles();
                    oDialog.open();
                }.bind(this));
            } else {
                this.loadRoles();
                this._oCreateUserDialog.open();
            }

        },

        // ============= AGREGAR NUEVO USUARIO =============
        onSaveUser: function () {
            var that = this;
            var oDialog = this._oCreateUserDialog;
            var oModel = this.getView().getModel("newUserModel");
            var oData = oModel.getData();
            var regUser = sessionStorage.getItem("USERID");

            // ========== FORMATEO DE DATOS ==========
            // Fecha de nacimiento (Date)
            if (oData.BIRTHDAYDATE) {
                if (oData.BIRTHDAYDATE instanceof Date) {
                    oData.BIRTHDAYDATE = oData.BIRTHDAYDATE.toISOString();
                } else if (typeof oData.BIRTHDAYDATE === "string" && oData.BIRTHDAYDATE.match(/^\d{4}-\d{2}-\d{2}/)) {
                    oData.BIRTHDAYDATE = new Date(oData.BIRTHDAYDATE).toISOString();
                } else {
                    var parts = oData.BIRTHDAYDATE.split("/");
                    if (parts.length === 3) {
                        var year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
                        var dateObj = new Date(year, parts[1] - 1, parts[0]);
                        oData.BIRTHDAYDATE = dateObj.toISOString();
                    }
                }
            }

            // Números (Number)
            if (oData.EMPLOYEEID) oData.EMPLOYEEID = Number(oData.EMPLOYEEID) || undefined;
            if (oData.POSTALCODE) oData.POSTALCODE = Number(oData.POSTALCODE) || undefined;
            if (oData.COMPANYID) oData.COMPANYID = Number(oData.COMPANYID) || undefined;

            // Roles seleccionados (array de objetos {ROLEID})
            var oVBox = this.getView().byId("selectedRolesVBox");
            var aRoles = oVBox.getItems().map(function (oItem) {
                return { ROLEID: oItem.data("roleId") };
            });
            oData.ROLES = aRoles;

            // Validación básica
            if (!oData.USERID || !oData.EMAIL) {
                // @ts-ignore
                sap.m.MessageBox.warning("Por favor, completa al menos el ID de usuario y el correo electrónico.");
                return;
            }

            // ========== ENVÍO ==========
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=post&RegUser=" + regUser, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(oData)
            })
            .then(res => res.json())
            .then(data => {
                var errorObj = (data && Array.isArray(data.value) && data.value[0] && data.value[0].error) ? data.value[0] : data;
                if (errorObj && errorObj.error) {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al agregar usuario: " + (errorObj.message || "No se pudo agregar el usuario."));
                    return;
                }
                // @ts-ignore
                sap.m.MessageToast.show("Usuario agregado correctamente");
                that.loadUsers();
                if (oDialog) oDialog.close();
            })
            .catch(err => {
                // @ts-ignore
                sap.m.MessageBox.error("Error de red al agregar usuario: " + err.message);
            });
        },

        // ============= FIN AGREGAR NUEVO USUARIO =============

        onCancelUser: function () {
            var oDialog = this.byId("AddUserDialog");
            if (oDialog) oDialog.close();
        },

        //===================================================
        //=============== EDITAR USUARIO ====================
        //===================================================

        /**
         * Función onpress del botón para editar un nuevo usuario
         * Agregar la lógica para cargar la info a la modal
         */
        onEditUser: function () {
            var oView = this.getView();
            var oSelected = this.selectedUser;
            if (!oSelected) {
                MessageToast.show("Selecciona un usuario para editar.");
                return;
            }

            var oEditUserModel = new sap.ui.model.json.JSONModel(JSON.parse(JSON.stringify(oSelected)));
            oView.setModel(oEditUserModel, "editUserModel");

            // Carga compañías y departamentos antes de abrir el diálogo
            this.loadEditCompanies();
            this.loadEditDeptos();

            if (!this._oEditUserDialog) {
                sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.EditUserDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditUserDialog = oDialog;
                    oView.addDependent(oDialog);
                    // @ts-ignore
                    this.loadRoles();
                    this._oEditUserDialog.open();
                    // @ts-ignore
                    this._fillEditRolesVBox();
                }.bind(this));
            } else {
                this.loadRoles();
                this._oEditUserDialog.open();
                this._fillEditRolesVBox();
            }
        },

        // ============= LLENAR LOS ROLES SELECCIONADOS EN EDICIÓN =============
        _fillEditRolesVBox: function () {
            var oVBox = this.getView().byId("selectedEditRolesVBox");
            oVBox.removeAllItems();
            var oEditUserModel = this.getView().getModel("editUserModel");
            var aRoles = oEditUserModel.getProperty("/ROLES") || [];
            var oRolesModel = this.getView().getModel("roles");
            var aAllRoles = oRolesModel ? oRolesModel.getProperty("/roles") : [];

            aRoles.forEach(function (role) {
                var roleName = (aAllRoles.find(r => r.ROLEID === role.ROLEID) || {}).ROLENAME || role.ROLEID;
                var oHBox = new sap.m.HBox({
                    items: [
                        new sap.m.Label({ text: roleName }).addStyleClass("sapUiSmallMarginEnd"),
                        // @ts-ignore
                        new sap.m.Button({
                            icon: "sap-icon://decline",
                            type: "Transparent",
                            press: function () {
                                oVBox.removeItem(oHBox);
                            }
                        })
                    ]
                });
                oHBox.data("roleId", role.ROLEID);
                oVBox.addItem(oHBox);
            });
        },

        // ============= GUARDAR EDICIÓN DE USUARIO =============
        onEditSaveUser: function () {
            var that = this;
            var oDialog = this._oEditUserDialog;
            var oModel = this.getView().getModel("editUserModel");
            var oData = oModel.getData();
            var regUser = sessionStorage.getItem("USERID");

            // Formateo de datos igual que en alta
            if (oData.BIRTHDAYDATE) {
                if (oData.BIRTHDAYDATE instanceof Date) {
                    oData.BIRTHDAYDATE = oData.BIRTHDAYDATE.toISOString();
                } else if (typeof oData.BIRTHDAYDATE === "string" && oData.BIRTHDAYDATE.match(/^\d{4}-\d{2}-\d{2}/)) {
                    oData.BIRTHDAYDATE = new Date(oData.BIRTHDAYDATE).toISOString();
                } else {
                    var parts = oData.BIRTHDAYDATE.split("/");
                    if (parts.length === 3) {
                        var year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
                        var dateObj = new Date(year, parts[1] - 1, parts[0]);
                        oData.BIRTHDAYDATE = dateObj.toISOString();
                    }
                }
            }
            if (oData.EMPLOYEEID) oData.EMPLOYEEID = Number(oData.EMPLOYEEID) || undefined;
            if (oData.POSTALCODE) oData.POSTALCODE = Number(oData.POSTALCODE) || undefined;
            if (oData.COMPANYID) oData.COMPANYID = Number(oData.COMPANYID) || undefined;

            // Roles seleccionados
            var oVBox = this.getView().byId("selectedEditRolesVBox");
            var aRoles = oVBox.getItems().map(function (oItem) {
                return { ROLEID: oItem.data("roleId") };
            });
            oData.ROLES = aRoles;

            // Validación básica
            if (!oData.USERID || !oData.EMAIL) {
                // @ts-ignore
                sap.m.MessageBox.warning("Por favor, completa al menos el ID de usuario y el correo electrónico.");
                return;
            }

            // Enviar a la API
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=put&userid=" + encodeURIComponent(oData.USERID) + "&RegUser=" + regUser, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oData)
            })
            .then(res => res.json())
            .then(data => {
                var errorObj = (data && Array.isArray(data.value) && data.value[0] && data.value[0].error) ? data.value[0] : data;
                if (errorObj && errorObj.error) {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al editar usuario: " + (errorObj.message || "No se pudo editar el usuario."));
                    return;
                }
                // @ts-ignore
                sap.m.MessageToast.show("Usuario editado correctamente");
                that.loadUsers();
                if (oDialog) oDialog.close();
            })
            .catch(err => {
                // @ts-ignore
                sap.m.MessageBox.error("Error de red al editar usuario: " + err.message);
            });
        },

        // ============= CANCELAR EDICIÓN =============
        onEditCancelUser: function () {
            if (this._oEditUserDialog) {
                this._oEditUserDialog.close();
            }
        },


        // ===================================================
        // ========= Eliminar Usuario Fisicamente ============
        // ===================================================

        /**
         * Función onDeleteUser .
         */
        onDeleteUser: function () {
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas eliminar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar eliminación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.deleteUser(that.selectedUser.USERID);
                        }
                    }
                });
            } else {
                MessageToast.show("Selecciona un usuario para eliminar de la base de datos");
            }
        },

        // ============= ELIMINAR USER (DELETE FÍSICO) =============
        // Elimina el usuario de la base de datos de forma permanente
        deleteUser: function (UserId) {
            var that = this;
            var regUser = sessionStorage.getItem("USERID");
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=delete&type=hard&userid=" + encodeURIComponent(UserId) + "&RegUser=" + regUser, {
                method: "POST"
            })
            .then(res => res.json())
            .then(data => {
                var errorObj = (data && Array.isArray(data.value) && data.value[0] && data.value[0].error) ? data.value[0] : data;
                if (errorObj && errorObj.error) {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al eliminar usuario: " + (errorObj.message || "No se pudo eliminar el usuario."));
                    return;
                }
                // @ts-ignore
                sap.m.MessageToast.show("Usuario eliminado correctamente");
                that.loadUsers();
                that.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
            })
            .catch(err => {
                // @ts-ignore
                sap.m.MessageBox.error("Error de red al eliminar usuario: " + err.message);
            });
        },

        // ============= FIN ELIMINAR USER (DELETE FÍSICO) =============

        // ===================================================
        // ============ Desactivar el usuario ================
        // ===================================================

        /**
         * Función onDesactivateUser.
         */
        onDesactivateUser: function () {
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas desactivar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar desactivación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.desactivateUser(that.selectedUser.USERID);
                        }
                    }
                });
            } else {
                MessageToast.show("Selecciona un usuario para desactivar");
            }
        },

        // ============= DESACTIVAR USER (DELETE LÓGICO) =============
        // Marca el usuario como desactivado/eliminado lógicamente (no se borra de la BD)
        desactivateUser: function (UserId) {
            var that = this;
            var regUser = sessionStorage.getItem("USERID");
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=delete&type=logic&userid=" + encodeURIComponent(UserId) + "&RegUser=" + regUser, {
                method: "POST"
            })
            .then(res => res.json())
            .then(data => {
                var errorObj = (data && Array.isArray(data.value) && data.value[0] && data.value[0].error) ? data.value[0] : data;
                if (errorObj && errorObj.error) {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al desactivar usuario: " + (errorObj.message || "No se pudo desactivar el usuario."));
                    return;
                }
                // @ts-ignore
                sap.m.MessageToast.show("Usuario desactivado correctamente");
                that.loadUsers();
                that.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
            })
            .catch(err => {
                // @ts-ignore
                sap.m.MessageBox.error("Error de red al desactivar usuario: " + err.message);
            });
        },

        // ============= FIN DESACTIVAR USER (DELETE LÓGICO) =============


        // ===================================================
        // ============== Activar el usuario =================
        // ===================================================

        /**
         * Función onActivateUser.
         */
        onActivateUser: function () {
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas activar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar activación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.activateUser(that.selectedUser.USERID);
                        }
                    }
                });
            } else {
                MessageToast.show("Selecciona un usuario para activar");
            }
        },

        // ============= ACTIVAR USER =============
        activateUser: function (UserId) {
            var that = this;
            var regUser = sessionStorage.getItem("USERID");
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=activate&userid=" + encodeURIComponent(UserId) + "&RegUser=" + regUser, {
                method: "POST"
            })
            .then(res => res.json())
            .then(data => {
                var errorObj = (data && Array.isArray(data.value) && data.value[0] && data.value[0].error) ? data.value[0] : data;
                if (errorObj && errorObj.error) {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al activar usuario: " + (errorObj.message || "No se pudo activar el usuario."));
                    return;
                }
                // @ts-ignore
                sap.m.MessageToast.show("Usuario activado correctamente");
                that.loadUsers();
                that.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
            })
            .catch(err => {
                // @ts-ignore
                sap.m.MessageBox.error("Error de red al activar usuario: " + err.message);
            });
        },
        // ============= FIN ACTIVAR USER =============


        //===================================================
        //=============== Funciones de la tabla =============
        //===================================================

        /**
         * Función que obtiene el usuario que se selecciona en la tabla en this.selectedUser se guarda todo el usuario
         * Además activa los botones de editar/eliminar/desactivar y activar
         */
        onUserRowSelected: function () {
            var oTable = this.byId("IdTable1UsersManageTable");
            var iSelectedIndex = oTable.getSelectedIndex();

            // @ts-ignore
            if (iSelectedIndex < 0) {
                this.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
                return;
            }

            var oContext = oTable.getContextByIndex(iSelectedIndex);
            var UserData = oContext.getObject();

            this.selectedUser = UserData;

            // Activa los botones
            this.getView().getModel("viewModel").setProperty("/buttonsEnabled", true);
        },

        onSearchUser: function () {
            //Aplicar el filtro de búsqueda para la tabla
        },

        onRefresh: function () {
            this.loadUsers();
        },


        //===================================================
        //=========== Validar email y phonenumber ===========
        //===================================================

        isValidEmail: function (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        isValidPhoneNumber: function (phone) {
            return /^\d{10}$/.test(phone); // Ejemplo: 10 dígitos numéricos
        },

        formatStatus: function (detailRow) {
            if (!detailRow) return "";
            if (detailRow.DELETED) return "Eliminado";
            if (detailRow.ACTIVED) return "Activo";
            return "Inactivo";
        },

        formatStatusText: function (detailRow) {
            if (!detailRow) return "";
            if (detailRow.ACTIVED === true && detailRow.DELETED === false) return "Activo";
            if (detailRow.ACTIVED === false && detailRow.DELETED === true) return "Inactivo";
            return "";
        },

        formatStatusState: function (detailRow) {
            if (!detailRow) return "None";
            if (detailRow.ACTIVED === true && detailRow.DELETED === false) return "Success";
            if (detailRow.ACTIVED === false && detailRow.DELETED === true) return "Warning";
            return "None";
        },

        onCompanySelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oItem = oComboBox.getSelectedItem();
            var oCtx = oItem.getBindingContext("companies");
            var oCompany = oCtx.getObject();

            var oModel = this.getView().getModel("newUserModel");
            // Mapea como lo pides:
            oModel.setProperty("/COMPANYID", oCompany.RAW.COMPANYID); // Número
            oModel.setProperty("/COMPANYNAME", "IdCompanies-" + oCompany.RAW.VALUEID); // Identificador compuesto
            oModel.setProperty("/COMPANYALIAS", oCompany.RAW.VALUE); // Nombre visible

            // Limpia departamento al cambiar compañía
            oModel.setProperty("/DEPARTMENTID", "");
            oModel.setProperty("/DEPARTMENT", "");

            this.loadDeptos();
        },

        onDepartmentSelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oItem = oComboBox.getSelectedItem();
            var oCtx = oItem.getBindingContext("departments");
            var oDept = oCtx.getObject();

            var oModel = this.getView().getModel("newUserModel");
            oModel.setProperty("/DEPARTMENTID", oDept.RAW.VALUEID); // VALUEID
            oModel.setProperty("/DEPARTMENT", oDept.RAW.VALUE);     // VALUE
        },

        // ============= CARGAR COMPAÑÍAS PARA EDICIÓN =============
        loadEditCompanies: async function () {
            try {
                const res = await fetch("http://localhost:3033/api/sec/usersroles/getAllCompanies", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });

                if (!res.ok) throw new Error("Error en la respuesta del servidor.");

                const data = await res.json();
                console.log("Respuesta cruda de getAllCompanies (edit):", data);

                const aAllCompanies = Array.isArray(data.value) ? data.value : (Array.isArray(data) ? data : []);
                const aFilteredCompanies = aAllCompanies.filter(
                    (company) => company.DETAIL_ROW?.ACTIVED && !company.DETAIL_ROW?.DELETED
                );

                const companiesFormatted = aFilteredCompanies.map((company) => ({
                    COMPANYID: company.COMPANYID, // Número
                    COMPANYNAME: "IdCompanies-" + company.VALUEID, // Identificador compuesto
                    COMPANYALIAS: company.VALUE, // Nombre visible
                    RAW: company
                }));

                const oModel = this.getView().getModel("editCompanies") || new sap.ui.model.json.JSONModel();
                oModel.setData({ companies: companiesFormatted, originalData: aFilteredCompanies });
                if (!this.getView().getModel("editCompanies")) {
                    this.getView().setModel(oModel, "editCompanies");
                }
            } catch (error) {
                console.error("Error al cargar compañías (edit):", error);
                // @ts-ignore
                sap.m.MessageBox.error("Error al cargar compañías. Por favor, intente nuevamente.");
            }
        },
        // ============= FIN CARGAR COMPAÑÍAS PARA EDICIÓN =============

        // ============= CARGAR DEPARTAMENTOS PARA EDICIÓN =============
        loadEditDeptos: async function () {
            try {
                var oUserModel = this.getView().getModel("editUserModel");
                var sCompanyName = oUserModel.getProperty("/COMPANYNAME");

                if (!sCompanyName) {
                    console.warn("No hay compañía seleccionada para cargar departamentos (edit).");
                    // No mostrar MessageBox aquí, solo salir silenciosamente
                    return;
                }

                var companyIdStr = sCompanyName;
                console.log("Solicitando departamentos para (edit):", companyIdStr);

                const res = await fetch("http://localhost:3033/api/sec/usersroles/getDepartmentsByCompany", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyIdStr: companyIdStr })
                });

                if (!res.ok) throw new Error("Error en la respuesta del servidor.");

                const data = await res.json();
                const aAllDepartments = Array.isArray(data.value) ? data.value : (Array.isArray(data) ? data : []);
                var oUserCompanyId = oUserModel.getProperty("/COMPANYID");
                const aFilteredDepartments = aAllDepartments.filter(
                    (dept) =>
                        dept.DETAIL_ROW?.ACTIVED &&
                        !dept.DETAIL_ROW?.DELETED &&
                        dept.VALUEPAID === companyIdStr &&
                        dept.COMPANYID === oUserCompanyId
                );

                const departmentsFormatted = aFilteredDepartments.map((dept) => ({
                    DEPARTMENTID: dept.VALUEID,
                    DEPARTMENTNAME: dept.VALUE,
                    DEPARTMENTALIAS: dept.ALIAS,
                    RAW: dept
                }));

                const oModel = this.getView().getModel("editDepartments") || new sap.ui.model.json.JSONModel();
                oModel.setData({ departments: departmentsFormatted, originalData: aFilteredDepartments });
                if (!this.getView().getModel("editDepartments")) {
                    this.getView().setModel(oModel, "editDepartments");
                }
            } catch (error) {
                // Solo muestra el error si sí había compañía seleccionada
                if (this.getView().getModel("editUserModel").getProperty("/COMPANYNAME")) {
                    console.error("Error al cargar departamentos (edit):", error);
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al cargar departamentos. Por favor, intente nuevamente.");
                }
            }
        },
        // ============= FIN CARGAR DEPARTAMENTOS PARA EDICIÓN =============

        onEditCompanySelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oItem = oComboBox.getSelectedItem();
            var oCtx = oItem.getBindingContext("editCompanies");
            var oCompany = oCtx.getObject();

            var oModel = this.getView().getModel("editUserModel");
            oModel.setProperty("/COMPANYID", oCompany.RAW.COMPANYID);
            oModel.setProperty("/COMPANYNAME", oCompany.COMPANYNAME);
            oModel.setProperty("/COMPANYALIAS", oCompany.RAW.VALUE);

            // Limpia departamento al cambiar compañía
            oModel.setProperty("/DEPARTMENTID", "");
            oModel.setProperty("/DEPARTMENT", "");

            this.loadEditDeptos();
        },

        onEditDepartmentSelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oItem = oComboBox.getSelectedItem();
            var oCtx = oItem.getBindingContext("editDepartments");
            var oDept = oCtx.getObject();

            var oModel = this.getView().getModel("editUserModel");
            oModel.setProperty("/DEPARTMENTID", oDept.RAW.VALUEID);
            oModel.setProperty("/DEPARTMENT", oDept.RAW.VALUE);
        },
    });
});
