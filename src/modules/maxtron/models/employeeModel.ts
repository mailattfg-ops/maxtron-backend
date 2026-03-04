import { supabase } from '../../../config/supabase';
import { User } from '../../../models/userModel';
import bcrypt from 'bcryptjs';

export const EmployeeModel = {
    // Get all employees (from users table)
    getAll: async (): Promise<User[]> => {
        // Optionally, we could join departments and categories here
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                employee_categories(category_name),
                companies(company_name),
                user_types(name),
                addresses(*),
                employee_qualifications(*),
                employee_experiences(*),
                employee_certificates(*),
                employee_licenses(*),
                employee_passports(*),
                employee_loans(*),
                employee_targets(*),
                employee_suspenses(*),
                employee_incentive_slabs(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    // Get single employee by ID
    getById: async (id: string): Promise<User | null> => {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                employee_categories(category_name),
                companies(company_name),
                user_types(name),
                addresses(*),
                employee_qualifications(*),
                employee_experiences(*),
                employee_certificates(*),
                employee_licenses(*),
                employee_passports(*),
                employee_loans(*),
                employee_targets(*),
                employee_suspenses(*),
                employee_incentive_slabs(*)
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || null;
    },

    // Create a new employee
    create: async (employeeData: any): Promise<User> => {
        const { employee_qualifications, employee_experiences, employee_certificates, employee_licenses, employee_passports, employee_loans, employee_targets, employee_suspenses, employee_incentive_slabs, addresses, ...baseUserData } = employeeData;

        let dataToInsert = { ...baseUserData };
        if (dataToInsert.password) {
            const salt = await bcrypt.genSalt(10);
            dataToInsert.password = await bcrypt.hash(dataToInsert.password, salt);
        }

        const { data: user, error } = await supabase
            .from('users')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Process nested relations
        if (user) {
            const insertRelation = async (table: string, records: any[]) => {
                if (records && records.length > 0) {
                    const mappedRecords = records.map(r => ({ ...r, employee_id: user.id }));
                    await supabase.from(table).insert(mappedRecords);
                }
            };

            await insertRelation('employee_qualifications', employee_qualifications);
            await insertRelation('employee_experiences', employee_experiences);
            await insertRelation('employee_certificates', employee_certificates);
            await insertRelation('employee_licenses', employee_licenses);
            await insertRelation('employee_passports', employee_passports);
            await insertRelation('employee_loans', employee_loans);
            await insertRelation('employee_targets', employee_targets);
            await insertRelation('employee_suspenses', employee_suspenses);
            await insertRelation('employee_incentive_slabs', employee_incentive_slabs);

            if (addresses && addresses.length > 0) {
                const mappedAddresses = addresses.map((a: any) => ({ ...a, user_id: user.id }));
                await supabase.from('addresses').insert(mappedAddresses);
            }
        }

        return user;
    },
    // Update existing employee
    update: async (id: string, updates: any): Promise<User | null> => {
        const { employee_qualifications, employee_experiences, employee_certificates, employee_licenses, employee_passports, employee_loans, employee_targets, employee_suspenses, employee_incentive_slabs, addresses, ...baseUserData } = updates;

        let dataToUpdate = { ...baseUserData };
        if (dataToUpdate.password) {
            const salt = await bcrypt.genSalt(10);
            dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, salt);
        } else {
            delete dataToUpdate.password;
        }

        const { data: user, error } = await supabase
            .from('users')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Recreate relations by deleting old and inserting new
        if (user) {
            const recreateRelation = async (table: string, records: any[]) => {
                if (records) {
                    await supabase.from(table).delete().eq('employee_id', user.id);
                    if (records.length > 0) {
                        const mappedRecords = records.map(r => ({ ...r, employee_id: user.id }));
                        await supabase.from(table).insert(mappedRecords);
                    }
                }
            };

            await recreateRelation('employee_qualifications', employee_qualifications);
            await recreateRelation('employee_experiences', employee_experiences);
            await recreateRelation('employee_certificates', employee_certificates);
            await recreateRelation('employee_licenses', employee_licenses);
            await recreateRelation('employee_passports', employee_passports);
            await recreateRelation('employee_loans', employee_loans);
            await recreateRelation('employee_targets', employee_targets);
            await recreateRelation('employee_suspenses', employee_suspenses);
            await recreateRelation('employee_incentive_slabs', employee_incentive_slabs);

            if (addresses) {
                await supabase.from('addresses').delete().eq('user_id', user.id);
                if (addresses.length > 0) {
                    const mappedAddresses = addresses.map((a: any) => ({ ...a, user_id: user.id }));
                    await supabase.from('addresses').insert(mappedAddresses);
                }
            }
        }

        return user || null;
    },

    // Delete an employee
    delete: async (id: string): Promise<boolean> => {
        // Thanks to ON DELETE CASCADE on our dependencies, deleting the user 
        // will automatically clean up addresses, loans, experiences, etc.
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
