/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @description Set vendor verification flag and date after onboarding approval
 */

define(['N/log', 'N/record'], (log, record) => {

    /**
     * @param {record.Record} requestRecord - the current onboarding request record
     * @throws when the request has no linked vendor
     */
    const setVendorVerification = (requestRecord) => {
        const vendorId = requestRecord.getValue({ fieldId: 'custrecord_acp_vonb_vendor' });
        if (!vendorId) {
            throw new Error('No vendor linked to the onboarding request ' + requestRecord.id);
        }

        record.submitFields({
            type: record.Type.VENDOR,
            id: vendorId,
            values: {
                custentity_acp_vonb_verified: true,
                custentity_acp_vonb_verified_date: new Date()
            }
        });
    };

    /**
     * Executes the workflow action. Set vendor verification flag and date after onboarding approval.
     * Returns 'OK' on success, 'Error' on failure — the workflow transition can branch on this result
     * to keep the request out of a successfully-approved state when the downstream side effect failed.
     * @param {context} context
     * @returns {'OK' | 'Error'}
     */
    const onAction = (context) => {
        try {
            setVendorVerification(context.newRecord);
            return 'OK';
        } catch (e) {
            log.error('onAction:error', JSON.stringify({
                name: e.name,
                message: e.message,
                stack: e.stack,
                recordId: context.newRecord.id
            }));
            return 'Error';
        }
    };

    return { onAction };
});
