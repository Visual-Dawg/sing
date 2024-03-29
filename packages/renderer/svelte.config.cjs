/* eslint-disable no-undef */
const sveltePreprocess = require("svelte-preprocess")

module.exports = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors

  preprocess: [sveltePreprocess({ postcss: true })],

  /** @see https://github.com/sveltejs/language-tools/issues/650#issuecomment-1181354795  */
  onwarn: (warning, handler) => {
    if (warning.code.startsWith("a11y-")) {
      return
    }
    handler(warning)
  },
}
