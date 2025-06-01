const ztsimulation = require('../models/mongodb/ztsimulation');

async function getAllSimulaciones(req) {
    try {
        // Verifica si se ha proporcionado un USERID en la consulta
        const USERID = req.req.body?.USERID;
        const SIMULATIONID = req.req.query?.id;
        
        // Crear una variable para almacenar la simulación
        let simulation;
        
        // Caso 1: Búsqueda por ID específico
        if (SIMULATIONID != null) {
            simulation = await ztsimulation.findOne({ SIMULATIONID }).lean();
        }
        // Caso 2: Obtener todos los registros (filtrados por campos)
        else {
            simulation = await ztsimulation.find(
                { USERID },
                {
                    SIMULATIONID: 1,
                    SIMULATIONNAME: 1,
                    STARTDATE: 1,
                    ENDDATE: 1,
                    STRATEGY: 1,
                    SYMBOL: 1,
                    SUMMARY: 1,
                    SPECS: 1,
                    AMOUNT: 1,
                    _id: 0
                }
            ).lean();
        }

        return simulation;
    } catch(e) {
        console.error("Error en GetAllSimulaciones:", e);
        return { error: e.message }; // Devuelve el error en formato objeto
    }
}

/**
 * Elimina físicamente una simulación de la base de datos por su ID y usuario.
 */
async function DeleteMultipleSimulations(userID, simulationIDs) {
    if (!userID || !simulationIDs?.length) {
        throw new Error("Se requiere userID y un array de simulationIDs.");
    }

    // Eliminar múltiples documentos
    const result = await ztsimulation.deleteMany({
        USERID: userID,
        SIMULATIONID: { $in: simulationIDs }
    });

    if (result.deletedCount === 0) {
        throw new Error("No se encontraron simulaciones para eliminar.");
    }

    return {
        message: `Se eliminaron ${result.deletedCount} simulaciones.`,
        userID,
        deletedIDs: simulationIDs
    };
}


const updateSimulationName = async (idSimulation, newName) => {
  if (!idSimulation || !newName) {
    throw new Error("Faltan parámetros obligatorios");
  }

  const updated = await ztsimulation.findOneAndUpdate(
    { SIMULATIONID: idSimulation },
    { SIMULATIONNAME: newName },
    { new: true }
  );

  if (!updated) {
    throw new Error("Simulación no encontrada");
  }

  return updated;
};


module.exports = {
  updateSimulationName,
  DeleteMultipleSimulations,
  getAllSimulaciones
};
