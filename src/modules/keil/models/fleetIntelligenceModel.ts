import { supabase } from '../../../config/supabase';

export const FleetIntelligenceModel = {
    getStats: async (companyId: string) => {
        // 1. Fetch Logs for Distance and Fuel
        const { data: logs, error: logsError } = await supabase
            .from('keil_vehicle_logs')
            .select('start_km, end_km, fuel_qty')
            .eq('company_id', companyId);

        if (logsError) throw logsError;

        let totalDistance = 0;
        let totalFuel = 0;
        logs?.forEach((log: any) => {
            const dist = (parseFloat(log.end_km) || 0) - (parseFloat(log.start_km) || 0);
            if (dist > 0) totalDistance += dist;
            totalFuel += parseFloat(log.fuel_qty) || 0;
        });

        // 2. Fetch Repair Costs
        const { data: repairs, error: repairsError } = await supabase
            .from('keil_vehicle_repairs')
            .select('cost')
            .eq('company_id', companyId);

        if (repairsError) throw repairsError;

        let totalMaintenance = 0;
        repairs?.forEach((repair: any) => {
            totalMaintenance += parseFloat(repair.cost) || 0;
        });

        // 3. Vehicle Count
        const { count, error: countError } = await supabase
            .from('keil_vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId);
        
        if (countError) throw countError;

        // 4. Per Vehicle Performance Matrix
        const { data: vehicles, error: vError } = await supabase
            .from('keil_vehicles')
            .select(`
                id,
                registration_number,
                current_km,
                logs:keil_vehicle_logs(start_km, end_km, fuel_qty),
                repairs:keil_vehicle_repairs(cost)
            `)
            .eq('company_id', companyId);

        if (vError) throw vError;

        const vehicleMatrix = vehicles?.map(v => {
            let vDist = 0;
            let vFuel = 0;
            v.logs?.forEach((l: any) => {
                const dist = (parseFloat(l.end_km) || 0) - (parseFloat(l.start_km) || 0);
                if (dist > 0) vDist += dist;
                vFuel += parseFloat(l.fuel_qty) || 0;
            });

            let vMaintenance = 0;
            v.repairs?.forEach((r: any) => {
                vMaintenance += parseFloat(r.cost) || 0;
            });

            const efficiency = vFuel > 0 ? (vDist / vFuel).toFixed(1) : '0.0';

            return {
                id: v.id,
                registration_number: v.registration_number,
                total_distance: vDist,
                total_fuel: vFuel,
                maintenance_cost: vMaintenance,
                efficiency,
                uptime: '98%' // Placeholder for now
            };
        });

        // 5. Next Maintenance Windows (Status not Completed)
        const { data: upcoming, error: upError } = await supabase
            .from('keil_vehicle_repairs')
            .select(`
                id,
                log_date,
                entry_date,
                repair_description,
                vehicle:vehicle_id(registration_number)
            `)
            .eq('company_id', companyId)
            .neq('status', 'Completed')
            .order('entry_date', { ascending: true })
            .limit(2);

        if (upError) throw upError;

        return {
            summary: {
                totalDistance: totalDistance.toFixed(0),
                totalFuel: totalFuel.toFixed(0),
                totalMaintenance: totalMaintenance.toFixed(0),
                activeVehicles: count || 0,
                uptime: '98.2%' // Placeholder
            },
            vehicleMatrix,
            upcoming: upcoming?.map((u: any) => ({
                id: u.id,
                date: u.log_date || u.entry_date,
                vehicle: u.vehicle?.registration_number,
                work: u.repair_description
            })) || []
        };
    }
};
