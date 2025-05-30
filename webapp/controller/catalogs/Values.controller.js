//This file is part of the SAP Fiori Mod Inv application.
sap.ui.define(
  [
    "com/invertions/sapfiorimodinv/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "jquery",
  ],
// Controller definition
  function (
    BaseController,
    JSONModel,
    MessageBox,
    MessageToast,
    Filter,
    Fragment,
    FilterOperator,
    $
  ) {
    "use strict";

    return BaseController.extend(
      "com.invertions.sapfiorimodinv.controller.catalogs.Values",
      {
        //1. Método de inicialización del controlador para establecer modelos y cargar datos
        onInit: function () {
          // Modelo principal para los valores y catálogos
          this.getView().setModel(
            new JSONModel({
              values: [],
              selectedValue: { LABELID: "IdApplications" },
              selectedValueIn: null,
              AllValues: [],
              AllLabels: [],
            }),
            "values"
          );

          //CREA el modelo newValueModel antes de usar setData
          this.getView().setModel(
            new JSONModel({
              VALUEID: "",
              VALUE: "",
              VALUEPAID: "",
              ALIAS: "",
              IMAGE: "",
              DESCRIPTION: "",
              DETAIL_ROW: {
                ACTIVED: true,
                DELETED: false,
              },
            }),
            "newValueModel"
          );

          // Carga los valores al iniciar usando el LABELID real -- comentado
          // this._loadValuesByLabel("IdApplications");
        },

        //2. Método para cargar los valores en el modelo-----------------------

        loadValues: function (aFilteredValues, aAllValues, oAllLabels) {
          this.getView()
            .getModel("values")
            .setProperty("/values", aFilteredValues || []);
          this.getView()
            .getModel("values")
            .setProperty("/AllValues", aAllValues || []);
          this.getView()
            .getModel("values")
            .setProperty("/AllLabels", oAllLabels || []);
        },
        //FIN Método para cargar los valores en el modelo-----------------------


        //3. Eventos de UI------------------------------------------------------

        // Método para cargar los valores al iniciar la vista-------------------
        onLabelIdChange: function (oEvent) {
          var sSelectedLabelId = oEvent.getParameter("selectedItem").getKey();
          var oView = this.getView();
          var aAllValues = oView.getModel("values").getProperty("/AllValues") || [];
          var aFiltered = aAllValues.filter(function (oValue) {
            return oValue.LABELID === sSelectedLabelId;
          });
          oView.getModel("values").setProperty("/FilteredValues", aFiltered);
          // Limpia el VALUEPAID seleccionado si deseas reiniciar el segundo combobox
          oView.getModel("newValueModel").setProperty("/VALUEPAID", "");
          // //
          // oView.getModel("values").setProperty("/selectedValue", {
          //     LABELID: sSelectedLabelId
          // });
        },

        // Método para abrir el diálogo de selección de valores-------------------

        onItemSelect: function (oEvent) {
          var oItem = oEvent.getParameter("listItem");
          var oSelectedData = oItem.getBindingContext("values").getObject();

          var sParentValueId = "";
          var sParentLabelId = "";
          if (oSelectedData.VALUEPAID) {
            var aParts = oSelectedData.VALUEPAID.split("-");
            sParentLabelId = aParts.length > 1 ? aParts[0] : "";
            sParentValueId = aParts.length > 1 ? aParts[1] : "";
          }

          // Setear valores seleccionados
          this.getView()
            .getModel("newValueModel")
            .setProperty("/", {
              VALUEID: oSelectedData.VALUEID,
              VALUE: oSelectedData.VALUE,
              ValuePaid1: sParentLabelId,
              ALIAS: oSelectedData.ALIAS,
              IMAGE: oSelectedData.IMAGE,
              DESCRIPTION: oSelectedData.DESCRIPTION,
              DETAIL_ROW: {
                ACTIVED: oSelectedData.DETAIL_ROW.ACTIVED,
              },
            });

          // Filtrar valores del ComboBox 2
          var aAllValues =
            this.getView().getModel("values").getProperty("/AllValues") || [];
          var aFiltered = aAllValues.filter(function (oValue) {
            return oValue.LABELID === sParentLabelId;
          });
          this.getView()
            .getModel("values")
            .setProperty("/FilteredValues", aFiltered);

          this.getView()
            .getModel("newValueModel")
            .setProperty("/ValuePaid2", sParentValueId);

          //solo actualiza el valor seleccionado para los botones
          this.getView()
            .getModel("values")
            .setProperty("/selectedValueIn", oSelectedData);
        },

        // Método para inicializar el modelo de nuevo valor------------------------
        onFilterChange: function () {
          var oTable = this.byId("valuesTable");
          var oBinding = oTable.getBinding("items");
          var valueFilterVal = this.byId("ValueSearchField").getValue();

          var aFilters = [];
          if (valueFilterVal) {
            aFilters.push(
              new Filter("VALUEID", FilterOperator.Contains, valueFilterVal)
            );
          }

          oBinding.filter(aFilters);
        },

        // Método para manejar el cambio del switch de activación/desactivación
        onSwitchChange: function (oEvent) {
          var bState = oEvent.getParameter("state");
          var oModel = this.getView().getModel("newValueModel");

          oModel.setProperty("/DETAIL_ROW/ACTIVED", bState);
          if (bState === true) {
            oModel.setProperty("/DETAIL_ROW/DELETED", false);
          } else {
            oModel.setProperty("/DETAIL_ROW/DELETED", true);
          }
        },

        //4. CRUD
        //Metodo para añadir valores---------------------------------------

        onAddValues: function () {
          var oView = this.getView();
          var oValuesModel = oView.getModel("values");
          var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");

          // Limpia el modelo de añadir valores antes de abrir el diálogo
          var oAddValueModel = this.getView().getModel("addValueModel");
          if (oAddValueModel) {
            oAddValueModel.setData({
              COMPANYID: 0,
              CEDIID: 0,
              LABELID: oSelectedCatalog ? oSelectedCatalog.LABELID : "",
              VALUEPAID: "",
              VALUEID: "",
              VALUE: "",
              ALIAS: "",
              SEQUENCE: 30,
              IMAGE: "",
              VALUESAPID: "",
              DESCRIPTION: "",
              ROUTE: "",
              DETAIL_ROW: {
                ACTIVED: true,
                DELETED: false,
              },
              DETAIL_ROW_REG: [],
            });
          } else {
            oAddValueModel = new JSONModel({
              COMPANYID: 0,
              CEDIID: 0,
              LABELID: oSelectedCatalog ? oSelectedCatalog.LABELID : "",
              VALUEPAID: "",
              VALUEID: "",
              VALUE: "",
              ALIAS: "",
              SEQUENCE: 30,
              IMAGE: "",
              VALUESAPID: "",
              DESCRIPTION: "",
              ROUTE: "",
              DETAIL_ROW: {
                ACTIVED: true,
                DELETED: false,
              },
              DETAIL_ROW_REG: [],
            });
            this.getView().setModel(oAddValueModel, "addValueModel");
          }

          // Limpia también el modelo del formulario rápido CON DETAIL_ROW y modo edición

          this.getView()
            .getModel("newValueModel")
            .setData({
              VALUEID: "",
              VALUE: "",
              VALUEPAID: "",
              ALIAS: "",
              IMAGE: "",
              DESCRIPTION: "",
              DETAIL_ROW: {
                ACTIVED: true,
                DELETED: false,
              },
              isEdit: false, // <-- NO es edición
            });

          // Cargar el diálogo si no existe

          if (!this._oAddDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.AddValueDialog",
              controller: this,
            }).then(
              function (oDialog) {
                this._oAddDialog = oDialog;
                this.getView().addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this._oAddDialog.open();
          }
        },

        //INICIO Método para guardar un nuevo valor------------------------

        onSaveValues: function () {
          var oView = this.getView();
          var oNewValueModel = oView.getModel("newValueModel");
          var oValuesModel = oView.getModel("values");

          // Obtener datos del formulario
          var oFormData = oNewValueModel.getData();
          var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");

          // Validaciones
          if (!oFormData.VALUEID || !oFormData.VALUE) {
            MessageToast.show("VALUEID y VALUE son campos obligatorios");
            return;
          }
          var ValuePaid = `${oFormData.ValuePaid1 || ""}-${
            oFormData.ValuePaid2 || ""
          }`;
          // Construir objeto con todos los parámetros
          var oParams = {
            COMPANYID: 0,
            CEDIID: 0,
            LABELID: oSelectedCatalog.LABELID,
            VALUEPAID: ValuePaid || "",
            VALUEID: oFormData.VALUEID,
            VALUE: oFormData.VALUE,
            ALIAS: oFormData.ALIAS || "",
            SEQUENCE: 30,
            IMAGE: oFormData.IMAGE || "",
            DESCRIPTION: oFormData.DESCRIPTION || "",
            DETAIL_ROW: {
              ACTIVED: oFormData.DETAIL_ROW.ACTIVED,
              DELETED: false,
              DETAIL_ROW_REG: [
                {
                  CURRENT: true,
                  REGDATE: new Date().toISOString(),
                  REGTIME: new Date().toISOString(),
                  REGUSER: sessionStorage.getItem("USERID"),
                },
              ],
            },
          };
          var payload = {
            value: oParams,
          };
          oView.setBusy(true);

          $.ajax({
            url: `http://localhost:3033/api/catalogos/createLabel?type=2`,
            data: JSON.stringify(payload),
            method: "POST",
            contentType: "application/json",
            success: function (response) {
              oView.setBusy(false);
              MessageToast.show("Valor guardado correctamente");

              // Actualizar el modelo directamente con la estructura completa
              var currentValues = oValuesModel.getProperty("/values") || [];
              currentValues.push(oParams); // Asegúrate de agregar el objeto completo
              oValuesModel.setProperty("/values", currentValues);
              currentValues = oValuesModel.getProperty("/AllValues") || [];
              currentValues.push(oParams); // Asegúrate de agregar el objeto completo
              oValuesModel.setProperty("/AllValues", currentValues);

              // Cerrar diálogo y limpiar
              this.onCancelValues();
            }.bind(this),
            error: function (error) {
              oView.setBusy(false);
              MessageToast.show(
                "Error al guardar: " +
                  (error.responseJSON?.error?.message || "Error en el servidor")
              );
            },
          });
        },

        //FIN Método para guardar un nuevo valor-------------------------------

        // Método para inicializar el modelo de nuevo valor al iniciar la vista
        onChangeValue: function () {
          var oView = this.getView();
          var oValuesModel = oView.getModel("values");
          var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");
          // Inicializa el modelo con estructura completa
          var oModel = new JSONModel({
            COMPANYID: 0,
            CEDIID: 0,
            LABELID: oSelectedCatalog.LABELID,
            VALUEPAID: "",
            VALUEID: "",
            VALUE: "",
            ALIAS: "",
            SEQUENCE: 30,
            IMAGE: "",
            VALUESAPID: "",
            DESCRIPTION: "",
            ROUTE: "",
            DETAIL_ROW: {
              ACTIVED: true,
              DELETED: false,
            },
            DETAIL_ROW_REG: [],
            isEdit: true, // <-- Es edición
          });

          this.getView().setModel(oModel, "addValueModel");
          this.getView().getModel("newValueModel").setProperty("/isEdit", true);

          // Cargar el diálogo si no existe
          if (!this._oEditDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.EditValueDialog",
              controller: this,
            }).then(
              function (oDialog) {
                this._oEditDialog = oDialog;
                this.getView().addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this._oEditDialog.open();
          }
        },
        //FIN Método para inicializar el modelo de nuevo valor al iniciar la vista

        //INICIO Método para editar un valor existente-----------------------------------
        onEditValue: function () {
          var oView = this.getView();
          var oNewValueModel = oView.getModel("newValueModel");
          var oValuesModel = oView.getModel("values");

          // Obtener datos del formulario
          var oFormData = oNewValueModel.getData();
          var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");

          // Validaciones
          if (!oFormData.VALUEID || !oFormData.VALUE) {
            MessageToast.show("VALUEID y VALUE son campos obligatorios");
            return;
          }
          var ValuePaid = `${oFormData.ValuePaid1}-${oFormData.ValuePaid2}`;
          // Construir objeto con todos los parámetros
          var oParams = {
            value: {
              COMPANYID: "0",
              CEDIID: "0",
              LABELID: oSelectedCatalog.LABELID,
              VALUEPAID: ValuePaid != "-" ? ValuePaid : "",
              VALUEID: oFormData.VALUEID,
              VALUE: oFormData.VALUE,
              ALIAS: oFormData.ALIAS || "",
              SEQUENCE: 30,
              IMAGE: oFormData.IMAGE || "",
              DESCRIPTION: oFormData.DESCRIPTION || "",
              ACTIVED: oFormData.DETAIL_ROW.ACTIVED,
              REGUSER: sessionStorage.getItem("USERID"),
              // Estructura anidada para DETAIL_ROW
            },
          };
          // Configurar llamada AJAX con GET
          oView.setBusy(true);

          $.ajax({
            url: `http://localhost:3033/api/catalogos/updateLabel?type=2`,
            contentType: "application/json",
            data: JSON.stringify(oParams),
            method: "POST",
            success: function (response) {
              oView.setBusy(false);
              MessageToast.show("Valor guardado correctamente");

              // Actualizar el modelo directamente
              var currentValues = oValuesModel.getProperty("/values") || [];
              var updatedIndex = currentValues.findIndex(
                (item) => item.VALUEID === oFormData.VALUEID
              );

              if (updatedIndex !== -1) {
                currentValues[updatedIndex] = {
                  ...currentValues[updatedIndex],
                  VALUE: oFormData.VALUE,
                  VALUEPAID: oFormData.VALUEPAID,
                  ALIAS: oFormData.ALIAS,
                  IMAGE: oFormData.IMAGE,
                  DESCRIPTION: oFormData.DESCRIPTION,
                  DETAIL_ROW: { ACTIVED: oFormData.DETAIL_ROW.ACTIVED },
                };
                oValuesModel.setProperty("/values", currentValues);
              }

              currentValues = oValuesModel.getProperty("/AllValues") || [];
              var updatedIndex = currentValues.findIndex(
                (item) => item.VALUEID === oFormData.VALUEID
              );
              currentValues.push(oParams); // Asegúrate de agregar el objeto completo
              if (updatedIndex !== -1) {
                currentValues[updatedIndex] = {
                  ...currentValues[updatedIndex],
                  VALUE: oFormData.VALUE,
                  VALUEPAID: oFormData.VALUEPAID,
                  ALIAS: oFormData.ALIAS,
                  IMAGE: oFormData.IMAGE,
                  DESCRIPTION: oFormData.DESCRIPTION,
                  DETAIL_ROW: { ACTIVED: oFormData.DETAIL_ROW.ACTIVED },
                };
                oValuesModel.setProperty("/AllValues", currentValues);
              }
              

              // Cerrar diálogo y limpiar
              this.onCancelEdit();
            }.bind(this),
            error: function (error) {
              oView.setBusy(false);
              MessageToast.show(
                "Error al guardar: " +
                  (error.responseJSON?.error?.message || "Error en el servidor")
              );
            },
          });
        },
        //FIN Método para editar un valor existente-----------------------------------

        //INICIO Método para eliminar un valor------------------------------------------------
        onDeleteValue: function () {
          var oView = this.getView();
          var oNewValueModel = oView.getModel("newValueModel");
          var oValuesModel = oView.getModel("values");

          // Obtener datos del formulario
          var oFormData = oNewValueModel.getData();
          var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");

          // Validaciones
          if (!oFormData.VALUEID || !oFormData.VALUE) {
            MessageToast.show("VALUEID y VALUE son campos obligatorios");
            return;
          }

          //Mensaje de confirmación antes de eliminar
          MessageBox.confirm(
            "¿ESTÁS SEGURO DE ELIMINAR PERMANENTEMENTE ESTE DATO?",
            {
              title: "Confirmar Eliminación",
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  // ✅ Si el usuario presiona "OK", ejecuta la eliminación
                  oView.setBusy(true);

                  $.ajax({
                    url: `http://localhost:3033/api/catalogos/deleteLabelOrValue?mode=physical&type=2&id=${oFormData.VALUEID}`,
                    method: "GET",
                    success: function (response) {
                      oView.setBusy(false);
                      MessageToast.show("Valor eliminado correctamente");

                      // Actualizar el modelo directamente
                      var currentValues =
                        oValuesModel.getProperty("/values") || [];
                      var filteredValues = currentValues.filter(
                        (item) => item.VALUEID !== oFormData.VALUEID
                      );
                      oValuesModel.setProperty("/values", filteredValues);

                      this._cleanModels();
                    }.bind(this),
                    error: function (error) {
                      oView.setBusy(false);
                      MessageToast.show(
                        "Error al eliminar: " +
                          (error.responseJSON?.error?.message ||
                            "Error en el servidor")
                      );
                    },
                  });
                }
              }.bind(this),
            }
          );
        },
        //FIN Método para eliminar un valor------------------------------------------------

        // 5. Acciones de estado
        // Métodos para aceptar o rechazar el estado del valor seleccionado

        StatusValueAccept: function () {
          this.StatusValue(false);
        },
        StatusValueDecline: function () {
          this.StatusValue(true);
        },

        //FIN Método para aceptar o rechazar el estado del valor seleccionado

        //INICIO Método para cambiar el estado del valor seleccionado
        
        StatusValue: function () {
          var oView = this.getView();
          var oNewValueModel = oView.getModel("newValueModel");
          var oValuesModel = oView.getModel("values");
          var oFormData = oNewValueModel.getData();

          if (!oFormData.VALUEID) {
            MessageToast.show("Selecciona un valor.");
            return;
          }

          oView.setBusy(true);

          $.ajax({
            url: `http://localhost:3033/api/catalogos/logicalLabelValue?status=${!oFormData
              .DETAIL_ROW.ACTIVED}&id=${oFormData.VALUEID}&type=2`,
            method: "GET",
            success: function (response) {
              oView.setBusy(false);

              // //
              // var labelIdToReload = oFormData.LABELID || (oValuesModel.getProperty("/selectedValue") && oValuesModel.getProperty("/selectedValue").LABELID);

              // if (labelIdToReload && labelIdToReload !== "IdViews") {
              //     // this._loadValuesByLabel(labelIdToReload);
              // } else {
              //     MessageToast.show("No se pudo recargar la lista: LABELID inválido.");
              // }

              var currentValues = oValuesModel.getProperty("/values") || [];
              var updatedIndex = currentValues.findIndex(
                (item) => item.VALUEID === oFormData.VALUEID
              );

              if (updatedIndex !== -1) {
                currentValues[updatedIndex].DETAIL_ROW = {
                  ACTIVED: !oFormData.DETAIL_ROW.ACTIVED,
                };

                oValuesModel.setProperty("/values", currentValues);
              }

              MessageToast.show(
                !!oFormData.DETAIL_ROW.ACTIVED
                  ? "Valor activado correctamente"
                  : "Valor desactivado correctamente"
              );
            }.bind(this),
            error: function (error) {
              oView.setBusy(false);
              MessageToast.show(
                "Error al actualizar: " +
                  (error.responseJSON?.error?.message || "Error en el servidor")
              );
            },
          });
        },
        //FIN Método para cambiar el estado del valor seleccionado

        // 6. Cancelar y limpiar
        // Métodos para cancelar la edición o adición de valores
        onCancelEdit: function () {
          if (this._oEditDialog) {
            this._oEditDialog.close();
          }
          this._cleanModels();
        },
        onCancelValues: function () {
          if (this._oAddDialog) {
            this._oAddDialog.close();
          }
          this._cleanModels();
        },

        // Método para limpiar los modelos y resetear la vista------------------------
        _cleanModels: function () {
          // Limpiar modelo de valores seleccionados
          this.getView()
            .getModel("newValueModel")
            .setData({
              VALUEID: "",
              VALUE: "",
              VALUEPAID: "",
              ALIAS: "",
              IMAGE: "",
              DESCRIPTION: "",
              DETAIL_ROW: {
                ACTIVED: true,
                DELETED: false,
              },
            });

          // Limpiar modelo de añadir valores (si existe)
          if (this.getView().getModel("addValueModel")) {
            this.getView()
              .getModel("addValueModel")
              .setData({
                VALUEID: "",
                VALUE: "",
                VALUEPAID: "",
                ALIAS: "",
                IMAGE: "",
                DESCRIPTION: "",
                DETAIL_ROW: {
                  ACTIVED: true,
                  DELETED: false,
                },
              });
          }

          // Resetear selección
          this.getView()
            .getModel("values")
            .setProperty("/selectedValueIn", null);

          // Deseleccionar items en la tabla
          var oTable = this.byId("valuesTable");
          if (oTable) {
            oTable.removeSelections();
          }
        },

        // //-----comentado
        //         _loadValuesByLabel: function(sLabelID) {
        //     var oView = this.getView();
        //     $.ajax({
        //         url: "http://localhost:3033/api/sec/valuesCRUD?procedure=get&labelID=" + encodeURIComponent(sLabelID),
        //         method: "GET",
        //         success: function(data) {
        //             oView.getModel("values").setProperty("/values", data.value || []);
        //         }.bind(this),
        //         error: function(error) {
        //             MessageToast.show("Error al cargar valores");
        //             console.error("Error loading values:", error);
        //         }
        //     });
        // },
      }
    );
  }
);
