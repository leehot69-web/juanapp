import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const storageService = {
    async uploadFile(file: File, folder: string = 'media') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return publicUrl;
    }
};
