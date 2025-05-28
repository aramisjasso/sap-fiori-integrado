//CONTROLADOR
// Adjust strategy name for API call if necessary
          let apiStrategyName = strategy; // Usamos una variable para el nombre de la API
          if (strategy === "Reversión Simple") {
            apiStrategyName = "reversionsimple";
          }else if (strategy === "Supertrend"){
            apiStrategyName = "supertrend";
          }

          var SPECS = []; // Initialize as array

          if (apiStrategyName === "reversionsimple") {
            const rsi = oStrategyModel.getProperty("/rsi");
            SPECS = [
              {
                INDICATOR: "rsi",
                VALUE: rsi,
              },
            ];
          } else if(strategy === "supertrend"){
                        SPECS = [
              {
                INDICATOR: "ma_length",
                VALUE: oStrategyModel.getProperty("/ma_length"), // Asegúrate de que el tipo de dato sea correcto (número si lo esperas como número)
              },
              {
                INDICATOR: "atr",
                VALUE: oStrategyModel.getProperty("/atr"), // Asegúrate de que el tipo de dato sea correcto
              },
              {
                INDICATOR: "mult",
                VALUE: oStrategyModel.getProperty("/mult"), // Asegúrate de que el tipo de dato sea correcto
              },
              {
                INDICATOR: "rr",
                VALUE: oStrategyModel.getProperty("/rr"), // Asegúrate de que el tipo de dato sea correcto
              },
            ];
          }
           else {
            // Default for MACrossover or any other strategy
            SPECS = [
              {
                INDICATOR: "SHORT_MA",
                VALUE: oStrategyModel.getProperty("/shortSMA"),
              },
              {
                INDICATOR: "LONG_MA",
                VALUE: oStrategyModel.getProperty("/longSMA"),
              },
            ];
          }

          // Extract indicator values from the INDICATORS array
            let shortMA = null;
            let longMA = null;
            let rsi = null;
            let sma = null; // Variable para la SMA simple
            let ma = null;
            let atr = null;
            if (Array.isArray(oItem.INDICATORS)) {
              oItem.INDICATORS.forEach((indicator) => {
                // Asegúrate de que estos nombres coincidan EXACTAMENTE con lo que tu API devuelve
                // Por ejemplo, si tu API devuelve "SHORT_MA" (mayúsculas), cambia aquí a "SHORT_MA"
                if (indicator.INDICATOR === "short_ma") {
                  shortMA = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "long_ma") {
                  longMA = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "rsi") {
                  rsi = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "sma") {
                  // Nuevo indicador para Reversión Simple
                  sma = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "ma") {
                  // Nuevo indicador para longitud de MA
                  ma = parseFloat(indicator.VALUE);
                } 
                else if (indicator.INDICATOR === "atr") {
                  // Nuevo indicador para ATR
                  atr = parseFloat(indicator.VALUE);
                } 
              });
            }

            
            // Construcción dinámica de la cadena de texto de indicadores para la tabla
            let indicatorParts = [];
            if (shortMA !== null && !isNaN(shortMA)) {
              indicatorParts.push(`SMA Corta: ${shortMA.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (longMA !== null && !isNaN(longMA)) {
              indicatorParts.push(`SMA Larga: ${longMA.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (rsi !== null && !isNaN(rsi)) {
              indicatorParts.push(`RSI: ${rsi.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (sma !== null && !isNaN(sma)) {
              // Incluir SMA simple si tiene valor
              indicatorParts.push(`SMA: ${sma.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (ma !== null && !isNaN(ma)) {
              indicatorParts.push(`MA: ${ma.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (atr !== null && !isNaN(atr)) {
              indicatorParts.push(`ATR: ${atr.toFixed(2)}`); // Formatear a 2 decimales
            }

            const indicatorsText =
              indicatorParts.length > 0 ? indicatorParts.join(", ") : "N/A";

            return {
              DATE_GRAPH: dateObject, // Property for VizFrame (Date object)
              DATE: dateObject
                ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(
                    dateObject
                  )
                : null, // Property for table (formatted string)
              OPEN: parseFloat(oItem.OPEN),
              HIGH: parseFloat(oItem.HIGH),
              LOW: parseFloat(oItem.LOW),
              CLOSE: parseFloat(oItem.CLOSE),
              VOLUME: parseFloat(oItem.VOLUME),
              // Properties for chart measures (will be null if not present for a given row)
              SHORT_MA: shortMA,
              LONG_MA: longMA,
              RSI: rsi,
              SMA: sma, // Asegúrate de incluir SMA aquí para que el gráfico pueda acceder a él
              // Signal points on chart (only show value if a signal exists)
              MA: ma,
              ATR: atr,
              BUY_SIGNAL:
                signal.TYPE === "buy" ? parseFloat(oItem.CLOSE) : null,
              SELL_SIGNAL:
                signal.TYPE === "sell" ? parseFloat(oItem.CLOSE) : null,
              // Propiedades para la tabla (ej. texto combinado de indicadores)
              INDICATORS_TEXT: indicatorsText, // Usamos la cadena construida dinámicamente

              SIGNALS: signal.TYPE
                ? "ACCIÓN " + signal.TYPE.toUpperCase()
                : "SIN ACCIÓN", // Convertir a mayúsculas
              RULES: signal.REASONING
                ? "RAZÓN " + signal.REASONING
                : "SIN RAZÓN",
              SHARES: signal.SHARES ?? 0,
              // Añadir propiedades de señal para el fragmento de última operación
              type: signal.TYPE || "",
              price: signal.PRICE || 0,
              reasoning: signal.REASONING || "",
            };

//VISTA GRÁFICA
             <viz.data:MeasureDefinition
                                                        name="SHORT_MA"
                                                        value="{SHORT_MA}"
                                                    />
                                                    <viz.data:MeasureDefinition
                                                        name="LONG_MA"
                                                        value="{LONG_MA}"
                                                    />
                                                    <viz.data:MeasureDefinition
                                                        name="RSI"
                                                        value="{RSI}"
                                                    />
                                                    <viz.data:MeasureDefinition
                                                        name="SMA"
                                                        value="{SMA}"
                                                    />
                                                    <viz.data:MeasureDefinition
                                                        name="MA"
                                                        value="{MA}"
                                                    />
                                                    <viz.data:MeasureDefinition
                                                        name="ATR"
                                                        value="{ATR}"
                                                    />
//PANEL DE ENTRADA
                                                    <core:FragmentDefinition
    xmlns="sap.m"
    xmlns:f="sap.ui.layout.form"
    xmlns:core="sap.ui.core"
>
    <Panel
        id="strategyAnalysisPanelFragment"
        headerText="{i18n>strategyAnalysisPanelTitle}"
        expandable="true"
        expanded="true"
        width="100%"
    >
        <content>
            <f:SimpleForm
                id="strategyAnalysisFormInFragment"
                editable="true"
                layout="ResponsiveGridLayout"
                labelSpanXL="4"
                labelSpanL="4"
                labelSpanM="12"
                labelSpanS="12"
                columnsXL="2"
                columnsL="2"
                columnsM="1"
                singleContainerFullSize="false"
            >
                <f:content>
                    <Label
                        text="{i18n>strategyLabelText}"
                        required="true"
                    />
                    <ComboBox
                        id="strategyComboBoxInFragment"
                        items="{strategyAnalysisModel>/strategies}"
                        selectionChange=".onStrategyChange"
                        placeholder="{i18n>selectStrategyPlaceholder}"
                        selectedKey="{strategyAnalysisModel>/strategyKey}"
                        width="100%"
                    >
                        <core:Item
                            key="{strategyAnalysisModel>key}"
                            text="{strategyAnalysisModel>text}"
                        />
                    </ComboBox>

                    <VBox visible="{strategyAnalysisModel>/controlsVisible}">
                        <HBox
                            justifyContent="SpaceBetween"
                            width="100%"
                            renderType="Bare"
                            class="sapUiTinyMarginTop"
                        >
                            <VBox width="48%">
                                <Label
                                    text="{i18n>longSMALabelText}"
                                    visible="{= ${strategyAnalysisModel>/strategyKey} === 'MACrossover' }"
                                />
                                <Input
                                    id="longSMAInputInFragment"
                                    value="{strategyAnalysisModel>/longSMA}"
                                    type="Number"
                                    placeholder="Ej: 200"
                                    width="100%"
                                    visible="{= ${strategyAnalysisModel>/strategyKey} === 'MACrossover' }"
                                />
                            </VBox>
                            <VBox width="48%">
                                <Label
                                    text="{i18n>shortSMALabelText}"
                                    visible="{= ${strategyAnalysisModel>/strategyKey} === 'MACrossover' }"
                                />
                                <Input
                                    id="shortSMAInputInFragment"
                                    value="{strategyAnalysisModel>/shortSMA}"
                                    type="Number"
                                    placeholder="Ej: 50"
                                    width="100%"
                                    visible="{= ${strategyAnalysisModel>/strategyKey} === 'MACrossover' }"
                                />
                            </VBox>
                        </HBox>

                        <VBox width="100%">
                            <Label text="{i18n>startDateLabelText}" />
                            <DatePicker
                                id="startDatePickerInFragment"
                                value="{
                                        path: 'strategyAnalysisModel>/startDate', type: 'sap.ui.model.type.Date',
                                        formatOptions: { pattern: 'yyyy-MM-dd' }
                                    }"
                                displayFormat="long"
                                width="100%"
                            />
                        </VBox>
                        <VBox width="100%">
                            <Label text="{i18n>endDateLabelText}" />
                            <DatePicker
                                id="endDatePickerInFragment"
                                value="{
                                        path: 'strategyAnalysisModel>/endDate', type: 'sap.ui.model.type.Date',
                                        formatOptions: { pattern: 'yyyy-MM-dd' }
                                    }"
                                displayFormat="long"
                                width="100%"
                            />
                        </VBox>

                        <Label
                            class="sapUiTinyMarginTop"
                            text="RSI Simple"
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Reversión Simple' }"
                        />
                        <StepInput
                            value="{strategyAnalysisModel>/rsi}"
                            min="1"
                            step="1"
                            width="100%"
                            class=""
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Reversión Simple' }"
                        />

                        <Label
                            class="sapUiTinyMarginTop"
                            text="MA Length"
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />
                        <StepInput
                            value="{strategyAnalysisModel>/ma_length}"
                            min="1"
                            step="1"
                            width="100%"
                            class=""
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />

                        <Label
                            class="sapUiTinyMarginTop"
                            text="ATR"
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />
                        <StepInput
                            value="{strategyAnalysisModel>/atr}"
                            min="1"
                            step="1"
                            width="100%"
                            class=""
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />

                        <Label
                            class="sapUiTinyMarginTop"
                            text="Multiplier"
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />
                        <StepInput
                            value="{ 
                                path: 'strategyAnalysisModel>/mult', 
                                type: 'sap.ui.model.type.Float', 
                                formatOptions: { minFractionDigits: 1, maxFractionDigits: 2 } 
                            }"
                            min="1"
                            step="0.1"
                            displayValuePrecision="2"
                            width="100%"

                            class=""
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />
                        
                        <Label
                            class="sapUiTinyMarginTop"
                            text="Risk/Reward"
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />
                        <StepInput
                            min="1"
                            step="0.1"
                            width="100%"
                            value="{ 
                                path: 'strategyAnalysisModel>/rr', 
                                type: 'sap.ui.model.type.Float', 
                                formatOptions: { minFractionDigits: 1, maxFractionDigits: 2 } 
                            }"
                            displayValuePrecision="2"
                            class=""
                            visible="{= ${strategyAnalysisModel>/strategyKey} === 'Supertrend' }"
                        />

                        <Label
                            class="sapUiTinyMarginTop"
                            text="Cantidad de dinero a invertir"
                        />
                        <StepInput
                            value="{strategyAnalysisModel>/stock}"
                            min="1000"
                            step="500"
                            width="100%"
                            class=""
                        />

                        <Label />
                        <Button
                            id="runAnalysisButtonInFragment"
                            text="{i18n>runAnalysisButtonText}"
                            press=".onRunAnalysisPress"
                            type="Emphasized"
                            width="auto"
                        />
                    </VBox>
                </f:content>
            </f:SimpleForm>
        </content>
    </Panel>
</core:FragmentDefinition>
