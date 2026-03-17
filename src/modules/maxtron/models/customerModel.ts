import { supabase } from '../../../config/supabase';

export const CustomerModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('customers').select(`
            *,
            addresses(*)
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                addresses(*)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (customerData: any) => {
        const { addresses, ...customerInfo } = customerData;

        const { data, error } = await supabase
            .from('customers')
            .insert([customerInfo])
            .select();

        if (error) throw new Error(error.message);
        const newCustomer = data[0];

        if (newCustomer && addresses && addresses.length > 0) {
            const enrichedAddresses = addresses.map((addr: any) => ({
                ...addr,
                customer_id: newCustomer.id
            }));
            const { error: addrError } = await supabase.from('addresses').insert(enrichedAddresses);
            if (addrError) throw new Error(addrError.message);
        }

        return CustomerModel.getById(newCustomer.id);
    },

    update: async (id: string, customerData: any) => {
        const { addresses, ...customerInfo } = customerData;

        const { data, error } = await supabase
            .from('customers')
            .update(customerInfo)
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);

        if (addresses) {
            // Delete old addresses and insert new ones or perform a more sophisticated update
            await supabase.from('addresses').delete().eq('customer_id', id);
            const enrichedAddresses = addresses.map((addr: any) => ({
                ...addr,
                customer_id: id
            }));
            await supabase.from('addresses').insert(enrichedAddresses);
        }

        return CustomerModel.getById(id);
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
