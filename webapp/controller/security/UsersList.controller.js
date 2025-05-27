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
], function(BaseController,JSONModel,Log,Fragment,MessageToast,MessageBox){
    "use strict";

    return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.UsersList",{
        onInit: function(){

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

        loadCompanies: function() {
            //Agregar lógica para cargar compañias
        },

        loadDeptos: function(){
            //Agregar lógica para cargar deptos según la compañía
        },


        // ============= CARGAR ROLES PARA EL DIALOGO DE NUEVO USUARIO =============
        /**
         * Funcion para cargar la lista de roles y poderlos visualizar en el combobox
         * Esto va cambiar ya que quiere que primero carguemos las compañías, luego que carguemos los deptos
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
            return rolesArray.map(function(role) {
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
        onAddUser : function() {
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

            if (!this._oCreateUserDialog) {
                sap.ui.core.Fragment.load({
                    id: this.getView().getId(), // Usa el id de la vista
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.AddUserDialog",
                    controller: this // <-- MUY IMPORTANTE
                }).then(function(oDialog) {
                    this._oCreateUserDialog = oDialog;
                    // @ts-ignore
                    this.getView().addDependent(oDialog);
                    // @ts-ignore
                    this.loadRoles();
                    oDialog.open();
                }.bind(this)); // <-- IMPORTANTE: bind(this)
            } else {
                this.loadRoles();
                this._oCreateUserDialog.open();
            }
            
        },

        // ============= AGREGAR NUEVO USUARIO =============
        // Envía los datos del nuevo usuario a la API CAP y refresca la tabla
        onSaveUser: function () {
            var that = this;
            var oDialog = this._oCreateUserDialog;
            var oModel = this.getView().getModel("newUserModel");
            var oData = oModel.getData();

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
            var aRoles = oVBox.getItems().map(function(oItem) {
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
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=post", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(oData)
            })
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    // @ts-ignore
                    sap.m.MessageToast.show("Usuario agregado correctamente");
                    that.loadUsers();
                    if (oDialog) oDialog.close();
                } else {
                    let msg = "No se pudo agregar el usuario.";
                    if (data && data.message) msg = data.message;
                    if (data && data.errors) {
                        msg += "\n";
                        Object.keys(data.errors).forEach(function(field) {
                            msg += "\n" + field + ": " + data.errors[field].message;
                        });
                    }
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al agregar usuario: " + msg);
                }
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
        onEditUser: function() {
            var oView = this.getView();
            var oSelected = this.selectedUser;
            if (!oSelected) {
                MessageToast.show("Selecciona un usuario para editar.");
                return;
            }

            // Prepara el modelo para edición (copia profunda)
            var oEditUserModel = new sap.ui.model.json.JSONModel(JSON.parse(JSON.stringify(oSelected)));
            oView.setModel(oEditUserModel, "editUserModel");

            if (!this._oEditUserDialog) {
                sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.EditUserDialog",
                    controller: this
                }).then(function(oDialog) {
                    this._oEditUserDialog = oDialog;
                    oView.addDependent(oDialog);
                    // @ts-ignore
                    this.loadRoles(); // Si quieres recargar roles
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
        _fillEditRolesVBox: function() {
            var oVBox = this.getView().byId("selectedEditRolesVBox");
            oVBox.removeAllItems();
            var oEditUserModel = this.getView().getModel("editUserModel");
            var aRoles = oEditUserModel.getProperty("/ROLES") || [];
            var oRolesModel = this.getView().getModel("roles");
            var aAllRoles = oRolesModel ? oRolesModel.getProperty("/roles") : [];

            aRoles.forEach(function(role) {
                var roleName = (aAllRoles.find(r => r.ROLEID === role.ROLEID) || {}).ROLENAME || role.ROLEID;
                var oHBox = new sap.m.HBox({
                    items: [
                        new sap.m.Label({ text: roleName }).addStyleClass("sapUiSmallMarginEnd"),
                        // @ts-ignore
                        new sap.m.Button({
                            icon: "sap-icon://decline",
                            type: "Transparent",
                            press: function() {
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
        onEditSaveUser: function() {
            var that = this;
            var oDialog = this._oEditUserDialog;
            var oModel = this.getView().getModel("editUserModel");
            var oData = oModel.getData();

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
            var aRoles = oVBox.getItems().map(function(oItem) {
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
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=put&userid=" + encodeURIComponent(oData.USERID), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(oData)
            })
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    // @ts-ignore
                    sap.m.MessageToast.show("Usuario editado correctamente");
                    that.loadUsers();
                    if (oDialog) oDialog.close();
                } else {
                    let msg = "No se pudo editar el usuario.";
                    if (data && data.message) msg = data.message;
                    if (data && data.errors) {
                        msg += "\n";
                        Object.keys(data.errors).forEach(function(field) {
                            msg += "\n" + field + ": " + data.errors[field].message;
                        });
                    }
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al editar usuario: " + msg);
                }
            })
            .catch(err => {
                // @ts-ignore
                sap.m.MessageBox.error("Error de red al editar usuario: " + err.message);
            });
        },

        // ============= CANCELAR EDICIÓN =============
        onEditCancelUser: function(){
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
        onDeleteUser: function(){
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
            }else{
                MessageToast.show("Selecciona un usuario para eliminar de la base de datos");
            }
        },

        // ============= ELIMINAR USER (DELETE FÍSICO) =============
        // Elimina el usuario de la base de datos de forma permanente
        deleteUser: function(UserId){
            var that = this;
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=delete&type=hard&userid=" + encodeURIComponent(UserId), {
                method: "POST"
            })
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    // @ts-ignore
                    sap.m.MessageToast.show("Usuario eliminado correctamente");
                    that.loadUsers();
                    that.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
                } else {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al eliminar usuario: " + (data.message || "No se pudo eliminar el usuario."));
                }
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
        onDesactivateUser: function(){
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
            }else{
                MessageToast.show("Selecciona un usuario para desactivar");
            }
        },

        // ============= DESACTIVAR USER (DELETE LÓGICO) =============
        // Marca el usuario como desactivado/eliminado lógicamente (no se borra de la BD)
        desactivateUser: function(UserId){
            var that = this;
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=delete&type=logic&userid=" + encodeURIComponent(UserId), {
                method: "POST"
            })
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    // @ts-ignore
                    sap.m.MessageToast.show("Usuario desactivado correctamente");
                    that.loadUsers();
                    that.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
                } else {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al desactivar usuario: " + (data.message || "No se pudo desactivar el usuario."));
                }
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
        onActivateUser: function(){
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
            }else{
                MessageToast.show("Selecciona un usuario para activar");
            }
        },

        // ============= ACTIVAR USER =============
        activateUser: function(UserId){
            var that = this;
            fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=activate&userid=" + encodeURIComponent(UserId), {
                method: "POST"
            })
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    // @ts-ignore
                    sap.m.MessageToast.show("Usuario activado correctamente");
                    that.loadUsers();
                    that.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
                } else {
                    // @ts-ignore
                    sap.m.MessageBox.error("Error al activar usuario: " + (data.message || "No se pudo activar el usuario."));
                }
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

        onRefresh: function(){
            this.loadUsers();
        },


        //===================================================
        //=========== Validar email y phonenumber ===========
        //===================================================

        isValidEmail: function(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        isValidPhoneNumber: function(phone) {
            return /^\d{10}$/.test(phone); // Ejemplo: 10 dígitos numéricos
        },

        formatStatus: function(detailRow) {
            if (!detailRow) return "";
            if (detailRow.DELETED) return "Eliminado";
            if (detailRow.ACTIVED) return "Activo";
            return "Desactivado";
        }

    });
});
