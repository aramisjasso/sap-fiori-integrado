//Importacion de modelos
// ==============================
const UsersSchema = require('../models/mongodb/ztusers');
const RoleSchema = require('../models/mongodb/ztroles');
const ValueSchema = require('../models/mongodb/ztvalues'); // Modelo para validar proceso


async function RolesCRUD(req) {
  try {
    const { procedure, type, roleid } = req.req.query;
    console.log('PROCEDURE:', procedure, 'TYPE:', type);

    let result;


    //FUNCION PARA VALDIAR PROCESSID
    const validarProcessIds = async (privilegios = []) => {
      const processIds = (privilegios || []).map(p =>
        p.PROCESSID.replace('IdProcess-', '').trim()
      );

      const procesosValidos = await ValueSchema.find({
        LABELID: "IdProcesses",
        VALUEID: { $in: processIds }
      }).lean();

      if (procesosValidos.length !== processIds.length) {
        const encontrados = procesosValidos.map(p => p.VALUEID);
        const faltantes = processIds.filter(id => !encontrados.includes(id));

        throw new Error(`No existe el siguiente proceso en la Base de Datos: ${faltantes.join(', ')}`);
      }
    };



    // GET ALL ------------------------------------
    if (procedure === 'get' && type === 'all') {
      //por si pasa un IDROLE
      const matchStage = roleid ? [{ $match: { ROLEID: roleid } }] : [];

      // CONSULTA PARA ROLES
      const pipelineAll = [
        ...matchStage,
        {
          $unwind: {
            path: "$PRIVILEGES",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "ZTVALUES",
            let: { pid: "$PRIVILEGES.PROCESSID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$LABELID", "IdProcesses"] },
                      {
                        $eq: [
                          "$VALUEID",
                          { $replaceOne: { input: "$$pid", find: "IdProcess-", replacement: "" } }
                        ]
                      }
                    ]
                  }
                }
              }
            ],
            as: "processInfo"
          }
        },
        {
          $unwind: {
            path: "$processInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $set: {
            PROCESSNAME: "$processInfo.VALUE",
            VIEWID: "$processInfo.VALUEPAID"
          }
        },
        {
          $lookup: {
            from: "ZTVALUES",
            let: { vid: "$VIEWID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$LABELID", "IdViews"] },
                      {
                        $eq: [
                          "$VALUEID",
                          { $replaceOne: { input: "$$vid", find: "IdViews-", replacement: "" } }
                        ]
                      }
                    ]
                  }
                }
              }
            ],
            as: "viewInfo"
          }
        },
        {
          $unwind: {
            path: "$viewInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $set: {
            VIEWNAME: "$viewInfo.VALUE",
            APPLICATIONID: "$viewInfo.VALUEPAID"
          }
        },
        {
          $lookup: {
            from: "ZTVALUES",
            let: { aid: "$APPLICATIONID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$LABELID", "IdApplications"] },
                      {
                        $eq: [
                          "$VALUEID",
                          { $replaceOne: { input: "$$aid", find: "IdApplications-", replacement: "" } }
                        ]
                      }
                    ]
                  }
                }
              }
            ],
            as: "appInfo"
          }
        },
        {
          $unwind: {
            path: "$appInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $set: {
            APPLICATIONNAME: "$appInfo.VALUE"
          }
        },
        {
          $unwind: {
            path: "$PRIVILEGES.PRIVILEGEID",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "ZTVALUES",
            let: { prid: "$PRIVILEGES.PRIVILEGEID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$LABELID", "IdPrivileges"] },
                      { $eq: ["$VALUEID", "$$prid"] }
                    ]
                  }
                }
              }
            ],
            as: "privInfo"
          }
        },
        {
          $unwind: {
            path: "$privInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: {
              ROLEID: "$ROLEID",
              ROLENAME: "$ROLENAME",
              DESCRIPTION: "$DESCRIPTION",
              PROCESSID: "$processInfo.VALUEID",
              PROCESSNAME: "$PROCESSNAME",
              VIEWID: "$viewInfo.VALUEID",
              VIEWNAME: "$VIEWNAME",
              APPLICATIONID: "$appInfo.VALUEID",
              APPLICATIONNAME: "$appInfo.VALUE"
            },
            PRIVILEGES: {
              $push: {
                PRIVILEGEID: "$PRIVILEGES.PRIVILEGEID",
                PRIVILEGENAME: "$privInfo.VALUE"
              }
            },
            DETAIL_ROW: { $first: "$DETAIL_ROW" }
          }
        },
        {
          $group: {
            _id: {
              ROLEID: "$_id.ROLEID",
              ROLENAME: "$_id.ROLENAME",
              DESCRIPTION: "$_id.DESCRIPTION"
            },
            PROCESSES: {
              $push: {
                PROCESSID: "$_id.PROCESSID",
                PROCESSNAME: "$_id.PROCESSNAME",
                VIEWID: "$_id.VIEWID",
                VIEWNAME: "$_id.VIEWNAME",
                APPLICATIONID: "$_id.APPLICATIONID",
                APPLICATIONNAME: "$_id.APPLICATIONNAME",
                PRIVILEGES: "$PRIVILEGES"
              }
            },
            DETAIL_ROW: { $first: "$DETAIL_ROW" }
          }
        },
        {
          $lookup: {
            from: "ZTUSERS",
            let: { roleId: "$_id.ROLEID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$roleId", "$ROLES.ROLEID"]
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  USERID: 1,
                  USERNAME: 1,
                  COMPANYNAME: 1,
                  DEPARTMENT: 1,
                  EMPLOYEEID: 1
                }
              }
            ],
            as: "USERS"
          }
        },
        {
          $project: {
            _id: 0,
            ROLEID: "$_id.ROLEID",
            ROLENAME: "$_id.ROLENAME",
            DESCRIPTION: "$_id.DESCRIPTION",
            PROCESSES: {
              $filter: {
                input: "$PROCESSES",
                as: "proc",
                cond: { $ne: ["$$proc.PROCESSID", null] }
              }
            },
            USERS: 1,
            DETAIL_ROW: 1
          }
        }
      ];


      result = await RoleSchema.aggregate(pipelineAll);


      // GET CON USERS ----------------------------------
    } else if (procedure === 'get' && type === 'users') {
      //por si pasa un IDROLE
      const matchStage = roleid ? [{ $match: { ROLEID: roleid } }] : [];

      // CONSULTA PARA ROLES-USUARIOS
      const pipelineUsers = [
        ...matchStage,
        {
          $lookup: {
            from: "ZTUSERS",
            let: {
              roleId: "$ROLEID"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$roleId", "$ROLES.ROLEID"]
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  USERID: 1,
                  USERNAME: 1,
                  COMPANYNAME: 1,
                  DEPARTMENT: 1,
                  EMPLOYEEID: 1
                }
              }
            ],
            as: "USERS"
          }
        },
        {
          $project: {
            _id: 0,
            ROLEID: 1,
            ROLENAME: 1,
            DESCRIPTION: 1,
            USERS: 1,
            DETAIL_ROW: 1
          }
        }
      ]

      result = await RoleSchema.aggregate(pipelineUsers);


      // POST -------------------------------------
    } else if (req.req.query.procedure === 'post') {

      const nuevoRol = req.req.body;
      // Validar que ya no exista un ROLEID igual
      const existente = await RoleSchema.findOne({ ROLEID: nuevoRol.ROLEID });
      if (existente) {
        throw new Error(`Ya existe un rol con el ROLEID: ${nuevoRol.ROLEID}`);
      }

      await validarProcessIds(nuevoRol.PRIVILEGES);

      const nuevoRolito = await RoleSchema.create(nuevoRol);
      result = nuevoRolito.toObject();

      // DELETE ----------------------------
    } else if (procedure === 'delete') {
      if (!roleid) throw new Error('Parametro faltante (RoleID)');


      //DELETE LOGICO
      if (type === 'logic') {

        updated = await RoleSchema.findOneAndUpdate(
          { ROLEID: roleid },
          {
            $set: { 'DETAIL_ROW.ACTIVED': false, 'DETAIL_ROW.DELETED': true }
          },
          { new: true }
        );

        if (!updated) throw new Error('No existe el rol especificado.');
        result = updated.toObject();

        console.log('Rol desactivado');



        //DELETE FISICO
      } else if (type === 'hard') {

        const deleted = await RoleSchema.deleteOne({ ROLEID: roleid });

        if (deleted.deletedCount === 0) {
          throw new Error('No existe el rol especificado.');
        }

        result = { message: 'Rol eliminado.' };

      }

      // ACTIVAR ROL ----------------------------------------------
      } else if (procedure === 'activate') {
        if (!roleid) throw new Error('Parametro faltante (RoleID)');

        const updated = await RoleSchema.findOneAndUpdate(
          { ROLEID: roleid },
          {
            $set: { 'DETAIL_ROW.ACTIVED': true, 'DETAIL_ROW.DELETED': false }
          },
          { new: true }
        );

        if (!updated) throw new Error('No existe el rol especificado.');
        result = updated.toObject();


      //PUT ----------------------------------------------
    } else if (procedure === 'put') {
      if (!roleid) throw new Error('Parametro faltante (RoleID)');

      const camposActualizar = req.req.body;

      if (!camposActualizar || Object.keys(camposActualizar).length === 0) {
        throw new Error('No se proporcionan campos para actualizar');
      }

      // Validar que no se cambie el ROLEID a uno duplicado
      if (camposActualizar.ROLEID && camposActualizar.ROLEID !== roleid) {
        const yaExiste = await RoleSchema.findOne({ ROLEID: camposActualizar.ROLEID });
        if (yaExiste) {
          throw new Error(`Ya existe un rol con el ROLEID: ${camposActualizar.ROLEID}`);
        }
      }

      //SI HAY PRIVILEGIOS A ACTUALIZAR SE LLAMA LA FUNCION PARA VALIDAR ESA COSA
      if (camposActualizar.PRIVILEGES) {
        await validarProcessIds(camposActualizar.PRIVILEGES);
      }

      const existing = await RoleSchema.findOne({ ROLEID: roleid });
      if (!existing) throw new Error('No se encontró el rol para actualizar');


      // Actualizar campos manualmente
      if (camposActualizar.ROLEID) existing.ROLEID = camposActualizar.ROLEID;
      if (camposActualizar.ROLENAME) existing.ROLENAME = camposActualizar.ROLENAME;
      if (camposActualizar.DESCRIPTION) existing.DESCRIPTION = camposActualizar.DESCRIPTION;
      if (Array.isArray(camposActualizar.PRIVILEGES)) existing.PRIVILEGES = camposActualizar.PRIVILEGES;


      // Actualizar el registro de la actualización
      const now = new Date();
      const reguser = req.req.user?.USERNAME || 'SYSTEM';

      // Marcar registros anteriores como no actuales
      if (Array.isArray(existing.DETAIL_ROW.DETAIL_ROW_REG)) {
        existing.DETAIL_ROW.DETAIL_ROW_REG.forEach(reg => {
          reg.CURRENT = false;
        });
      } else {
        existing.DETAIL_ROW.DETAIL_ROW_REG = [];
      }

      // Agregar nuevo registro
      existing.DETAIL_ROW.DETAIL_ROW_REG.push({
        CURRENT: true,
        REGDATE: now,
        REGTIME: now,
        REGUSER: reguser
      });

      // Guardar con validaciones y middleware
      const updated = await existing.save();
      result = updated.toObject();

    } else {
      console.log('No coincide ningún procedimiento');
      throw new Error('Parámetros inválidos o incompletos');
    }


    return JSON.parse(JSON.stringify(result));

  } catch (error) {
    console.error('Error en RolesCRUD:', error);
    req.reject(400, error.message);
  }

}

// ==============================
// USERSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
// ==============================


// ==============================
// FUNCIÓN AUXILIAR: validarRol
// ==============================
const validarRol = async (roles) => {
    if (!roles || roles.length === 0) return [];
    let rolesId = roles.map(r => r.ROLEID);
    let validation = await RoleSchema.find({ ROLEID: { $in: rolesId } }).lean();
    if (validation.length !== roles.length) {
        const encontrados = validation.map(r => r.ROLEID);
        const faltantes = rolesId.filter(id => !encontrados.includes(id));
        throw new Error(`Alguno de los roles ingresados no existe: ${faltantes.join(', ')}`);
    }
    return roles;
};

// ==============================
// FUNCIÓN PRINCIPAL: UsersCRUD
// ==============================


// Lista de privilegios del sistema:

// IdCreate: Permite crear nuevos usuarios.

// IdUpdate: Permite modificar información de usuarios existentes y activar usuarios desactivados.

// IdLogicDelete: Permite desactivar usuarios de forma lógica (eliminada lgica).

// IdHardDelete: Permite eliminar usuarios permanentemente del sistema (eliminada física).

// IdRead: Permite consultar (leer) la información de los usuarios. (no lo deje activo aaun)

async function UsersCRUD(req) {
    try {
        const { procedure, type, userid } = req.req.query;
        const currentUser = req.req?.query?.RegUser;
        let res;

        if (procedure === 'post') {
            await verificarPrivilegio(currentUser, "IdCreate");
            res = await PostUser(req);
        } else if (procedure === 'put') {
            await verificarPrivilegio(currentUser, "IdUpdate");
            res = await UpdateUser(req, userid);
        } else if (procedure === 'delete') {
            if (type === 'logic') {
                await verificarPrivilegio(currentUser, "IdLogicDelete");
                res = await LogDelete(userid, req);
            } else if (type === 'hard') {
                await verificarPrivilegio(currentUser, "IdHardDelete");
                res = await HardDelete(userid);
            } else {
                throw new Error("Tipo de borrado inválido (logic o hard)");
            }
        } else if (procedure === 'activate') {
            await verificarPrivilegio(currentUser, "IdUpdate");
            res = await ActivateUser(userid, req);
        } else if (procedure === 'get') {
            // Si se ocupa controlar lectura, descomenten esto att echauri:
            // await verificarPrivilegio(currentUser, "IdRead");
            if (type === 'all') {
                res = await GetAllUsers();
            } else if (type === 'one') {
                res = await GetOneUser(userid);
            } else {
                throw new Error("Coloca un tipo de búsqueda válido (all o one)");
            }
        } else {
            throw new Error('Parámetros inválidos o incompletos');
        }

        return res;
    } catch (error) {
        console.error('Error en UsersCRUD:', error);
        return { error: true, message: error.message };
    }
}

// ============= ACTIVAR USER =============
async function ActivateUser(userid, req) {
    const currentUser = req.req?.query?.RegUser || 'SYSTEM';
    const user = await UsersSchema.findOne({ USERID: userid });
    if (!user) throw new Error('No se encontró ningún usuario');
    if (!user.DETAIL_ROW) {
        user.DETAIL_ROW = { ACTIVED: false, DELETED: true, DETAIL_ROW_REG: [] };
    }
    const now = new Date();
    if (!Array.isArray(user.DETAIL_ROW.DETAIL_ROW_REG)) {
        user.DETAIL_ROW.DETAIL_ROW_REG = [];
    } else {
        user.DETAIL_ROW.DETAIL_ROW_REG.forEach(reg => {
            if (reg.CURRENT) reg.CURRENT = false;
        });
    }
    user.DETAIL_ROW.ACTIVED = true;
    user.DETAIL_ROW.DELETED = false;
    user.DETAIL_ROW.DETAIL_ROW_REG.push({
        CURRENT: true,
        REGDATE: now,
        REGTIME: now,
        REGUSER: currentUser
    });
    const updated = await user.save();
    return updated.toObject();
}

// ==============================
// GET ALL USERS
// ==============================
async function GetAllUsers() {
    const allUsers = await UsersSchema.find().lean();
    const enrichedUsers = await Promise.all(allUsers.map(async user => {
        const userRoles = user.ROLES || [];
        const fullRoles = await Promise.all(userRoles.map(async roleRef => {
            const role = await RoleSchema
                .findOne({ ROLEID: roleRef.ROLEID })
                .select("-DETAIL_ROW")
                .lean();
            return role || {
                ROLEID: roleRef.ROLEID,
                error: "Rol no encontrado"
            };
        }));
        return {
            ...user,
            ROLES: fullRoles
        };
    }));
    return enrichedUsers;
}

// ==============================
// GET ONE USER
// ==============================
async function GetOneUser(userid) {
    const user = await UsersSchema.findOne({ USERID: userid }).lean();
    if (!user) return { mensaje: 'No se encontró el usuario' };
    const userRoles = user.ROLES || [];
    const fullRoles = await Promise.all(userRoles.map(async roleRef => {
        const role = await RoleSchema
            .findOne({ ROLEID: roleRef.ROLEID })
            .select("-DETAIL_ROW")
            .lean();
        return role ? { ...roleRef, ...role } : {
            ROLEID: roleRef.ROLEID,
            error: "Rol no encontrado"
        };
    }));
    return {
        ...user,
        ROLES: fullRoles
    };
}

// ==============================
// POST USER
// ==============================
async function PostUser(req) {
    const currentUser = req.req?.query?.RegUser || 'SYSTEM';
    const newUser = req.req.body;
    console.log("Nuevo usuario a agregar datos del front:", newUser);

    // Validación obligatoria
    if (!newUser.USERID || !newUser.PASSWORD || !newUser.EMAIL ||
        newUser.COMPANYID === undefined || !newUser.COMPANYNAME || !newUser.COMPANYALIAS ||
        !newUser.DEPARTMENTID || !newUser.DEPARTMENT) {
        throw new Error("Faltan campos obligatorios: Usuario, Contraseña, Email, Compañía o Departamento.");
    }

    // Opcional: valida nombre y apellido
    if (!newUser.FIRSTNAME || !newUser.LASTNAME) {
        throw new Error("Nombre y apellido son obligatorios.");
    }

    // Opcional: valida formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.EMAIL)) {
        throw new Error("El correo electrónico no es válido.");
    }

    newUser.ROLES = await validarRol(newUser.ROLES || []);
    newUser.CAPITAL = "100";
    const instance = new UsersSchema(newUser);
    instance._reguser = currentUser;
    const validUser = await instance.save();
    return validUser.toObject();
}

// ==============================
// PUT USER
// ==============================
async function UpdateUser(req, userid) {
    const currentUser = req.req?.query?.RegUser || 'SYSTEM';
    const cambios = req.req.body;
    const user = await UsersSchema.findOne({ USERID: userid });
    if (!user) throw new Error('No se encontró ningún usuario');
    if (!cambios || Object.keys(cambios).length === 0)
        throw new Error('No se enviaron datos para actualizar');
    if (cambios.ROLES) {
        cambios.ROLES = await validarRol(cambios.ROLES);
    }
    if (!user.DETAIL_ROW) {
        user.DETAIL_ROW = { ACTIVED: true, DELETED: false, DETAIL_ROW_REG: [] };
    }
    const now = new Date();
    if (!Array.isArray(user.DETAIL_ROW.DETAIL_ROW_REG)) {
        user.DETAIL_ROW.DETAIL_ROW_REG = [];
    } else {
        user.DETAIL_ROW.DETAIL_ROW_REG.forEach(reg => {
            if (reg.CURRENT) reg.CURRENT = false;
        });
    }
    user.DETAIL_ROW.DETAIL_ROW_REG.push({
        CURRENT: true,
        REGDATE: now,
        REGTIME: now,
        REGUSER: currentUser
    });
    Object.keys(cambios).forEach(key => {
        user[key] = cambios[key];
    });
    const updated = await user.save();
    return updated.toObject();
}

// ==============================
// LOGICAL DELETE
// ==============================
async function LogDelete(userid, req) {
    const currentUser = req.req?.query?.RegUser || 'SYSTEM';
    const user = await UsersSchema.findOne({ USERID: userid });
    if (!user) throw new Error('No se encontró ningún usuario');
    if (!user.DETAIL_ROW) {
        user.DETAIL_ROW = { ACTIVED: true, DELETED: false, DETAIL_ROW_REG: [] };
    }
    const now = new Date();
    if (!Array.isArray(user.DETAIL_ROW.DETAIL_ROW_REG)) {
        user.DETAIL_ROW.DETAIL_ROW_REG = [];
    } else {
        user.DETAIL_ROW.DETAIL_ROW_REG.forEach(reg => {
            if (reg.CURRENT) reg.CURRENT = false;
        });
    }
    user.DETAIL_ROW.ACTIVED = false;
    user.DETAIL_ROW.DELETED = true;
    user.DETAIL_ROW.DETAIL_ROW_REG.push({
        CURRENT: true,
        REGDATE: now,
        REGTIME: now,
        REGUSER: currentUser
    });
    const updated = await user.save();
    return updated.toObject();
}

// ==============================
// HARD DELETE
// ==============================
async function HardDelete(userid) {
    const deleted = await UsersSchema.findOneAndDelete({ USERID: userid });
    if (!deleted) {
        throw new Error("No se pudo eliminar el usuario especificado");
    }
    return { mensaje: 'Usuario eliminado con éxito y para siempre' };
}

// Exportar función principal del servicio
module.exports = { RolesCRUD, UsersCRUD, GetAllCompanies, GetDepartmentsByCompany };


//FUNCIONES AUXILIARESSSSSSSSSSSSSSSSSSSSSSSSSS
/**
 * Verifica si el usuario tiene el privilegio requerido en cualquiera de sus roles.
 * @param {String} userId - El USERID del usuario autenticado.
 * @param {String} privilegeId - El privilegio requerido (como los q puse arriba: "IdCreate", "IdUpdate", "IdLogicDelete", "IdHardDelete").
 * @throws Error si el usuario no tiene el privilegio.
 */
async function verificarPrivilegio(userId, privilegeId) {
  console.log("Verificando privilegio:", privilegeId, "para usuario:", userId);
    const user = await UsersSchema.findOne({ USERID: userId }).lean();
    if (!user) throw new Error("Usuario autenticado no encontrado");

    const roles = user.ROLES || [];
    if (!roles.length) throw new Error("El usuario no tiene roles asignados");

    const rolesDocs = await RoleSchema.find({ ROLEID: { $in: roles.map(r => r.ROLEID) } }).lean();
    console.log("Roles encontrados:", rolesDocs);

    // Recorre todos los privilegios de todos los roles
    let tienePermiso = false;
    for (const rol of rolesDocs) {
        for (const priv of (rol.PRIVILEGES || [])) {
            // priv.PRIVILEGEID por que es un array de araays xd
            if (Array.isArray(priv.PRIVILEGEID)) {
                if (priv.PRIVILEGEID.includes("IdAll") || priv.PRIVILEGEID.includes(privilegeId)) {
                    tienePermiso = true;
                    break;
                }
            } else if (typeof priv.PRIVILEGEID === "string") {
                if (priv.PRIVILEGEID === "IdAll" || priv.PRIVILEGEID === privilegeId) {
                    tienePermiso = true;
                    break;
                }
            }
        }
        if (tienePermiso) break;
    }
    console.log("Tiene permiso:", tienePermiso, "para privilegio:", privilegeId);

    if (!tienePermiso) {
        throw new Error("No tienes permisos para realizar esta acción (" + privilegeId + ")");
    }
}

/**
 * Obtiene todas las compañías donde VALUEPAID esté vacío.
 * @returns {Promise<Array>} Lista de compañías con VALUEPAID vacío.
 */
async function GetAllCompanies() {
    // Busca documentos donde LABELID sea "IdCompanies" y VALUEPAID esté vacío
    return await ValueSchema.find({
        LABELID: "IdCompanies",
        VALUEPAID: ""
    }).lean();
}

/**
 * companyIdStr debe ser el identificador compuesto, ej: "IdCompanies-IdCocaCola"
 */
async function GetDepartmentsByCompany(companyIdStr) {
    // Busca la compañía para obtener su COMPANYID
    const company = await ValueSchema.findOne({
        LABELID: "IdCompanies",
        VALUEPAID: "",
        $expr: { $eq: [{ $concat: ["$LABELID", "-", "$VALUEID"] }, companyIdStr] }
    }).lean();

    if (!company) throw new Error("Compañía no encontrada");

    // Busca departamentos que pertenezcan a esa compañía
    return await ValueSchema.find({
        LABELID: "IdDepartaments",
        VALUEPAID: companyIdStr,
        COMPANYID: company.COMPANYID
    }).lean();
}
