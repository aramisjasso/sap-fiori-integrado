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

    // CONSTANTES
    _CONSTANTS: {
    DEFAULT_BALANCE: 1000,
      DEFAULT_AMOUNT: 25,
      DEFAULT_SHORT_SMA: 50,
      DEFAULT_LONG_SMA: 200
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
        balance: sessionStorage.getItem("CAPITAL"),
        amount: this._CONSTANTS.DEFAULT_AMOUNT,
        strategyKey: "",
        // Parámetros para MACrossover
        longSMA: this._CONSTANTS.DEFAULT_LONG_SMA,
        shortSMA: this._CONSTANTS.DEFAULT_SHORT_SMA,
        // Parámetros para Reversión Simple
        rsi: 14,
        // Parámetros para Supertrend
        ma_length: 10,
        atr: 10,
        mult: 3.0,
        rr: 2.0,
        // Parámetros para Momentum
        long: this._CONSTANTS.DEFAULT_LONG_SMA,
        short: this._CONSTANTS.DEFAULT_SHORT_SMA,
        adx: 2,
        startDate: null,
        endDate: null,
        controlsVisible: false,
        strategies: [],
        chartMeasuresFeed: ["PrecioCierre"],
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
          { key: "Momentum", text: this._oResourceBundle.getText("momentumStrategy")},
          { key: "MACrossover", text: this._oResourceBundle.getText("movingAverageCrossoverStrategy") },
          { key: "Reversión Simple", text: this._oResourceBundle.getText("reversionSimpleStrategy")},
          { key: "Supertrend", text: this._oResourceBundle.getText("supertrendStrategy")},
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
            const oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
            
            const chartData = data.value.map(item => ({
                DATE_GRAPH: new Date(item.DATE),
                DATE: item.DATE,
                OPEN: item.OPEN,
                HIGH: item.HIGH,
                LOW: item.LOW,
                CLOSE: item.CLOSE,
                VOLUME: item.VOLUME
            }));

            const oResultModel = this.getView().getModel("strategyResultModel");
            oResultModel.setProperty("/chart_data", chartData);
            oResultModel.setProperty("/symbol", TESTING_SYMBOL); // Usar símbolo de prueba
            this._updateChartMeasuresFeed("", oResultModel);
            
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
              dataLabel: { visible: false },
              window: {
                start: null,
                end: null,
              },
              
            },
            valueAxis: {
              title: { text: "Precio (USD)" }, // Generalize title as it will show various measures
            },
            timeAxis: {
              title: { text: "Fecha" },
              levels: ["day", "month", "year"],
              label: {
                formatString: "dd/MM/yy",
              },
            },
            title: {
              text: "Análisis de Precios e Indicadores",
            },
            legend: {
              visible: true,
            },
            tooltip: {
              visible: true,
              formatString: "#,##0.00",
            },
            interaction: {
                behaviorType : null,
                zoom: { enablement: "enabled" },
                selectability: { mode: "single" }
            },
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
        var oStrategyAnalysisModel = this.getView().getModel("strategyAnalysisModel");
        var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
        oStrategyAnalysisModel.setProperty(
          "/controlsVisible",
          !!sSelectedKey
        );
        // Update strategyKey in the model
        oStrategyAnalysisModel.setProperty("/strategyKey", sSelectedKey);
    },

    _updateChartMeasuresFeed: function (sStrategyKey, oStrategyAnalysisModel) {
      // Define las medidas base que siempre deben estar presentes
      // ¡IMPORTANTE! Usar los NOMBRES de las MeasureDefinition del XML, no los nombres de las propiedades de los datos.
      let aMeasures = ["PrecioCierre"];
      // Añade medidas adicionales según la estrategia seleccionada
      if (sStrategyKey === "MACrossover") {
        aMeasures.push("SHORT_MA", "LONG_MA"); // Estos nombres coinciden en tu XML
      } else if (sStrategyKey === "Reversión Simple") {
        aMeasures.push("RSI", "SMA"); // Estos nombres coinciden en tu XML
      } else if( sStrategyKey === "Supertrend") {
        aMeasures.push("MA","ATR");
      } else if( sStrategyKey === "Momentum") {
        aMeasures.push("SHORT_MA","LONG_MA", "RSI", "ADX");
      } 
      if (sStrategyKey !== "") {
        aMeasures.push("Señal BUY", "Señal SELL");
      }
       
      // Actualiza la propiedad del modelo con las medidas actuales
      oStrategyAnalysisModel.setProperty("/chartMeasuresFeed", aMeasures);
      console.log("Medidas actualizadas en el modelo:", aMeasures);
      const oVizFrame = this.byId("idVizFrame");
      if (oVizFrame) {
        // Obtener el dataset actual
        const oDataset = oVizFrame.getDataset();
        if (oDataset) {
          // Eliminar feeds existentes para valueAxis
          const aCurrentFeeds = oVizFrame.getFeeds();
          for (let i = aCurrentFeeds.length - 1; i >= 0; i--) {
            const oFeed = aCurrentFeeds[i];
            if (oFeed.getUid() === "valueAxis") {
              oVizFrame.removeFeed(oFeed);
            }
          }
          // Crear y añadir un nuevo FeedItem para valueAxis con las medidas actualizadas
          const oNewValueAxisFeed = new FeedItem({
            uid: "valueAxis",
            type: "Measure",
            values: aMeasures,
          });
          oVizFrame.addFeed(oNewValueAxisFeed);
          // Forzar la actualización del dataset si es necesario (a veces ayuda)
          // oDataset.setModel(oVizFrame.getModel("strategyResultModel")); // Esto puede ser redundante si el binding ya está bien
          // Invalida el VizFrame para forzar un re-renderizado
          oVizFrame.invalidate();
        } else {
          console.warn("Dataset no encontrado en el VizFrame.");
        }
      } else {
        console.warn("VizFrame con ID 'idVizFrame' no encontrado.");
      }
    },


    onRunAnalysisPress: async function() {
        var oView = this.getView();
        var oStrategyModel = oView.getModel("strategyAnalysisModel");
        var oResultModel = oView.getModel("strategyResultModel");
        var sSymbol = oView.byId("symbolSelector").getSelectedKey();
        const sSelectedKey = oStrategyModel.getProperty("/strategyKey");


        // Validaciones
        if (!this._validateAnalysisInputs(oStrategyModel, sSymbol)) return;

        const oViewModel = this.getView().getModel("viewModel");
        oViewModel.setProperty("/analysisPanelExpanded", false);
        oViewModel.setProperty("/resultPanelExpanded", true);

        oResultModel.setProperty("/isLoading", true);
        oResultModel.setProperty("/hasResults", false);

        try {
            await this._callAnalysisAPISimulation(sSymbol, oStrategyModel, oResultModel);
            this._updateChartMeasuresFeed(sSelectedKey, oStrategyModel);
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
        const strategy = oStrategyModel.getProperty("/strategyKey");
        let apiStrategyName = strategy;
        let SPECS = [];
        
        switch(strategy) {
            case "Momentum":
                apiStrategyName = "momentum";
                SPECS = [
                    {
                        INDICATOR: "LONG",
                        VALUE: oStrategyModel.getProperty("/long")
                    },
                    {
                        INDICATOR: "SHORT",
                        VALUE: oStrategyModel.getProperty("/short")
                    },
                    {
                        INDICATOR: "ADX",
                        VALUE: oStrategyModel.getProperty("/adx")
                    },
                    {
                        INDICATOR: "RSI",
                        VALUE: oStrategyModel.getProperty("/rsi")
                    }
                ]
                break;
            case "Reversión Simple":
                apiStrategyName = "reversionsimple";
                SPECS = [{
                    INDICATOR: "rsi",
                    VALUE: oStrategyModel.getProperty("/rsi")
                }];
                break;
            case "Supertrend":
                apiStrategyName = "supertrend";
                SPECS = [
                    {
                        INDICATOR: "ma_length",
                        VALUE: oStrategyModel.getProperty("/ma_length")
                    },
                    {
                        INDICATOR: "atr",
                        VALUE: oStrategyModel.getProperty("/atr")
                    },
                    {
                        INDICATOR: "mult",
                        VALUE: oStrategyModel.getProperty("/mult")
                    },
                    {
                        INDICATOR: "rr",
                        VALUE: oStrategyModel.getProperty("/rr")
                    }
                ];
                break;
            case "MACrossover":
                apiStrategyName = "macrossover";
                SPECS = [
                    {
                        INDICATOR: "SHORT_MA",
                        VALUE: oStrategyModel.getProperty("/shortSMA")
                    },
                    {
                        INDICATOR: "LONG_MA",
                        VALUE: oStrategyModel.getProperty("/longSMA")
                    }
                ];
                break;
            default:
                throw new Error("Estrategia no soportada");
        }


        const API_URL = `http://localhost:3033/api/inv/simulation?strategy=${apiStrategyName}`;

      var oRequestBody = {
        "SIMULATION": {
            "SYMBOL": sSymbol,
            "STARTDATE": this._formatDate(oStrategyModel.getProperty("/startDate")), 
            "ENDDATE": this._formatDate(oStrategyModel.getProperty("/endDate")),  
            "AMOUNT": oStrategyModel.getProperty("/amount"),
            "USERID": "ARAMIS",
            "SPECS": SPECS
        }
    };
      try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(oRequestBody)
        });

        if (!response.ok) {
            throw new Error("Error en la respuesta del servidor");
        }

        const data = await response.json();
        await this._handleAnalysisResponse(data.value[0], oStrategyModel, oResultModel);
        
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
            strategy: data.STRATEGY,
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
        var currentBalance = parseFloat(oStrategyModel.getProperty("/balance")) || 0;
        var gainPerShare = parseFloat(oResultModel.getProperty("/REAL_PROFIT")) || 0;
        var totalBalance = currentBalance + gainPerShare;
        
        // Actualizar balance en modelo y sessionStorage
        oStrategyModel.setProperty("/balance", totalBalance);
        sessionStorage.setItem("CAPITAL", totalBalance.toString());
        
        // Mostrar mensaje con formato de número
        MessageToast.show(`Se añadieron ${this.formatNumber(gainPerShare)} a tu balance.`);
    },

    _prepareTableData: function(aData, aSignals) {
        if (!Array.isArray(aData)) return [];
        
        const oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
        let currentShares = 0; // Rastrea las acciones en tiempo real
        
        return aData.map(oItem => {
            const oDate = new Date(oItem.DATE);
            const sDateKey = oDate.toISOString().split('T')[0];
            const oSignal = aSignals.find(s => s.DATE === sDateKey);

            // Extracción de todos los indicadores necesarios
            const indicators = {
                short_ma: null,
                long_ma: null,
                rsi: null,
                sma: null,
                ma: null,
                atr: null,
                adx: null
            };

            if (Array.isArray(oItem.INDICATORS)) {
                oItem.INDICATORS.forEach(indicator => {
                    const key = indicator.INDICATOR.toLowerCase();
                    if (indicators.hasOwnProperty(key)) {
                        indicators[key] = parseFloat(indicator.VALUE);
                    }
                });
            }

            // Construcción del texto de indicadores para la tabla
            const indicatorParts = [];
            if (indicators.short_ma !== null && indicators.long_ma !== null) indicatorParts.push(`SMA(${indicators.short_ma.toFixed(2)}/${indicators.long_ma.toFixed(2)})`);
            if (indicators.rsi !== null) indicatorParts.push(`RSI: ${indicators.rsi.toFixed(2)}`);
            if (indicators.sma !== null) indicatorParts.push(`SMA: ${indicators.sma.toFixed(2)}`);
            if (indicators.ma !== null) indicatorParts.push(`MA: ${indicators.ma.toFixed(2)}`);
            if (indicators.atr !== null) indicatorParts.push(`ATR: ${indicators.atr.toFixed(2)}`);
            if (indicators.adx !== null) indicatorParts.push(`ADX: ${indicators.adx.toFixed(2)}`);

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
                SHORT_MA: indicators.short_ma,
                LONG_MA: indicators.long_ma,
                RSI: indicators.rsi,
                SMA: indicators.sma,
                MA: indicators.ma,
                ATR: indicators.atr,
                ADX: indicators.adx,
                INDICATORS: indicatorParts.length > 0 ? indicatorParts.join(", ") : "-",
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
            const oView = this.getView(); 

            const oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/analysisPanelExpanded", false);
            oViewModel.setProperty("/resultPanelExpanded", true);

            oResultModel.setProperty("/isLoading", true);
            
            this._updateModelsWithSimulationData({
                simulationDetail,
                oStrategyModel,
                oResultModel,
                oItem: this._oSelectedStrategy
            });
            
            var oStrategyAnalysisModel = this.getView().getModel("strategyAnalysisModel");
            //ponerle un switch o if según la estrategia traída
            var sStrategyKey = simulationDetail.STRATEGY;
            oView.byId("symbolSelector").setSelectedKey(sStrategyKey || "");

            oResultModel.setProperty("/isLoading", false);
            this._updateChartMeasuresFeed(sStrategyKey, oStrategyAnalysisModel);

            // 4. Cerrar y feedback
            this._oHistoryPopover.close();
            sap.m.MessageToast.show(`Estrategia ${simulationDetail.SIMULATIONNAME} cargada`);
            
        } catch (error) {
            console.error("Error:", error);
            sap.m.MessageBox.error("Error al cargar la estrategia");
        } finally {
            sap.ui.core.BusyIndicator.hide();
            oResultModel.setProperty("/isLoading", false);
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
        //asignar la estrategia en el combo de estrategias...

        // Datos para strategyAnalysisModel
        oStrategyModel.setData({
            ...oStrategyModel.getData(),
            symbol: simulationDetail.SYMBOL,
            strategyKey: "MACrossover", // O el valor que corresponda
            balance: sessionStorage.getItem("CAPITAL"),
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
            PERCENTAGE_RETURN: simulationDetail.SUMMARY?.PERCENTAGE_RETURN || 0        });
        
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
                // Solo aplicar Contains a campos de texto
                new Filter({
                    path: "strategyName",
                    operator: FilterOperator.Contains,
                    value1: sSearchValue
                }),
                new Filter({
                    path: "symbol",
                    operator: FilterOperator.Contains,
                    value1: sSearchValue.toUpperCase()
                }),
                new Filter({
                    path: "strategyType",
                    operator: FilterOperator.Contains,
                    value1: sSearchValue
                }),
                // Para campos numéricos, usar EQ si el valor es un número
                ...(this._isNumeric(sSearchValue) ? [
                    new Filter({
                        path: "result",
                        operator: FilterOperator.EQ,
                        value1: parseFloat(sSearchValue)
                    }),
                    new Filter({
                        path: "rentability",
                        operator: FilterOperator.EQ,
                        value1: parseFloat(sSearchValue)
                    })
                ] : []),
                // Para fechas, usar función test personalizada
                new Filter({
                    test: function(oItem) {
                        const startDate = oItem.details?.STARTDATE?.toString() || '';
                        const endDate = oItem.details?.ENDDATE?.toString() || '';
                        return startDate.includes(sSearchValue) || 
                               endDate.includes(sSearchValue);
                    }
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

    _isNumeric: function(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
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