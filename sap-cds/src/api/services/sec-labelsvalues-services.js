const ztlabels = require('../models/mongodb/ztlabels')
const ztvalues = require('../models/mongodb/ztvalues')
const ztroles = require('../models/mongodb/ztroles')

async function GetAllLabelsValues(req) {
    try {
        const query = req.req.query;
        const type = query?.type;

        if (type === 'label') {
            const labelId = query.id;
            if (labelId) {
                return await getLabelById(labelId);
            } else {
                return await getAllLabels();
            }

        } else if (type === 'value') {
            const valueId = query.id;
            const labelId = query.labelID;

            if (valueId) {
                return await getValueById(valueId);
            } else if (labelId) {
                return await getValuesByLabel(labelId);
            } else {
                return await getAllValues();
            }

        }else if (type === 'catalog'){
            return await getAllCatalog();
        } 
        else {
            throw ({code: 400, message:"Parámetro 'type' no válido. Usa 'label', 'value' o 'catalog'." });
        }
    } catch (error) {
        throw error;
    }
}


// LABELS
async function getAllLabels() {
    return await ztlabels.find({}).lean();
}

async function getLabelById(labelId) {
    return await ztlabels.findOne({ LABELID: labelId }).lean();
}

// VALUES
async function getAllValues() {
    return await ztvalues.find({}).lean();
}

async function getValueById(valueId) {
    return await ztvalues.findOne({ VALUEID: valueId }).lean();
}

async function getValuesByLabel(labelId) {
    return await ztvalues.find({ LABELID: labelId }).lean();
}

// Catalagos
async function getAllCatalog() {
  try {
    // Obtener todos los labels
    const labels = await ztlabels.find({
    //   'DETAIL_ROW.ACTIVED': true,
    //   'DETAIL_ROW.DELETED': false
    }).lean();
    
    // Obtener todos los values activos
    const allValues = await ztvalues.find({
    //   'DETAIL_ROW.ACTIVED': true,
    //   'DETAIL_ROW.DELETED': false
    }).lean();
    
    // Mapear los labels con sus values correspondientes
    const result = labels.map(label => {
      // Filtrar los values que pertenecen a este label
      const valuesForLabel = allValues.filter(value => 
        value.LABELID === label.LABELID 
        // && 
        // value.COMPANYID === label.COMPANYID && 
        // value.CEDIID === label.CEDIID
      );
      
      return {
        ...label,
        values: valuesForLabel
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error en getLabelsWithValues:', error);
    throw error;
  }
}

// Patch de labels y values
// Patch para labels y values
async function UpdateLabelsValues(req) {
    const type = parseInt(req.req.query?.type);
    const id = req.req.query?.id;
    

    if (!id) {
        return { message: "Se requiere el parámetro 'id' para actualizar." };
    }

    if (type == 1) {
        const updateData = req.req.body.label;
        return patchLabels(req, id, updateData);
    } else if (type == 2) {
        const updateData = req.req.body.value;
        return patchValues(req, id, updateData);
    } else {
        return { message: "Parámetro 'type' no válido. Usa 1 para labels o 2 para values." };
    }
}

//POST
async function PostLabelsValues(req) {
    try {
        const type = parseInt(req.req.query?.type);
        console.log(req.data);
        if (type === 1) {
            const labelItem = req.data.label;
            if (!labelItem) {
                throw { code: 400, message: "Se requiere un objeto 'label' en la solicitud" };
            }

            // Validación del label
            if (!labelItem.LABELID) {
                throw { 
                    code: 400, 
                    message: "Los campos LABELID son obligatorios para un label" 
                };
            }

            // Verificar si el label ya existe
            const existingLabel = await ztlabels.findOne({ LABELID: labelItem.LABELID }).lean();
            if (existingLabel) {
                throw { 
                    code: 409, 
                    message: `Ya existe un label con LABELID: ${labelItem.LABELID}` 
                };
            }


            // Guardar el label
            const savedLabel = await ztlabels.create(labelItem);

            return {
                message: "Label insertado correctamente",
                success: true,
                label: labelItem
            };

        } else if (type === 2) {
            const valueItem = req.data.value;
            if (!valueItem) {
                throw { code: 400, message: "Se requiere un objeto 'value' en la solicitud" };
            }

            // Validación del value
            if (!valueItem.VALUEID || !valueItem.LABELID ) {
                throw { 
                    code: 400, 
                    message: "Los campos VALUEID y LABELID son obligatorios para un value" 
                };
            }

            // Verificar si el label padre existe
            const labelExists = await ztlabels.findOne({ LABELID: valueItem.LABELID }).lean();
            if (!labelExists) {
                throw { 
                    code: 404, 
                    message: `No existe un label con LABELID: ${valueItem.LABELID}` 
                };
            }

            // Verificar si el value ya existe
            const existingValue = await ztvalues.findOne({ VALUEID: valueItem.VALUEID }).lean();
            if (existingValue) {
                throw { 
                    code: 409, 
                    message: `Ya existe un value con VALUEID: ${valueItem.VALUEID}` 
                };
            }

            // Crear el nuevo value

            // Guardar el value
            const savedValue = await ztvalues.create(valueItem);

            return {
                message: "Value insertado correctamente",
                success: true,
                value: valueItem
            };

        } else {
            throw { 
                code: 400, 
                message: "Parámetro 'type' no válido. Usa 1 para labels o 2 para values." 
            };
        }

    } catch (error) {
        // Si el error ya tiene código (es un error lanzado por nosotros), lo devolvemos tal cual
        if (error.code) {
            throw error;
        }
        // Para otros errores (de base de datos, etc.)
        console.error('Error en PostLabelsValues:', error);
        throw { 
            code: 500, 
            message: "Error interno del servidor al procesar la solicitud" 
        };
    }
}


// Actualización de Labels
async function patchLabels(req, id, updateData) {
    try {
        // 1. Verificar si existe el label
        const existingLabel = await ztlabels.findOne({ LABELID: id }).lean();
        if (!existingLabel) {
            return { message: `No se encontró label con LABELID: ${id}` };
        }

        // 2. Validar cambio de LABELID (si se está intentando modificar)
        if (updateData.LABELID && updateData.LABELID !== id) {
            // Verificar si el nuevo LABELID ya existe
            const labelWithNewId = await ztlabels.findOne({ 
                LABELID: updateData.LABELID 
            }).lean();
            
            if (labelWithNewId) {
                return { 
                    message: "Ya existe un label con el nuevo LABELID especificado",
                    conflict: {
                        existingLabel: labelWithNewId.LABELID,
                        attemptedNewId: updateData.LABELID
                    }
                };
            }

            // Si no existe, permitir el cambio (se actualizará abajo)
        }

        // 3. Realizar la actualización
        const updatedLabel = await ztlabels.findOneAndUpdate(
            { LABELID: id },
            { $set: updateData },
            { new: true, lean: true }
        );

        return {
            message: "Label actualizado exitosamente",
            success: true,
            // updatedLabel: updatedLabel
        };
    } catch (error) {
        throw error;
    }
}

// Patch para labels y values
async function UpdateLabelsValues(req) {
    try{
        const type = parseInt(req.req.query?.type);


        if (type == 1) {
            const updateData = req.req.body.label;
            return patchLabels(req, updateData);
        } else if (type == 2) {
            const updateData = req.req.body.value;
            return patchValues(req, updateData);
        } else {
            return {code:400, message: "Parámetro 'type' no válido. Usa 1 para labels o 2 para values." };
        }
    }catch(error){
        throw error;
    }
}

// Actualización de Labels
async function patchLabels(req, updateData) {
    try {
        // 1. Verificar si existe el label
        const existingLabel = await ztlabels.findOne({ LABELID: updateData.LABELID }).lean();
        if (!existingLabel) {
            throw ({code: 400, message: `No se encontró label con LABELID: ${id}` })
        }

        // 3. Preparar la actualización del DETAIL_ROW si viene en los datos
        const updateObject = { ...updateData };
        
        // 5. Handle DETAIL_ROW update
        if (updateData.ACTIVED) {
            // First, mark all current registries as not current
            await ztlabels.updateOne(
                { LABELID: updateData.LABELID, "DETAIL_ROW.DETAIL_ROW_REG.CURRENT": true },
                { $set: { "DETAIL_ROW.DETAIL_ROW_REG.$[elem].CURRENT": false } },
                { arrayFilters: [{ "elem.CURRENT": true }] }
            );
        }

                // 5. Create new registry entry
        const newRegistry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: updateData?.REGUSER || 'system'
        };

        // Get the updated document to include the modified registries

        updateObject.DETAIL_ROW = {
            ACTIVED: updateData.ACTIVED ?? existingLabel.DETAIL_ROW?.ACTIVED ?? true,
            DELETED: existingLabel.DETAIL_ROW?.DELETED ?? false,
            DETAIL_ROW_REG: [
                ...(
                existingLabel.DETAIL_ROW?.DETAIL_ROW_REG
                    ?.filter(reg => typeof reg === 'object' && reg !== null)
                    ?.map(reg => ({ ...reg, CURRENT: false })) || []
                ),
                newRegistry
            ]
        };

        // 4. Realizar la actualización
        const updatedLabel = await ztlabels.findOneAndUpdate(
            { LABELID: updateData.LABELID },
            { $set: updateObject },
            { new: true, lean: true }
        );

        return {
            message: "Label actualizado exitosamente",
            success: true,
            value: updatedLabel
        };

    } catch (error) {
        throw error;
    }
}

async function patchValues(req, updateData) {
    try {
        // 1. Find the value to update
        const valueToUpdate = await ztvalues.findOne({ VALUEID: updateData.VALUEID }).lean();
        if (!valueToUpdate) {
            throw {
                code: 400,
                message: `No se encontró value con VALUEID: ${id}`,
                error: "VALUE_NOT_FOUND"
            };
        }

        // 2. Prevent LABELID changes
        if (updateData.LABELID && updateData.LABELID !== valueToUpdate.LABELID) {
            throw { 
                code: 400,
                message: "No está permitido modificar el LABELID de un value existente",
                error: "LABELID_MODIFICATION_NOT_ALLOWED"
            };
        }

        // 4. Prepare update object
        const updateObject = { ...updateData };
    


        // 5. Create new registry entry
        const newRegistry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: updateData?.REGUSER || 'system'
        };

        // Get the updated document to include the modified registries

        updateObject.DETAIL_ROW = {
            ACTIVED: updateData.ACTIVED ?? valueToUpdate.DETAIL_ROW?.ACTIVED ?? true,
            DELETED: valueToUpdate.DETAIL_ROW?.DELETED ?? false,
            DETAIL_ROW_REG: [
                ...(
                valueToUpdate.DETAIL_ROW?.DETAIL_ROW_REG
                    ?.filter(reg => typeof reg === 'object' && reg !== null)
                    ?.map(reg => ({ ...reg, CURRENT: false })) || []
                ),
                newRegistry
            ]
        };
        

        // 6. Perform the update
        const updatedValue = await ztvalues.findOneAndUpdate(
            { VALUEID: updateData.VALUEID },
            { $set: updateObject },
            { new: true, lean: true }
        );
        
        return { 
            message: "Value actualizado exitosamente",
            success: true,
            value: updatedValue
        };
    } catch (error) {
        throw error;
    }
}
// Delete de labels y values
async function DeleteLabelsValues(req) {
    try {
        const type = parseInt(req.req.query?.type);
        const id = req.req.query?.id;
        const mode = req.req.query?.mode?.toLowerCase(); // 'logical' o 'physical'
        const reguser = req.req.query?.reguser;

        if (!id) {
            throw { code: 400, message: "Se requiere el parámetro 'id' para borrar." };
        }

        if (!['logical', 'physical'].includes(mode)) {
            throw { code: 400, message: "Parámetro 'mode' no válido. Usa 'logical' o 'physical'." };
        }

        if (!reguser && mode === 'logical') {
            throw { code: 400, message: "Para el borrado lógico se requiere el parámetro 'reguser'." };
        }

        if (type === 1) {
            return await deleteLabel(id, mode, reguser);
        } else if (type === 2) {
            return await deleteValue(id, mode, reguser);
        } else {
            throw { code: 400, message: "Parámetro 'type' no válido. Usa 1 para labels o 2 para values." };
        }

    } catch (error) {
        throw error;
    }
}
// 🔴 Borrado de Labels
async function deleteLabel(id, mode, reguser) {
    try {
        const label = await ztlabels.findOne({ LABELID: id }).lean();
        if (!label) {
            throw { code: 404, message: `No se encontró label con LABELID: ${id}` };
        }

        if (mode === 'physical') {
            await ztlabels.deleteOne({ LABELID: id });
            return {
                code: 200,
                message: "Label borrado físicamente exitosamente",
                deletedLabel: label
            };
        }

        // Borrado lógico
        const newRegistry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: reguser
        };

        const updateObject = {
            DETAIL_ROW: {
                ACTIVED: false,
                DELETED: true,
                DETAIL_ROW_REG: [
                    ...(label.DETAIL_ROW?.DETAIL_ROW_REG
                        ?.filter(reg => typeof reg === 'object' && reg !== null)
                        ?.map(reg => ({ ...reg, CURRENT: false })) || []),
                    newRegistry
                ]
            }
        };

        const updatedLabel = await ztlabels.findOneAndUpdate(
            { LABELID: id },
            { $set: updateObject },
            { new: true, lean: true }
        );

        return {
            code: 200,
            message: "Label borrado lógicamente exitosamente",
            updatedLabel
        };

    } catch (error) {
        throw { code: 500, message: `Error al borrar label: ${error.message}` };
    }
}

// 🔵 Borrado de Values
async function deleteValue(id, mode, reguser) {
    try {
        const value = await ztvalues.findOne({ VALUEID: id }).lean();
        if (!value) {
            throw { code: 404, message: `No se encontró value con VALUEID: ${id}` };
        }

        if (mode === 'physical') {
            await ztvalues.deleteOne({ VALUEID: id });
            return {
                code: 200,
                message: "Value borrado físicamente exitosamente",
                deletedValue: value
            };
        }

        // Borrado lógico
        const newRegistry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: reguser
        };

        const updateObject = {
            DETAIL_ROW: {
                ACTIVED: false,
                DELETED: true,
                DETAIL_ROW_REG: [
                    ...(value.DETAIL_ROW?.DETAIL_ROW_REG
                        ?.filter(reg => typeof reg === 'object' && reg !== null)
                        ?.map(reg => ({ ...reg, CURRENT: false })) || []),
                    newRegistry
                ]
            }
        };

        const updatedValue = await ztvalues.findOneAndUpdate(
            { VALUEID: id },
            { $set: updateObject },
            { new: true, lean: true }
        );

        return {
            code: 200,
            message: "Value borrado lógicamente exitosamente",
            updatedValue
        };

    } catch (error) {
        throw error ;
    }
}

async function valideLabelid(valueToDelete, mensaje) {
    // 2. Validar si tiene hijos
    let children = [];

    // Caso especial para LABELID = "IdApplications", "IdViews"
    if (["IdApplications", "IdViews"].includes(valueToDelete.LABELID)) {
        const appName = valueToDelete.VALUEID;
        children = await ztvalues.find({ 
            VALUEPAID: { $regex: new RegExp(`${valueToDelete.LABELID}-${appName}`) } 
        }).lean();
        // Si tiene hijos no se puede borrar
        if (children.length > 0) {
            return { 
                message: `No se puede ${mensaje} porque tiene valores hijos asociados`,
                parentValue: valueToDelete,
                childValues: children 
            };
        }
    } 

    

    if (["IdProcesses", "IdPrivileges"].includes(valueToDelete.LABELID)) {
        let rolesUsingValue = [];
        
        if (valueToDelete.LABELID === "IdProcesses") {
            // Buscar en PROCESSID de ztroles
            const processPattern = `IdProcesses-${valueToDelete.VALUEID}`;
            rolesUsingValue = await ztroles.find({
                "PRIVILEGES.PROCESSID": { 
                    $regex: new RegExp(`^${processPattern}$`), 
                    $options: 'i' 
                }
            }).lean();
        } 
        else if (valueToDelete.LABELID === "IdPrivileges") {
            // Buscar en PRIVILEGEID de ztroles
            rolesUsingValue = await ztroles.find({
                "PRIVILEGES.PRIVILEGEID": valueToDelete.VALUEID
            }).lean();
        }

        if (rolesUsingValue.length > 0) {
            return { 
                message: `No se puede ${mensaje} porque está siendo usado por ${rolesUsingValue.length} rol(es)`,
                parentValue: valueToDelete,
                rolesUsingValue: rolesUsingValue.map(r => r.ROLEID)
            };
        }
    }
    return "";
}

async function logicalLabelValue(req) {
    const { status, id, type } = req.req.query;
    
    try {
        // Validate input parameters
        if (!status || !id || !type) {
            throw { code: 400, success: false, message: 'Missing required parameters: status, id, or type' };
        }

        const isActivated = status;
        const updateData = {
            'DETAIL_ROW.ACTIVED': isActivated,
            $push: { 
                'DETAIL_ROW.DETAIL_ROW_REG': {
                    CURRENT: true,
                    REGDATE: new Date(),
                    REGTIME: new Date(),
                    REGUSER: 'system'
                } 
            }
        };

        if (type === '1') {
            // First, update all CURRENT fields to false
            await ztlabels.updateOne(
                { LABELID: id },
                { $set: { 'DETAIL_ROW.DETAIL_ROW_REG.$[].CURRENT': false } }
            );
            
            // Then perform the main update
            const result = await ztlabels.findOneAndUpdate(
                { LABELID: id },
                updateData,
                { new: true }
            );

            if (!result) {
                throw { code: 400, success: false, message: 'Label not found' };
            }

            return { code: 200, success: true, message: `Label ${status} successfully` };
        } else {
            // First, update all CURRENT fields to false
            await ztvalues.updateOne(
                { VALUEID: id },
                { $set: { 'DETAIL_ROW.DETAIL_ROW_REG.$[].CURRENT': false } }
            );
            
            // Then perform the main update
            const result = await ztvalues.findOneAndUpdate(
                { VALUEID: id },
                updateData,
                { new: true }
            );

            if (!result) {
                throw { code: 400, success: false, message: 'Value not found' };
            }

            return { code: 200, success: true, message: `Value ${status} successfully` };
        }
    } catch (error) {
        console.error('Error in logicalLabelValue:', error);
        throw { 
            code: error.code || 500, 
            success: false, 
            message: error.message || 'Internal server error' 
        };
    }
}

module.exports = { GetAllLabelsValues, DeleteLabelsValues, UpdateLabelsValues, PostLabelsValues, logicalLabelValue }