const cds = require ('@sap/cds');
const servicio = require('../services/inv-investments-service');
const sercivioSimulacion = require('../services/inv-simulation-service');

class InvestionsClass extends cds.ApplicationService{
    async init (){
        this.on('pricehistory', async (req)=> {
           return servicio.GetAllPricesHistory(req);
        });

        this.on("simulation", async (req) => {
            try {
                // Extraer 'strategy' de los query params y datos del body
                const { strategy } = req?.req?.query || {};
                const body = req?.req?.body?.SIMULATION || {}; 

                // Validaciones
                if (!strategy) {
                    throw new Error(
                        "Falta el parámetro requerido: 'strategy' en los query parameters."
                    );
                }
                if (Object.keys(body).length === 0) {
                    throw new Error(
                        "El cuerpo de la solicitud no puede estar vacío. Se esperan parámetros de simulación."
                    );
                }

                // Switch para manejar diferentes estrategias
                switch (strategy.toLowerCase()) {
                    case "reversionsimple":
                        return await servicio.SimulateReversionSimple(body);

                    case "supertrend":
                        return await servicio.SimulateSupertrend(body);

                    case "momentum":
                        return await servicio.SimulateMomentum(body);

                    case "macrossover":
                        return await servicio.SimulateMACrossover(body);
                    default:
                        throw new Error(`Estrategia no reconocida: ${strategy}`);
                }
            } catch (error) {
                console.error("Error en el controlador de simulación:", error);
                // Retorna un objeto de error que el framework pueda serializar a JSON.
                return {
                ERROR: true,
                MESSAGE:
                    error.message || "Error al procesar la solicitud de simulación.",
                };
            }
        });

        this.on('strategy', async (req) => {
            return servicio.GetAllInvestmentStrategies(req);
        });

        this.on('deleteSimulations', async (req) => {
            try {
                const { userID, simulationIDs } = req.data;
                return await sercivioSimulacion.DeleteMultipleSimulations(userID, simulationIDs);
            } catch (error) {
                req.error(500, error.message);
            }
        });

        // getSimulation
        // Se espera que el idUser venga como un parámetro de consulta o sin este par un Get all
        this.on ('getSimulation', async (req) => {
            return sercivioSimulacion.getAllSimulaciones(req);
        });

        //updateSimulation
        this.on('updatesimulation', async (req) => {
            const { id, simulationName } = req.data;
        
            if (!id || !simulationName) {
                req.error(400, 'Faltan parámetros: id y simulationName son requeridos.');
                return;
            }
        
            try {
                const updated = await sercivioSimulacion.updateSimulationName(id, simulationName);
                return updated;
            } catch (err) {
                console.error("Error en updatesimulation:", err.message);
                req.error(500, err.message);
            }
        });

        this.on('symbols', async (req) => {
            try {
                return await servicio.GetAllSymbols();
            } catch (error) {
                throw new Error(`Error al traer los símbolos: ${error.message}`);
            }
        });

        this.on('company', async (req) => {
            return await servicio.GetAllCompanies(req);
        });

        this.on('calculateSMA', async (req) => {
            const { symbol, startDate, endDate, specs } = req.data;
          
            const resultado = await servicio.calcularSoloSMA({
              symbol,
              startDate,
              endDate,
              specs
            });
          
            return resultado;
          });

        return await super.init();
    };
};

module.exports = InvestionsClass;