sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
// @ts-ignore
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("com.invertions.sapfiorimodinv.controller.Login", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        email: "",
        password: ""
      }), "loginModel");
    },

    onLoginPress: async function () {
      const oLogin = this.getView().getModel("loginModel").getData();
      /*
      try {
        // Llama a tu API para obtener todos los usuarios
        const response = await fetch("http://localhost:3033/api/sec/usersroles/usersCRUD?procedure=get&type=all", {
          method: "POST"
        });

        const result = await response.json();
        console.log("Respuesta completa:", result);
        
        // Corrige el acceso a los datos - la estructura es: result.value (array de usuarios)
        let userList = [];
        if (result && result.value && Array.isArray(result.value)) {
          userList = result.value;
        } else if (Array.isArray(result)) {
          userList = result;
        }

        console.log("Lista de usuarios procesada:", userList);

        // Busca usuario por email y password (sin filtrar por estado)
        const user = userList.find(u => {
          const userEmail = (u.EMAIL || "").trim().toLowerCase();
          const userPassword = (u.PASSWORD || "").trim();
          const inputEmail = oLogin.email.trim().toLowerCase();
          const inputPassword = oLogin.password.trim();
          return userEmail === inputEmail && userPassword === inputPassword;
        });

        if (!user) {
          sap.m.MessageToast.show("Correo o contraseña incorrectos");
          console.log("Usuario no encontrado");
          return;
        }

        // Verifica si está activo
        const isActive = user.DETAIL_ROW && user.DETAIL_ROW.ACTIVED === true && user.DETAIL_ROW.DELETED === false;
        if (!isActive) {
          sap.m.MessageToast.show("El usuario no está activo. Contacta al administrador.");
          console.log("Usuario inactivo o eliminado");
          return;
        }

        console.log("Usuario encontrado:", user);

        // Guarda el USERID en sessionStorage (NO el USERNAME)
        sessionStorage.setItem("USERID", user.USERID);

        // Si quieres mostrar el nombre en la app, también puedes guardar el USERNAME aparte si lo necesitas
        sessionStorage.setItem("USERNAME", user.USERNAME);
        sessionStorage.setItem("CAPITAL", user.CAPITAL.toString());

        // Guarda el usuario autenticado en appView
        const oAppModel = this.getOwnerComponent().getModel("appView");
        oAppModel.setProperty("/isLoggedIn", true);
        //oAppModel.setProperty("/currentUser", user);

        // Navega a la vista principal
        this.getOwnerComponent().getRouter().navTo("RouteMain");

      } catch (error) {
        console.error("Error al autenticar:", error);
        // @ts-ignore
        sap.m.MessageToast.show("Error al conectar con la API");
      }*/
        const oAppModel = this.getOwnerComponent().getModel("appView");
        oAppModel.setProperty("/isLoggedIn", true);
        //oAppModel.setProperty("/currentUser", user);

        // Navega a la vista principal
        this.getOwnerComponent().getRouter().navTo("RouteMain");
    },

    //Funcion para el ojito
    onVerContraseña: function () {
      const oInput = this.byId("passwordInput");
      const bCurrentType = oInput.getType() === "Text";
      oInput.setType(bCurrentType ? "Password" : "Text");
      this.byId("showPasswordButton").setIcon(bCurrentType ? "sap-icon://show" : "sap-icon://hide");
    }
  });
});