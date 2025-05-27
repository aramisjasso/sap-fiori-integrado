sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/core/format/DateFormat",
  "sap/m/MessageBox",
  "sap/viz/ui5/controls/VizFrame",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/format/NumberFormat"
], function(Controller, JSONModel, MessageToast, DateFormat, MessageBox, VizFrame, FlattenedDataset, FeedItem, Filter, FilterOperator, NumberFormat) {
  "use strict";

  return Controller.extend("com.invertions.sapfiorimodinv.controller.investments.Investments", {
    // Variables de clase
    _oResourceBundle: null,
    _sSidebarOriginalSize: "380px",

    // CONSTANTES
    _CONSTANTS: {
      DEFAULT_BALANCE: 1000,
      DEFAULT_AMOUNT: 100,
      DEFAULT_SHORT_SMA: 50,
      DEFAULT_LONG_SMA: 200,
      URL_SIMULATION: "http://localhost:3033/api/inv/simulation?strategy=macrossover",
      URL_GETSIMULATION: "http://localhost:3033/api/inv/getSimulation?id=MSFT_2025-05-25_05-11-07-449Z"
    },

    onInit: function() {
      this._initModels();
      this._setDefaultDates();
      this._loadI18nTexts();
      this._setupViewDelegates();
    },

    // Inicialización de modelos
    _initModels: function() {
        // Modelo de símbolos
        const oSymbolsModel = new JSONModel();
        oSymbolsModel.loadData("/model/symbols.json");
        this.getView().setModel(oSymbolsModel, "symbolModel");


      // Modelo para datos de precios
      this.getView().setModel(new JSONModel({ value: [] }), "priceData");

      // Modelo de vista
      this.getView().setModel(new JSONModel({
        selectedTab: "table",
        analysisPanelExpanded: true,
        resultPanelExpanded: false
      }), "viewModel");

      // Modelo de análisis de estrategia
      this.getView().setModel(new JSONModel({
        balance: this._CONSTANTS.DEFAULT_BALANCE,
        amount: this._CONSTANTS.DEFAULT_AMOUNT,
        strategyKey: "",
        longSMA: this._CONSTANTS.DEFAULT_LONG_SMA,
        shortSMA: this._CONSTANTS.DEFAULT_SHORT_SMA,
        startDate: null,
        endDate: null,
        controlsVisible: false,
        strategies: []
      }), "strategyAnalysisModel");

      
      // Modelo de resultados
      this.getView().setModel(new JSONModel({
        isLoading: false,
        hasResults: false,
        chart_data: [],
        signals: [],
        result: null,
        symbol: "",

      }), "strategyResultModel");


      // Inicializar modelo con estructura vacía
      const oHistoryModel = new JSONModel({
          strategies: [],       // Aquí irán las estrategias dinámicas
          filteredCount: 0,    
          selectedCount: 0,
          isDeleteMode: false,
          selectedItem: null,    
          filters: {
              dateRange: null,
              investmentRange: [0, 10000],
              profitRange: [-100, 100]
          }
      });
      
      this.getView().setModel(oHistoryModel, "historyModel");
      this._oSelectedStrategy = null;
    },

    // Carga textos i18n
    _loadI18nTexts: function() {
      var oI18nModel = this.getOwnerComponent().getModel("i18n");
      if (!oI18nModel) {
        console.error("Modelo i18n no encontrado");
        return;
      }

      try {
        this._oResourceBundle = oI18nModel.getResourceBundle();
        this.getView().getModel("strategyAnalysisModel").setProperty("/strategies", [
          { key: "", text: this._oResourceBundle.getText("selectStrategyPlaceholder") },
          { key: "MACrossover", text: this._oResourceBundle.getText("movingAverageCrossoverStrategy") }
        ]);
      } catch (error) {
        console.error("Error al cargar ResourceBundle:", error);
      }
    },

    onSymbolChange: function(oEvent) {
        let sSymbol;
        const oSelectedItem = oEvent.getParameter("selectedItem");
        
        // Handle both selection and manual input
        if (oSelectedItem) {
            sSymbol = oSelectedItem.getKey();
        } else {
            sSymbol = oEvent.getSource().getValue();
        }

        if (!sSymbol) {
            return; // Exit if no symbol
        }

        const oResultModel = this.getView().getModel("strategyResultModel");
        
        // Clear previous data
        oResultModel.setData({
            isLoading: false,
            hasResults: false,
            chart_data: [],
            signals: [],
            result: null,
            symbol: sSymbol
        });

        // Load price history for selected symbol
        this._loadPriceHistory(sSymbol);
    },

    _loadPriceHistory: async function(sSymbol) {
        try {
            const TESTING_SYMBOL = sSymbol; 
            
            const response = await fetch(`http://localhost:3033/api/inv/pricehistory`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error("Error al obtener historial de precios");
            }

            const data = await response.json();
            
            const chartData = data.value.map(item => ({
                DATE_GRAPH: new Date(item.DATE),
                CLOSE: item.CLOSE
            }));

            const oResultModel = this.getView().getModel("strategyResultModel");
            oResultModel.setProperty("/chart_data", chartData);
            oResultModel.setProperty("/symbol", TESTING_SYMBOL); // Usar símbolo de prueba
            
        } catch (error) {
            console.error("Error:", error);
            MessageToast.show("Error al cargar historial de precios");
        }
    },


    // Configurar delegados de vista
    _setupViewDelegates: function() {
      this.getView().addEventDelegate({
        onAfterRendering: this._onViewAfterRendering.bind(this)
      });
    },

    // Configurar gráfico
    _onViewAfterRendering: function() {
    const oVizFrame = this.byId("idVizFrame");
    if (!oVizFrame) return;

    oVizFrame.setVizProperties({
        plotArea: { 
            dataShape: { 
                primaryAxis: ["line", "line", "line", "point", "point"]
            },
            colorPalette: ["#0074D9", "#FFDC00", "#FFA500", "#2ecc40", "#ff4136"],
            dataLabel: { visible: false },
            marker: {
                visible: true,
                forceVisible: true,
                shape: ["circle", "circle", "circle", "triangleUp", "triangleDown"],
                size: 5,
            },
          
            window: {
                start: "firstDataPoint",
                end: "lastDataPoint"
            },
            handleNull: "zero"
        },
        valueAxis: { 
            title: { text: "Precio de Cierre (USD)" }, 
            visible: true 
        },
        timeAxis: {
            title: { text: "Fecha" },
            levels: ["day", "month", "year"],
            label: { formatString: "dd/MM/yy" }
        },
        title: { text: "Histórico de Precios de Acciones" },
        legend: { visible: true },
        tooltip: {
            visible: true,
        },
        interaction: {
            behaviorType : null,
            zoom: { enablement: "enabled" },
            selectability: { mode: "single" }
        }
    });
  },

    // Métodos de fecha
    _setDefaultDates: function() {
      var oModel = this.getView().getModel("strategyAnalysisModel");
      var oToday = new Date();
      var oStartDate = new Date(oToday);
      oStartDate.setMonth(oStartDate.getMonth() - 6);
      
      oModel.setProperty("/endDate", new Date(oToday));
      oModel.setProperty("/startDate", new Date(oStartDate));
    },

    _formatDate: function(oDate) {
      return oDate ? DateFormat.getDateInstance({pattern: "yyyy-MM-dd"}).format(oDate) : null;
    },

    // Event Handlers
    onTabSelect: function(oEvent) {
      var sKey = oEvent.getParameter("key");
      this.getView().getModel("viewModel").setProperty("/selectedTab", sKey);
    },

    onStrategyChange: function(oEvent) {
      var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
      this.getView().getModel("strategyAnalysisModel").setProperty("/controlsVisible", !!sSelectedKey);
    },

    onRunAnalysisPress: async function() {
        var oView = this.getView();
        var oStrategyModel = oView.getModel("strategyAnalysisModel");
        var oResultModel = oView.getModel("strategyResultModel");
        var sSymbol = oView.byId("symbolSelector").getSelectedKey();

        // Validaciones
        if (!this._validateAnalysisInputs(oStrategyModel, sSymbol)) return;

        const oViewModel = this.getView().getModel("viewModel");
        oViewModel.setProperty("/analysisPanelExpanded", false);
        oViewModel.setProperty("/resultPanelExpanded", true);
        
        oResultModel.setProperty("/isLoading", true);
        oResultModel.setProperty("/hasResults", false);

        try {
            await this._callAnalysisAPISimulation(sSymbol, oStrategyModel, oResultModel);
        } catch (error) {
            MessageBox.error("Error al procesar la simulación");
            oViewModel.setProperty("/analysisPanelExpanded", true);
            oViewModel.setProperty("/resultPanelExpanded", false);
        } finally {
            
        }


    },

    _validateAnalysisInputs: function(oStrategyModel, sSymbol) {
      if (!oStrategyModel.getProperty("/strategyKey")) {
        MessageBox.warning("Seleccione una estrategia");
        return false;
      }
      if (!sSymbol) {
        MessageBox.warning("Seleccione un símbolo (ej: AAPL)");
        return false;
      }
      return true;
    },

    _callAnalysisAPISimulation: async function(sSymbol, oStrategyModel, oResultModel) {
      var oRequestBody = {
        "SIMULATION": {
            "SYMBOL": sSymbol,
            "STARTDATE": this._formatDate(oStrategyModel.getProperty("/startDate")), 
            "ENDDATE": this._formatDate(oStrategyModel.getProperty("/endDate")),  
            "AMOUNT": oStrategyModel.getProperty("/amount"),
            "USERID": "ARAMIS",
            "SPECS": [
                {
                    "INDICATOR": "SHORT_MA",
                    "VALUE": oStrategyModel.getProperty("/shortSMA")
                },
                {
                    "INDICATOR": "LONG_MA",
                    "VALUE": oStrategyModel.getProperty("/longSMA")
                }
            ]
        }
    };
      try {
        const response = await fetch(this._CONSTANTS.URL_SIMULATION, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(oRequestBody)
        });

        if (!response.ok) {
            throw new Error("Error en la respuesta del servidor");
        }

        const data = await response.json();
        await this._handleAnalysisResponse(data.value[0], oStrategyModel, oResultModel);
        
        // Quitar el loading solo después de procesar los datos
        oResultModel.setProperty("/isLoading", false);
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
    },

    _handleAnalysisResponse: function(data, oStrategyModel, oResultModel) {
        // console.log("Datos para la gráfica:", data.CHART_DATA);
        // console.log("Señales:", data.SIGNALS);
        
        // Actualizar modelo de resultados
        oResultModel.setData({
            hasResults: true,
            chart_data: this._prepareTableData(
                data.CHART_DATA || [],
                data.SIGNALS || []
            ),
            signals: data.SIGNALS || [],
            result: data.SUMMARY?.REAL_PROFIT || 0,
            simulationName: "Moving Average Crossover",
            symbol: data.SYMBOL,
            startDate: oStrategyModel.getProperty("/startDate"),
            endDate: oStrategyModel.getProperty("/endDate"),
            TOTAL_BOUGHT_UNITS: data.SUMMARY?.TOTAL_BOUGHT_UNITS || 0,
            TOTAL_SOLD_UNITS: data.SUMMARY?.TOTAL_SOLD_UNITS || 0,
            REMAINING_UNITS: data.SUMMARY?.REMAINING_UNITS || 0,
            FINAL_CASH: data.SUMMARY?.FINAL_CASH || 0,
            FINAL_VALUE: data.SUMMARY?.FINAL_VALUE || 0,
            FINAL_BALANCE: data.SUMMARY?.FINAL_BALANCE || 0,
            REAL_PROFIT: data.SUMMARY?.REAL_PROFIT || 0,
            PERCENTAGE_RETURN: data.SUMMARY?.PERCENTAGE_RETURN || 0
        });

        // Actualizar balance
        // var currentBalance = oStrategyModel.getProperty("/balance") || 0;
        // var gainPerShare = data.result || 0;
        // var stock = oStrategyModel.getProperty("/stock") || 1;
        // var totalGain = +(gainPerShare * stock).toFixed(2);
        
        // oStrategyModel.setProperty("/balance", currentBalance + totalGain);
        // MessageToast.show(`Se añadieron $${totalGain} a tu balance.`);
    },

  _prepareTableData: function(aData, aSignals) {
      if (!Array.isArray(aData)) return [];
      
      const oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
      let currentShares = 0; // Rastrea las acciones en tiempo real
      
      return aData.map(oItem => {
          // Ajuste para el nuevo formato de fecha (ya viene como string "YYYY-MM-DD")
          const oDate = typeof oItem.DATE === 'string' 
              ? new Date(oItem.DATE) 
              : (oItem.DATE instanceof Date ? oItem.DATE : new Date(oItem.date));
          
          const sDateKey = oDate.toISOString().split('T')[0]; // Para comparar fechas en formato YYYY-MM-DD
          
          // Buscar señal correspondiente a esta fecha (ahora SIGNALS viene en el formato nuevo)
          const oSignal = aSignals.find(s => s.DATE === sDateKey);

          // Obtener valores de los indicadores del nuevo formato
          const shortMA = oItem.INDICATORS?.find(i => i.INDICATOR === 'short_ma')?.VALUE;
          const longMA = oItem.INDICATORS?.find(i => i.INDICATOR === 'long_ma')?.VALUE;

          // Actualizar el acumulado de acciones (usando el nuevo formato de señales)
          if (oSignal) {
              currentShares = oSignal.SHARES || 0;
          }
          
          return {
              DATE: oDateFormat.format(oDate),
              DATE_GRAPH: oDate,
              OPEN: oItem.OPEN,
              HIGH: oItem.HIGH,
              LOW: oItem.LOW,
              CLOSE: oItem.CLOSE,
              VOLUME: oItem.VOLUME,
              SHORT_MA: shortMA,
              LONG_MA: longMA,
              INDICATORS: shortMA && longMA 
                  ? `MA(${shortMA.toFixed(2)}/${longMA.toFixed(2)})` 
                  : "-",
              SIGNALS: oSignal?.TYPE?.toUpperCase() || "-", // "BUY", "SELL" o vacío
              RULES: oSignal?.REASONING || "-",
              SHARES: currentShares.toFixed(4),  // Muestra el acumulado diario
              BUY_SIGNAL: oSignal?.TYPE?.toLowerCase() === 'buy' ? oItem.CLOSE : null,
              SELL_SIGNAL: oSignal?.TYPE?.toLowerCase() === 'sell' ? oItem.CLOSE : null,
          };
      });
  },

    onRefreshChart: function() {
      var oSymbolModel = this.getView().getModel("symbolModel");
      var sCurrentSymbol = oSymbolModel.getProperty("/selectedSymbol") || 
                         (oSymbolModel.getProperty("/symbols")[0]?.symbol);

      if (sCurrentSymbol) {
        this._loadPriceData(sCurrentSymbol);
      } else {
        MessageToast.show("Por favor, seleccione un símbolo.");
      }
    },

    formatDateRange: function(sStartDate, sEndDate) {
        if (!sStartDate || !sEndDate) return "";
        
        const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
            pattern: "dd/MM/yyyy"
        });
        
        const oStartDate = new Date(sStartDate);
        const oEndDate = new Date(sEndDate);
        
        return oDateFormat.format(oStartDate) + " - " + oDateFormat.format(oEndDate);
    },

    formatDate: function(oDate) {
        if (!oDate) return "";
        return DateFormat.getDateInstance({
            pattern: "dd/MM/yyyy"
        }).format(new Date(oDate));
    },

    formatSignalCount: function(aSignals, sType) {
        if (!Array.isArray(aSignals)) return "0";
        return aSignals.filter(s => s.type === sType).length.toString();
    },

    formatStopLossCount: function(aSignals) {
        if (!Array.isArray(aSignals)) return "0";
        return aSignals.filter(s => s.isStopLoss === true).length.toString();
    },

    formatSignalState: function(sType) {
        return sType === 'buy' ? 'Success' : 'Error';
    },

    formatCurrency: function(value) {
        if (!value) return "$0.00";
        return `$${parseFloat(value).toFixed(2)}`;
    },

    formatSignalPrice: function(value) {
        if (!value) return "";
        return `$${parseFloat(value).toFixed(2)}`;
    },

    // Historial de inversiones
    onHistoryPress: function(oEvent) {
        // 1. Crear popover como lo tenías originalmente
        if (!this._oHistoryPopover) {
            this._oHistoryPopover = sap.ui.xmlfragment(
                "com.invertions.sapfiorimodinv.view.investments.fragments.InvestmentHistoryPanel",
                this
            );
            this.getView().addDependent(this._oHistoryPopover);
            
            // SOLO ESTO ES NUEVO: Guardar referencia a la tabla
            this._oHistoryTable = this._oHistoryPopover.getContent()[0].getContent()[3]; 
            // Ajusta el índice según la posición real de tu tabla en el fragmento
        }
        
        // 2. Cerrar si ya está abierto (igual que tu versión)
        if (this._oHistoryPopover.isOpen()) {
            this._oHistoryPopover.close();
            return;
        }
        
        // 3. Abrir popover (igual que tu versión)
        this._oHistoryPopover.openBy(oEvent.getSource());
        
        // 4. Cargar datos (esto lo moví después de abrir el popover)
        this._loadHistoryData().catch(error => {
            console.error("Error cargando datos:", error);
            sap.m.MessageBox.error("Error al cargar historial");
        });
    },

    // Función separada para cargar datos (mejor organizado)
    _loadHistoryData: async function() {
        sap.ui.core.BusyIndicator.show(0);
        
        try {
            const USERID = "ARAMIS";
            const response = await fetch("http://localhost:3033/api/inv/getSimulation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ USERID })
            });
            
            if (!response.ok) throw new Error("Error en respuesta");
            
            const data = await response.json();

            console.log(data)
            
            const transformedData = data.value.map(simulation => ({
                date: new Date(simulation.STARTDATE),
                strategyName: simulation.SIMULATIONNAME,
                symbol: simulation.SYMBOL,
                result: simulation.SUMMARY?.REAL_PROFIT || 0,
                rentability: simulation.SUMMARY?.PERCENTAGE_RETURN,
                initialAmount: simulation.AMOUNT,
                status: "Completado",
                details: simulation,
                strategyType: simulation.STRATEGY,

            }));
            
            this.getView().setModel(new JSONModel({
                strategies: transformedData,
                filteredCount: transformedData.length,    
                selectedCount: 0,
                isDeleteMode: false,    
                filters: {            
                    dateRange: null,
                    investmentRange: [0, 10000],
                    profitRange: [-100, 100]
                }
            }), "historyModel");

            const oDateRange = sap.ui.getCore().byId("dateRangeFilter");
            const oInvestmentRange = sap.ui.getCore().byId("investmentRangeFilter");
            const oProfitRange = sap.ui.getCore().byId("profitRangeFilter");
            
            if (oDateRange) oDateRange.setValue(null);
            if (oInvestmentRange) oInvestmentRange.setRange([0, 10000]);
            if (oProfitRange) oProfitRange.setRange([-100, 100]);
            
        } finally {
            sap.ui.core.BusyIndicator.hide();
        }
    },

   onSelectionChange: function(oEvent) {
        const oModel = this.getView().getModel("historyModel");
        const bDeleteMode = oModel.getProperty("/isDeleteMode");
        const oTable = oEvent.getSource();
        
        if (bDeleteMode) {
            // Modo eliminación: contar todas las selecciones
            const aSelectedItems = oTable.getSelectedItems();
            oModel.setProperty("/selectedCount", aSelectedItems.length);
        } else {
            // Modo carga: solo una selección
            const oItem = oEvent.getParameter("listItem");
            const bSelected = oEvent.getParameter("selected");
            
            oModel.setProperty("/selectedCount", bSelected ? 1 : 0);
            this._oSelectedStrategy = bSelected ? 
                oItem.getBindingContext("historyModel").getObject() : 
                null;
        }

            // Actualizar el modelo con el ítem seleccionado
            const oSelectedItem = oEvent.getParameter("listItem");
            this.getView().getModel("historyModel").setProperty("/selectedItem", 
                oSelectedItem ? oSelectedItem.getBindingContext("historyModel").getObject() : null);
    },

    onLoadStrategy: async function() {
        try {
            if (!this._oSelectedStrategy) {
                sap.m.MessageToast.show("Selecciona una estrategia primero");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);
            
            // 1. Obtener datos
            const sSimulationId = this._oSelectedStrategy.details.SIMULATIONID;
            const simulationDetail = await this._loadSimulationDetails(sSimulationId);
            
            // 2. Actualizar modelos
            const oStrategyModel = this.getView().getModel("strategyAnalysisModel");
            const oResultModel = this.getView().getModel("strategyResultModel");
            
            this._updateModelsWithSimulationData({
                simulationDetail,
                oStrategyModel,
                oResultModel,
                oItem: this._oSelectedStrategy
            });
            
            // 4. Cerrar y feedback
            this._oHistoryPopover.close();
            sap.m.MessageToast.show(`Estrategia ${simulationDetail.SIMULATIONNAME} cargada`);
            
        } catch (error) {
            console.error("Error:", error);
            sap.m.MessageBox.error("Error al cargar la estrategia");
        } finally {
            sap.ui.core.BusyIndicator.hide();
        }
    },

    // Función auxiliar para cargar detalles
    _loadSimulationDetails: async function(sSimulationId) {
        const response = await fetch(`http://localhost:3033/api/inv/getSimulation?id=${sSimulationId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ USERID: "ARAMIS" })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data.value?.[0] || {};
    },

    // Función para actualizar modelos
    _updateModelsWithSimulationData: function({ simulationDetail, oStrategyModel, oResultModel, oItem }) {
         // Actualizar el ComboBox de símbolo
        const oSymbolSelector = this.byId("symbolSelector");
        if (oSymbolSelector) {
            oSymbolSelector.setSelectedKey(simulationDetail.SYMBOL);
        }
        // Datos para strategyAnalysisModel
        oStrategyModel.setData({
            ...oStrategyModel.getData(),
            symbol: simulationDetail.SYMBOL,
            strategyKey: "MACrossover", // O el valor que corresponda
            balance: this._CONSTANTS.DEFAULT_BALANCE,
            startDate: new Date(simulationDetail.STARTDATE),
            endDate: new Date(simulationDetail.ENDDATE),
            controlsVisible: true // Mostrar los controles de la estrategia
        });
        
        // Extracción dinámica de SPECS
        const specsMap = {};
        (simulationDetail.SPECS || []).forEach(spec => {
            specsMap[spec.INDICATOR] = spec.VALUE;
        });
        
        oStrategyModel.setProperty("/shortSMA", specsMap.SHORT_MA);
        oStrategyModel.setProperty("/longSMA", specsMap.LONG_MA);
        
        // Datos para strategyResultModel
        oResultModel.setData({
            hasResults: true,
            chart_data: this._prepareTableData(
                simulationDetail.CHART_DATA || [],
                simulationDetail.SIGNALS || []
            ),
            signals: simulationDetail.SIGNALS || [],
            simulationName: simulationDetail.SIMULATIONNAME,
            startDate: new Date(simulationDetail.STARTDATE), // Convertir a Date
            endDate: new Date(simulationDetail.ENDDATE),     // Convertir a Date
            TOTAL_BOUGHT_UNITS: simulationDetail.SUMMARY?.TOTAL_BOUGHT_UNITS || 0,
            TOTAL_SOLD_UNITS: simulationDetail.SUMMARY?.TOTAL_SOLD_UNITS || 0,
            REMAINING_UNITS: simulationDetail.SUMMARY?.REMAINING_UNITS || 0,
            FINAL_CASH: simulationDetail.SUMMARY?.FINAL_CASH || 0,
            FINAL_VALUE: simulationDetail.SUMMARY?.FINAL_VALUE || 0,
            FINAL_BALANCE: simulationDetail.SUMMARY?.FINAL_BALANCE || 0,
            REAL_PROFIT: simulationDetail.SUMMARY?.REAL_PROFIT || 0,
            PERCENTAGE_RETURN: simulationDetail.SUMMARY?.PERCENTAGE_RETURN || 0,
            originalData: simulationDetail // Guardar copia completa por si se necesita
        });
        
        // Actualizar historial si es necesario
        if (oItem) {
            oItem.lastLoaded = new Date().toISOString(); // Marcar última carga
        }
    },

    //Cerrar la ventana
    onCloseHistoryPopover: function() {
        if (this._oHistoryPopover) {
            this._oHistoryPopover.close();
        }
    },

    onToggleDeleteMode: function(oEvent) {
        const oModel = this.getView().getModel("historyModel");
        const bDeleteMode = oEvent.getParameter("pressed");
        
        oModel.setProperty("/isDeleteMode", bDeleteMode);
        
        // Limpiar selecciones al cambiar de modo
        const oTable = sap.ui.getCore().byId("historyTable");
        oTable.removeSelections(true);
        oModel.setProperty("/selectedCount", 0);
        this._oSelectedStrategy = null;
    },

onDeleteSelected: function() {
    const oTable = sap.ui.getCore().byId("historyTable"); // Mejor usa this.byId() en lugar de sap.ui.getCore().byId()
    const aSelectedItems = oTable.getSelectedItems();
    
    if (!aSelectedItems.length) {
        MessageToast.show("Selecciona al menos una simulación para eliminar");
        return;
    }

    const sMessage = aSelectedItems.length === 1 
        ? "¿Deseas eliminar la simulación seleccionada?" 
        : `¿Deseas eliminar las ${aSelectedItems.length} simulaciones seleccionadas?`;

    MessageBox.confirm(sMessage, {
        title: "Confirmar eliminación",
        onClose: async function(oAction) {
            if (oAction === MessageBox.Action.OK) {
                try {
                    sap.ui.core.BusyIndicator.show(0);
                    
                    // Obtener todos los IDs seleccionados
                    const aSimulationIds = aSelectedItems.map(oItem => {
                        return oItem.getBindingContext("historyModel").getObject().details.SIMULATIONID;
                    });

                    // Llamar al endpoint de delete múltiple
                    const response = await fetch("http://localhost:3033/api/inv/deleteSimulations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userID: "ARAMIS",  // Hardcodeado como en tu ejemplo, pero idealmente usa el user real
                            simulationIDs: aSimulationIds
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "Error al eliminar las simulaciones");
                    }

                    // Recargar datos y actualizar UI
                    await this._loadHistoryData();
                    
                    // Mensaje de éxito personalizado
                    const sSuccessMessage = aSimulationIds.length === 1
                        ? "Simulación eliminada correctamente"
                        : `${aSimulationIds.length} simulaciones eliminadas correctamente`;
                    
                    MessageToast.show(sSuccessMessage);

                    // Resetear modo de eliminación
                    const oModel = this.getView().getModel("historyModel");
                    oModel.setProperty("/isDeleteMode", false);
                    oModel.setProperty("/selectedCount", 0);

                } catch (error) {
                    console.error("Error detallado:", error);
                    MessageBox.error(error.message || "Error al eliminar las simulaciones");
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            }
        }.bind(this)
    });
},

onStrategyNameClick: function(oEvent) {
    // Crear un Input temporal
    const oIdentifier = oEvent.getSource();
    const sCurrentValue = oIdentifier.getTitle();
    
    // Crear Input
    const oInput = new sap.m.Input({
        value: sCurrentValue,
        valueLiveUpdate: true,
        submit: function(oEvent) {
            const sNewValue = oEvent.getParameter("value");
            if (sNewValue && sNewValue.trim()) {
                oIdentifier.setTitle(sNewValue);
                // Aquí iría tu lógica de guardado
                this.onStrategyNameSubmit(oEvent);
            }
            oInput.destroy();
            oIdentifier.setVisible(true);
        }.bind(this)
    });

    // Ocultar identificador y mostrar input
    oIdentifier.setVisible(false);
    oInput.placeAt(oIdentifier.getParent().getId());
    oInput.focus();
},

onStrategyNameChange: function(oEvent) {
    const sNewValue = oEvent.getParameter("value");
    const oInput = oEvent.getSource();
    const sPath = oInput.getBindingContext("historyModel").getPath();
    
    // Optional: Add validation here if needed
    if (!sNewValue.trim()) {
        oInput.setValueState("Error");
        oInput.setValueStateText("El nombre no puede estar vacío");
        return;
    }
    
    oInput.setValueState("None");
},

onStrategyNameSubmit: async function(oEvent) {
    const oInput = oEvent.getSource();
    const sNewValue = oEvent.getParameter("value");
    const sPath = oInput.getBindingContext("historyModel").getPath();
    
    // Validar nombre vacío
    if (!sNewValue.trim()) {
        MessageToast.show("El nombre no puede estar vacío");
        return;
    }

    try {
        // Obtener el ID de simulación del contexto
        const oContext = oInput.getBindingContext("historyModel");
        const oData = oContext.getObject();
        const sSimulationId = oData.details.SIMULATIONID;

        // Mostrar indicador de carga
        sap.ui.core.BusyIndicator.show(0);

        // Llamar a la API
        const response = await fetch("http://localhost:3033/api/inv/updatesimulation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: sSimulationId,
                simulationName: sNewValue.trim()
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al actualizar el nombre");
        }

        // Actualizar modelo local
        this.getView().getModel("historyModel").setProperty(sPath + "/strategyName", sNewValue.trim());
        
        // Desactivar edición
        oInput.setEditable(false);
        oInput.setValueState("None");
        
        // Mostrar mensaje de éxito
        MessageToast.show("Nombre actualizado correctamente");

        // Opcional: Recargar datos para asegurar sincronización
        await this._loadHistoryData();

    } catch (error) {
        console.error("Error:", error);
        MessageBox.error(error.message || "Error al actualizar el nombre");
        oInput.setValueState("Error");
        oInput.setValueStateText(error.message || "Error al actualizar");
    } finally {
        sap.ui.core.BusyIndicator.hide();
    }
},

onEditSelected: function() {
    const oTable = sap.ui.getCore().byId("historyTable");
    const aSelectedItems = oTable.getSelectedItems();
    
    if (aSelectedItems.length !== 1) {
        MessageToast.show("Selecciona una estrategia para editar");
        return;
    }

    const aAllItems = oTable.getItems();
    aAllItems.forEach(item => {
        const oInput = item.getCells()[0];
        oInput.setEditable(false);
        oInput.setValueState("None");
    });

    const oSelectedItem = aSelectedItems[0];
    const oInput = oSelectedItem.getCells()[0]; // Get Input directly from cell
    
    // Hacer editable el input
    oInput.setEditable(true);
    
    // Dar foco y seleccionar texto
    setTimeout(() => {
        oInput.focus();
        oInput.selectText(0, oInput.getValue().length);
    }, 100);
},

onStrategyNameBlur: function(oEvent) {
    const oInput = oEvent.getSource();
    
    if (oInput.getEditable()) {
        const sNewValue = oInput.getValue();
        const oContext = oInput.getBindingContext("historyModel");
        const sOriginalValue = oContext.getObject().strategyName;
        
        if (sNewValue && sNewValue.trim()) {
            this.onStrategyNameSubmit(oEvent);
        } else {
            // Si está vacío, revertir al valor original del modelo
            oInput.setValue(sOriginalValue);
        }
        
        // Desactivar edición
        oInput.setEditable(false);
        oInput.setValueState("None");
    }
},

    // ******** FILTRO ********** //
    onToggleAdvancedFilters: function() {
        if (!this._oHistoryPopover) return;

        // Get panel directly from popover content
        const oPanel = sap.ui.getCore().byId("advancedFiltersPanel");
        
        if (oPanel) {
            oPanel.setVisible(!oPanel.getVisible());
        } else {
            console.warn("Advanced filters panel not found");
        }
    },

    _applyFilters: function() {
        const oTable = sap.ui.getCore().byId("historyTable");
        if (!oTable) return;
        
        const oBinding = oTable.getBinding("items");
        if (!oBinding) return;

        const aFilters = [];
        
        // 1. Filtro de búsqueda
        const sSearchValue = sap.ui.getCore().byId("searchField")?.getValue();
        if (sSearchValue) {
            aFilters.push(new Filter({
                filters: [
                    new Filter({
                        path: "strategyName",
                        operator: FilterOperator.Contains,
                        value1: sSearchValue
                    }),
                    new Filter({
                        path: "symbol",
                        operator: FilterOperator.Contains,
                        value1: sSearchValue.toUpperCase()
                    })
                ],
                and: false
            }));
        }
        
        // 2. Filtro de fechas
        const oDateRange = sap.ui.getCore().byId("dateRangeFilter");
        if (oDateRange?.getDateValue() && oDateRange?.getSecondDateValue()) {
            const oFilterStartDate = oDateRange.getDateValue();
            const oFilterEndDate = oDateRange.getSecondDateValue();
            
            aFilters.push(new Filter({
                test: function(oItem) {
                    const oStrategyStartDate = new Date(oItem.details.STARTDATE);
                    const oStrategyEndDate = new Date(oItem.details.ENDDATE);
                    
                    return oStrategyStartDate <= oFilterEndDate && 
                        oStrategyEndDate >= oFilterStartDate;
                }
            }));
        }
        
        
        // // 3. Filtro de inversión
        const oInvestmentRange = sap.ui.getCore().byId("investmentRangeFilter");
        if (oInvestmentRange) {
            const [minInv, maxInv] = oInvestmentRange.getRange();
            console.log("=== INICIO FILTRO INVERSIÓN ===");
            console.log("Rango seleccionado:", {min: minInv, max: maxInv});
            
            aFilters.push(new Filter({
                test: function(oItem) {
                    // Usar el monto inicial guardado
                    const amount = oItem.initialAmount;
                    
                    console.log("Evaluando estrategia:", {
                        name: oItem.strategyName,
                        montoInvertido: amount,
                        rango: `${minInv} a ${maxInv}`,
                        pasa: amount >= minInv && amount <= maxInv
                    });
                    
                    return amount >= minInv && amount <= maxInv;
                }
            }));
            console.log("=== FIN FILTRO INVERSIÓN ===");
        }
                
        //// 4. Filtro de rentabilidad
        const oProfitRange = sap.ui.getCore().byId("profitRangeFilter");
        if (oProfitRange) {
            const [minProfit, maxProfit] = oProfitRange.getRange();          
            aFilters.push(new Filter({
                test: function(oItem) {
                    const profitPercentage = oItem.rentability || 0;                  
                    return profitPercentage >= minProfit && profitPercentage <= maxProfit;
                }
            }));
        }
        
        // Aplicar todos los filtros juntos
        if (aFilters.length > 0) {
            oBinding.filter(new Filter({
                filters: aFilters,
                and: true
            }));
        } else {
            oBinding.filter(null);
        }
        
        // Actualizar contador
        const oModel = this.getView().getModel("historyModel");
        oModel.setProperty("/filteredCount", oBinding.getLength());
    },

    // Actualizar onSearch para que use _applyFilters
    onSearch: function(oEvent) {
        this._applyFilters();
    },

        onFilterChange: function() {
        this._applyFilters();
    },

    onExit: function() {
        if (this._oHistoryPopover) {
            this._oHistoryPopover.destroy();
            this._oHistoryPopover = null;
        }
    },

    formatNumber: function(value) {
        if (!value) return "0";
        
        const oNumberFormat = NumberFormat.getFloatInstance({
            maxFractionDigits: 2,
            minFractionDigits: 2,
            groupingEnabled: true
        });
        
        return oNumberFormat.format(value);
    },
  });
});