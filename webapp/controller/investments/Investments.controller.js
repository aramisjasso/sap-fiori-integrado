sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/core/format/DateFormat",
  "sap/m/MessageBox",
  "sap/viz/ui5/controls/VizFrame",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem"
], function(Controller, JSONModel, MessageToast, DateFormat, MessageBox, VizFrame, FlattenedDataset, FeedItem) {
  "use strict";

  return Controller.extend("com.invertions.sapfiorimodinv.controller.investments.Investments", {
    // Variables de clase
    _oResourceBundle: null,
    _sSidebarOriginalSize: "380px",

    // CONSTANTES
    _CONSTANTS: {
      DEFAULT_BALANCE: 1000,
      DEFAULT_STOCK: 1,
      DEFAULT_SHORT_SMA: 50,
      DEFAULT_LONG_SMA: 200,
      //API_ENDPOINT: "http://localhost:3033/api/inv/simulation?strategy=macrossover",
      ENDPOINT_TEST: "http://localhost:3033/api/inv/getSimulation?id=TSLA_2025-05-21_02-29-47-664Z"
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
      this.getView().setModel(new JSONModel({
        symbols: [
          { symbol: "TSLA", name: "Tesla" },
          { symbol: "AAPL", name: "Apple" },
          { symbol: "MSFT", name: "Microsoft" }
        ]
      }), "symbolModel");

      // Modelo para datos de precios
      this.getView().setModel(new JSONModel({ value: [] }), "priceData");

      // Modelo de vista
      this.getView().setModel(new JSONModel({
        selectedTab: "table"
      }), "viewModel");

      // Modelo de análisis de estrategia
      this.getView().setModel(new JSONModel({
        balance: this._CONSTANTS.DEFAULT_BALANCE,
        stock: this._CONSTANTS.DEFAULT_STOCK,
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
        hasResults: false,
        chart_data: [],
        signals: [],
        result: null,

      }), "strategyResultModel");

          // Modelo historial de inversiones
    this.getView().setModel(new JSONModel({strategies: [{
                date: new Date(2024, 4, 15),  // Mayo 15, 2024
                strategyName: "Moving Average Crossover 1",
                symbol: "AAPL",
                result: 2500.50,
                status: "Completado"
            },
            {
                date: new Date(2024, 4, 16),  // Mayo 16, 2024
                strategyName: "Moving Average Crossover 2",
                symbol: "TSLA",
                result: -1200.30,
                status: "Completado"
            },
            {
                date: new Date(2024, 4, 17),  // Mayo 17, 2024
                strategyName: "Moving Average Crossover 3",
                symbol: "MSFT",
                result: 3400.80,
                status: "En Proceso"
            }]}), "historyModel");
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

    onRunAnalysisPress: function() {
      var oView = this.getView();
      var oStrategyModel = oView.getModel("strategyAnalysisModel");
      var oResultModel = oView.getModel("strategyResultModel");
      var sSymbol = oView.byId("symbolSelector").getSelectedKey();

      // Validaciones
      if (!this._validateAnalysisInputs(oStrategyModel, sSymbol)) return;

      // Configurar y llamar API
      this._callAnalysisAPI(sSymbol, oStrategyModel, oResultModel);
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

    _callAnalysisAPI: function(sSymbol, oStrategyModel, oResultModel) {
      /*var oRequestBody = {
        symbol: sSymbol,
        startDate: this._formatDate(oStrategyModel.getProperty("/startDate")),
        endDate: this._formatDate(oStrategyModel.getProperty("/endDate")),
        amount: this._CONSTANTS.DEFAULT_BALANCE,
        userId: "ARAMIS",
        specs: `SHORT:${oStrategyModel.getProperty("/shortSMA")}&LONG:${oStrategyModel.getProperty("/longSMA")}`
      };*/
      // TEST
      var oRequestBody = {
        idUser: "ARAMIS"
      };
      //fetch(this._CONSTANTS.API_ENDPOINT, {
      //TEST
      fetch(this._CONSTANTS.ENDPOINT_TEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(oRequestBody)
      })
      .then(response => response.ok ? response.json() : Promise.reject(response))
      //.then(data => this._handleAnalysisResponse(data.value, oStrategyModel, oResultModel))
      // TEST
      .then(data => this._handleAnalysisResponse(data.value[0], oStrategyModel, oResultModel))
      .catch(error => {
        console.error("Error:", error);
        MessageBox.error("Error al obtener datos de simulación");
      });
    },

    _handleAnalysisResponse: function(data, oStrategyModel, oResultModel) {
        console.log("Datos para la gráfica:", data.chart_data);
         console.log("Señales:", data.signals);
        
        // Actualizar modelo de resultados
        oResultModel.setData({
            hasResults: true,
            chart_data: this._prepareTableData(
                data.chart_data || [],
                data.signals || [],
                data.transactions || []
            ),
            signals: data.signals || [],
            result: data.result || 0,
            simulationName: "Moving Average Crossover",
            symbol: oStrategyModel.getProperty("/symbol"),
            startDate: oStrategyModel.getProperty("/startDate"),
            endDate: oStrategyModel.getProperty("/endDate")
        });

        // Actualizar balance
        var currentBalance = oStrategyModel.getProperty("/balance") || 0;
        var gainPerShare = data.result || 0;
        var stock = oStrategyModel.getProperty("/stock") || 1;
        var totalGain = +(gainPerShare * stock).toFixed(2);
        
        oStrategyModel.setProperty("/balance", currentBalance + totalGain);
        MessageToast.show(`Se añadieron $${totalGain} a tu balance.`);
    },

    _prepareTableData: function(aData, aSignals, aTransactions) {
        if (!Array.isArray(aData)) return [];
        
        const oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
        let currentShares = 0; // Rastrea las acciones en tiempo real
        
        return aData.map(oItem => {
            const oDate = oItem.date instanceof Date ? oItem.date : new Date(oItem.date);
            const sDateKey = oDate.toISOString(); // Para comparar fechas
            
            // Buscar señal correspondiente a esta fecha
            const oSignal = aSignals.find(s => 
                new Date(s.date).toISOString() === sDateKey
            );
            
            // Buscar transacción correspondiente
            const oTransaction = aTransactions.find(t => 
                new Date(t.date).toISOString() === sDateKey
            );

            // Actualizar el acumulado de acciones
            if (oTransaction) {
                currentShares = oTransaction.type === 'buy' 
                    ? oTransaction.shares // Compra: establece nuevas acciones
                    : 0; // Venta: liquidamos todo (ajusta si hay ventas parciales)
            }
            
            return {
                DATE: oDateFormat.format(oDate),
                DATE_GRAPH: oDate,
                OPEN: oItem.open,
                HIGH: oItem.high,
                LOW: oItem.low,
                CLOSE: oItem.close,
                VOLUME: oItem.volume,
                SHORT_MA: oItem.short_ma,
                LONG_MA: oItem.long_ma,
                INDICATORS: `MA(${oItem.short_ma?.toFixed(2)}/${oItem.long_ma?.toFixed(2)})`,
                SIGNALS: oSignal?.type?.toUpperCase() || "-", // "BUY", "SELL" o vacío
                RULES: oSignal?.reasoning || "-",
                SHARES: currentShares.toFixed(4),  // Muestra el acumulado diario
                BUY_SIGNAL: oSignal?.type === 'buy' ? oItem.close : null,
                SELL_SIGNAL: oSignal?.type === 'sell' ? oItem.close : null,
                
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


    //Historial de inversiones
    onHistoryPress: function(oEvent) {
      if (!this._oHistoryPopover) {
          this._oHistoryPopover = sap.ui.xmlfragment(
              "com.invertions.sapfiorimodinv.view.investments.fragments.InvestmentHistoryPanel",
              this
          );
          this.getView().addDependent(this._oHistoryPopover);
      }
      
      if (this._oHistoryPopover.isOpen()) {
          this._oHistoryPopover.close();
          return;
      }
      
      // Abrir la ventana
      this._oHistoryPopover.openBy(oEvent.getSource());
  },


    onLoadStrategy: function(oEvent) {
        var oItem = oEvent.getSource().getBindingContext("historyModel").getObject();
        
        // Cargar la estrategia seleccionada
        var oStrategyModel = this.getView().getModel("strategyAnalysisModel");
        var oResultModel = this.getView().getModel("strategyResultModel");
        
        // Restaurar configuración
        oStrategyModel.setProperty("/symbol", oItem.symbol);
        oStrategyModel.setProperty("/shortSMA", oItem.shortSMA);
        oStrategyModel.setProperty("/longSMA", oItem.longSMA);
        
        // Restaurar datos
        oResultModel.setProperty("/chart_data", oItem.chartData);
        oResultModel.setProperty("/signals", oItem.signals);
        
        // Cerrar diálogo y mostrar mensaje
        this._oHistoryPopover.close();
        MessageToast.show("Estrategia cargada correctamente");
    },

    //Cerrar la ventana
    onCloseHistoryPopover: function() {
        if (this._oHistoryPopover) {
            this._oHistoryPopover.close();
        }
    },

    onDataPointSelect: function(oEvent) {
      const oData = oEvent.getParameter("data");
      if (!oData || oData.length === 0) return;

      const oSelectedData = oData[0];
      if (oSelectedData.data.DATE && oSelectedData.data.CLOSE !== undefined) {
        this.getView().getModel("viewModel").setProperty("/selectedPoint", {
          DATE: oSelectedData.data.DATE,
          CLOSE: oSelectedData.data.CLOSE
        });
      }
    },

    onExit: function() {
        if (this._oHistoryPopover) {
            this._oHistoryPopover.destroy();
            this._oHistoryPopover = null;
        }
    },
  });
});