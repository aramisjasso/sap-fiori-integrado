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
  "sap/ui/model/FilterOperator"
], function(Controller, JSONModel, MessageToast, DateFormat, MessageBox, VizFrame, FlattenedDataset, FeedItem, Filter, FilterOperator) {
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


      // Inicializar modelo con estructura vacía
      const oHistoryModel = new JSONModel({
          strategies: [],       // Aquí irán las estrategias dinámicas
          filteredCount: 0,    
          selectedCount: 0,    
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
      this._callAnalysisAPISimulation(sSymbol, oStrategyModel, oResultModel);
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

    _callAnalysisAPISimulation: function(sSymbol, oStrategyModel, oResultModel) {
      var oRequestBody = {
        symbol: sSymbol,
        startDate: this._formatDate(oStrategyModel.getProperty("/startDate")),
        endDate: this._formatDate(oStrategyModel.getProperty("/endDate")),
        amount: this._CONSTANTS.DEFAULT_BALANCE,
        userId: "ARAMIS",
        specs: `SHORT:${oStrategyModel.getProperty("/shortSMA")}&LONG:${oStrategyModel.getProperty("/longSMA")}`
      };
      fetch(this._CONSTANTS.API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(oRequestBody)
      })
      .then(response => response.ok ? response.json() : Promise.reject(response))
      .then(data => this._handleAnalysisResponse(data.value, oStrategyModel, oResultModel))
      .catch(error => {
        console.error("Error:", error);
        MessageBox.error("Error al obtener datos de simulación");
      });
    },

    _handleAnalysisResponse: function(data, oStrategyModel, oResultModel) {
        //console.log("Datos para la gráfica:", data.CHART_DATA);
        //console.log("Señales:", data.SIGNALS);
        
        // Actualizar modelo de resultados
        oResultModel.setData({
            hasResults: true,
            chart_data: this._prepareTableData(
                data.CHART_DATA || [],
                data.SIGNALS || []
            ),
            signals: data.SIGNALS || [],
            result: data.SUMMARY.REAL_PROFIT || 0,
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
            
            const transformedData = data.value.map(simulation => ({
                date: new Date(simulation.STARTDATE),
                strategyName: simulation.SIMULATIONNAME,
                symbol: simulation.SYMBOL,
                result: simulation.SUMMARY?.REAL_PROFIT || 0,
                status: "Completado",
                details: simulation
            }));
            
            this.getView().setModel(new JSONModel({
                strategies: transformedData,
                filteredCount: transformedData.length,    
                selectedCount: 0,    
                filters: {            
                    dateRange: null,
                    investmentRange: [0, 10000],
                    profitRange: [-100, 100]
                }
            }), "historyModel");
            
        } finally {
            sap.ui.core.BusyIndicator.hide();
        }
    },

   onSelectionChange: function(oEvent) {
        // Guarda la estrategia seleccionada directamente
        this._oSelectedStrategy = oEvent.getParameter("listItem")?.getBindingContext("historyModel")?.getObject();
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
            
            oStrategyModel.setProperty("/symbol", simulationDetail.SYMBOL);
            
            // Extraer valores de SPECS
            simulationDetail.SPECS?.forEach(spec => {
                if (spec.INDICATOR === "SHORT_MA") oStrategyModel.setProperty("/shortSMA", spec.VALUE);
                if (spec.INDICATOR === "LONG_MA") oStrategyModel.setProperty("/longSMA", spec.VALUE);
            });
            
            // 3. Preparar datos para resultados
            oResultModel.setData({
                hasResults: true,
                chart_data: this._prepareTableData(simulationDetail.CHART_DATA || [], simulationDetail.SIGNALS || []),
                signals: simulationDetail.SIGNALS || [],
                simulationName: simulationDetail.SIMULATIONNAME
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
        // Datos para strategyAnalysisModel
        oStrategyModel.setProperty("/symbol", simulationDetail.SYMBOL);
        
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

    onDeleteSelected: function() {
      const oTable = this.byId("historyTable");
      const aSelectedItems = oTable.getSelectedItems();
      
      if (!aSelectedItems.length) return;
      
      MessageBox.confirm("¿Desea eliminar las " + aSelectedItems.length + " estrategias seleccionadas?", {
          onClose: function(oAction) {
              if (oAction === MessageBox.Action.OK) {
                  const oModel = this.getView().getModel("historyModel");
                  const aStrategies = oModel.getProperty("/strategies");
                  const aSelectedPaths = aSelectedItems.map(item => 
                      parseInt(item.getBindingContext("historyModel").getPath().split("/")[2])
                  );
                  
                  // Eliminar elementos seleccionados
                  const aFilteredStrategies = aStrategies.filter((_, index) => 
                      !aSelectedPaths.includes(index)
                  );
                  
                  oModel.setProperty("/strategies", aFilteredStrategies);
                  this._saveStrategiesToLocalStorage(aFilteredStrategies);
                  MessageToast.show("Estrategias eliminadas correctamente");
              }
          }.bind(this)
      });
    },

onStrategyNameClick: function(oEvent) {
    const oInput = oEvent.getSource();
    oInput.setEditable(true);
    
    // Dar foco al input después de hacerlo editable
    setTimeout(() => {
        oInput.focus();
        // Seleccionar todo el texto
        oInput.selectText(0, oInput.getValue().length);
    }, 100);
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

onStrategyNameSubmit: function(oEvent) {
    const oInput = oEvent.getSource();
    const sNewValue = oEvent.getParameter("value");
    const sPath = oInput.getBindingContext("historyModel").getPath();
    
    // Validate and save
    if (!sNewValue.trim()) {
        MessageToast.show("El nombre no puede estar vacío");
        return;
    }
    
    // Update model
    this.getView().getModel("historyModel").setProperty(sPath + "/strategyName", sNewValue.trim());
    
    // Exit edit mode
    oInput.setEditable(false);
    
    // Optional: Save to backend/localStorage
    this._saveStrategiesToLocalStorage();
    
    MessageToast.show("Nombre actualizado correctamente");
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
        const oTable = this.byId("historyTable");
        const oSearchField = this.byId("searchField");
        const oDateRange = this.byId("dateRange");
        const oSymbolFilter = this.byId("symbolFilter");
        const oInvestmentRange = this.byId("investmentRange");
        const oProfitRange = this.byId("profitRange");
        
        // Crear filtros
        const aFilters = [];
        
        // Filtro de búsqueda
        if (oSearchField.getValue()) {
            aFilters.push(new Filter("strategyName", FilterOperator.Contains, oSearchField.getValue()));
        }
        
        // Filtro de fechas
        if (oDateRange.getDateValue() && oDateRange.getSecondDateValue()) {
            aFilters.push(new Filter("date", FilterOperator.BT, 
                oDateRange.getDateValue(), 
                oDateRange.getSecondDateValue()));
        }
        
        // Filtro de símbolo
        if (oSymbolFilter.getValue()) {
            aFilters.push(new Filter("symbol", FilterOperator.Contains, oSymbolFilter.getValue()));
        }
        
        // Filtro de inversión
        const [minInv, maxInv] = oInvestmentRange.getRange();
        aFilters.push(new Filter("investment", FilterOperator.BT, minInv, maxInv));
        
        // Filtro de rentabilidad
        const [minProfit, maxProfit] = oProfitRange.getRange();
        aFilters.push(new Filter("result", FilterOperator.BT, minProfit, maxProfit));
        
        // Aplicar filtros
        const oBinding = oTable.getBinding("items");
        oBinding.filter(new Filter({
            filters: aFilters,
            and: true
        }));
        
        // Actualizar contador
        this.getView().getModel("historyModel").setProperty("/filteredCount", 
            oBinding.getLength());
    }, 

    onSearch: function(oEvent) {
      const sQuery = oEvent.getParameter("query");
      const oTable = sap.ui.getCore().byId("historyTable");
      const oBinding = oTable.getBinding("items");

      if (!oBinding) return;

      if (!sQuery) {
          oBinding.filter([]);
          return;
      }

      // Crear filtros para nombre y símbolo
      const aFilters = [
          new Filter("strategyName", FilterOperator.Contains, sQuery),
          new Filter("symbol", FilterOperator.Contains, sQuery.toUpperCase())
      ];

      // Aplicar filtros con OR
      oBinding.filter(new Filter({
          filters: aFilters,
          and: false
      }));
  },

    onExit: function() {
        if (this._oHistoryPopover) {
            this._oHistoryPopover.destroy();
            this._oHistoryPopover = null;
        }
    },
  });
});