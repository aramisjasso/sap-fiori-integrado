using {inv as myph} from '../models/inv-investments';

@impl: 'src/api/controllers/inv-investments-controller.js'
service PricesHistoryRoute @(path:'/api/inv') {
    entity priceshistory as projection on myph.priceshistory;
    entity simulations as projection on myph.SIMULATION;
    entity symbol as projection on myph.symbols;
    
    @Core.Description:'get-all-prices-history'
    @path : 'pricehistory'
    function pricehistory()
    returns array of priceshistory;

    @Core.Description:'Simulate MA Crossover strategy'
    @path: 'simulation'
    action simulation(SIMULATION: simulations) returns array of simulations;

    @Core.Description:'get-all-strategys'
    @path : 'strategy'
    function strategy()
    returns array of String;

    @Core.Description:'get-all-simulations'
    @path : 'getSimulation'	
    action getSimulation(USERID: String, id: String)
    returns array of {};

    @Core.Description: 'Elimina múltiples simulaciones por IDs y USERID'
    @path: 'deleteSimulations'
    action deleteSimulations(
        userID : String,
        simulationIDs : array of String
    ) returns String;

    @Core.Description: 'Actualizar nombre de simulación por ID'
    @path: 'updatesimulation'
    action updatesimulation(
        id: String,
        simulationName: String
    ) returns String;


    // @Core.Description: 'get-all-symbols'
    // @path: 'symbols'
    // function symbols()
    // returns array of symbol;
    
    @Core.Description:'Calcular SMA (Simple Moving Averages) para SHORT y LONG'
    @path: 'calculateSMA'
    action calculateSMA(
        symbol: String,
        startDate: String,
        endDate: String,
        specs: String
    ) returns array of {
        date: DateTime;
        close: Decimal;
        short: Decimal;
        long: Decimal
    };
};
