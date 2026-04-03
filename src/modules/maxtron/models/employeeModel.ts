import { supabase } from '../../../config/supabase';
import { User } from '../../../models/userModel';
import bcrypt from 'bcryptjs';

export const EmployeeModel = {
    // Get all employees (from users table)
    getAll: async (companyName?: string, companyId?: string, categoryId?: string, isDeleted?: boolean): Promise<User[]> => {
        let query = supabase
            .from('users')
            .select(`
                *,
                employee_categories(category_name),
                companies!inner(company_name),
                user_types(name),
                addresses(*),
                employee_qualifications(*),
                employee_experiences(*),
                employee_certificates(*),
                employee_licenses(*),
                employee_insurances(*),
                employee_passports(*),
                employee_loans(*),
                employee_targets(*),
                employee_suspenses(*),
                employee_incentive_slabs(*)
            `);

        // Default to showing only non-deleted if not specified
        const showDeleted = isDeleted === true || isDeleted === (true as any);
        query = query.eq('is_deleted', showDeleted);

        if (companyName && companyName.trim() !== '') {
            query = query.ilike('companies.company_name', `%${companyName}%`);
        }
        if (companyId && companyId.trim() !== '') {
            query = query.filter('company_id', 'eq', companyId);
        }
        if (categoryId && categoryId.trim() !== '') {
            query = query.filter('category_id', 'eq', categoryId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

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
                employee_insurances(*),
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
        const { employee_qualifications, employee_experiences, employee_certificates, employee_licenses, employee_insurances, employee_passports, employee_loans, employee_targets, employee_suspenses, employee_incentive_slabs, addresses, ...baseUserData } = employeeData;

        let dataToInsert = { ...baseUserData };

        // Remove empty employee_code to allow DB default (auto-increment) to work
        if (!dataToInsert.employee_code || dataToInsert.employee_code.trim() === '') {
            delete dataToInsert.employee_code;
        }

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
                    // Filter out completely empty records
                    const validRecords = records.filter(r => {
                      const values = Object.values(r).filter(v => v !== '' && v !== null && v !== undefined);
                      return values.length > 0;
                    });

                    if (validRecords.length > 0) {
                      const mappedRecords = validRecords.map(r => {
                        const sanitized = { ...r, employee_id: user.id };
                        // Convert empty strings to null for DB compatibility
                        Object.keys(sanitized).forEach(key => {
                          if (sanitized[key] === '') sanitized[key] = null;
                        });
                        return sanitized;
                      });
                      const { error } = await supabase.from(table).insert(mappedRecords);
                      if (error) {
                        throw new Error(`Failed to save ${table}: ${error.message}`);
                      }
                    }
                }
            };

            await insertRelation('employee_qualifications', employee_qualifications);
            await insertRelation('employee_experiences', employee_experiences);
            await insertRelation('employee_certificates', employee_certificates);
            await insertRelation('employee_licenses', employee_licenses);
            await insertRelation('employee_insurances', employee_insurances);
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
        const { 
          employee_qualifications, employee_experiences, employee_certificates, 
          employee_licenses, employee_insurances, employee_passports, 
          employee_loans, employee_targets, employee_suspenses, 
          employee_incentive_slabs, addresses, ...baseUserData 
        } = updates;

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
                        const validRecords = records.filter(r => {
                          const values = Object.values(r).filter(v => v !== '' && v !== null && v !== undefined);
                          return values.length > 0;
                        });

                        if (validRecords.length > 0) {
                          const mappedRecords = validRecords.map(r => {
                            const sanitized = { ...r, employee_id: user.id };
                            Object.keys(sanitized).forEach(key => {
                              if (sanitized[key] === '') sanitized[key] = null;
                            });
                            return sanitized;
                          });
                          const { error: insError } = await supabase.from(table).insert(mappedRecords);
                          if (insError) {
                            throw new Error(`Failed to update ${table}: ${insError.message}`);
                          }
                        }
                    }
                }
            };

            await recreateRelation('employee_qualifications', employee_qualifications);
            await recreateRelation('employee_experiences', employee_experiences);
            await recreateRelation('employee_certificates', employee_certificates);
            await recreateRelation('employee_licenses', employee_licenses);
            await recreateRelation('employee_insurances', employee_insurances);
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

    // Delete an employee (Soft Delete)
    delete: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('users').update({ is_deleted: true }).eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
