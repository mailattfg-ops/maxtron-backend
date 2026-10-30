import { supabase } from '../../../config/supabase';
import { HCEModel } from './hceModel';

/** An HCE code as the registry compares it: digits without leading zeros ("00078" is 78). */
const codeKey = (v: unknown) => String(v ?? '').trim().replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');

export const AssignmentModel = {
    getRouteAssignments: async (routeId: string) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .select(`
                *,
                keil_hces (hce_name, hce_code, address, hce_place, collection_type)
            `)
            .eq('route_id', routeId)
            .order('sequence_order')
            .order('created_at');

        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * Link a facility to a route, last in the route's order, so a list entered
     * in its sheet's order keeps that order. A facility can be linked more than
     * once (Mon & Thu at one place in the order, Tue & Fri at another, or on
     * another route): each link keeps its own days and place.
     */
    assignHce: async (assignmentData: any) => {
        const { data: last, error: lastError } = await supabase
            .from('keil_route_assignments')
            .select('sequence_order')
            .eq('route_id', assignmentData.route_id)
            .order('sequence_order', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (lastError) throw new Error(lastError.message);

        const { data, error } = await supabase
            .from('keil_route_assignments')
            .insert([{ ...assignmentData, sequence_order: (last?.sequence_order || 0) + 1 }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Bulk upload of a route's list for one set of days: the facilities, in the
     * order given, replace the route's links for exactly those days (links for
     * other days stay). The new links go in before the old ones go, so a failed
     * upload loses nothing.
     *
     * An item is { hce_id } or, for a facility not in the HCE Registry yet,
     * { hce_code, hce_name }: it is registered in the route's branch first, or
     * the HCE already registered under that code there (by an earlier list of
     * the same upload, say) is used.
     */
    replaceDayList: async ({ route_id, company_id, collection_days, collection_type, items }: any) => {
        const { data: route, error: routeError } = await supabase
            .from('keil_routes').select('branch_id').eq('id', route_id).single();
        if (routeError) throw new Error(routeError.message);

        const byCode = new Map<string, string>();
        const unregistered = items.filter((i: any) => !i.hce_id);
        if (unregistered.length) {
            const registered = await HCEModel.getAll(company_id, [route.branch_id]);
            registered.forEach(h => byCode.set(codeKey(h.hce_code), h.id));
            const toCreate = new Map<string, any>();
            unregistered.forEach((i: any) => { if (!byCode.has(codeKey(i.hce_code))) toCreate.set(codeKey(i.hce_code), i); });
            if (toCreate.size) {
                const { data: created, error: createError } = await supabase
                    .from('keil_hces')
                    .insert([...toCreate.values()].map(i => ({
                        hce_code: String(i.hce_code).trim(),
                        hce_name: String(i.hce_name).trim().slice(0, 255),
                        branch_id: route.branch_id,
                        company_id,
                    })))
                    .select('id, hce_code');
                if (createError) throw new Error(createError.message);
                (created || []).forEach(h => byCode.set(codeKey(h.hce_code), h.id));
            }
        }
        const hce_ids = items.map((i: any) => i.hce_id || byCode.get(codeKey(i.hce_code)));
        if (hce_ids.some((id: string | undefined) => !id)) throw new Error('Some facilities could not be registered in the HCE Registry.');

        const { data: links, error: findError } = await supabase
            .from('keil_route_assignments')
            .select('id, collection_days, sequence_order')
            .eq('route_id', route_id);
        if (findError) throw new Error(findError.message);

        const sameDays = (days: string[] = []) =>
            days.length === collection_days.length && collection_days.every((d: string) => days.includes(d));
        const old = (links || []).filter(l => sameDays(l.collection_days || [])).map(l => l.id);
        const last = Math.max(0, ...(links || []).map(l => l.sequence_order || 0));

        const { error } = await supabase.from('keil_route_assignments').insert(hce_ids.map((hce_id: string, i: number) => ({
            route_id, company_id, hce_id, collection_days, collection_type, sequence_order: last + i + 1,
        })));
        if (error) throw new Error(error.message);

        if (old.length) {
            const { error: deleteError } = await supabase.from('keil_route_assignments').delete().in('id', old);
            if (deleteError) throw new Error(deleteError.message);
        }
        return { added: hce_ids.length, replaced: old.length };
    },

    removeHce: async (id: string) => {
        const { error } = await supabase.from('keil_route_assignments').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    /** Save a new route order: each link's sequence_order as given. */
    reorder: async (items: { id: string; sequence_order: number }[]) => {
        const results = await Promise.all(items.map(it => supabase
            .from('keil_route_assignments')
            .update({ sequence_order: it.sequence_order })
            .eq('id', it.id)));
        const failed = results.find(r => r.error);
        if (failed?.error) throw new Error(failed.error.message);
        return true;
    },

    updateAssignment: async (id: string, updates: any) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
};
