/** @type {import('vite').UserConfig} */ 
import UnpluginTypia from '@ryoppippi/unplugin-typia/vite'
 
export default {
    base: "",
    build:
    {
        rollupOptions:
        {
            output:
            {
                manualChunks: 
                {
                    three: ['three'] 
                }
            }
        }
    },
    plugins: [
        UnpluginTypia({ /* options */ })
      ],
    // config options
};
