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
                // Usa el endpoint que te da la estructura completa
                const res = await fetch("http://localhost:3033/api/sec/usersroles/getCompaniesWithCedisAndDepartments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });

                if (!res.ok) throw new Error("Error en la respuesta del servidor.");

                const data = await res.json();
                // Aquí ya tienes la estructura correcta
                const companies = Array.isArray(data.value) ? data.value : (Array.isArray(data) ? data : []);
                console.log("Empresas con CEDIS y departamentos:", companies);

                const oModel = new sap.ui.model.json.JSONModel({ companies });
                this.getView().setModel(oModel, "companies");
            } catch (error) {
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
                ROLES: [],
                PHONE_DIGITS: ["","","","","","","","","",""],
                PHONE_ERROR: "",
                EMAIL_ERROR: "",
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

            // --- FORZAR ACTUALIZACIÓN DEL PHONENUMBER ANTES DE ENVIAR ---
            if (Array.isArray(oData.PHONE_DIGITS)) {
                // Asegura que sean 10 posiciones y solo dígitos
                for (let i = 0; i < 10; i++) {
                    if (!oData.PHONE_DIGITS[i]) oData.PHONE_DIGITS[i] = "";
                    oData.PHONE_DIGITS[i] = String(oData.PHONE_DIGITS[i]).replace(/\D/g, "").charAt(0) || "";
                }
                oData.PHONENUMBER = oData.PHONE_DIGITS.join("");
                oModel.setProperty("/PHONENUMBER", oData.PHONENUMBER);
            }
            // ------------------------------------------------------------

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

            // ======= SE ELIMINA LA VALIDACIÓN BÁSICA DEL FRONT =======
            // if (!oData.USERID || !oData.EMAIL) {
            //     sap.m.MessageBox.warning("Por favor, completa al menos el ID de usuario y el correo electrónico.");
            //     return;
            // }
            // =========================================================

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
                    sap.m.MessageBox.error("Error al agregar usuario: " + (errorObj.message || "No se pudo agregar el usuario."));
                    return;
                }
                sap.m.MessageToast.show("Usuario agregado correctamente");
                that.loadUsers();
                if (oDialog) oDialog.close();
            })
            .catch(err => {
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

            // Inicializa PHONE_DIGITS y errores
            var phone = oSelected.PHONENUMBER || "";
            var phoneDigits = phone.split("").slice(0, 10);
            while (phoneDigits.length < 10) phoneDigits.push("");
            oSelected.PHONE_DIGITS = phoneDigits;
            oSelected.PHONE_ERROR = "";
            oSelected.EMAIL_ERROR = "";

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

            // Guarda el USERID original antes de editar
            var originalUserId = this.selectedUser.USERID;

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
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=put&userid=" + encodeURIComponent(originalUserId) + "&RegUser=" + regUser, {
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

        onSearchUser: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oTable = this.byId("IdTable1UsersManageTable");
            var oBinding = oTable.getBinding("rows");

            if (!oBinding) return;

            var aFilters = [];
            if (sQuery) {
                aFilters.push(
                    new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("USERID", sap.ui.model.FilterOperator.Contains, sQuery),
                            new sap.ui.model.Filter("USERNAME", sap.ui.model.FilterOperator.Contains, sQuery),
                            new sap.ui.model.Filter("EMAIL", sap.ui.model.FilterOperator.Contains, sQuery),
                            new sap.ui.model.Filter("COMPANYALIAS", sap.ui.model.FilterOperator.Contains, sQuery),
                            new sap.ui.model.Filter("DEPARTMENT", sap.ui.model.FilterOperator.Contains, sQuery),
                            // Filtro personalizado para roles
                            new sap.ui.model.Filter({
                                path: "ROLES",
                                test: function (aRoles) {
                                    if (!Array.isArray(aRoles)) return false;
                                    return aRoles.some(function (role) {
                                        return (role.ROLEID && role.ROLEID.toLowerCase().includes(sQuery.toLowerCase())) ||
                                               (role.ROLENAME && role.ROLENAME.toLowerCase().includes(sQuery.toLowerCase()));
                                    });
                                }
                            })
                        ],
                        and: false
                    })
                );
            }
            oBinding.filter(aFilters);
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
            // Solo acepta exactamente 10 dígitos
            return /^\d{10}$/.test(phone);
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

        // Evento al seleccionar empresa: llena CEDIS y habilita el ComboBox
        onCompanySelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oItem = oComboBox.getSelectedItem();
            if (!oItem) return;

            var oCtx = oItem.getBindingContext("companies");
            var oCompany = oCtx.getObject();

            // LOG para depuración
            console.log("Empresa seleccionada:", oCompany);

            // Setea los datos en el modelo del usuario
            var oUserModel = this.getView().getModel("newUserModel");
            oUserModel.setProperty("/COMPANYID", oCompany.COMPANYID);
            oUserModel.setProperty("/COMPANYNAME", oCompany.VALUEID);
            oUserModel.setProperty("/COMPANYALIAS", oCompany.VALUE);

            // Limpia CEDI y Departamento seleccionados
            oUserModel.setProperty("/CEDIID", "");
            oUserModel.setProperty("/DEPARTMENT", "");

            // Llenar modelo de CEDIS
            var cedis = oCompany.CEDIS || [];
            console.log("CEDIS de la empresa:", cedis);

            var oCedisModel = new sap.ui.model.json.JSONModel({ cedis: cedis });
            this.getView().setModel(oCedisModel, "cedis");

            // Limpiar departamentos
            var oDeptosModel = new sap.ui.model.json.JSONModel({ departments: [] });
            this.getView().setModel(oDeptosModel, "departments");

            // Habilitar ComboBox de CEDIS
            this.getView().byId("comboBoxCedis").setEnabled(true);
            this.getView().byId("comboBoxDepartments").setEnabled(false);
        },

        onCediSelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oItem = oComboBox.getSelectedItem();
            if (!oItem) return;

            var oCtx = oItem.getBindingContext("cedis");
            var oCedi = oCtx.getObject();

            // LOG para depuración
            console.log("CEDI seleccionado:", oCedi);

            // Setea el CEDIID en el modelo del usuario
            var oUserModel = this.getView().getModel("newUserModel");
            oUserModel.setProperty("/CEDIID", oCedi.CEDIID);

            // Limpia departamento seleccionado
            oUserModel.setProperty("/DEPARTMENT", "");

            // Llenar modelo de departamentos
            var departments = oCedi.DEPARTAMENTOS || [];
            console.log("Departamentos del CEDI:", departments);

            var oDeptosModel = new sap.ui.model.json.JSONModel({ departments: departments });
            this.getView().setModel(oDeptosModel, "departments");

            // Habilitar ComboBox de departamentos
            this.getView().byId("comboBoxDepartments").setEnabled(true);
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

        onDepartmentSelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var oItem = oComboBox.getSelectedItem();
            if (!oItem) return;

            var oCtx = oItem.getBindingContext("departments");
            var oDept = oCtx.getObject();

            // LOG para depuración
            console.log("Departamento seleccionado:", oDept);

            // Solo setea el nombre del departamento
            var oUserModel = this.getView().getModel("newUserModel");
            oUserModel.setProperty("/DEPARTMENT", oDept.VALUE);
        },

        onPhoneInputChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            // Elimina todo lo que no sea dígito
            var digits = sValue.replace(/\D/g, "").substring(0, 10);
            // Formatea como _-_... (ejemplo: 123-456-7890)
            var formatted = digits.replace(/(\d{1})(?=(\d{1})+(?!\d))/g, "$1-");
            // Quita el guion final si existe
            if (formatted.endsWith("-")) formatted = formatted.slice(0, -1);
            oEvent.getSource().setValue(formatted);

            // Actualiza el modelo solo con los dígitos
            var oUserModel = this.getView().getModel("newUserModel");
            oUserModel.setProperty("/PHONENUMBER", digits);
        },

        onPhoneDigitChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var oUserModel = this.getView().getModel("newUserModel");
            var digits = oUserModel.getProperty("/PHONE_DIGITS") || [];

            // Detecta el índice del input (phoneDigit0, phoneDigit1, ...)
            var sId = oInput.getId();
            var idx = parseInt(sId.match(/phoneDigit(\d)$/)[1], 10);

            // Solo permite un dígito numérico, elimina letras y más de un dígito
            var clean = (typeof sValue === "string") ? sValue.replace(/\D/g, "").charAt(0) || "" : "";
            oInput.setValue(clean);
            digits[idx] = clean;

            // Actualiza el modelo con los dígitos corregidos
            oUserModel.setProperty("/PHONE_DIGITS", digits);

            // Une los dígitos en un solo string para PHONENUMBER
            var phone = digits.join("");
            oUserModel.setProperty("/PHONENUMBER", phone);

            // Validación en tiempo real
            if (phone.length === 10) {
                oUserModel.setProperty("/PHONE_ERROR", "");
            } else {
                oUserModel.setProperty("/PHONE_ERROR", "El número debe tener 10 dígitos");
            }
        },

        onEditPhoneDigitChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");
            var oUserModel = this.getView().getModel("editUserModel");
            var digits = oUserModel.getProperty("/PHONE_DIGITS") || [];

            // Detecta el índice del input (editPhoneDigit0, editPhoneDigit1, ...)
            var sId = oInput.getId();
            var idx = parseInt(sId.match(/editPhoneDigit(\d)$/)[1], 10);

            // Solo permite un dígito numérico, elimina letras y más de un dígito
            var clean = (typeof sValue === "string") ? sValue.replace(/\D/g, "").charAt(0) || "" : "";
            oInput.setValue(clean);
            digits[idx] = clean;

            // Actualiza el modelo con los dígitos corregidos
            oUserModel.setProperty("/PHONE_DIGITS", digits);

            // Une los dígitos en un solo string para PHONENUMBER
            var phone = digits.join("");
            oUserModel.setProperty("/PHONENUMBER", phone);

            // Validación en tiempo real
            if (phone.length === 10) {
                oUserModel.setProperty("/PHONE_ERROR", "");
            } else {
                oUserModel.setProperty("/PHONE_ERROR", "El número debe tener 10 dígitos");
            }
        },

        onEmailInputChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oUserModel = this.getView().getModel("newUserModel");
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sValue)) {
                oUserModel.setProperty("/EMAIL_ERROR", "Correo inválido");
            } else {
                oUserModel.setProperty("/EMAIL_ERROR", "");
            }
        },

        onEditEmailInputChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oUserModel = this.getView().getModel("editUserModel");
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sValue)) {
                oUserModel.setProperty("/EMAIL_ERROR", "Correo inválido");
            } else {
                oUserModel.setProperty("/EMAIL_ERROR", "");
            }
        },

    });
});