/** @type {import('vite').UserConfig} */ 
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
    }

    // config options
};
