/* eslint-disable linebreak-style */
/* eslint-disable no-console */
/* eslint-disable fiori-custom/sap-no-hardcoded-url */
/* eslint-disable fiori-custom/sap-no-localhost */
sap.ui.define([
    "com/invertions/sapfiorimodinv/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function(BaseController,JSONModel,Log,Fragment,MessageToast){
    "use strict";

    return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.UsersList",{
        onInit: function(){
            const oRolesModel = new JSONModel();
            this.getView().setModel(oRolesModel, "users");

            const oSelectedUserModel = new JSONModel();

            this.getView().setModel(oSelectedUserModel, "selectedUser");

            this._loadUsersData();
        },

        _loadUsersData: async function(){
            try {
                const response = await fetch("http://localhost:4004/api/security/crudUsers?action=get");
                const data = await response.json();
                //console.log("ESTO ES LA RESPUESTA:",data);
                // Guardamos todo el array de usuarios
                this.getView().getModel("users").setData({ value: data.value });
              } catch (error) {
                Log.error("Error al cargar Usuarios", error);
              }
        },
        
        onListItemPressed:function(oEvent){
            const oListItem = oEvent.getParameter("listItem");
            const oContext = oListItem.getBindingContext("users");
            
            if (!oContext) {
                console.error("No se encontró el contexto del rol seleccionado.");
                return;
            }

            const oSelectedUser = oContext.getObject();
            
            const oSelectedUserModel = new JSONModel(oSelectedUser);
            this.getOwnerComponent().setModel(oSelectedUserModel, "selectedUser");
            
            //✅ Navegar al detalle
            this.getOwnerComponent().getRouter().navTo("RouteUserDetails", {
                USERID: encodeURIComponent(oSelectedUser.USERID)
            });
        },

        onAddUser : function() {
            if (!this._oUserDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.invertions.sapfiorimodinv.view.Users.UserDialog",
                    controller: this
                }).then( (oDialog) => {
                    this.getView().addDependent(oDialog);
                    this._oUserDialog = oDialog;
                    // Crea y asigna un modelo local para el diálogo
                    var oDialogModel = new JSONModel({
                        FIRSTNAME: "",
                        LASTNAME: "",
                        ALIAS: "",
                        EMAIL: "",
                        BIRTHDAYDATE: "",
                        DEPARTMENT: "",
                        FUNCTION: "",
                        STREET: "",
                        CITY: "",
                        STATE: "",
                        POSTALCODE: "",
                        PHONENUMBER: "",
                        COUNTRY: "",
                        ROLES: ""
                    });
                    oDialogModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
                    oDialog.setModel(oDialogModel, "UserDialogModel");
                    oDialog.open();
                });
            } else {
                // Si el diálogo ya existe, reinicia el modelo
                var oModel = this._oUserDialog.getModel("UserDialogModel");
                // oModel.setData({
                // FIRSTNAME: "",
                // LASTNAME: "",
                // ALIAS: "",
                // EMAIL: "",
                // BIRTHDAYDATE: "",
                // DEPARTMENT: "",
                // FUNCTION: "",
                // STREET: "",
                // CITY: "",
                // STATE: "",
                // POSTALCODE: "",
                // PHONENUMBER: "",
                // COUNTRY: "",
                // ROLES: ""
                // });
                this._oUserDialog.open();
            }
        },

        onCancelUser: function(){
            if (this._oUserDialog) {
                this._oUserDialog.close();
            }
        },
        onSaveUser: function() {
            var oDialogModel = this._oUserDialog.getModel("UserDialogModel");
            var oNewUser = oDialogModel.getData();
            console.log("Datos guardados en el modelo local:",oNewUser);
            // Validar datos básicos, por ejemplo:
            if (!oNewUser.FIRSTNAME || !oNewUser.LASTNAME || !oNewUser.EMAIL) {
                MessageToast.show("Por favor, complete los campos obligatorios.");
                return;
            }

            // Obtener el modelo principal de usuarios (por ejemplo, "users")
            var oMainModel = this.getView().getModel("users");
            var aUsers = oMainModel.getProperty("/value") || [];
            aUsers.push(oNewUser);
            oMainModel.setProperty("/value", aUsers);


            // Cerramos el diálogo y, opcionalmente, mostramos un mensaje de éxito.
            this._oUserDialog.close();
            MessageToast.show("El usuario se ha guardado correctamente.");
        }

        ,_resetUserDialog: function() {
            // Asumiendo que tus controles de entrada están dentro del diálogo
            // Puedes obtenerlos por ID y poner su valor en vacío.
            // Por ejemplo:
            this.byId("inputFirstName").setValue("");
            this.byId("inputLastName").setValue("");
            this.byId("inputAlias").setValue("");
            this.byId("inputEmail").setValue("");
            this.byId("inputBirthday").setValue("");
            this.byId("inputDepartment").setValue("");
            this.byId("inputFunction").setValue("");
            this.byId("inputStreet").setValue("");
            this.byId("inputCity").setValue("");
            this.byId("inputState").setValue("");
            this.byId("inputPostalCode").setValue("");
            this.byId("inputPhoneNumber").setValue("");
            this.byId("inputCountry").setValue("");
            this.byId("inputRoles").setValue("");
        }
    });
});
