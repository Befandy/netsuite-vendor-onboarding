/**
 * SuiteCloud project configuration.
 *
 * Used by the SuiteCloud CLI to locate the SDF project root and configure
 * deployment behaviour. Copy the project to a SuiteCloud-enabled workspace
 * and run `suitecloud project:validate` / `suitecloud project:deploy` to
 * push to a target account.
 */
module.exports = {
    defaultProjectFolder: 'src',
    commands: {
        'project:deploy': {
            beforeExecuting: async (args) => args
        }
    }
};
