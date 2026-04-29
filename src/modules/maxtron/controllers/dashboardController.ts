import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase';
import { StockModel } from '../models/stockModel';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { companyId } = req.query;
        if (!companyId) {
            res.status(400).json({ success: false, message: 'Company ID is required' });
            return;
        }

        const cId = companyId as string;
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Date range for 7-day charts
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Fetch production stats separately to keep Promise.all clean
        const [curProductionRes, prevProductionRes] = await Promise.all([
            supabase.from('production_conversion_items')
                .select('quantity, production_conversions!inner(date, company_id)')
                .eq('production_conversions.company_id', cId)
                .gte('production_conversions.date', firstDayOfMonth.toISOString()),
            supabase.from('production_conversion_items')
                .select('quantity, production_conversions!inner(date, company_id)')
                .eq('production_conversions.company_id', cId)
                .gte('production_conversions.date', firstDayOfPrevMonth.toISOString())
                .lte('production_conversions.date', lastDayOfPrevMonth.toISOString())
        ]);

        const curProduction = curProductionRes.data || [];
        const prevProduction = prevProductionRes.data || [];

        // 1. Fetch Stats in Parallel
        const [
            { count: employeeCount },
            { count: pendingOrdersCount },
            { data: curSales },
            { data: prevSales },
            { data: curPurchases },
            { data: prevPurchases },
            { data: collections },
            { data: payments },
            { data: expenses },
            stockSummary,
            { data: dailySales },
            { data: dailyCollections },
            { data: attendance }
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_id', cId).eq('is_deleted', false),
            supabase.from('customer_orders').select('*', { count: 'exact', head: true }).eq('company_id', cId).eq('status', 'PENDING'),
            supabase.from('sales_invoices').select('net_amount').eq('company_id', cId).gte('invoice_date', firstDayOfMonth.toISOString()),
            supabase.from('sales_invoices').select('net_amount').eq('company_id', cId).gte('invoice_date', firstDayOfPrevMonth.toISOString()).lte('invoice_date', lastDayOfPrevMonth.toISOString()),
            supabase.from('purchase_entries').select('total_amount').eq('company_id', cId).gte('entry_date', firstDayOfMonth.toISOString()),
            supabase.from('purchase_entries').select('total_amount').eq('company_id', cId).gte('entry_date', firstDayOfPrevMonth.toISOString()).lte('entry_date', lastDayOfPrevMonth.toISOString()),
            supabase.from('customer_collections').select('amount').eq('company_id', cId),
            supabase.from('supplier_payments').select('amount').eq('company_id', cId),
            supabase.from('petty_cash').select('amount').eq('company_id', cId),
            StockModel.getRMStockSummary(cId),
            supabase.from('sales_invoices').select('invoice_date, net_amount').eq('company_id', cId).gte('invoice_date', sevenDaysAgo.toISOString()),
            supabase.from('customer_collections').select('collection_date, amount').eq('company_id', cId).gte('collection_date', sevenDaysAgo.toISOString()),
            supabase.from('attendance').select('date, status').eq('company_id', cId).gte('date', sevenDaysAgo.toISOString())
        ]);

        // 2. Recent Activity
        const [
            { data: recentInvoices },
            { data: recentOrders },
            { data: recentBatches }
        ] = await Promise.all([
            supabase.from('sales_invoices').select('invoice_number, net_amount, invoice_date, customers(customer_name)').eq('company_id', cId).order('invoice_date', { ascending: false }).limit(5),
            supabase.from('customer_orders').select('order_number, total_amount, order_date, customers(customer_name), status').eq('company_id', cId).order('order_date', { ascending: false }).limit(5),
            supabase.from('production_batches').select('batch_number, extrusion_output_qty, date, finished_products(product_name)').eq('company_id', cId).order('date', { ascending: false }).limit(5)
        ]);

        // 3. Calculation Logic
        const totalSales = (curSales || []).reduce((sum, item) => sum + Number(item.net_amount), 0);
        const prevMonthSales = (prevSales || []).reduce((sum, item) => sum + Number(item.net_amount), 0);
        const salesTrend = prevMonthSales === 0 ? 100 : (((totalSales - prevMonthSales) / prevMonthSales) * 100);

        const totalProduction = curProduction.reduce((sum, item) => sum + Number(item.quantity), 0);
        const prevMonthProduction = prevProduction.reduce((sum, item) => sum + Number(item.quantity), 0);
        const productionTrend = prevMonthProduction === 0 ? 0 : (((totalProduction - prevMonthProduction) / prevMonthProduction) * 100);

        const totalCollections = (collections || []).reduce((sum, item) => sum + Number(item.amount), 0);
        const totalPayments = (payments || []).reduce((sum, item) => sum + Number(item.amount), 0);
        const totalExpenses = (expenses || []).reduce((sum, item) => sum + Number(item.amount), 0);
        const cashInHand = totalCollections - (totalPayments + totalExpenses);

        const collectionEfficiency = totalSales === 0 ? 0 : (totalCollections / totalSales) * 100;

        // Initialize last 7 days for charts
        const chartDataMap = new Map<string, any>();
        const attendanceMap = new Map<string, any>();

        const toDateStr = (date: Date) => {
            return date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0');
        };

        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const sortKey = toDateStr(d);

            chartDataMap.set(sortKey, { date: dStr, sortKey, sales: 0, income: 0 });
            attendanceMap.set(sortKey, { date: dStr, sortKey, present: 0, absent: 0 });
        }

        [...(dailySales || []), ...(dailyCollections || [])].forEach(item => {
            const dateVal = (item as any).invoice_date || (item as any).collection_date;
            const sortKey = typeof dateVal === 'string' ? dateVal.split('T')[0] : toDateStr(new Date(dateVal));

            if (chartDataMap.has(sortKey)) {
                const entry = chartDataMap.get(sortKey);
                if ((item as any).net_amount) entry.sales += Number((item as any).net_amount);
                if ((item as any).amount) entry.income += Number((item as any).amount);
            }
        });

        (attendance || []).forEach(att => {
            const sortKey = typeof att.date === 'string' ? att.date.split('T')[0] : toDateStr(new Date(att.date));
            if (attendanceMap.has(sortKey)) {
                const entry = attendanceMap.get(sortKey);
                if (['PRESENT', 'LATE', 'HALF_DAY'].includes(att.status)) entry.present++;
                else if (att.status === 'ABSENT') entry.absent++;
            }
        });

        const chartData = Array.from(chartDataMap.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
        const attendanceChartData = Array.from(attendanceMap.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));

        const todayStr = toDateStr(new Date());
        const presentToday = attendanceMap.get(todayStr)?.present || 0;

        const lowStock = (stockSummary || []).filter(s => s.balance < 100).map(s => ({
            name: s.rm_name,
            balance: s.balance,
            unit: s.unit_type
        }));

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalSales,
                    totalProduction,
                    employeeCount,
                    presentToday,
                    pendingOrdersCount,
                    cashInHand,
                    collectionEfficiency,
                    salesTrend,
                    productionTrend
                },
                recentActivity: {
                    invoices: recentInvoices,
                    orders: recentOrders,
                    production: recentBatches
                },
                alerts: lowStock,
                chartData,
                attendanceChartData
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: error.message });
    }
};
